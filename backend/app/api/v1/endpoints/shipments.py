"""Shipment endpoints — create, track, handover, deliver."""
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.models import Shipment, ShipmentItem, Package, Organization, HandoverEvent, AuditLog, BlockchainTransaction
from app.models.enums import ShipmentStatus, PackageStatus, HandoverEventType, UserRole
from app.schemas.schemas import ShipmentCreate, ShipmentRead, HandoverCreate
from app.core.security import get_current_user, require_roles
from app.services.blockchain.blockchain_service import blockchain_service
from app.core.websocket import ws_manager

router = APIRouter(prefix="/shipments", tags=["shipments"])


def _gen_shipment_number() -> str:
    import random, string
    return "SHP-" + ''.join(random.choices(string.digits, k=8))


@router.get("", response_model=dict)
async def list_shipments(
    status_filter: Optional[str] = Query(None, alias="status"),
    origin_org_id: Optional[uuid.UUID] = Query(None),
    destination_org_id: Optional[uuid.UUID] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    q = select(Shipment).options(
        selectinload(Shipment.origin),
        selectinload(Shipment.destination),
    ).where(Shipment.is_deleted == False)

    if status_filter:
        q = q.where(Shipment.status == status_filter)
    if origin_org_id:
        q = q.where(Shipment.origin_org_id == origin_org_id)
    if destination_org_id:
        q = q.where(Shipment.destination_org_id == destination_org_id)

    # Role-based filtering
    if current_user.role not in [UserRole.SUPER_ADMIN.value, UserRole.AUDITOR.value]:
        q = q.where(
            (Shipment.origin_org_id == current_user.organization_id) |
            (Shipment.destination_org_id == current_user.organization_id)
        )

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    result = await db.execute(q.order_by(Shipment.created_at.desc()).offset((page - 1) * size).limit(size))
    shipments = result.scalars().all()

    return {
        "items": [ShipmentRead.model_validate(s) for s in shipments],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size if total else 0,
    }


@router.post("", response_model=ShipmentRead, status_code=status.HTTP_201_CREATED)
async def create_shipment(
    body: ShipmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.MANUFACTURER, UserRole.DISTRIBUTOR, UserRole.LOGISTICS)),
):
    # Validate orgs
    for org_id in [body.origin_org_id, body.destination_org_id]:
        r = await db.execute(select(Organization).where(Organization.id == org_id))
        if not r.scalar_one_or_none():
            raise HTTPException(status_code=404, detail=f"Organization {org_id} not found")

    shipment = Shipment(
        shipment_number=_gen_shipment_number(),
        origin_org_id=body.origin_org_id,
        destination_org_id=body.destination_org_id,
        carrier=body.carrier,
        vehicle_number=body.vehicle_number,
        driver_name=body.driver_name,
        driver_phone=body.driver_phone,
        expected_delivery=body.expected_delivery,
        status=ShipmentStatus.CREATED.value,
        created_by=current_user.id,
        notes=body.notes,
    )
    db.add(shipment)
    await db.flush()

    # Add packages to shipment
    for pkg_id in body.package_ids:
        r = await db.execute(select(Package).where(Package.id == pkg_id))
        pkg = r.scalar_one_or_none()
        if pkg:
            item = ShipmentItem(shipment_id=shipment.id, package_id=pkg_id)
            db.add(item)
            pkg.status = PackageStatus.IN_TRANSIT.value
            db.add(pkg)

    # Blockchain registration
    bc = await blockchain_service.create_shipment(
        shipment_number=shipment.shipment_number,
        origin=str(body.origin_org_id),
        destination=str(body.destination_org_id),
    )
    if bc:
        shipment.blockchain_tx_hash = bc["tx_hash"]
        bc_tx = BlockchainTransaction(
            tx_hash=bc["tx_hash"],
            tx_type="SHIPMENT_CREATE",
            status=bc.get("status", "PENDING"),
            entity_type="shipment",
            entity_id=shipment.id,
        )
        db.add(bc_tx)

    audit = AuditLog(
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        action="SHIPMENT_CREATED",
        resource_type="shipment",
        resource_id=shipment.id,
        description=f"Created shipment {shipment.shipment_number}",
    )
    db.add(audit)
    await db.commit()

    r = await db.execute(
        select(Shipment).options(
            selectinload(Shipment.origin),
            selectinload(Shipment.destination),
        ).where(Shipment.id == shipment.id)
    )
    return ShipmentRead.model_validate(r.scalar_one())


