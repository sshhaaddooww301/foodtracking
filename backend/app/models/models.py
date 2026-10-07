"""All SQLAlchemy models for TrustChain Supply."""
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean, Column, DateTime, Float, ForeignKey,
    Index, Integer, String, Text, UniqueConstraint, func,
)
from sqlalchemy.orm import relationship
from app.models.base import Base, TimestampMixin, UUIDMixin, UUID, JSONB
from app.models.enums import (
    AlertStatus, BatchStatus, BlockchainTxStatus, DocumentType,
    FraudAlertType, HandoverEventType, IoTSimulationMode,
    OracleStatus, OrganizationType, PackageStatus, ProductCategory,
    ProductStatus, RecallStatus, RiskLevel, ShipmentStatus, UserRole,
)


# ── User & Organisation ────────────────────────────────────────────────────────

class Organization(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "organizations"

    name = Column(String(255), nullable=False)
    org_type = Column(String(50), nullable=False)  # OrganizationType
    registration_number = Column(String(100), unique=True)
    license_number = Column(String(100))
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    country = Column(String(100), default="India")
    latitude = Column(Float)
    longitude = Column(Float)
    contact_email = Column(String(255))
    contact_phone = Column(String(50))
    is_active = Column(Boolean, default=True, nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False)
    metadata_ = Column("metadata", JSONB, default={})

    # Relationships
    users = relationship("User", back_populates="organization")
    products = relationship("Product", back_populates="manufacturer", foreign_keys="Product.manufacturer_id")


class User(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "users"

    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default=UserRole.RETAILER.value)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False)
    last_login = Column(DateTime(timezone=True))
    wallet_address = Column(String(42))  # Ethereum wallet address

    # Relationships
    organization = relationship("Organization", back_populates="users")
    audit_logs = relationship("AuditLog", back_populates="user")


# ── Product Catalogue ──────────────────────────────────────────────────────────

