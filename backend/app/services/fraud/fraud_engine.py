"""
Fraud Detection Engine — deterministic rule-based detection.
Runs entirely on the backend. Never called from frontend.
"""
from __future__ import annotations
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List, Tuple
import math

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.models import (
    FraudAlert, Package, IoTReading, Batch, Product,
    HandoverEvent, QuarantineRecord, ConsumerScan,
)
from app.models.enums import (
    FraudAlertType, RiskLevel, AlertStatus, PackageStatus,
)

logger = logging.getLogger(__name__)

# Risk score weights per fraud type
RISK_WEIGHTS: Dict[str, float] = {
    FraudAlertType.DUPLICATE_PACKAGE.value: 90.0,
    FraudAlertType.IMPOSSIBLE_MOVEMENT.value: 75.0,
    FraudAlertType.COLD_CHAIN_BREACH.value: 40.0,
    FraudAlertType.INVALID_SIGNATURE.value: 85.0,
    FraudAlertType.REPLAY_ATTACK.value: 95.0,
    FraudAlertType.UNAUTHORIZED_TRANSFER.value: 70.0,
    FraudAlertType.EXPIRED_PRODUCT.value: 60.0,
    FraudAlertType.DOCUMENT_TAMPERING.value: 80.0,
    FraudAlertType.GPS_ANOMALY.value: 50.0,
}

RISK_LEVEL_THRESHOLDS = {
    RiskLevel.LOW: (0, 20),
    RiskLevel.MEDIUM: (21, 50),
    RiskLevel.HIGH: (51, 80),
    RiskLevel.CRITICAL: (81, 100),
}