@router.get("/{shipment_id}", response_model=ShipmentRead)
async def get_shipment(
    shipment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    r = await db.execute(
        select(Shipment).options(
            selectinload(Shipment.origin),
            selectinload(Shipment.destination),
            selectinload(Shipment.items),
        ).where(Shipment.id == shipment_id, Shipment.is_deleted == False)
    )
    s = r.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return ShipmentRead.model_validate(s)


@router.post("/{shipment_id}/status", response_model=ShipmentRead)
async def update_shipment_status(
    shipment_id: uuid.UUID,
    new_status: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    valid = [s.value for s in ShipmentStatus]
    if new_status not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid status. Valid: {valid}")

    r = await db.execute(select(Shipment).where(Shipment.id == shipment_id))
    shipment = r.scalar_one_or_none()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    shipment.status = new_status
    if new_status == ShipmentStatus.DELIVERED.value:
        shipment.actual_delivery = datetime.now(timezone.utc)
    db.add(shipment)

    audit = AuditLog(
        user_id=current_user.id,
        action=f"SHIPMENT_{new_status}",
        resource_type="shipment",
        resource_id=shipment_id,
    )
    db.add(audit)
    await db.commit()

    await ws_manager.broadcast_shipment({
        "shipment_id": str(shipment_id),
        "shipment_number": shipment.shipment_number,
        "status": new_status,
    })

    r = await db.execute(
        select(Shipment).options(selectinload(Shipment.origin), selectinload(Shipment.destination))
        .where(Shipment.id == shipment_id)
    )
    return ShipmentRead.model_validate(r.scalar_one())


@router.post("/handover", status_code=201)
async def record_handover(
    body: HandoverCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    event = HandoverEvent(
        shipment_id=body.shipment_id,
        package_id=body.package_id,
        event_type=body.event_type.value,
        from_org_id=body.from_org_id,
        to_org_id=body.to_org_id,
        performed_by=current_user.id,
        location_lat=body.location_lat,
        location_lng=body.location_lng,
        location_name=body.location_name,
        notes=body.notes,
        event_timestamp=datetime.now(timezone.utc),
    )
    db.add(event)

    # Update package owner
    if body.package_id:
        r = await db.execute(select(Package).where(Package.id == body.package_id))
        pkg = r.scalar_one_or_none()
        if pkg:
            pkg.current_owner_id = body.to_org_id
            if body.location_lat:
                pkg.current_location_lat = body.location_lat
            if body.location_lng:
                pkg.current_location_lng = body.location_lng
            if body.location_name:
                pkg.current_location_name = body.location_name
            db.add(pkg)

    # Blockchain custody transfer
    bc = await blockchain_service.transfer_custody(
        package_code=str(body.package_id),
        from_org=str(body.from_org_id),
        to_org=str(body.to_org_id),
        timestamp=int(datetime.now(timezone.utc).timestamp()),
    )
    if bc:
        event.blockchain_tx_hash = bc["tx_hash"]

    await db.commit()
    return {"event_id": str(event.id), "blockchain_tx": event.blockchain_tx_hash}


@router.get("/{shipment_id}/journey")
async def get_shipment_journey(
    shipment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    r = await db.execute(
        select(HandoverEvent).options(
            selectinload(HandoverEvent.from_org),
            selectinload(HandoverEvent.to_org),
            selectinload(HandoverEvent.performer),
        ).where(HandoverEvent.shipment_id == shipment_id)
        .order_by(HandoverEvent.event_timestamp)
    )
    events = r.scalars().all()
    return [
        {
            "id": str(e.id),
            "event_type": e.event_type,
            "from_org": e.from_org.name if e.from_org else None,
            "to_org": e.to_org.name if e.to_org else None,
            "location": e.location_name,
            "latitude": e.location_lat,
            "longitude": e.location_lng,
            "timestamp": e.event_timestamp.isoformat() if e.event_timestamp else None,
            "blockchain_tx": e.blockchain_tx_hash,
            "performed_by": e.performer.full_name if e.performer else None,
        }
        for e in events
    ]