class Product(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "products"

    sku = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    category = Column(String(50), nullable=False)  # ProductCategory
    description = Column(Text)
    manufacturer_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    min_temperature = Column(Float)  # Celsius
    max_temperature = Column(Float)  # Celsius
    max_humidity = Column(Float)  # Percentage
    expiry_period_days = Column(Integer)  # Days from manufacture
    regulatory_license = Column(String(255))
    drug_schedule = Column(String(50))  # For pharmaceuticals
    composition = Column(Text)
    image_url = Column(String(500))
    status = Column(String(50), default=ProductStatus.ACTIVE.value, nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False)
    metadata_ = Column("metadata", JSONB, default={})

    # Relationships
    manufacturer = relationship("Organization", back_populates="products", foreign_keys=[manufacturer_id])
    batches = relationship("Batch", back_populates="product")
    documents = relationship("Document", back_populates="product")

    __table_args__ = (
        Index("ix_products_manufacturer", "manufacturer_id"),
        Index("ix_products_category", "category"),
        Index("ix_products_status", "status"),
    )


class Batch(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "batches"

    batch_number = Column(String(100), unique=True, nullable=False, index=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    manufacturing_date = Column(DateTime(timezone=True), nullable=False)
    expiry_date = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(50), default=BatchStatus.CREATED.value, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    blockchain_tx_hash = Column(String(66))  # Transaction hash when registered on chain
    blockchain_batch_id = Column(String(100))  # On-chain ID
    ipfs_cid = Column(String(100))  # IPFS CID for batch document
    notes = Column(Text)
    is_deleted = Column(Boolean, default=False, nullable=False)
    metadata_ = Column("metadata", JSONB, default={})

    # Relationships
    product = relationship("Product", back_populates="batches")
    creator = relationship("User", foreign_keys=[created_by])
    packages = relationship("Package", back_populates="batch")
    documents = relationship("Document", back_populates="batch")
    recall = relationship("Recall", back_populates="batch", uselist=False)

    __table_args__ = (
        Index("ix_batches_product", "product_id"),
        Index("ix_batches_status", "status"),
    )


class Package(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "packages"

    package_code = Column(String(50), unique=True, nullable=False, index=True)  # PKG-000001
    batch_id = Column(UUID(as_uuid=True), ForeignKey("batches.id"), nullable=False)
    qr_payload = Column(Text)  # URL payload for QR code
    nfc_uid = Column(String(100))  # NFC tag UID (optional)
    crypto_hash = Column(String(66), nullable=False)  # SHA-256 of package identity
    blockchain_identity = Column(String(66))  # On-chain registration tx
    blockchain_package_id = Column(String(100))  # On-chain package ID
    current_owner_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    current_location_lat = Column(Float)
    current_location_lng = Column(Float)
    current_location_name = Column(String(255))
    status = Column(String(50), default=PackageStatus.CREATED.value, nullable=False)
    risk_score = Column(Float, default=0.0)
    risk_level = Column(String(20), default=RiskLevel.LOW.value)
    is_deleted = Column(Boolean, default=False, nullable=False)
    metadata_ = Column("metadata", JSONB, default={})

    # Relationships
    batch = relationship("Batch", back_populates="packages")
    current_owner = relationship("Organization", foreign_keys=[current_owner_id])
    shipment_items = relationship("ShipmentItem", back_populates="package")
    iot_readings = relationship("IoTReading", back_populates="package")
    handover_events = relationship("HandoverEvent", back_populates="package")
    fraud_alerts = relationship("FraudAlert", back_populates="package")
    quarantine_records = relationship("QuarantineRecord", back_populates="package")
    consumer_scans = relationship("ConsumerScan", back_populates="package")

    __table_args__ = (
        Index("ix_packages_batch", "batch_id"),
        Index("ix_packages_status", "status"),
        Index("ix_packages_owner", "current_owner_id"),
        Index("ix_packages_risk_level", "risk_level"),
    )


# ── Shipment ───────────────────────────────────────────────────────────────────

class Shipment(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "shipments"

    shipment_number = Column(String(100), unique=True, nullable=False, index=True)
    origin_org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    destination_org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    carrier = Column(String(255))
    vehicle_number = Column(String(100))
    driver_name = Column(String(255))
    driver_phone = Column(String(50))
    status = Column(String(50), default=ShipmentStatus.CREATED.value, nullable=False)
    expected_delivery = Column(DateTime(timezone=True))
    actual_delivery = Column(DateTime(timezone=True))
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    blockchain_tx_hash = Column(String(66))
    current_lat = Column(Float)
    current_lng = Column(Float)
    current_location_name = Column(String(255))
    temperature_compliant = Column(Boolean, default=True)
    notes = Column(Text)
    is_deleted = Column(Boolean, default=False, nullable=False)
    metadata_ = Column("metadata", JSONB, default={})

    # Relationships
    origin = relationship("Organization", foreign_keys=[origin_org_id])
    destination = relationship("Organization", foreign_keys=[destination_org_id])
    creator = relationship("User", foreign_keys=[created_by])
    items = relationship("ShipmentItem", back_populates="shipment")
    handover_events = relationship("HandoverEvent", back_populates="shipment")
    iot_readings = relationship("IoTReading", back_populates="shipment")
    fraud_alerts = relationship("FraudAlert", back_populates="shipment")

    __table_args__ = (
        Index("ix_shipments_origin", "origin_org_id"),
        Index("ix_shipments_destination", "destination_org_id"),
        Index("ix_shipments_status", "status"),
    )


class ShipmentItem(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "shipment_items"

    shipment_id = Column(UUID(as_uuid=True), ForeignKey("shipments.id"), nullable=False)
    package_id = Column(UUID(as_uuid=True), ForeignKey("packages.id"), nullable=False)
    quantity = Column(Integer, default=1)

    # Relationships
    shipment = relationship("Shipment", back_populates="items")
    package = relationship("Package", back_populates="shipment_items")

    __table_args__ = (
        UniqueConstraint("shipment_id", "package_id", name="uq_shipment_package"),
    )


class HandoverEvent(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "handover_events"

    shipment_id = Column(UUID(as_uuid=True), ForeignKey("shipments.id"))
    package_id = Column(UUID(as_uuid=True), ForeignKey("packages.id"))
    event_type = Column(String(50), nullable=False)  # HandoverEventType
    from_org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    to_org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    performed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    location_lat = Column(Float)
    location_lng = Column(Float)
    location_name = Column(String(255))
    signature = Column(Text)  # Digital signature
    blockchain_tx_hash = Column(String(66))
    notes = Column(Text)
    event_timestamp = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    shipment = relationship("Shipment", back_populates="handover_events")
    package = relationship("Package", back_populates="handover_events")
    from_org = relationship("Organization", foreign_keys=[from_org_id])
    to_org = relationship("Organization", foreign_keys=[to_org_id])
    performer = relationship("User", foreign_keys=[performed_by])

    __table_args__ = (
        Index("ix_handover_shipment", "shipment_id"),
        Index("ix_handover_package", "package_id"),
    )


# ── IoT ───────────────────────────────────────────────────────────────────────

class IoTDevice(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "iot_devices"

    device_id = Column(String(100), unique=True, nullable=False, index=True)  # IOT-DEL-001
    device_name = Column(String(255))
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    package_id = Column(UUID(as_uuid=True), ForeignKey("packages.id"))
    shipment_id = Column(UUID(as_uuid=True), ForeignKey("shipments.id"))
    public_key = Column(Text, nullable=False)  # For signature verification
    is_active = Column(Boolean, default=True)
    last_seen = Column(DateTime(timezone=True))
    battery_level = Column(Float)
    simulation_mode = Column(String(50), default=IoTSimulationMode.NORMAL.value)
    firmware_version = Column(String(50))
    location = Column(String(255))

    # Relationships
    organization = relationship("Organization")
    package = relationship("Package")
    readings = relationship("IoTReading", back_populates="device")


class IoTReading(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "iot_readings"

    device_id = Column(String(100), ForeignKey("iot_devices.device_id"), nullable=False, index=True)
    package_id = Column(UUID(as_uuid=True), ForeignKey("packages.id"), index=True)
    shipment_id = Column(UUID(as_uuid=True), ForeignKey("shipments.id"), index=True)
    temperature = Column(Float)
    humidity = Column(Float)
    latitude = Column(Float)
    longitude = Column(Float)
    battery = Column(Float)
    nonce = Column(String(100), unique=True, nullable=False)  # Replay attack prevention
    signature = Column(Text)
    signature_valid = Column(Boolean)
    is_anomaly = Column(Boolean, default=False)
    reading_timestamp = Column(DateTime(timezone=True), nullable=False)
    raw_payload = Column(JSONB)
    metadata_ = Column("metadata", JSONB, default={})

    # Relationships
    device = relationship("IoTDevice", back_populates="readings")
    package = relationship("Package", back_populates="iot_readings")
    shipment = relationship("Shipment", back_populates="iot_readings")

    __table_args__ = (
        Index("ix_iot_readings_device_time", "device_id", "reading_timestamp"),
        Index("ix_iot_readings_package_time", "package_id", "reading_timestamp"),
    )


# ── Oracle ────────────────────────────────────────────────────────────────────

class OracleNode(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "oracle_nodes"

    oracle_id = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    endpoint_url = Column(String(500))
    public_key = Column(Text)
    status = Column(String(50), default=OracleStatus.ACTIVE.value)
    accuracy_score = Column(Float, default=1.0)  # 0-1
    total_attestations = Column(Integer, default=0)
    failed_attestations = Column(Integer, default=0)
    last_seen = Column(DateTime(timezone=True))
    metadata_ = Column("metadata", JSONB, default={})


class Attestation(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "attestations"

    iot_reading_id = Column(UUID(as_uuid=True), ForeignKey("iot_readings.id"), nullable=False)
    oracle_id = Column(String(100), ForeignKey("oracle_nodes.oracle_id"))
    attested_temperature = Column(Float)
    attested_humidity = Column(Float)
    attested_location_lat = Column(Float)
    attested_location_lng = Column(Float)
    consensus_reached = Column(Boolean)
    confidence_score = Column(Float)
    blockchain_tx_hash = Column(String(66))
    signature = Column(Text)
    metadata_ = Column("metadata", JSONB, default={})

    # Relationships
    iot_reading = relationship("IoTReading")
    oracle = relationship("OracleNode")


# ── Blockchain Transactions ───────────────────────────────────────────────────

class BlockchainTransaction(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "blockchain_transactions"

    tx_hash = Column(String(66), unique=True, nullable=False, index=True)
    tx_type = Column(String(100), nullable=False)  # e.g. BATCH_REGISTER, PACKAGE_IDENTITY
    contract_address = Column(String(42))
    from_address = Column(String(42))
    to_address = Column(String(42))
    block_number = Column(Integer)
    gas_used = Column(Integer)
    status = Column(String(20), default=BlockchainTxStatus.PENDING.value)
    entity_type = Column(String(50))  # batch, package, shipment, etc.
    entity_id = Column(UUID(as_uuid=True))
    input_data = Column(JSONB)
    event_data = Column(JSONB)

    __table_args__ = (
        Index("ix_bc_tx_entity", "entity_type", "entity_id"),
    )


# ── Documents ─────────────────────────────────────────────────────────────────

class Document(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "documents"

    title = Column(String(255), nullable=False)
    doc_type = Column(String(50), nullable=False)  # DocumentType
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"))
    batch_id = Column(UUID(as_uuid=True), ForeignKey("batches.id"))
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    ipfs_cid = Column(String(100), nullable=False)
    file_hash = Column(String(66), nullable=False)  # SHA-256
    file_name = Column(String(255))
    file_size = Column(Integer)
    mime_type = Column(String(100))
    blockchain_tx_hash = Column(String(66))
    is_tampered = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)
    metadata_ = Column("metadata", JSONB, default={})

    # Relationships
    product = relationship("Product", back_populates="documents")
    batch = relationship("Batch", back_populates="documents")
    organization = relationship("Organization")
    uploader = relationship("User")


# ── Fraud & Risk ──────────────────────────────────────────────────────────────

class FraudAlert(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "fraud_alerts"

    alert_type = Column(String(50), nullable=False)  # FraudAlertType
    package_id = Column(UUID(as_uuid=True), ForeignKey("packages.id"), index=True)
    shipment_id = Column(UUID(as_uuid=True), ForeignKey("shipments.id"), index=True)
    iot_reading_id = Column(UUID(as_uuid=True), ForeignKey("iot_readings.id"))
    risk_score = Column(Float, nullable=False)
    risk_level = Column(String(20), nullable=False)  # RiskLevel
    description = Column(Text)
    evidence = Column(JSONB)
    status = Column(String(50), default=AlertStatus.OPEN.value)
    resolved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    resolved_at = Column(DateTime(timezone=True))
    resolution_notes = Column(Text)
    blockchain_tx_hash = Column(String(66))
    auto_quarantined = Column(Boolean, default=False)

    # Relationships
    package = relationship("Package", back_populates="fraud_alerts")
    shipment = relationship("Shipment", back_populates="fraud_alerts")
    resolver = relationship("User", foreign_keys=[resolved_by])

    __table_args__ = (
        Index("ix_fraud_status", "status"),
        Index("ix_fraud_risk_level", "risk_level"),
    )


class QuarantineRecord(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "quarantine_records"

    package_id = Column(UUID(as_uuid=True), ForeignKey("packages.id"), nullable=False, index=True)
    fraud_alert_id = Column(UUID(as_uuid=True), ForeignKey("fraud_alerts.id"))
    reason = Column(Text, nullable=False)
    quarantined_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    released_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    released_at = Column(DateTime(timezone=True))
    release_reason = Column(Text)
    blockchain_tx_hash = Column(String(66))
    is_active = Column(Boolean, default=True)

    # Relationships
    package = relationship("Package", back_populates="quarantine_records")
    fraud_alert = relationship("FraudAlert")


# ── Recalls ───────────────────────────────────────────────────────────────────

class Recall(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "recalls"

    recall_number = Column(String(100), unique=True, nullable=False, index=True)
    batch_id = Column(UUID(as_uuid=True), ForeignKey("batches.id"), nullable=False)
    initiated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    reason = Column(Text, nullable=False)
    description = Column(Text)
    severity = Column(String(20), nullable=False)  # RiskLevel used as severity
    status = Column(String(50), default=RecallStatus.INITIATED.value)
    affected_packages_count = Column(Integer, default=0)
    consumer_notice_url = Column(String(500))
    blockchain_tx_hash = Column(String(66))
    completed_at = Column(DateTime(timezone=True))
    metadata_ = Column("metadata", JSONB, default={})

    # Relationships
    batch = relationship("Batch", back_populates="recall")
    initiator = relationship("User", foreign_keys=[initiated_by])


# ── Consumer Scans ────────────────────────────────────────────────────────────

class ConsumerScan(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "consumer_scans"

    package_id = Column(UUID(as_uuid=True), ForeignKey("packages.id"), nullable=False, index=True)
    scan_type = Column(String(20), default="QR")  # QR, NFC, MANUAL
    consumer_ip = Column(String(45))
    user_agent = Column(String(500))
    latitude = Column(Float)
    longitude = Column(Float)
    location_name = Column(String(255))
    result = Column(String(50))  # AUTHENTIC, SUSPICIOUS, COUNTERFEIT
    is_suspicious = Column(Boolean, default=False)
    scan_count = Column(Integer, default=1)
    metadata_ = Column("metadata", JSONB, default={})

    # Relationships
    package = relationship("Package", back_populates="consumer_scans")

    __table_args__ = (
        Index("ix_consumer_scans_package", "package_id"),
    )


# ── Audit Log ─────────────────────────────────────────────────────────────────

class AuditLog(Base, UUIDMixin):
    __tablename__ = "audit_logs"

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    action = Column(String(100), nullable=False, index=True)
    resource_type = Column(String(50), index=True)
    resource_id = Column(UUID(as_uuid=True))
    description = Column(Text)
    ip_address = Column(String(45))
    user_agent = Column(String(500))
    metadata_ = Column("metadata", JSONB, default={})

    # Relationships
    user = relationship("User", back_populates="audit_logs")

    __table_args__ = (
        Index("ix_audit_resource", "resource_type", "resource_id"),
        Index("ix_audit_action", "action"),
    )
