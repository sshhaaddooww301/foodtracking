"""Dashboard stats, fraud alerts, organizations, documents, recalls, blockchain endpoints."""
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.models import (
    Organization, User, Product, Batch, Package, Shipment,
    IoTReading, FraudAlert, AuditLog, BlockchainTransaction,
    Document, Recall, QuarantineRecord, OracleNode,
)
from app.models.enums import (
    PackageStatus, ShipmentStatus, AlertStatus, RecallStatus,
    UserRole, OrganizationType,
)
from app.schemas.schemas import (
    OrganizationCreate, OrganizationRead, OrganizationUpdate,
    UserCreate, UserRead, UserUpdate,
    FraudAlertRead, AlertResolve,
    DocumentRead,
    RecallCreate, RecallRead,
    BlockchainTxRead,
    OracleNodeRead,
    AuditLogRead,
    DashboardStats,
    QuarantineReleaseRequest,
)
from app.core.security import (
    get_current_user, require_roles, require_super_admin, hash_password,
)
from app.services.blockchain.blockchain_service import blockchain_service
from app.services.ipfs.ipfs_service import ipfs_service
from app.services.quarantine import quarantine_package, release_package

# ── Organizations ─────────────────────────────────────────────────────────────
orgs_router = APIRouter(prefix="/organizations", tags=["organizations"])


@orgs_router.get("", response_model=dict)
async def list_organizations(
    org_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    q = select(Organization).where(Organization.is_deleted == False)
    if org_type:
        q = q.where(Organization.org_type == org_type)
    if search:
        q = q.where(Organization.name.ilike(f"%{search}%"))
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    result = await db.execute(q.order_by(Organization.name).offset((page - 1) * size).limit(size))
    orgs = result.scalars().all()
    return {
        "items": [OrganizationRead.model_validate(o) for o in orgs],
        "total": total, "page": page, "size": size,
        "pages": (total + size - 1) // size if total else 0,
    }


@orgs_router.post("", response_model=OrganizationRead, status_code=201)
async def create_organization(
    body: OrganizationCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_super_admin),
):
    org = Organization(**body.model_dump())
    db.add(org)
    audit = AuditLog(user_id=current_user.id, action="ORG_CREATED", resource_type="organization", description=f"Created org {body.name}")
    db.add(audit)
    await db.commit()
    await db.refresh(org)
    return OrganizationRead.model_validate(org)


@orgs_router.get("/{org_id}", response_model=OrganizationRead)
async def get_organization(org_id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    r = await db.execute(select(Organization).where(Organization.id == org_id))
    org = r.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return OrganizationRead.model_validate(org)


# ── Users ─────────────────────────────────────────────────────────────────────
users_router = APIRouter(prefix="/users", tags=["users"])


@users_router.get("", response_model=dict)
async def list_users(
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_super_admin),
):
    q = select(User).options(selectinload(User.organization)).where(User.is_deleted == False)
    if search:
        q = q.where((User.email.ilike(f"%{search}%")) | (User.full_name.ilike(f"%{search}%")))
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    result = await db.execute(q.order_by(User.created_at.desc()).offset((page - 1) * size).limit(size))
    users = result.scalars().all()
    return {"items": [UserRead.model_validate(u) for u in users], "total": total, "page": page, "size": size, "pages": (total + size - 1) // size if total else 0}


@users_router.post("", response_model=UserRead, status_code=201)
async def create_user(
    body: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_super_admin),
):
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
        role=body.role.value,
        organization_id=body.organization_id,
    )
    db.add(user)
    await db.commit()
    r = await db.execute(select(User).options(selectinload(User.organization)).where(User.id == user.id))
    user_loaded = r.scalar_one()
    return UserRead.model_validate(user_loaded)


