"""Products endpoints — full CRUD with search/filter/pagination."""
from typing import Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.models import Product, Organization, AuditLog
from app.models.enums import ProductStatus, UserRole
from app.schemas.schemas import ProductCreate, ProductRead, ProductUpdate
from app.core.security import get_current_user, require_roles

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=dict)
async def list_products(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    manufacturer_id: Optional[uuid.UUID] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    q = select(Product).options(selectinload(Product.manufacturer)).where(Product.is_deleted == False)

    if search:
        q = q.where(or_(
            Product.name.ilike(f"%{search}%"),
            Product.sku.ilike(f"%{search}%"),
            Product.description.ilike(f"%{search}%"),
        ))
    if category:
        q = q.where(Product.category == category)
    if manufacturer_id:
        q = q.where(Product.manufacturer_id == manufacturer_id)
    if status:
        q = q.where(Product.status == status)

    # Non-admins see only their org's products
    if current_user.role not in [UserRole.SUPER_ADMIN.value, UserRole.AUDITOR.value]:
        q = q.where(Product.manufacturer_id == current_user.organization_id)

    count_q = select(func.count()).select_from(q.subquery())
    total_result = await db.execute(count_q)
    total = total_result.scalar()

    q = q.order_by(Product.created_at.desc()).offset((page - 1) * size).limit(size)
    result = await db.execute(q)
    products = result.scalars().all()

    return {
        "items": [ProductRead.model_validate(p) for p in products],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size if total else 0,
    }


@router.post("", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
async def create_product(
    body: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.MANUFACTURER)),
):
    # Validate manufacturer exists
    result = await db.execute(select(Organization).where(Organization.id == body.manufacturer_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Manufacturer organization not found")

    product = Product(**body.model_dump())
    db.add(product)

    audit = AuditLog(
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        action="PRODUCT_CREATED",
        resource_type="product",
        description=f"Created product {body.name} (SKU: {body.sku})",
    )
    db.add(audit)
    await db.commit()
    await db.refresh(product)

    result = await db.execute(
        select(Product).options(selectinload(Product.manufacturer)).where(Product.id == product.id)
    )
    return ProductRead.model_validate(result.scalar_one())


@router.get("/{product_id}", response_model=ProductRead)
async def get_product(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(Product).options(selectinload(Product.manufacturer))
        .where(Product.id == product_id, Product.is_deleted == False)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return ProductRead.model_validate(product)


@router.patch("/{product_id}", response_model=ProductRead)
async def update_product(
    product_id: uuid.UUID,
    body: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.MANUFACTURER)),
):
    result = await db.execute(
        select(Product).where(Product.id == product_id, Product.is_deleted == False)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(product, field, value)

    audit = AuditLog(
        user_id=current_user.id,
        action="PRODUCT_UPDATED",
        resource_type="product",
        resource_id=product_id,
    )
    db.add(audit)
    db.add(product)
    await db.commit()
    await db.refresh(product)

    result = await db.execute(
        select(Product).options(selectinload(Product.manufacturer)).where(Product.id == product_id)
    )
    return ProductRead.model_validate(result.scalar_one())


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def archive_product(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.MANUFACTURER)),
):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.is_deleted = True
    product.status = ProductStatus.ARCHIVED.value
    db.add(product)
    await db.commit()
