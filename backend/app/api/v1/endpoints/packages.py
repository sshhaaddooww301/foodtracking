"""Package endpoints — QR, NFC, verification abstraction."""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.models import (
    Package, Batch, Product, Organization, HandoverEvent,
    IoTReading, FraudAlert, Recall, ConsumerScan, QuarantineRecord,
)
from app.models.enums import PackageStatus, UserRole
from app.schemas.schemas import PackageRead, PackageVerifyResult
from app.core.security import get_current_user, require_roles
from app.services.fraud.fraud_engine import FraudEngine
from app.utils.qr_service import generate_package_qr

router = APIRouter(prefix="/packages", tags=["packages"])


@router.get("", response_model=dict)
async def list_packages(
    batch_id: Optional[uuid.UUID] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    risk_level: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    q = select(Package).options(
        selectinload(Package.batch).selectinload(Batch.product).selectinload(Product.manufacturer),
        selectinload(Package.current_owner),
    ).where(Package.is_deleted == False)
    if batch_id:
        q = q.where(Package.batch_id == batch_id)
    if status_filter:
        q = q.where(Package.status == status_filter)
    if risk_level:
        q = q.where(Package.risk_level == risk_level)

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


@router.get("/{package_code}/qr")
async def get_package_qr(
    package_code: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(select(Package).where(Package.package_code == package_code))
    package = result.scalar_one_or_none()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")

    qr_data = generate_package_qr(package_code)
    return {
        "package_code": package_code,
        "qr_image": qr_data,
        "qr_base64": qr_data,
        "verification_url": f"/verify/{package_code}",
    }


@router.get("/{package_id}/detail", response_model=PackageRead)
async def get_package(
    package_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(Package).options(
            selectinload(Package.batch).selectinload(Batch.product).selectinload(Product.manufacturer),
            selectinload(Package.current_owner),
        ).where(Package.id == package_id, Package.is_deleted == False)
    )
    package = result.scalar_one_or_none()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    return PackageRead.model_validate(package)
