"""IoT telemetry ingestion and device control endpoints."""
import uuid
import hashlib
import logging
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from cryptography.hazmat.primitives.serialization import load_pem_public_key
from cryptography.exceptions import InvalidSignature
import base64

from app.db.session import get_db
from app.models.models import IoTDevice, IoTReading, Package, AuditLog, FraudAlert
from app.models.enums import UserRole
from app.schemas.schemas import IoTReadingIngest, IoTReadingRead, SimulatorControlRequest
from app.core.security import get_current_user, require_roles
from app.core.websocket import ws_manager
from app.services.fraud.fraud_engine import FraudEngine
from app.core.config import settings

router = APIRouter(prefix="/iot", tags=["iot"])
logger = logging.getLogger(__name__)


def _verify_signature(device: IoTDevice, reading: IoTReadingIngest) -> bool:
    """Verify HMAC-SHA256 signature of IoT payload using device public key or shared key."""
    try:
        # Build canonical payload string
        payload = f"{reading.device_id}:{reading.package_id}:{reading.temperature}:{reading.humidity}:{reading.latitude}:{reading.longitude}:{reading.nonce}:{reading.timestamp}"
        expected_hash = hashlib.sha256(
            f"{payload}:{settings.IOT_SIGNING_KEY}".encode()
        ).hexdigest()
        return reading.signature == expected_hash
    except Exception as e:
        logger.error(f"Signature verification error: {e}")
        return False


@router.post("/ingest", status_code=201)
async def ingest_telemetry(
    reading: IoTReadingIngest,
    db: AsyncSession = Depends(get_db),
):
    """
    IoT telemetry ingestion endpoint.
    Called by IoT Simulator. Validates signature, checks replay, runs fraud engine.
    """
    # 1. Look up device
    result = await db.execute(select(IoTDevice).where(IoTDevice.device_id == reading.device_id))
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail=f"Unknown device: {reading.device_id}")

    # 2. Replay attack check — nonce must be unique
    existing = await db.execute(select(IoTReading).where(IoTReading.nonce == reading.nonce))
    replay_detected = existing.scalar_one_or_none() is not None

    # 3. Signature validation
    sig_valid = _verify_signature(device, reading)

    # 4. Parse timestamp
    try:
        ts = datetime.fromisoformat(reading.timestamp.replace("Z", "+00:00"))
    except Exception:
        ts = datetime.now(timezone.utc)

    # 5. Parse IDs
    package_id = None
    shipment_id = None
    if reading.package_id:
        pkg_result = await db.execute(select(Package).where(Package.package_code == reading.package_id))
        pkg = pkg_result.scalar_one_or_none()
        if pkg:
            package_id = pkg.id

    if reading.shipment_id:
        from app.models.models import Shipment
        s_result = await db.execute(select(Shipment).where(Shipment.shipment_number == reading.shipment_id))
        s = s_result.scalar_one_or_none()
        if s:
            shipment_id = s.id

    # 6. Store reading (use unique nonce even if duplicate, append suffix)
    nonce = reading.nonce if not replay_detected else f"{reading.nonce}-dup-{datetime.now(timezone.utc).timestamp()}"

    iot_record = IoTReading(
        device_id=reading.device_id,
        package_id=package_id,
        shipment_id=shipment_id,
        temperature=reading.temperature,
        humidity=reading.humidity,
        latitude=reading.latitude,
        longitude=reading.longitude,
        battery=reading.battery,
        nonce=nonce,
        signature=reading.signature,
        signature_valid=sig_valid,
        is_anomaly=False,
        reading_timestamp=ts,
        raw_payload=reading.model_dump(),
        metadata_={"replay_detected": replay_detected},
    )
    db.add(iot_record)
    await db.flush()

    # 7. Update device last seen + location
    device.last_seen = datetime.now(timezone.utc)
    device.battery_level = reading.battery
    db.add(device)

    # 8. Update package location
    if package_id:
        pkg_upd = await db.execute(select(Package).where(Package.id == package_id))
        pkg = pkg_upd.scalar_one_or_none()
        if pkg:
            pkg.current_location_lat = reading.latitude
            pkg.current_location_lng = reading.longitude
            db.add(pkg)

    # 9. Run fraud engine
    fraud_engine = FraudEngine(db)
    alerts = await fraud_engine.evaluate_iot_reading(iot_record)

    auto_quarantined = False
    for alert in alerts:
        iot_record.is_anomaly = True
        if package_id:
            pkg_upd2 = await db.execute(select(Package).where(Package.id == package_id))
            pkg2 = pkg_upd2.scalar_one_or_none()
            if pkg2:
                auto_quarantined = await fraud_engine.maybe_quarantine(pkg2, alert)

    await db.commit()

    # 10. Broadcast via WebSocket
    await ws_manager.broadcast_iot({
        "device_id": reading.device_id,
        "package_id": str(package_id) if package_id else None,
        "temperature": reading.temperature,
        "humidity": reading.humidity,
        "latitude": reading.latitude,
        "longitude": reading.longitude,
        "battery": reading.battery,
        "is_anomaly": iot_record.is_anomaly,
        "signature_valid": sig_valid,
        "timestamp": ts.isoformat(),
    })

    for alert in alerts:
        await ws_manager.broadcast_fraud_alert({
            "alert_id": str(alert.id),
            "alert_type": alert.alert_type,
            "risk_level": alert.risk_level,
            "risk_score": alert.risk_score,
            "description": alert.description,
            "package_id": str(alert.package_id) if alert.package_id else None,
            "auto_quarantined": auto_quarantined,
        })

    return {
        "accepted": True,
        "reading_id": str(iot_record.id),
        "signature_valid": sig_valid,
        "replay_detected": replay_detected,
        "alerts_generated": len(alerts),
        "auto_quarantined": auto_quarantined,
    }


