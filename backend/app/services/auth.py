"""Lógica de negocio de autenticación: registro, login y refresh tokens.

Los refresh tokens se persisten hasheados en `refresh_tokens` para soportar
revocación (logout) y rotación en cada uso.
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core import security
from app.models.user import RefreshToken, User
from app.schemas.token import Token
from app.schemas.user import UserCreate


class AuthError(Exception):
    """Error de dominio de autenticación (lo traduce la capa de API)."""


def get_user_by_username(db: Session, username: str) -> User | None:
    return db.scalar(select(User).where(User.username == username))


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email))


def register_user(db: Session, data: UserCreate) -> User:
    if get_user_by_username(db, data.username) is not None:
        raise AuthError("El nombre de usuario ya está en uso")
    if data.email is not None and get_user_by_email(db, data.email) is not None:
        raise AuthError("El email ya está registrado")
    user = User(
        username=data.username,
        email=data.email,
        display_name=data.display_name,
        hashed_password=security.hash_password(data.password),
        preferred_unit=data.preferred_unit,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate(db: Session, username: str, password: str) -> User:
    user = get_user_by_username(db, username)
    if user is None or not security.verify_password(
        password, user.hashed_password
    ):
        raise AuthError("Credenciales inválidas")
    if not user.is_active:
        raise AuthError("Usuario inactivo")
    return user


def _issue_refresh_token(db: Session, user: User) -> str:
    """Crea y persiste (hasheado) un nuevo refresh token; devuelve el crudo."""
    raw = security.generate_refresh_token()
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=security.hash_refresh_token(raw),
            expires_at=security.refresh_token_expiry(),
        )
    )
    return raw


def issue_tokens(db: Session, user: User) -> Token:
    """Emite un par access + refresh para un usuario ya autenticado."""
    raw_refresh = _issue_refresh_token(db, user)
    db.commit()
    return Token(
        access_token=security.create_access_token(user.id),
        refresh_token=raw_refresh,
    )


def _get_valid_refresh_row(db: Session, raw_token: str) -> RefreshToken:
    row = db.scalar(
        select(RefreshToken).where(
            RefreshToken.token_hash == security.hash_refresh_token(raw_token)
        )
    )
    if row is None or row.revoked:
        raise AuthError("Refresh token inválido")
    if row.expires_at <= datetime.now(timezone.utc):
        raise AuthError("Refresh token expirado")
    return row


def rotate_tokens(db: Session, raw_token: str) -> Token:
    """Valida un refresh token, lo revoca y emite un par nuevo (rotación)."""
    row = _get_valid_refresh_row(db, raw_token)
    row.revoked = True  # rotación: un refresh token es de un solo uso
    user = db.get(User, row.user_id)
    if user is None or not user.is_active:
        db.commit()
        raise AuthError("Usuario inválido")
    new_raw = _issue_refresh_token(db, user)
    db.commit()
    return Token(
        access_token=security.create_access_token(user.id),
        refresh_token=new_raw,
    )


def revoke_refresh_token(db: Session, raw_token: str) -> None:
    """Logout: revoca el refresh token si existe (idempotente)."""
    row = db.scalar(
        select(RefreshToken).where(
            RefreshToken.token_hash == security.hash_refresh_token(raw_token)
        )
    )
    if row is not None and not row.revoked:
        row.revoked = True
        db.commit()
