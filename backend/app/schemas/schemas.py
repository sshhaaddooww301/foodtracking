"""Pydantic schemas for all API request/response models."""
from __future__ import annotations
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field, validator, ConfigDict, computed_field

from app.models.enums import (
    AlertStatus, BatchStatus, BlockchainTxStatus, DocumentType,
    FraudAlertType, HandoverEventType, IoTSimulationMode,
    OracleStatus, OrganizationType, PackageStatus, ProductCategory,
    ProductStatus, RecallStatus, RiskLevel, ShipmentStatus, UserRole,
)


# ── Shared ─────────────────────────────────────────────────────────────────────

class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    size: int
    pages: int


# ── Auth ───────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str = Field(min_length=6)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "UserRead"


class RefreshTokenRequest(BaseModel):
    refresh_token: str


# ── Organization ───────────────────────────────────────────────────────────────

class OrganizationCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    org_type: OrganizationType
    registration_number: Optional[str] = None
    license_number: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: str = "India"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    license_number: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None


class OrganizationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    org_type: str
    registration_number: Optional[str] = None
    license_number: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    is_active: bool
    created_at: datetime


# ── User ───────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=2, max_length=255)
    role: UserRole = UserRole.RETAILER
    organization_id: Optional[uuid.UUID] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    organization_id: Optional[uuid.UUID] = None
    is_active: Optional[bool] = None
    wallet_address: Optional[str] = None


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    full_name: str
    role: str
    organization_id: Optional[uuid.UUID] = None
    organization: Optional[OrganizationRead] = None
    is_active: bool
    last_login: Optional[datetime] = None
    wallet_address: Optional[str] = None
    created_at: datetime


# ── Product ────────────────────────────────────────────────────────────────────

class ProductCreate(BaseModel):
    sku: str = Field(min_length=2, max_length=100)
    name: str = Field(min_length=2, max_length=255)
    category: ProductCategory
    description: Optional[str] = None
    manufacturer_id: uuid.UUID
    min_temperature: Optional[float] = None
    max_temperature: Optional[float] = None
    max_humidity: Optional[float] = None
    expiry_period_days: Optional[int] = None
    regulatory_license: Optional[str] = None
    drug_schedule: Optional[str] = None
    composition: Optional[str] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    min_temperature: Optional[float] = None
    max_temperature: Optional[float] = None
    max_humidity: Optional[float] = None
    expiry_period_days: Optional[int] = None
    regulatory_license: Optional[str] = None
    status: Optional[ProductStatus] = None


class ProductRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    sku: str
    name: str
    category: str
    description: Optional[str] = None
    manufacturer_id: uuid.UUID
    manufacturer: Optional[OrganizationRead] = None
    min_temperature: Optional[float] = None
    max_temperature: Optional[float] = None
    max_humidity: Optional[float] = None
    expiry_period_days: Optional[int] = None
    regulatory_license: Optional[str] = None
    drug_schedule: Optional[str] = None
    composition: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime


# ── Batch ──────────────────────────────────────────────────────────────────────

class BatchCreate(BaseModel):
    batch_number: Optional[str] = None
    product_id: uuid.UUID
    quantity: Optional[int] = Field(default=None, gt=0)
    quantity_manufactured: Optional[int] = Field(default=None, gt=0)
    manufacturing_date: Optional[datetime] = None
    expiry_date: datetime
    notes: Optional[str] = None

    def model_post_init(self, __context: Any) -> None:
        if self.quantity is None and self.quantity_manufactured is not None:
            self.quantity = self.quantity_manufactured
        elif self.quantity is None:
            self.quantity = 100
        if self.manufacturing_date is None:
            from datetime import timezone
            self.manufacturing_date = datetime.now(timezone.utc)


class BatchRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    batch_number: str
    product_id: uuid.UUID
    product: Optional[ProductRead] = None
    quantity: int
    manufacturing_date: datetime
    expiry_date: datetime
    status: str
    blockchain_tx_hash: Optional[str] = None
    ipfs_cid: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    @computed_field
    @property
    def quantity_manufactured(self) -> int:
        return self.quantity

    @computed_field
    @property
    def quantity_remaining(self) -> int:
        return self.quantity


# ── Package ────────────────────────────────────────────────────────────────────

class PackageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    package_code: str
    batch_id: uuid.UUID
    batch: Optional[BatchRead] = None
    qr_payload: Optional[str] = None
    crypto_hash: str
    blockchain_identity: Optional[str] = None
    current_owner: Optional[OrganizationRead] = None
    current_location_name: Optional[str] = None
    status: str
    risk_score: float
    risk_level: str
    created_at: datetime


class PackageVerifyResult(BaseModel):
    package_code: str
    status: str
    is_authentic: bool
    is_suspicious: bool
    is_recalled: bool
    is_quarantined: bool
    product: Optional[Dict[str, Any]] = None
    batch: Optional[Dict[str, Any]] = None
    manufacturer: Optional[Dict[str, Any]] = None
    current_owner: Optional[Dict[str, Any]] = None
    journey: List[Dict[str, Any]] = []
    cold_chain_ok: bool
    risk_score: float
    risk_level: str
    blockchain_tx: Optional[str] = None
    recall_info: Optional[Dict[str, Any]] = None
    last_temperature: Optional[float] = None
    last_humidity: Optional[float] = None
    scan_count: int
    current_location: Optional[Dict[str, Any]] = None


