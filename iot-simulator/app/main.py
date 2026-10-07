"""
TrustChain IoT Simulator — independent Python service.
Generates cryptographically signed telemetry.
Supports: NORMAL, COLD_CHAIN_BREACH, GPS_ANOMALY, SENSOR_TAMPERING, REPLAY_ATTACK, DEVICE_OFFLINE modes.
"""
import asyncio
import hashlib
import json
import logging
import os
import random
import time
import uuid
from datetime import datetime, timezone
from typing import Dict, Optional
from enum import Enum

import httpx
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
import redis.asyncio as aioredis

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("iot-simulator")

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8080")
IOT_SIGNING_KEY = os.getenv("IOT_SIGNING_KEY", "trustchain_iot_master_signing_key_production_2026")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
INTERVAL_SECONDS = int(os.getenv("INTERVAL_SECONDS", "10"))

app = FastAPI(title="TrustChain IoT Simulator", version="1.0.0")


class SimMode(str, Enum):
    NORMAL = "NORMAL"
    COLD_CHAIN_BREACH = "COLD_CHAIN_BREACH"
    GPS_ANOMALY = "GPS_ANOMALY"
    SENSOR_TAMPERING = "SENSOR_TAMPERING"
    REPLAY_ATTACK = "REPLAY_ATTACK"
    DEVICE_OFFLINE = "DEVICE_OFFLINE"


# Device configurations with realistic Indian locations
DEVICES: Dict[str, Dict] = {
    "IOT-MUM-001": {
        "name": "Mumbai Cold Store Sensor",
        "base_lat": 19.076, "base_lng": 72.877,
        "normal_temp_min": 2.0, "normal_temp_max": 8.0,
        "normal_humidity_min": 40.0, "normal_humidity_max": 65.0,
        "package_id": None, "shipment_id": None,
        "mode": SimMode.NORMAL,
        "mode_duration": 0, "mode_start": 0,
    },
    "IOT-DEL-001": {
        "name": "Delhi Distribution Sensor",
        "base_lat": 28.704, "base_lng": 77.102,
        "normal_temp_min": 2.0, "normal_temp_max": 25.0,
        "normal_humidity_min": 30.0, "normal_humidity_max": 60.0,
        "package_id": None, "shipment_id": None,
        "mode": SimMode.NORMAL,
        "mode_duration": 0, "mode_start": 0,
    },
    "IOT-BLR-001": {
        "name": "Bengaluru Transit Tracker",
        "base_lat": 12.971, "base_lng": 77.594,
        "normal_temp_min": 15.0, "normal_temp_max": 25.0,
        "normal_humidity_min": 45.0, "normal_humidity_max": 70.0,
        "package_id": None, "shipment_id": None,
        "mode": SimMode.NORMAL,
        "mode_duration": 0, "mode_start": 0,
    },
    "IOT-PUN-001": {
        "name": "Pune Warehouse Monitor",
        "base_lat": 18.520, "base_lng": 73.856,
        "normal_temp_min": 2.0, "normal_temp_max": 8.0,
        "normal_humidity_min": 35.0, "normal_humidity_max": 60.0,
        "package_id": None, "shipment_id": None,
        "mode": SimMode.NORMAL,
        "mode_duration": 0, "mode_start": 0,
    },
    "IOT-HYD-001": {
        "name": "Hyderabad Cold Chain Tracker",
        "base_lat": 17.385, "base_lng": 78.487,
        "normal_temp_min": 2.0, "normal_temp_max": 8.0,
        "normal_humidity_min": 40.0, "normal_humidity_max": 65.0,
        "package_id": None, "shipment_id": None,
        "mode": SimMode.NORMAL,
        "mode_duration": 0, "mode_start": 0,
    },
    "IOT-CHN-001": {
        "name": "Chennai Depot Sensor",
        "base_lat": 13.082, "base_lng": 80.270,
        "normal_temp_min": 15.0, "normal_temp_max": 28.0,
        "normal_humidity_min": 50.0, "normal_humidity_max": 75.0,
        "package_id": None, "shipment_id": None,
        "mode": SimMode.NORMAL,
        "mode_duration": 0, "mode_start": 0,
    },
}

# Track sent nonces for replay attack simulation
_sent_nonces: Dict[str, str] = {}


def _sign_payload(device_id: str, package_id: Optional[str], temperature: float,
                   humidity: float, latitude: float, longitude: float,
                   nonce: str, timestamp: str, tampered: bool = False) -> str:
    """Generate HMAC-SHA256 signature. tampered=True produces invalid signature."""
    payload = f"{device_id}:{package_id}:{temperature}:{humidity}:{latitude}:{longitude}:{nonce}:{timestamp}"
    signing_key = IOT_SIGNING_KEY if not tampered else "WRONG_KEY"
    return hashlib.sha256(f"{payload}:{signing_key}".encode()).hexdigest()


