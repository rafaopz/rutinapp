"""Endpoints de autenticación: registro, login, refresh, logout y perfil."""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.api.deps import CurrentUser, DbSession
from app.schemas.token import Token, TokenRefresh
from app.schemas.user import UserCreate, UserRead
from app.services import auth as auth_service
from app.services.auth import AuthError

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register", response_model=UserRead, status_code=status.HTTP_201_CREATED
)
def register(data: UserCreate, db: DbSession) -> UserRead:
    try:
        user = auth_service.register_user(db, data)
    except AuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(exc)
        )
    return user


@router.post("/login", response_model=Token)
def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: DbSession,
) -> Token:
    """OAuth2 Password Flow. El campo `username` es el nombre de usuario."""
    try:
        user = auth_service.authenticate(
            db, form_data.username, form_data.password
        )
    except AuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        )
    return auth_service.issue_tokens(db, user)


@router.post("/refresh", response_model=Token)
def refresh(data: TokenRefresh, db: DbSession) -> Token:
    try:
        return auth_service.rotate_tokens(db, data.refresh_token)
    except AuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)
        )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(data: TokenRefresh, db: DbSession) -> None:
    auth_service.revoke_refresh_token(db, data.refresh_token)


@router.get("/me", response_model=UserRead)
def me(current_user: CurrentUser) -> UserRead:
    return current_user
