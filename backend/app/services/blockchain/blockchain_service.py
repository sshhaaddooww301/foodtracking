"""
Blockchain Service — integrates with Hardhat/EVM via web3.py.
Uses smart contract ABIs loaded from the deployments directory.
"""
from __future__ import annotations
import json
import logging
import os
from pathlib import Path
from typing import Optional, Dict, Any

from web3 import Web3
try:
    from web3.middleware import ExtraDataToPOAMiddleware as poa_middleware
except ImportError:
    try:
        from web3.middleware import geth_poa_middleware as poa_middleware
    except ImportError:
        poa_middleware = None

from app.core.config import settings

logger = logging.getLogger(__name__)

# Path where Hardhat puts deployment artifacts
DEPLOYMENTS_DIR = Path("./blockchain_deployments")


class BlockchainService:
    _instance: Optional["BlockchainService"] = None

    def __init__(self):
        self.w3 = Web3(Web3.HTTPProvider(settings.BLOCKCHAIN_RPC_URL))
        if poa_middleware:
            try:
                self.w3.middleware_onion.inject(poa_middleware, layer=0)
            except Exception:
                pass
        try:
            self.account = self.w3.eth.account.from_key(settings.BLOCKCHAIN_PRIVATE_KEY)
        except Exception:
            self.account = None
        self._contracts: Dict[str, Any] = {}
        self._connected = False

    @classmethod
    def get_instance(cls) -> "BlockchainService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    async def connect(self):
        try:
            self._connected = self.w3.is_connected()
            if self._connected:
                logger.info(f"Connected to blockchain: {settings.BLOCKCHAIN_RPC_URL}")
                await self._load_contracts()
            else:
                logger.warning("Blockchain node not reachable. Running in degraded mode.")
        except Exception as e:
            logger.error(f"Blockchain connection error: {e}")
            self._connected = False

    def is_connected(self) -> bool:
        try:
            return self.w3.is_connected()
        except Exception:
            return False

    async def _load_contracts(self):
        """Load deployed contract ABIs and addresses from deployment artifacts."""
        contract_map = {
            "SupplyChainRegistry": settings.CONTRACT_SUPPLY_CHAIN_REGISTRY,
            "BatchRegistry": settings.CONTRACT_BATCH_REGISTRY,
            "PackageIdentity": settings.CONTRACT_PACKAGE_IDENTITY,
            "ShipmentContract": settings.CONTRACT_SHIPMENT_CONTRACT,
            "AttestationRegistry": settings.CONTRACT_ATTESTATION_REGISTRY,
            "FraudRegistry": settings.CONTRACT_FRAUD_REGISTRY,
        }

        for contract_name, address in contract_map.items():
            abi_path = DEPLOYMENTS_DIR / f"{contract_name}.json"
            if abi_path.exists() and address:
                try:
                    with open(abi_path) as f:
                        artifact = json.load(f)
                    self._contracts[contract_name] = self.w3.eth.contract(
                        address=Web3.to_checksum_address(address),
                        abi=artifact["abi"],
                    )
                    logger.info(f"Loaded contract {contract_name} at {address}")
                except Exception as e:
                    logger.error(f"Failed to load contract {contract_name}: {e}")

    def _get_contract(self, name: str):
        return self._contracts.get(name)

    def _build_and_send(self, contract_function) -> Optional[Dict[str, Any]]:
        """Build transaction, sign with account, send, and wait for receipt."""
        if not self._connected:
            return None
        try:
            tx = contract_function.build_transaction({
                "from": self.account.address,
                "nonce": self.w3.eth.get_transaction_count(self.account.address),
                "gas": 500000,
                "gasPrice": self.w3.eth.gas_price,
                "chainId": settings.BLOCKCHAIN_CHAIN_ID,
            })
            signed = self.w3.eth.account.sign_transaction(tx, self.account.key)
            tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
            return {
                "tx_hash": tx_hash.hex(),
                "block_number": receipt.blockNumber,
                "gas_used": receipt.gasUsed,
                "status": "CONFIRMED" if receipt.status == 1 else "FAILED",
            }
        except Exception as e:
            logger.error(f"Blockchain transaction failed: {e}")
            return None

    async def register_batch(self, batch_number: str, product_sku: str, quantity: int, expiry_ts: int) -> Optional[Dict]:
        contract = self._get_contract("BatchRegistry")
        if not contract:
            return self._mock_tx("BATCH_REGISTER")
        fn = contract.functions.registerBatch(batch_number, product_sku, quantity, expiry_ts)
        return self._build_and_send(fn)

    async def register_package(self, package_code: str, batch_number: str, crypto_hash: str) -> Optional[Dict]:
        contract = self._get_contract("PackageIdentity")
        if not contract:
            return self._mock_tx("PACKAGE_IDENTITY")
        fn = contract.functions.registerPackage(package_code, batch_number, crypto_hash)
        return self._build_and_send(fn)

    async def create_shipment(self, shipment_number: str, origin: str, destination: str) -> Optional[Dict]:
        contract = self._get_contract("ShipmentContract")
        if not contract:
            return self._mock_tx("SHIPMENT_CREATE")
        fn = contract.functions.createShipment(shipment_number, origin, destination)
        return self._build_and_send(fn)

    async def transfer_custody(self, package_code: str, from_org: str, to_org: str, timestamp: int) -> Optional[Dict]:
        contract = self._get_contract("ShipmentContract")
        if not contract:
            return self._mock_tx("CUSTODY_TRANSFER")
        fn = contract.functions.transferCustody(package_code, from_org, to_org, timestamp)
        return self._build_and_send(fn)

    async def flag_package(self, package_code: str, reason: str) -> Optional[Dict]:
        contract = self._get_contract("FraudRegistry")
        if not contract:
            return self._mock_tx("PACKAGE_FLAG")
        fn = contract.functions.flagPackage(package_code, reason)
        return self._build_and_send(fn)

    async def quarantine_package(self, package_code: str, reason: str) -> Optional[Dict]:
        contract = self._get_contract("FraudRegistry")
        if not contract:
            return self._mock_tx("PACKAGE_QUARANTINE")
        fn = contract.functions.quarantinePackage(package_code, reason)
        return self._build_and_send(fn)

    async def anchor_document(self, doc_id: str, ipfs_cid: str, file_hash: str) -> Optional[Dict]:
        contract = self._get_contract("SupplyChainRegistry")
        if not contract:
            return self._mock_tx("DOCUMENT_ANCHOR")
        fn = contract.functions.anchorDocument(doc_id, ipfs_cid, file_hash)
        return self._build_and_send(fn)

    async def initiate_recall(self, batch_number: str, reason: str) -> Optional[Dict]:
        contract = self._get_contract("FraudRegistry")
        if not contract:
            return self._mock_tx("RECALL_INITIATE")
        fn = contract.functions.reportCounterfeit(batch_number, reason)
        return self._build_and_send(fn)

    async def get_latest_block(self) -> Optional[int]:
        try:
            return self.w3.eth.block_number
        except Exception:
            return None

    async def get_transaction(self, tx_hash: str) -> Optional[Dict]:
        try:
            tx = self.w3.eth.get_transaction(tx_hash)
            receipt = self.w3.eth.get_transaction_receipt(tx_hash)
            return {
                "hash": tx_hash,
                "block_number": receipt.blockNumber if receipt else None,
                "gas_used": receipt.gasUsed if receipt else None,
                "status": "CONFIRMED" if receipt and receipt.status == 1 else "PENDING",
            }
        except Exception:
            return None

    def _mock_tx(self, tx_type: str) -> Dict[str, Any]:
        """Return a deterministic mock transaction when blockchain is unavailable."""
        import hashlib, time
        mock_hash = "0x" + hashlib.sha256(f"{tx_type}{time.time()}".encode()).hexdigest()
        return {
            "tx_hash": mock_hash,
            "block_number": None,
            "gas_used": None,
            "status": "PENDING",
            "mock": True,
        }

    async def get_health(self) -> Dict[str, Any]:
        connected = self.is_connected()
        block = await self.get_latest_block() if connected else None
        return {
            "connected": connected,
            "latest_block": block,
            "rpc_url": settings.BLOCKCHAIN_RPC_URL,
            "contracts_loaded": list(self._contracts.keys()),
        }


blockchain_service = BlockchainService.get_instance()
