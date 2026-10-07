"""Consumer verification endpoint — the core public-facing verify flow."""
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.models import (
    Package, Batch, Product, Organization,
    HandoverEvent, IoTReading, Recall, ConsumerScan, FraudAlert,
)
from app.models.enums import PackageStatus, RecallStatus, AlertStatus
from app.schemas.schemas import PackageVerifyResult
from app.services.fraud.fraud_engine import FraudEngine

router = APIRouter(prefix="/consumer", tags=["consumer"])


async def _verify_identifier(
    identifier: str,
    db: AsyncSession,
    request: Request,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    location_name: Optional[str] = None,
) -> PackageVerifyResult:
    """
    Core verification engine — shared by QR scan and NFC scan.
    identifier: package_code (PKG-000001) or nfc_uid
    """
    # Try package_code first, then nfc_uid
    result = await db.execute(
        select(Package).options(
            selectinload(Package.batch).selectinload(Batch.product).selectinload(Product.manufacturer),
            selectinload(Package.current_owner),
        ).where(
            (Package.package_code == identifier) | (Package.nfc_uid == identifier),
            Package.is_deleted == False,
        )
    )
    package = result.scalar_one_or_none()

    if not package:
        return PackageVerifyResult(
            package_code=identifier,
            status="NOT_FOUND",
            is_authentic=False,
            is_suspicious=True,
            is_recalled=False,
            is_quarantined=False,
            cold_chain_ok=True,
            risk_score=100.0,
            risk_level="CRITICAL",
            scan_count=0,
        )

    # Record consumer scan
    scan = ConsumerScan(
        package_id=package.id,
        scan_type="QR",
        consumer_ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        latitude=lat,
        longitude=lng,
        location_name=location_name,
    )
    db.add(scan)
    await db.flush()

    # Run duplicate package check
    engine = FraudEngine(db)
    scan_alerts = await engine.evaluate_package_scan(package)
    for alert in scan_alerts:
        await engine.maybe_quarantine(package, alert)
    if scan_alerts:
        risk_score, risk_lvl = await engine.calculate_package_risk(package.id)
        package.risk_score = risk_score
        package.risk_level = risk_lvl
        db.add(package)
        await db.flush()

    # Get journey (handover events)
    journey_result = await db.execute(
        select(HandoverEvent).options(
            selectinload(HandoverEvent.from_org),
            selectinload(HandoverEvent.to_org),
            selectinload(HandoverEvent.performer),
        ).where(HandoverEvent.package_id == package.id)
        .order_by(HandoverEvent.event_timestamp)
    )
    journey_events = journey_result.scalars().all()

    # Get latest IoT readings for temperature/humidity
    iot_result = await db.execute(
        select(IoTReading)
        .where(IoTReading.package_id == package.id)
        .order_by(IoTReading.reading_timestamp.desc())
        .limit(1)
    )
    latest_reading = iot_result.scalar_one_or_none()

    # Check cold chain compliance
    cold_chain_ok = True
    if package.batch and package.batch.product:
        p = package.batch.product
        if latest_reading:
            if p.min_temperature and latest_reading.temperature and latest_reading.temperature < p.min_temperature:
                cold_chain_ok = False
            if p.max_temperature and latest_reading.temperature and latest_reading.temperature > p.max_temperature:
                cold_chain_ok = False

    # Check recall
    recall_result = await db.execute(
        select(Recall).where(
            Recall.batch_id == package.batch_id,
            Recall.status.in_([RecallStatus.INITIATED.value, RecallStatus.ACTIVE.value]),
        ).limit(1)
    )
    recall = recall_result.scalar_one_or_none()

    # Check open fraud alerts
    alert_result = await db.execute(
        select(FraudAlert).where(
            FraudAlert.package_id == package.id,
            FraudAlert.status == AlertStatus.OPEN.value,
        )
    )
    open_alerts = alert_result.scalars().all()

    # Consumer scan count
    scan_count_result = await db.execute(
        select(ConsumerScan).where(ConsumerScan.package_id == package.id)
    )
    all_scans = scan_count_result.scalars().all()

    is_quarantined = package.status == PackageStatus.QUARANTINED.value
    is_recalled = bool(recall)
    is_suspicious = bool(open_alerts) or is_quarantined or not cold_chain_ok
    is_authentic = (
        not is_quarantined
        and not is_recalled
        and package.status not in [PackageStatus.COUNTERFEIT.value, PackageStatus.RECALLED.value]
        and package.crypto_hash is not None
        and len(open_alerts) == 0
    )

    scan.result = "AUTHENTIC" if is_authentic else ("COUNTERFEIT" if is_quarantined else "SUSPICIOUS")
    scan.is_suspicious = is_suspicious
    await db.commit()

    batch = package.batch
    product = batch.product if batch else None
    manufacturer = product.manufacturer if product else None

    return PackageVerifyResult(
        package_code=package.package_code,
        status=package.status,
        is_authentic=is_authentic,
        is_suspicious=is_suspicious,
        is_recalled=is_recalled,
        is_quarantined=is_quarantined,
        product={
            "name": product.name if product else None,
            "sku": product.sku if product else None,
            "category": product.category if product else None,
            "description": product.description if product else None,
        } if product else None,
        batch={
            "batch_number": batch.batch_number if batch else None,
            "manufacturing_date": batch.manufacturing_date.isoformat() if batch else None,
            "expiry_date": batch.expiry_date.isoformat() if batch else None,
        } if batch else None,
        manufacturer={
            "name": manufacturer.name if manufacturer else None,
            "city": manufacturer.city if manufacturer else None,
            "country": manufacturer.country if manufacturer else None,
            "license": manufacturer.license_number if manufacturer else None,
        } if manufacturer else None,
        current_owner={
            "name": package.current_owner.name if package.current_owner else None,
            "type": package.current_owner.org_type if package.current_owner else None,
            "city": package.current_owner.city if package.current_owner else None,
        } if package.current_owner else None,
        journey=[{
            "event_type": e.event_type,
            "from_org": e.from_org.name if e.from_org else None,
            "to_org": e.to_org.name if e.to_org else None,
            "location": e.location_name,
            "timestamp": e.event_timestamp.isoformat() if e.event_timestamp else None,
            "blockchain_tx": e.blockchain_tx_hash,
        } for e in journey_events],
        cold_chain_ok=cold_chain_ok,
        risk_score=package.risk_score,
        risk_level=package.risk_level,
        blockchain_tx=package.blockchain_identity,
        recall_info={
            "recall_number": recall.recall_number,
            "reason": recall.reason,
            "severity": recall.severity,
            "status": recall.status,
        } if recall else None,
        last_temperature=latest_reading.temperature if latest_reading else None,
        last_humidity=latest_reading.humidity if latest_reading else None,
        scan_count=len(all_scans),
    )


@router.get("/verify/{identifier}", response_model=PackageVerifyResult)
async def verify_package(
    identifier: str,
    request: Request,
    lat: Optional[float] = Query(None),
    lng: Optional[float] = Query(None),
    location: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Public endpoint — no auth required.
    Verifies a product by QR code payload or NFC UID.
    """
    return await _verify_identifier(identifier, db, request, lat=lat, lng=lng, location_name=location)


@router.post("/verify", response_model=PackageVerifyResult)
async def verify_package_post(
    request: Request,
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    """POST-based verification for manual code entry."""
    identifier = body.get("identifier", "").strip()
    if not identifier:
        raise HTTPException(status_code=400, detail="identifier is required")
    lat = body.get("latitude") or body.get("lat")
    lng = body.get("longitude") or body.get("lng")
    location = body.get("location_name") or body.get("location")
    return await _verify_identifier(identifier, db, request, lat=lat, lng=lng, location_name=location)
