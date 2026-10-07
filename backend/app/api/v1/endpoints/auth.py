"""Auth endpoints: login, refresh, me."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.models import User, AuditLog
from app.core.security import (
    verify_password, create_access_token, create_refresh_token,
    decode_token, get_current_user,
)
from app.schemas.schemas import LoginRequest, TokenResponse, UserRead, RefreshTokenRequest

from sqlalchemy.orm import selectinload

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(request: Request, body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).options(selectinload(User.organization)).where(User.email == body.email, User.is_active == True, User.is_deleted == False)
    )
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    user.last_login = datetime.now(timezone.utc)
    db.add(user)

    audit = AuditLog(
        user_id=user.id,
        organization_id=user.organization_id,
        action="USER_LOGIN",
        resource_type="user",
        resource_id=user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(audit)
    await db.commit()

    # Re-fetch user with organization eager-loaded to avoid DetachedInstanceError
    res = await db.execute(
        select(User).options(selectinload(User.organization)).where(User.id == user.id)
    )
    user = res.scalar_one()

    token_data = {"sub": str(user.id), "role": user.role, "org": str(user.organization_id) if user.organization_id else None}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user=UserRead.model_validate(user),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(body.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    result = await db.execute(select(User).options(selectinload(User.organization)).where(User.id == payload["sub"], User.is_active == True))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    token_data = {"sub": str(user.id), "role": user.role, "org": str(user.organization_id) if user.organization_id else None}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user=UserRead.model_validate(user),
    )


@router.get("/me", response_model=UserRead)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserRead.model_validate(current_user)
