"""SQLAlchemy database models — base and mixins."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, String, func, JSON, CHAR
from sqlalchemy.types import TypeDecorator
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB as PG_JSONB
from sqlalchemy.orm import DeclarativeBase


class UUID(TypeDecorator):
    """Platform-independent GUID/UUID type supporting PostgreSQL and SQLite."""
    impl = CHAR(36)
    cache_ok = True

    def __init__(self, as_uuid=True, *args, **kwargs):
        self.as_uuid = as_uuid
        super().__init__(36)

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_UUID(as_uuid=self.as_uuid))
        return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if dialect.name == "postgresql":
            if isinstance(value, uuid.UUID):
                return value
            return uuid.UUID(str(value))
        return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, uuid.UUID):
            return value
        try:
            return uuid.UUID(str(value))
        except (ValueError, AttributeError):
            return value


class JSONB(TypeDecorator):
    """Platform-independent JSONB type supporting PostgreSQL and SQLite."""
    impl = JSON
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_JSONB())
        return dialect.type_descriptor(JSON())


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class UUIDMixin:
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )
