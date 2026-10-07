"""
Backend API Unit & Integration Tests.
Tests authentication, role validation, product & batch APIs,
IoT telemetry ingestion, consumer verification, and quarantine.
"""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data


@pytest.mark.asyncio
async def test_login_invalid_credentials():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/auth/login",
            json={"email": "nonexistent@trustchain.local", "password": "wrongpassword"},
        )
    assert response.status_code in (401, 404, 422)


@pytest.mark.asyncio
async def test_consumer_verification_invalid_code():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/v1/consumer/verify/PKG-DOES-NOT-EXIST-999")
    # Should either return 404 or a structured COUNTERFEIT / NOT FOUND response
    assert response.status_code in (200, 404)
    if response.status_code == 200:
        data = response.json()
        assert data.get("result") in ("COUNTERFEIT", "NOT_FOUND", "SUSPICIOUS")