# ── Dashboard ─────────────────────────────────────────────────────────────────
dashboard_router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@dashboard_router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    yesterday = now - timedelta(hours=24)

    async def count(model, *filters):
        r = await db.execute(select(func.count()).select_from(model).where(*filters))
        return r.scalar() or 0

    total_orgs = await count(Organization, Organization.is_deleted == False)
    total_products = await count(Product, Product.is_deleted == False)
    total_batches = await count(Batch, Batch.is_deleted == False)
    total_packages = await count(Package, Package.is_deleted == False)
    active_shipments = await count(Shipment, Shipment.status.in_([
        ShipmentStatus.IN_TRANSIT.value, ShipmentStatus.PICKED_UP.value, ShipmentStatus.OUT_FOR_DELIVERY.value
    ]), Shipment.is_deleted == False)
    verified_packages = await count(Package, Package.status == PackageStatus.REGISTERED.value)
    fraud_alerts_open = await count(FraudAlert, FraudAlert.status == AlertStatus.OPEN.value)
    cold_chain_breaches = await count(FraudAlert, FraudAlert.alert_type == "COLD_CHAIN_BREACH", FraudAlert.status == AlertStatus.OPEN.value)
    quarantined = await count(Package, Package.status == PackageStatus.QUARANTINED.value)
    recalled = await count(Batch, Batch.status == "RECALLED")
    iot_24h = await count(IoTReading, IoTReading.reading_timestamp >= yesterday)
    bc_tx_count = await count(BlockchainTransaction)

    bc_health = await blockchain_service.get_health()
    ipfs_health = await ipfs_service.get_health()

    return DashboardStats(
        total_organizations=total_orgs,
        total_products=total_products,
        total_batches=total_batches,
        total_packages=total_packages,
        active_shipments=active_shipments,
        verified_packages=verified_packages,
        fraud_alerts_open=fraud_alerts_open,
        cold_chain_breaches=cold_chain_breaches,
        quarantined_packages=quarantined,
        recalled_batches=recalled,
        total_iot_readings_24h=iot_24h,
        blockchain_tx_count=bc_tx_count,
        system_health={
            "blockchain": "healthy" if bc_health.get("connected") else "degraded",
            "ipfs": ipfs_health.get("status", "unknown"),
            "database": "healthy",
        },
    )


# ── Fraud Alerts ──────────────────────────────────────────────────────────────
fraud_router = APIRouter(prefix="/fraud", tags=["fraud"])


@fraud_router.get("", response_model=dict)
@fraud_router.get("/alerts", response_model=dict)
async def list_fraud_alerts(
    alert_type: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    risk_level: Optional[str] = Query(None),
    package_id: Optional[uuid.UUID] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    q = select(FraudAlert)
    if alert_type:
        q = q.where(FraudAlert.alert_type == alert_type)
    if status_filter:
        q = q.where(FraudAlert.status == status_filter)
    if risk_level:
        q = q.where(FraudAlert.risk_level == risk_level)
    if package_id:
        q = q.where(FraudAlert.package_id == package_id)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    result = await db.execute(q.order_by(FraudAlert.created_at.desc()).offset((page - 1) * size).limit(size))
    alerts = result.scalars().all()
    return {"items": [FraudAlertRead.model_validate(a) for a in alerts], "total": total, "page": page, "size": size, "pages": (total + size - 1) // size if total else 0}


@fraud_router.post("/{alert_id}/resolve")
async def resolve_alert(
    alert_id: uuid.UUID,
    body: AlertResolve,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.AUDITOR)),
):
    r = await db.execute(select(FraudAlert).where(FraudAlert.id == alert_id))
    alert = r.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.status = AlertStatus.FALSE_POSITIVE.value if body.is_false_positive else AlertStatus.RESOLVED.value
    alert.resolved_by = current_user.id
    alert.resolved_at = datetime.now(timezone.utc)
    alert.resolution_notes = body.resolution_notes
    db.add(alert)
    await db.commit()
    return {"status": alert.status}