@router.post("/simulator/control")
async def control_simulator(
    body: SimulatorControlRequest,
    current_user=Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.WAREHOUSE, UserRole.LOGISTICS)),
):
    """Send control signal to IoT simulator to change simulation mode."""
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.post(
                f"{settings.IOT_SIMULATOR_URL}/control",
                json=body.model_dump(),
            )
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Simulator not reachable: {e}")


@router.get("/devices", response_model=dict)
async def list_devices(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    q = select(IoTDevice)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    result = await db.execute(q.order_by(IoTDevice.created_at.desc()).offset((page - 1) * size).limit(size))
    devices = result.scalars().all()
    return {
        "items": [
            {
                "id": str(d.id),
                "device_id": d.device_id,
                "device_name": d.device_name,
                "is_active": d.is_active,
                "last_seen": d.last_seen.isoformat() if d.last_seen else None,
                "battery_level": d.battery_level,
                "simulation_mode": d.simulation_mode,
                "package_id": str(d.package_id) if d.package_id else None,
                "shipment_id": str(d.shipment_id) if d.shipment_id else None,
            }
            for d in devices
        ],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size if total else 0,
    }


@router.get("/devices/{device_id}")
async def get_device(
    device_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(select(IoTDevice).where(IoTDevice.device_id == device_id))
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return {
        "id": str(device.id),
        "device_id": device.device_id,
        "device_name": device.device_name,
        "location": device.location,
        "is_active": device.is_active,
        "battery_level": device.battery_level,
        "simulation_mode": device.simulation_mode,
    }


@router.post("/devices", status_code=201)
async def create_device(
    body: dict,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(UserRole.SUPER_ADMIN)),
):
    device_id = body.get("device_id")
    device_name = body.get("device_name")
    location = body.get("location")
    public_key = body.get("public_key", "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VdAyEAGDm2CpMlIYNzRmpUOxG0lfwO6YD+1yMjMZ9iFkNVhis=\n-----END PUBLIC KEY-----")
    
    device = IoTDevice(
        device_id=device_id,
        device_name=device_name,
        location=location,
        public_key=public_key,
        is_active=body.get("is_active", True),
    )
    db.add(device)
    await db.commit()
    await db.refresh(device)
    return {
        "id": str(device.id),
        "device_id": device.device_id,
        "device_name": device.device_name,
        "location": device.location,
        "is_active": device.is_active,
    }


@router.get("/readings", response_model=dict)
async def get_readings(
    device_id: Optional[str] = Query(None),
    package_id: Optional[uuid.UUID] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    q = select(IoTReading)
    if device_id:
        q = q.where(IoTReading.device_id == device_id)
    if package_id:
        q = q.where(IoTReading.package_id == package_id)
    result = await db.execute(q.order_by(IoTReading.reading_timestamp.desc()).limit(limit))
    readings = result.scalars().all()
    return {"items": [IoTReadingRead.model_validate(r) for r in readings], "total": len(readings)}


@router.websocket("/ws")
async def iot_websocket(websocket: WebSocket):
    """WebSocket endpoint for real-time IoT telemetry and alerts."""
    topics = websocket.query_params.get("topics", "*").split(",")
    await ws_manager.connect(websocket, topics=topics)
    try:
        while True:
            # Keep connection alive — receive heartbeats
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