def score_to_level(score: float) -> str:
    for level, (low, high) in RISK_LEVEL_THRESHOLDS.items():
        if low <= score <= high:
            return level.value
    return RiskLevel.CRITICAL.value


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two GPS coordinates in kilometres."""
    R = 6371
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(d_lon / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


class FraudEngine:
    """
    Deterministic fraud detection engine.
    Each rule is a separate async method returning (triggered: bool, evidence: dict).
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    async def evaluate_iot_reading(self, reading: IoTReading) -> List[FraudAlert]:
        """Run all applicable rules against an IoT reading."""
        alerts = []

        rules = [
            self._check_invalid_signature,
            self._check_replay_attack,
            self._check_cold_chain_breach,
            self._check_gps_anomaly,
        ]

        for rule in rules:
            try:
                alert = await rule(reading)
                if alert:
                    alerts.append(alert)
            except Exception as e:
                logger.error(f"Fraud rule {rule.__name__} failed: {e}")

        return alerts

    async def evaluate_package_scan(self, package: Package) -> List[FraudAlert]:
        """Run package-level fraud rules."""
        alerts = []
        rules = [
            self._check_duplicate_package,
            self._check_expired_product,
        ]
        for rule in rules:
            try:
                alert = await rule(package)
                if alert:
                    alerts.append(alert)
            except Exception as e:
                logger.error(f"Package fraud rule {rule.__name__} failed: {e}")
        return alerts

    # ── Individual Rules ──────────────────────────────────────────────────────

    async def _check_invalid_signature(self, reading: IoTReading) -> Optional[FraudAlert]:
        if reading.signature_valid is False:
            score = RISK_WEIGHTS[FraudAlertType.INVALID_SIGNATURE.value]
            return await self._create_alert(
                alert_type=FraudAlertType.INVALID_SIGNATURE,
                package_id=reading.package_id,
                shipment_id=reading.shipment_id,
                iot_reading_id=reading.id,
                risk_score=score,
                description=f"IoT device {reading.device_id} submitted reading with invalid cryptographic signature.",
                evidence={
                    "device_id": reading.device_id,
                    "nonce": reading.nonce,
                    "reading_timestamp": reading.reading_timestamp.isoformat() if reading.reading_timestamp else None,
                }
            )
        return None

    async def _check_replay_attack(self, reading: IoTReading) -> Optional[FraudAlert]:
        """Check if nonce was already seen (handled by DB unique constraint, but alert here)."""
        # The DB unique constraint on nonce already prevents actual replay.
        # This alert is triggered when the service catches a duplicate nonce attempt.
        # reading.metadata_ will contain {'replay_detected': True} if set by the ingest service.
        metadata = reading.metadata_ or {}
        if metadata.get("replay_detected"):
            score = RISK_WEIGHTS[FraudAlertType.REPLAY_ATTACK.value]
            return await self._create_alert(
                alert_type=FraudAlertType.REPLAY_ATTACK,
                package_id=reading.package_id,
                shipment_id=reading.shipment_id,
                iot_reading_id=reading.id,
                risk_score=score,
                description=f"Replay attack detected for device {reading.device_id}: nonce already used.",
                evidence={
                    "device_id": reading.device_id,
                    "nonce": reading.nonce,
                }
            )
        return None

    async def _check_cold_chain_breach(self, reading: IoTReading) -> Optional[FraudAlert]:
        if not reading.package_id:
            return None

        # Fetch product limits
        from app.models.models import Package, Batch, Product
        result = await self.session.execute(
            select(Package, Batch, Product)
            .join(Batch, Package.batch_id == Batch.id)
            .join(Product, Batch.product_id == Product.id)
            .where(Package.id == reading.package_id)
        )
        row = result.first()
        if not row:
            return None
        package, batch, product = row

        breach = False
        reason_parts = []

        if reading.temperature is not None:
            if product.min_temperature is not None and reading.temperature < product.min_temperature:
                breach = True
                reason_parts.append(
                    f"Temperature {reading.temperature:.1f}°C below minimum {product.min_temperature}°C"
                )
            if product.max_temperature is not None and reading.temperature > product.max_temperature:
                breach = True
                reason_parts.append(
                    f"Temperature {reading.temperature:.1f}°C above maximum {product.max_temperature}°C"
                )

        if reading.humidity is not None and product.max_humidity is not None:
            if reading.humidity > product.max_humidity:
                breach = True
                reason_parts.append(
                    f"Humidity {reading.humidity:.1f}% above limit {product.max_humidity}%"
                )

        if breach:
            score = RISK_WEIGHTS[FraudAlertType.COLD_CHAIN_BREACH.value]
            return await self._create_alert(
                alert_type=FraudAlertType.COLD_CHAIN_BREACH,
                package_id=reading.package_id,
                shipment_id=reading.shipment_id,
                iot_reading_id=reading.id,
                risk_score=score,
                description=f"Cold chain breach detected: {'; '.join(reason_parts)}",
                evidence={
                    "device_id": reading.device_id,
                    "temperature": reading.temperature,
                    "humidity": reading.humidity,
                    "min_temp": product.min_temperature,
                    "max_temp": product.max_temperature,
                    "max_humidity": product.max_humidity,
                    "reasons": reason_parts,
                }
            )
        return None

    async def _check_gps_anomaly(self, reading: IoTReading) -> Optional[FraudAlert]:
        """Detect impossible movement by comparing to previous reading."""
        if not reading.package_id or reading.latitude is None or reading.longitude is None:
            return None

        # Get the previous reading for this package
        result = await self.session.execute(
            select(IoTReading)
            .where(
                IoTReading.package_id == reading.package_id,
                IoTReading.id != reading.id,
                IoTReading.latitude.is_not(None),
            )
            .order_by(IoTReading.reading_timestamp.desc())
            .limit(1)
        )
        prev = result.scalar_one_or_none()
        if not prev:
            return None

        distance_km = haversine_km(
            prev.latitude, prev.longitude,
            reading.latitude, reading.longitude,
        )
        time_diff_seconds = (
            reading.reading_timestamp - prev.reading_timestamp
        ).total_seconds()

        if time_diff_seconds <= 0:
            return None

        speed_kmh = (distance_km / time_diff_seconds) * 3600
        MAX_PLAUSIBLE_SPEED_KMH = 200  # Fastest delivery vehicle

        if speed_kmh > MAX_PLAUSIBLE_SPEED_KMH:
            score = RISK_WEIGHTS[FraudAlertType.GPS_ANOMALY.value]
            return await self._create_alert(
                alert_type=FraudAlertType.GPS_ANOMALY,
                package_id=reading.package_id,
                shipment_id=reading.shipment_id,
                iot_reading_id=reading.id,
                risk_score=score,
                description=f"GPS anomaly: package moved {distance_km:.1f}km in {time_diff_seconds:.0f}s ({speed_kmh:.0f} km/h)",
                evidence={
                    "device_id": reading.device_id,
                    "distance_km": round(distance_km, 2),
                    "speed_kmh": round(speed_kmh, 1),
                    "prev_lat": prev.latitude,
                    "prev_lng": prev.longitude,
                    "curr_lat": reading.latitude,
                    "curr_lng": reading.longitude,
                }
            )
        return None

    async def _check_duplicate_package(self, package: Package) -> Optional[FraudAlert]:
        """Check if package code has been scanned in different locations simultaneously."""
        # Check for multiple consumer scans from very different locations in short time
        result = await self.session.execute(
            select(ConsumerScan)
            .where(ConsumerScan.package_id == package.id)
            .order_by(ConsumerScan.created_at.desc())
            .limit(5)
        )
        scans = result.scalars().all()

        if len(scans) < 2:
            return None

        latest = scans[0]
        previous = scans[1]

        if not all([latest.latitude, latest.longitude, previous.latitude, previous.longitude]):
            return None

        time_diff = (latest.created_at - previous.created_at).total_seconds()
        if time_diff < 300:  # 5 minutes
            dist = haversine_km(
                latest.latitude, latest.longitude,
                previous.latitude, previous.longitude,
            )
            if dist > 50:  # 50km apart
                score = RISK_WEIGHTS[FraudAlertType.DUPLICATE_PACKAGE.value]
                return await self._create_alert(
                    alert_type=FraudAlertType.DUPLICATE_PACKAGE,
                    package_id=package.id,
                    shipment_id=None,
                    iot_reading_id=None,
                    risk_score=score,
                    description=f"Package scanned {dist:.0f}km apart in {time_diff:.0f}s — possible counterfeit.",
                    evidence={
                        "scan1_lat": latest.latitude,
                        "scan1_lng": latest.longitude,
                        "scan2_lat": previous.latitude,
                        "scan2_lng": previous.longitude,
                        "distance_km": round(dist, 1),
                        "time_diff_seconds": int(time_diff),
                    }
                )
        return None

    async def _check_expired_product(self, package: Package) -> Optional[FraudAlert]:
        result = await self.session.execute(
            select(Batch).where(Batch.id == package.batch_id)
        )
        batch = result.scalar_one_or_none()
        if batch and batch.expiry_date < datetime.now(timezone.utc):
            score = RISK_WEIGHTS[FraudAlertType.EXPIRED_PRODUCT.value]
            return await self._create_alert(
                alert_type=FraudAlertType.EXPIRED_PRODUCT,
                package_id=package.id,
                shipment_id=None,
                iot_reading_id=None,
                risk_score=score,
                description=f"Package {package.package_code} belongs to expired batch (expired {batch.expiry_date.date()}).",
                evidence={
                    "expiry_date": batch.expiry_date.isoformat(),
                    "batch_number": batch.batch_number,
                }
            )
        return None

    # ── Risk Score Aggregation ────────────────────────────────────────────────

    async def calculate_package_risk(self, package_id) -> Tuple[float, str]:
        """Aggregate risk from all open alerts for a package."""
        result = await self.session.execute(
            select(FraudAlert)
            .where(
                FraudAlert.package_id == package_id,
                FraudAlert.status == AlertStatus.OPEN.value,
            )
        )
        alerts = result.scalars().all()
        if not alerts:
            return 0.0, RiskLevel.LOW.value

        # Use max + some accumulation logic
        max_score = max(a.risk_score for a in alerts)
        accumulation = min(len(alerts) * 5, 20)  # Additional risk from multiple alerts
        final_score = min(max_score + accumulation, 100.0)
        return final_score, score_to_level(final_score)

    async def maybe_quarantine(self, package: Package, alert: FraudAlert) -> bool:
        """Auto-quarantine package if risk is CRITICAL."""
        if alert.risk_level == RiskLevel.CRITICAL.value:
            await self._quarantine_package(package, alert)
            return True
        return False

    async def _quarantine_package(self, package: Package, alert: FraudAlert):
        from app.services.quarantine import quarantine_package
        await quarantine_package(
            session=self.session,
            package=package,
            reason=f"Automatic quarantine: {alert.description}",
            fraud_alert_id=alert.id,
        )

    # ── Alert Creation ─────────────────────────────────────────────────────────

    async def _create_alert(
        self,
        alert_type: FraudAlertType,
        package_id,
        shipment_id,
        iot_reading_id,
        risk_score: float,
        description: str,
        evidence: Dict[str, Any],
    ) -> FraudAlert:
        risk_level = score_to_level(risk_score)
        alert = FraudAlert(
            alert_type=alert_type.value,
            package_id=package_id,
            shipment_id=shipment_id,
            iot_reading_id=iot_reading_id,
            risk_score=risk_score,
            risk_level=risk_level,
            description=description,
            evidence=evidence,
            status=AlertStatus.OPEN.value,
            auto_quarantined=False,
        )
        self.session.add(alert)
        await self.session.flush()  # Get ID without committing
        logger.warning(f"FRAUD ALERT [{alert_type.value}] risk={risk_score} pkg={package_id}")
        return alert