# ── Documents ─────────────────────────────────────────────────────────────────
documents_router = APIRouter(prefix="/documents", tags=["documents"])


@documents_router.post("", response_model=DocumentRead, status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    doc_type: str = Form(...),
    product_id: Optional[str] = Form(None),
    batch_id: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    content = await file.read()
    result = await ipfs_service.upload_file(
        file_bytes=content,
        filename=file.filename,
        metadata={"uploaded_by": str(current_user.id), "doc_type": doc_type},
    )
    if not result:
        raise HTTPException(status_code=500, detail="IPFS upload failed")

    doc = Document(
        title=title,
        doc_type=doc_type,
        product_id=uuid.UUID(product_id) if product_id else None,
        batch_id=uuid.UUID(batch_id) if batch_id else None,
        organization_id=current_user.organization_id,
        uploaded_by=current_user.id,
        ipfs_cid=result["cid"],
        file_hash=result["file_hash"],
        file_name=file.filename,
        file_size=len(content),
        mime_type=file.content_type,
    )
    db.add(doc)

    # Anchor on blockchain
    bc = await blockchain_service.anchor_document(str(doc.id), result["cid"], result["file_hash"])
    if bc:
        doc.blockchain_tx_hash = bc["tx_hash"]

    audit = AuditLog(user_id=current_user.id, action="DOCUMENT_UPLOADED", resource_type="document", description=f"Uploaded {file.filename} to IPFS: {result['cid']}")
    db.add(audit)
    await db.commit()
    await db.refresh(doc)
    return DocumentRead.model_validate(doc)


@documents_router.get("", response_model=dict)
async def list_documents(
    product_id: Optional[uuid.UUID] = Query(None),
    batch_id: Optional[uuid.UUID] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    q = select(Document).where(Document.is_deleted == False)
    if product_id:
        q = q.where(Document.product_id == product_id)
    if batch_id:
        q = q.where(Document.batch_id == batch_id)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    result = await db.execute(q.order_by(Document.created_at.desc()).offset((page - 1) * size).limit(size))
    docs = result.scalars().all()
    return {"items": [DocumentRead.model_validate(d) for d in docs], "total": total, "page": page, "size": size, "pages": (total + size - 1) // size if total else 0}


# ── Recalls ───────────────────────────────────────────────────────────────────
recalls_router = APIRouter(prefix="/recalls", tags=["recalls"])


@recalls_router.post("", response_model=RecallRead, status_code=201)
async def initiate_recall(
    body: RecallCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.MANUFACTURER)),
):
    r = await db.execute(select(Batch).where(Batch.id == body.batch_id))
    batch = r.scalar_one_or_none()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    import random, string
    recall_number = "RCL-" + ''.join(random.choices(string.digits, k=8))

    # Count affected packages
    pkg_count = (await db.execute(select(func.count()).where(Package.batch_id == body.batch_id))).scalar()

    recall = Recall(
        recall_number=recall_number,
        batch_id=body.batch_id,
        initiated_by=current_user.id,
        reason=body.reason,
        description=body.description,
        severity=body.severity.value,
        status=RecallStatus.INITIATED.value,
        affected_packages_count=pkg_count,
    )
    db.add(recall)

    # Mark batch and packages as recalled
    batch.status = "RECALLED"
    db.add(batch)

    pkgs = (await db.execute(select(Package).where(Package.batch_id == body.batch_id))).scalars().all()
    for pkg in pkgs:
        pkg.status = PackageStatus.RECALLED.value
        db.add(pkg)

    # Blockchain recall event
    bc = await blockchain_service.initiate_recall(batch.batch_number, body.reason)
    if bc:
        recall.blockchain_tx_hash = bc["tx_hash"]

    audit = AuditLog(user_id=current_user.id, action="RECALL_INITIATED", resource_type="recall", description=f"Recall {recall_number} for batch {batch.batch_number}")
    db.add(audit)
    await db.commit()
    await db.refresh(recall)
    return RecallRead.model_validate(recall)


@recalls_router.get("", response_model=dict)
async def list_recalls(
    page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user),
):
    q = select(Recall)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    result = await db.execute(q.order_by(Recall.created_at.desc()).offset((page - 1) * size).limit(size))
    recalls = result.scalars().all()
    return {"items": [RecallRead.model_validate(r) for r in recalls], "total": total, "page": page, "size": size, "pages": (total + size - 1) // size if total else 0}


# ── Quarantine ────────────────────────────────────────────────────────────────
quarantine_router = APIRouter(prefix="/quarantine", tags=["quarantine"])


@quarantine_router.get("", response_model=dict)
async def list_quarantined(
    page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user),
):
    q = select(QuarantineRecord).where(QuarantineRecord.is_active == True)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    result = await db.execute(q.order_by(QuarantineRecord.created_at.desc()).offset((page - 1) * size).limit(size))
    records = result.scalars().all()
    return {
        "items": [{"id": str(r.id), "package_id": str(r.package_id), "reason": r.reason, "created_at": r.created_at.isoformat()} for r in records],
        "total": total, "page": page, "size": size, "pages": (total + size - 1) // size if total else 0,
    }


