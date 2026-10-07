"""
Quarantine Service — handles package quarantine and release.
"""
from __future__ import annotations
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.models import Package, QuarantineRecord, AuditLog
from app.models.enums import PackageStatus

logger = logging.getLogger(__name__)


async def quarantine_package(
    session: AsyncSession,
    package: Package,
    reason: str,
    fraud_alert_id: Optional[uuid.UUID] = None,
    quarantined_by: Optional[uuid.UUID] = None,
) -> QuarantineRecord:
    """Quarantine a package — updates status and creates quarantine record."""
    package.status = PackageStatus.QUARANTINED.value
    session.add(package)

    record = QuarantineRecord(
        package_id=package.id,
        fraud_alert_id=fraud_alert_id,
        reason=reason,
        quarantined_by=quarantined_by,
        is_active=True,
    )
    session.add(record)

    # Audit log
    audit = AuditLog(
        action="PACKAGE_QUARANTINED",
        resource_type="package",
        resource_id=package.id,
        user_id=quarantined_by,
        description=f"Package {package.package_code} quarantined: {reason}",
    )
    session.add(audit)

    await session.flush()
    logger.warning(f"QUARANTINE: Package {package.package_code} quarantined. Reason: {reason}")
    return record


async def release_package(
    session: AsyncSession,
    package: Package,
    release_reason: str,
    released_by: uuid.UUID,
) -> Optional[QuarantineRecord]:
    """Release a package from quarantine."""
    result = await session.execute(
        select(QuarantineRecord)
        .where(
            QuarantineRecord.package_id == package.id,
            QuarantineRecord.is_active == True,
        )
        .order_by(QuarantineRecord.created_at.desc())
        .limit(1)
    )
    record = result.scalar_one_or_none()

    if record:
        record.released_by = released_by
        record.released_at = datetime.now(timezone.utc)
        record.release_reason = release_reason
        record.is_active = False
        session.add(record)

    package.status = PackageStatus.REGISTERED.value
    session.add(package)

    audit = AuditLog(
        action="PACKAGE_RELEASED",
        resource_type="package",
        resource_id=package.id,
        user_id=released_by,
        description=f"Package {package.package_code} released from quarantine: {release_reason}",
    )
    session.add(audit)

    await session.flush()
    logger.info(f"RELEASE: Package {package.package_code} released from quarantine.")
    return record
