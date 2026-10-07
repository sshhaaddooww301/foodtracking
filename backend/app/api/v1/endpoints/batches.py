"""Batches endpoints — create, list, register on blockchain, generate packages."""
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, cast, Integer
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.models import Batch, Package, Product, AuditLog, BlockchainTransaction
from app.models.enums import BatchStatus, PackageStatus, UserRole
from app.schemas.schemas import BatchCreate, BatchRead, PackageRead
from app.core.security import get_current_user, require_roles
from app.services.blockchain.blockchain_service import blockchain_service
from app.utils.qr_service import generate_package_qr, generate_package_hash

router = APIRouter(prefix="/batches", tags=["batches"])


def _generate_batch_number() -> str:
    import random, string
    prefix = "BATCH"
    suffix = ''.join(random.choices(string.digits, k=8))
    return f"{prefix}-{suffix}"


@router.get("", response_model=dict)
async def list_batches(
    product_id: Optional[uuid.UUID] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    q = select(Batch).options(
        selectinload(Batch.product).selectinload(Product.manufacturer)
    ).where(Batch.is_deleted == False)

    if product_id:
        q = q.where(Batch.product_id == product_id)
    if status_filter:
        q = q.where(Batch.status == status_filter)

    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar()

    q = q.order_by(Batch.created_at.desc()).offset((page - 1) * size).limit(size)
    result = await db.execute(q)
    batches = result.scalars().all()

    return {
        "items": [BatchRead.model_validate(b) for b in batches],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size if total else 0,
    }


@router.post("", response_model=BatchRead, status_code=status.HTTP_201_CREATED)
async def create_batch(
    body: BatchCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.MANUFACTURER)),
):
    # Validate product exists
    p_result = await db.execute(select(Product).where(Product.id == body.product_id))
    product = p_result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    batch = Batch(
        batch_number=body.batch_number or _generate_batch_number(),
        product_id=body.product_id,
        quantity=body.quantity,
        manufacturing_date=body.manufacturing_date,
        expiry_date=body.expiry_date,
        status=BatchStatus.CREATED.value,
        created_by=current_user.id,
        notes=body.notes,
    )
    db.add(batch)

    # Register on blockchain
    bc_result = await blockchain_service.register_batch(
        batch_number=batch.batch_number,
        product_sku=product.sku,
        quantity=body.quantity,
        expiry_ts=int(body.expiry_date.timestamp()),
    )
    if bc_result:
        batch.blockchain_tx_hash = bc_result["tx_hash"]
        batch.status = BatchStatus.REGISTERED.value

        bc_tx = BlockchainTransaction(
            tx_hash=bc_result["tx_hash"],
            tx_type="BATCH_REGISTER",
            block_number=bc_result.get("block_number"),
            gas_used=bc_result.get("gas_used"),
            status=bc_result.get("status", "PENDING"),
            entity_type="batch",
            entity_id=batch.id,
        )
        db.add(bc_tx)

    audit = AuditLog(
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        action="BATCH_CREATED",
        resource_type="batch",
        description=f"Created batch {batch.batch_number} for product {product.name}",
    )
    db.add(audit)
    await db.commit()
    await db.refresh(batch)

    result = await db.execute(
        select(Batch).options(
            selectinload(Batch.product).selectinload(Product.manufacturer)
        ).where(Batch.id == batch.id)
    )
    return BatchRead.model_validate(result.scalar_one())


@router.get("/{batch_id}", response_model=BatchRead)
async def get_batch(
    batch_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(Batch).options(
            selectinload(Batch.product).selectinload(Product.manufacturer)
        ).where(Batch.id == batch_id, Batch.is_deleted == False)
    )
    batch = result.scalar_one_or_none()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    return BatchRead.model_validate(batch)


@router.post("/{batch_id}/generate-packages", response_model=dict)
async def generate_packages(
    batch_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.MANUFACTURER)),
):
    """Generate individual package identities for a batch."""
    result = await db.execute(
        select(Batch).options(selectinload(Batch.product)).where(Batch.id == batch_id)
    )
    batch = result.scalar_one_or_none()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    # Check if packages already exist for this batch
    existing_count = (await db.execute(select(func.count()).where(Package.batch_id == batch_id))).scalar() or 0
    if existing_count > 0:
        existing_pkgs = (await db.execute(
            select(Package.package_code).where(Package.batch_id == batch_id).order_by(Package.package_code)
        )).scalars().all()
        return {
            "batch_id": str(batch_id),
            "batch_number": batch.batch_number,
            "packages_generated": existing_count,
            "already_serialized": True,
            "first_package": existing_pkgs[0] if existing_pkgs else None,
            "last_package": existing_pkgs[-1] if existing_pkgs else None,
            "message": f"Batch already serialized with {existing_count} packages.",
        }

    # Safely compute current max PKG-###### sequence across all packages
    codes_result = await db.execute(select(Package.package_code))
    current_max = 0
    for code in codes_result.scalars().all():
        if code and code.startswith("PKG-"):
            num_part = code[4:]
            if num_part.isdigit():
                current_max = max(current_max, int(num_part))

    # Generate up to 20 unit packages
    num_to_generate = min(batch.quantity, 20) if batch.quantity and batch.quantity > 0 else 10
    packages = []
    for i in range(num_to_generate):
        seq = current_max + i + 1
        package_code = f"PKG-{seq:06d}"
        crypto_hash = generate_package_hash(package_code, str(batch_id), str(batch.product_id))
        qr_payload = f"{package_code}"  # QR points to /verify/{package_code}

        pkg = Package(
            package_code=package_code,
            batch_id=batch_id,
            qr_payload=qr_payload,
            crypto_hash=crypto_hash,
            current_owner_id=batch.product.manufacturer_id if batch.product else None,
            status=PackageStatus.CREATED.value,
        )
        db.add(pkg)

        # Register on blockchain (first 5 for speed)
        if i < 5:
            try:
                bc_result = await blockchain_service.register_package(
                    package_code=package_code,
                    batch_number=batch.batch_number,
                    crypto_hash=crypto_hash,
                )
                if bc_result and isinstance(bc_result, dict):
                    pkg.blockchain_identity = bc_result.get("tx_hash")
            except Exception as e:
                logger.warning(f"Blockchain register package skipped: {e}")

        packages.append(package_code)

    audit = AuditLog(
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        action="PACKAGES_GENERATED",
        resource_type="batch",
        resource_id=batch_id,
        description=f"Generated {len(packages)} packages for batch {batch.batch_number}",
    )
    db.add(audit)
    await db.commit()

    return {
        "batch_id": str(batch_id),
        "batch_number": batch.batch_number,
        "packages_generated": len(packages),
        "already_serialized": False,
        "first_package": packages[0] if packages else None,
        "last_package": packages[-1] if packages else None,
        "message": f"Successfully serialized {len(packages)} unit packages with QR identities!",
    }


@router.get("/{batch_id}/packages", response_model=dict)
async def get_batch_packages(
    batch_id: uuid.UUID,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    q = select(Package).options(
        selectinload(Package.batch).selectinload(Batch.product).selectinload(Product.manufacturer),
        selectinload(Package.current_owner),
    ).where(Package.batch_id == batch_id, Package.is_deleted == False)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    result = await db.execute(q.order_by(Package.package_code).offset((page - 1) * size).limit(size))
    packages = result.scalars().all()

    return {
        "items": [PackageRead.model_validate(p) for p in packages],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size if total else 0,
    }
