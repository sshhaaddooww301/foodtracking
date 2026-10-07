"""
IPFS Service — Pinata integration for decentralized document storage.
"""
from __future__ import annotations
import hashlib
import io
import logging
from typing import Optional, Dict, Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

PINATA_BASE = "https://api.pinata.cloud"


class IPFSService:
    """Pinata-backed IPFS service with SHA-256 document verification."""

    def __init__(self):
        self._headers = {}
        if settings.PINATA_JWT:
            self._headers["Authorization"] = f"Bearer {settings.PINATA_JWT}"
        elif settings.PINATA_API_KEY and settings.PINATA_API_SECRET:
            self._headers["pinata_api_key"] = settings.PINATA_API_KEY
            self._headers["pinata_secret_api_key"] = settings.PINATA_API_SECRET

    @property
    def configured(self) -> bool:
        return bool(settings.PINATA_JWT or (settings.PINATA_API_KEY and settings.PINATA_API_SECRET))

    async def upload_file(
        self,
        file_bytes: bytes,
        filename: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Upload file to IPFS via Pinata.
        Returns: {cid, file_hash, gateway_url} or None on failure.
        """
        file_hash = self._sha256(file_bytes)

        if not self.configured:
            logger.warning("IPFS/Pinata not configured — returning local hash only.")
            fake_cid = f"Qm{file_hash[:44]}"
            return {
                "cid": fake_cid,
                "file_hash": file_hash,
                "gateway_url": f"{settings.IPFS_GATEWAY_URL}{fake_cid}",
                "mock": True,
            }

        try:
            async with httpx.AsyncClient(timeout=60) as client:
                files = {"file": (filename, io.BytesIO(file_bytes), "application/octet-stream")}
                data = {}
                if metadata:
                    import json
                    data["pinataMetadata"] = json.dumps({"name": filename, "keyvalues": metadata})

                resp = await client.post(
                    f"{PINATA_BASE}/pinning/pinFileToIPFS",
                    headers=self._headers,
                    files=files,
                    data=data,
                )
                resp.raise_for_status()
                result = resp.json()
                cid = result["IpfsHash"]
                return {
                    "cid": cid,
                    "file_hash": file_hash,
                    "gateway_url": f"{settings.IPFS_GATEWAY_URL}{cid}",
                    "mock": False,
                }
        except Exception as e:
            logger.error(f"Pinata upload failed: {e}")
            return None

    async def upload_json(self, data: Dict[str, Any], name: str) -> Optional[Dict[str, Any]]:
        """Upload JSON data to IPFS."""
        import json
        json_bytes = json.dumps(data, default=str).encode()
        return await self.upload_file(json_bytes, f"{name}.json", metadata={"type": "json"})

    async def verify_file(self, file_bytes: bytes, stored_hash: str) -> bool:
        """Verify a file against its stored SHA-256 hash."""
        return self._sha256(file_bytes) == stored_hash

    async def get_health(self) -> Dict[str, Any]:
        if not self.configured:
            return {"configured": False, "status": "unconfigured"}
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    f"{PINATA_BASE}/data/testAuthentication",
                    headers=self._headers,
                )
                return {
                    "configured": True,
                    "status": "healthy" if resp.status_code == 200 else "error",
                    "http_status": resp.status_code,
                }
        except Exception as e:
            return {"configured": True, "status": "error", "error": str(e)}

    @staticmethod
    def _sha256(data: bytes) -> str:
        return hashlib.sha256(data).hexdigest()


ipfs_service = IPFSService()