# ── Shipment ───────────────────────────────────────────────────────────────────

class ShipmentCreate(BaseModel):
    origin_org_id: uuid.UUID
    destination_org_id: uuid.UUID
    carrier: Optional[str] = None
    vehicle_number: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    expected_delivery: Optional[datetime] = None
    package_ids: List[uuid.UUID] = []
    notes: Optional[str] = None


class ShipmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    shipment_number: str
    origin: Optional[OrganizationRead] = None
    destination: Optional[OrganizationRead] = None
    carrier: Optional[str] = None
    vehicle_number: Optional[str] = None
    driver_name: Optional[str] = None
    status: str
    expected_delivery: Optional[datetime] = None
    actual_delivery: Optional[datetime] = None
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None
    current_location_name: Optional[str] = None
    temperature_compliant: bool
    blockchain_tx_hash: Optional[str] = None
    created_at: datetime


class HandoverCreate(BaseModel):
    shipment_id: Optional[uuid.UUID] = None
    package_id: Optional[uuid.UUID] = None
    event_type: HandoverEventType
    from_org_id: uuid.UUID
    to_org_id: uuid.UUID
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    location_name: Optional[str] = None
    notes: Optional[str] = None


# ── IoT ───────────────────────────────────────────────────────────────────────

class IoTReadingIngest(BaseModel):
    """Schema for incoming IoT telemetry from simulator."""
    device_id: str
    package_id: Optional[str] = None
    shipment_id: Optional[str] = None
    temperature: float
    humidity: float
    latitude: float
    longitude: float
    battery: float
    nonce: str
    timestamp: str
    signature: str
    payload_hash: Optional[str] = None


class IoTReadingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    device_id: str
    package_id: Optional[uuid.UUID] = None
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    battery: Optional[float] = None
    nonce: str
    signature_valid: Optional[bool] = None
    is_anomaly: bool
    reading_timestamp: datetime
    created_at: datetime


class SimulatorControlRequest(BaseModel):
    device_id: str
    mode: IoTSimulationMode
    duration_seconds: int = Field(default=60, ge=10, le=3600)
    package_id: Optional[str] = None
    shipment_id: Optional[str] = None


# ── Fraud ─────────────────────────────────────────────────────────────────────

class FraudAlertRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    alert_type: str
    package_id: Optional[uuid.UUID] = None
    shipment_id: Optional[uuid.UUID] = None
    risk_score: float
    risk_level: str
    description: Optional[str] = None
    evidence: Optional[Dict[str, Any]] = None
    status: str
    auto_quarantined: bool
    created_at: datetime


class AlertResolve(BaseModel):
    resolution_notes: str
    is_false_positive: bool = False


# ── Document ──────────────────────────────────────────────────────────────────

class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    doc_type: str
    ipfs_cid: str
    file_hash: str
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    is_tampered: bool
    blockchain_tx_hash: Optional[str] = None
    created_at: datetime


# ── Recall ────────────────────────────────────────────────────────────────────

class RecallCreate(BaseModel):
    batch_id: uuid.UUID
    reason: str = Field(min_length=10)
    description: Optional[str] = None
    severity: RiskLevel = RiskLevel.HIGH


class RecallRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    recall_number: str
    batch_id: uuid.UUID
    batch: Optional[BatchRead] = None
    reason: str
    description: Optional[str] = None
    severity: str
    status: str
    affected_packages_count: int
    consumer_notice_url: Optional[str] = None
    blockchain_tx_hash: Optional[str] = None
    created_at: datetime


# ── Blockchain ────────────────────────────────────────────────────────────────

class BlockchainTxRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tx_hash: str
    tx_type: str
    contract_address: Optional[str] = None
    block_number: Optional[int] = None
    gas_used: Optional[int] = None
    status: str
    entity_type: Optional[str] = None
    entity_id: Optional[uuid.UUID] = None
    created_at: datetime


# ── Dashboard Stats ────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_organizations: int
    total_products: int
    total_batches: int
    total_packages: int
    active_shipments: int
    verified_packages: int
    fraud_alerts_open: int
    cold_chain_breaches: int
    quarantined_packages: int
    recalled_batches: int
    total_iot_readings_24h: int
    blockchain_tx_count: int
    system_health: Dict[str, str]


# ── Oracle ────────────────────────────────────────────────────────────────────

class OracleNodeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    oracle_id: str
    name: str
    status: str
    accuracy_score: float
    total_attestations: int
    failed_attestations: int
    last_seen: Optional[datetime] = None


# ── Audit Log ─────────────────────────────────────────────────────────────────

class AuditLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    user_id: Optional[uuid.UUID] = None
    organization_id: Optional[uuid.UUID] = None
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[uuid.UUID] = None
    description: Optional[str] = None
    ip_address: Optional[str] = None


# ── Quarantine ────────────────────────────────────────────────────────────────

class QuarantineReleaseRequest(BaseModel):
    release_reason: str = Field(min_length=10)