def _generate_reading(device_id: str, device: Dict) -> Optional[Dict]:
    """Generate a telemetry reading based on current simulation mode."""
    mode = device["mode"]

    if mode == SimMode.DEVICE_OFFLINE:
        logger.info(f"[{device_id}] OFFLINE — skipping reading")
        return None

    now = datetime.now(timezone.utc)
    timestamp = now.isoformat()

    # Base values
    temp = round(random.uniform(device["normal_temp_min"], device["normal_temp_max"]), 2)
    humidity = round(random.uniform(device["normal_humidity_min"], device["normal_humidity_max"]), 2)
    lat = device["base_lat"] + random.uniform(-0.01, 0.01)
    lng = device["base_lng"] + random.uniform(-0.01, 0.01)
    battery = round(random.uniform(60.0, 100.0), 1)
    nonce = str(uuid.uuid4())
    tampered = False

    # Apply mode-specific modifications
    if mode == SimMode.COLD_CHAIN_BREACH:
        temp = round(random.uniform(15.0, 35.0), 2)  # Way above cold chain limit
        logger.warning(f"[{device_id}] 🌡️  COLD CHAIN BREACH — temp={temp}°C")

    elif mode == SimMode.GPS_ANOMALY:
        # Jump to completely different location (impossible movement)
        lat = random.uniform(8.0, 37.0)
        lng = random.uniform(68.0, 97.0)
        logger.warning(f"[{device_id}] 📍 GPS ANOMALY — lat={lat:.4f}, lng={lng:.4f}")

    elif mode == SimMode.SENSOR_TAMPERING:
        tampered = True
        logger.warning(f"[{device_id}] 🔐 SENSOR TAMPERING — invalid signature")

    elif mode == SimMode.REPLAY_ATTACK:
        # Reuse a previously sent nonce
        if device_id in _sent_nonces:
            nonce = _sent_nonces[device_id]
            logger.warning(f"[{device_id}] 🔄 REPLAY ATTACK — reusing nonce {nonce}")
        else:
            logger.info(f"[{device_id}] No previous nonce to replay yet")

    lat = round(lat, 6)
    lng = round(lng, 6)
    signature = _sign_payload(device_id, device.get("package_id"), temp, humidity, lat, lng, nonce, timestamp, tampered)

    reading = {
        "device_id": device_id,
        "package_id": device.get("package_id"),
        "shipment_id": device.get("shipment_id"),
        "temperature": temp,
        "humidity": humidity,
        "latitude": lat,
        "longitude": lng,
        "battery": battery,
        "nonce": nonce,
        "timestamp": timestamp,
        "signature": signature,
    }

    # Store nonce for potential replay
    if mode != SimMode.REPLAY_ATTACK:
        _sent_nonces[device_id] = nonce

    return reading


async def _send_reading(device_id: str, reading: Dict):
    """POST telemetry to backend."""
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.post(
                f"{BACKEND_URL}/api/v1/iot/ingest",
                json=reading,
            )
            if resp.status_code == 201:
                data = resp.json()
                logger.info(
                    f"[{device_id}] ✅ Sent | T={reading['temperature']}°C "
                    f"H={reading['humidity']}% | "
                    f"sig_valid={data.get('signature_valid')} | "
                    f"alerts={data.get('alerts_generated', 0)}"
                )
            else:
                logger.error(f"[{device_id}] ❌ Backend error: {resp.status_code} {resp.text[:200]}")
        except Exception as e:
            logger.error(f"[{device_id}] ❌ Connection error: {e}")


async def _simulation_loop():
    """Main simulation loop — runs all devices continuously."""
    logger.info("🚀 IoT Simulator starting...")
    # Wait for backend to be ready
    await asyncio.sleep(15)

    while True:
        for device_id, device in DEVICES.items():
            # Check if mode should expire
            if device["mode_duration"] > 0:
                elapsed = time.time() - device["mode_start"]
                if elapsed > device["mode_duration"]:
                    logger.info(f"[{device_id}] Mode {device['mode']} expired → NORMAL")
                    device["mode"] = SimMode.NORMAL
                    device["mode_duration"] = 0

            reading = _generate_reading(device_id, device)
            if reading:
                await _send_reading(device_id, reading)

        await asyncio.sleep(INTERVAL_SECONDS)


@app.on_event("startup")
async def startup():
    asyncio.create_task(_simulation_loop())


# ── Control API ───────────────────────────────────────────────────────────────

class ControlRequest(BaseModel):
    device_id: str
    mode: SimMode
    duration_seconds: int = 60
    package_id: Optional[str] = None
    shipment_id: Optional[str] = None


@app.post("/control")
async def control_device(body: ControlRequest):
    """Change simulation mode for a device."""
    if body.device_id not in DEVICES:
        raise HTTPException(status_code=404, detail=f"Device {body.device_id} not found")

    device = DEVICES[body.device_id]
    device["mode"] = body.mode
    device["mode_duration"] = body.duration_seconds
    device["mode_start"] = time.time()
    if body.package_id:
        device["package_id"] = body.package_id
    if body.shipment_id:
        device["shipment_id"] = body.shipment_id

    logger.info(f"[{body.device_id}] Mode changed to {body.mode.value} for {body.duration_seconds}s")
    return {
        "device_id": body.device_id,
        "mode": body.mode.value,
        "duration_seconds": body.duration_seconds,
        "activated_at": datetime.now(timezone.utc).isoformat(),
    }


@app.post("/control/all")
async def control_all_devices(body: ControlRequest):
    """Apply a simulation mode to ALL devices simultaneously."""
    for device_id, device in DEVICES.items():
        device["mode"] = body.mode
        device["mode_duration"] = body.duration_seconds
        device["mode_start"] = time.time()
    return {"applied_to": list(DEVICES.keys()), "mode": body.mode.value}


@app.get("/devices")
async def list_devices():
    return {
        device_id: {
            "name": d["name"],
            "mode": d["mode"].value,
            "package_id": d.get("package_id"),
            "mode_remaining": max(0, d["mode_duration"] - (time.time() - d["mode_start"])) if d["mode_duration"] > 0 else 0,
        }
        for device_id, d in DEVICES.items()
    }


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "IoT Simulator", "devices": len(DEVICES)}
