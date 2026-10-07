"""API v1 router — aggregates all endpoint routers."""
from fastapi import APIRouter

from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.products import router as products_router
from app.api.v1.endpoints.batches import router as batches_router
from app.api.v1.endpoints.packages import router as packages_router
from app.api.v1.endpoints.shipments import router as shipments_router
from app.api.v1.endpoints.iot import router as iot_router
from app.api.v1.endpoints.consumer import router as consumer_router
from app.api.v1.endpoints.admin import (
    orgs_router, users_router, dashboard_router,
    fraud_router, documents_router, recalls_router,
    quarantine_router, blockchain_router, oracle_router, audit_router,
)

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(orgs_router)
api_router.include_router(dashboard_router)
api_router.include_router(products_router)
api_router.include_router(batches_router)
api_router.include_router(packages_router)
api_router.include_router(shipments_router)
api_router.include_router(iot_router)
api_router.include_router(consumer_router)
api_router.include_router(fraud_router)
api_router.include_router(documents_router)
api_router.include_router(recalls_router)
api_router.include_router(quarantine_router)
api_router.include_router(blockchain_router)
api_router.include_router(oracle_router)
api_router.include_router(audit_router)
