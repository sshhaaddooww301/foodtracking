"""Database session factory and connection setup."""
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

# Async engine (used by FastAPI endpoints)
if "sqlite" in settings.DATABASE_URL:
    async_engine = create_async_engine(
        settings.DATABASE_URL,
        echo=settings.DEBUG,
    )
    sync_engine = create_engine(
        settings.DATABASE_URL_SYNC,
    )
else:
    async_engine = create_async_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        pool_size=20,
        max_overflow=40,
        echo=settings.DEBUG,
    )
    sync_engine = create_engine(
        settings.DATABASE_URL_SYNC,
        pool_pre_ping=True,
    )

AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)

SyncSessionLocal = sessionmaker(bind=sync_engine)


async def get_db() -> AsyncSession:
    """FastAPI dependency: yield async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
