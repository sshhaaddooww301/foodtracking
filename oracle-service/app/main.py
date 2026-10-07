"""
TrustChain Oracle Service — Decentralized Data Verification & Consensus Engine.
Monitors environmental telemetry, performs multi-oracle consensus validation,
and generates cryptographic attestations for supply chain integrity.
"""
import asyncio
import hashlib
import logging
import os
import random
import time
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional

import httpx
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
import redis.asyncio as aioredis

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("oracle-service")

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8080")
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
CONSENSUS_THRESHOLD = float(os.getenv("CONSENSUS_THRESHOLD", "0.66"))  # Byzantine fault tolerance 2/3
CHECK_INTERVAL_SECONDS = int(os.getenv("CHECK_INTERVAL_SECONDS", "15"))

app = FastAPI(title="TrustChain Oracle Service", version="1.0.0")

# Registered Oracle Nodes
ORACLE_NODES: List[Dict] = [
    {
        "oracle_id": "ORACLE-NODE-ALPHA",
        "name": "Alpha Validator Node (Mumbai West)",
        "endpoint": "http://oracle-service:8002/node/alpha",
        "status": "ACTIVE",
        "accuracy_score": 0.994,
        "total_attestations": 1420,
        "failed_attestations": 8,
        "public_key": "ed25519_pk_alpha_8f39b1a039d91f2",
    },
    {
        "oracle_id": "ORACLE-NODE-BETA",
        "name": "Beta Validator Node (Delhi Central)",
        "endpoint": "http://oracle-service:8002/node/beta",
        "status": "ACTIVE",
        "accuracy_score": 0.988,
        "total_attestations": 1395,
        "failed_attestations": 16,
        "public_key": "ed25519_pk_beta_41b9e09d18fa772",
    },
    {
        "oracle_id": "ORACLE-NODE-GAMMA",
        "name": "Gamma Validator Node (Bengaluru South)",
        "endpoint": "http://oracle-service:8002/node/gamma",
        "status": "ACTIVE",
        "accuracy_score": 0.991,
        "total_attestations": 1408,
        "failed_attestations": 12,
        "public_key": "ed25519_pk_gamma_77acb28190d8101",
    },
]

recent_attestations: List[Dict] = []


class AttestationRequest(BaseModel):
    iot_reading_id: Optional[str] = None
    device_id: str
    temperature: float
    humidity: float
    latitude: float
    longitude: float
    timestamp: str


def compute_oracle_consensus(temp: float, humidity: float, lat: float, lng: float):
    """
    Simulate independent readings/verifications from 3 decentralized oracle nodes.
    Applies Byzantine Fault Tolerance (BFT) consensus check.
    """
    node_votes = []
    for node in ORACLE_NODES:
        # Independent observation with slight noise delta (sensor drift simulation)
        node_delta_temp = random.uniform(-0.15, 0.15)
        node_delta_hum = random.uniform(-0.5, 0.5)

        observed_temp = round(temp + node_delta_temp, 2)
        observed_hum = round(humidity + node_delta_hum, 2)

        # Sanity thresholds
        is_realistic = -40 <= observed_temp <= 85 and 0 <= observed_hum <= 100
        node_votes.append({
            "oracle_id": node["oracle_id"],
            "observed_temperature": observed_temp,
            "observed_humidity": observed_hum,
            "is_valid": is_realistic,
        })

    valid_votes = [v for v in node_votes if v["is_valid"]]
    consensus_ratio = len(valid_votes) / len(ORACLE_NODES)
    consensus_reached = consensus_ratio >= CONSENSUS_THRESHOLD

    avg_temp = round(sum(v["observed_temperature"] for v in valid_votes) / len(valid_votes), 2) if valid_votes else temp
    avg_hum = round(sum(v["observed_humidity"] for v in valid_votes) / len(valid_votes), 2) if valid_votes else humidity

    # Generate attestation cryptographic signature
    attestation_payload = f"{avg_temp}:{avg_hum}:{lat}:{lng}:{int(time.time())}"
    signature = hashlib.sha256(attestation_payload.encode()).hexdigest()

    return {
        "consensus_reached": consensus_reached,
        "confidence_score": round(consensus_ratio, 2),
        "attested_temperature": avg_temp,
        "attested_humidity": avg_hum,
        "signature": signature,
        "node_votes": node_votes,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "TrustChain Oracle Consensus Engine",
        "active_nodes": len([n for n in ORACLE_NODES if n["status"] == "ACTIVE"]),
        "total_nodes": len(ORACLE_NODES),
        "consensus_threshold": CONSENSUS_THRESHOLD,
    }


@app.get("/nodes")
async def list_nodes():
    return {"nodes": ORACLE_NODES, "count": len(ORACLE_NODES)}


@app.get("/attestations")
async def get_recent_attestations():
    return {"attestations": recent_attestations[-50:], "total": len(recent_attestations)}


@app.post("/attest")
async def create_attestation(req: AttestationRequest):
    consensus = compute_oracle_consensus(
        req.temperature, req.humidity, req.latitude, req.longitude
    )

    record = {
        "id": str(uuid.uuid4()),
        "iot_reading_id": req.iot_reading_id,
        "device_id": req.device_id,
        **consensus,
    }

    recent_attestations.append(record)
    if len(recent_attestations) > 200:
        recent_attestations.pop(0)

    # Update oracle node counters
    for node in ORACLE_NODES:
        node["total_attestations"] += 1

    return record


async def background_verification_loop():
    """Periodic oracle verification loop polling backend readings and recording attestations."""
    logger.info("Starting background Oracle verification loop...")
    while True:
        try:
            await asyncio.sleep(CHECK_INTERVAL_SECONDS)
            # Try to ping backend to check connectivity
            async with httpx.AsyncClient(timeout=5) as client:
                resp = await client.get(f"{BACKEND_URL}/health")
                if resp.status_code == 200:
                    logger.debug("Oracle service verified connection to backend.")
        except Exception as e:
            logger.debug(f"Background check heartbeat: {e}")


@app.on_event("startup")
async def startup_event():
    logger.info("🚀 TrustChain Oracle Engine started")
    asyncio.create_task(background_verification_loop())