@quarantine_router.post("/{package_id}/release")
async def release_from_quarantine(
    package_id: uuid.UUID,
    body: QuarantineReleaseRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.AUDITOR)),
):
    r = await db.execute(select(Package).where(Package.id == package_id))
    package = r.scalar_one_or_none()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    record = await release_package(db, package, body.release_reason, current_user.id)
    await db.commit()
    return {"released": True, "record_id": str(record.id) if record else None}


# ── Blockchain ────────────────────────────────────────────────────────────────
blockchain_router = APIRouter(prefix="/blockchain", tags=["blockchain"])


@blockchain_router.get("/health")
async def bc_health(current_user=Depends(get_current_user)):
    return await blockchain_service.get_health()


@blockchain_router.get("/transactions", response_model=dict)
async def list_transactions(
    entity_type: Optional[str] = Query(None),
    page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user),
):
    q = select(BlockchainTransaction)
    if entity_type:
        q = q.where(BlockchainTransaction.entity_type == entity_type)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    result = await db.execute(q.order_by(BlockchainTransaction.created_at.desc()).offset((page - 1) * size).limit(size))
    txs = result.scalars().all()
    return {"items": [BlockchainTxRead.model_validate(t) for t in txs], "total": total, "page": page, "size": size, "pages": (total + size - 1) // size if total else 0}


# ── Oracle Nodes ──────────────────────────────────────────────────────────────
oracle_router = APIRouter(prefix="/oracles", tags=["oracles"])


@oracle_router.get("", response_model=dict)
async def list_oracles(db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    result = await db.execute(select(OracleNode))
    nodes = result.scalars().all()
    return {"items": [OracleNodeRead.model_validate(n) for n in nodes], "total": len(nodes)}


# ── Audit Logs ────────────────────────────────────────────────────────────────
audit_router = APIRouter(prefix="/audit", tags=["audit"])


@audit_router.get("", response_model=dict)
async def list_audit_logs(
    action: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    user_id: Optional[uuid.UUID] = Query(None),
    page: int = Query(1, ge=1), size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.AUDITOR)),
):
    q = select(AuditLog)
    if action:
        q = q.where(AuditLog.action.ilike(f"%{action}%"))
    if resource_type:
        q = q.where(AuditLog.resource_type == resource_type)
    if user_id:
        q = q.where(AuditLog.user_id == user_id)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    result = await db.execute(q.order_by(AuditLog.created_at.desc()).offset((page - 1) * size).limit(size))
    logs = result.scalars().all()
    return {"items": [AuditLogRead.model_validate(l) for l in logs], "total": total, "page": page, "size": size, "pages": (total + size - 1) // size if total else 0}
