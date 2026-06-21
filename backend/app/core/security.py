"""Utilidades de seguridad: hashing de contraseñas y tokens JWT/refresh.

- Contraseñas: bcrypt (vía la librería `bcrypt` directamente).
- Access token: JWT firmado (HS256) con `sub`=user_id, `exp`, `type=access`.
- Refresh token: opaco y aleatorio; en la BD se guarda solo su hash SHA-256
  para poder revocarlo por dispositivo.
"""
from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.core.config import settings

ACCESS_TOKEN_TYPE = "access"
# bcrypt solo considera los primeros 72 bytes de la contraseña.
_BCRYPT_MAX_BYTES = 72


# --- Contraseñas -----------------------------------------------------------
def hash_password(password: str) -> str:
    pwd = password.encode("utf-8")[:_BCRYPT_MAX_BYTES]
    return bcrypt.hashpw(pwd, bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    pwd = password.encode("utf-8")[:_BCRYPT_MAX_BYTES]
    try:
        return bcrypt.checkpw(pwd, hashed.encode("utf-8"))
    except ValueError:
        return False


# --- Access token (JWT) ----------------------------------------------------
def create_access_token(subject: str | int) -> str:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(subject),
        "type": ACCESS_TOKEN_TYPE,
        "iat": now,
        "exp": expire,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Devuelve el payload o lanza jwt.PyJWTError si es inválido/expirado."""
    return jwt.decode(
        token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
    )


# --- Refresh token (opaco, hash en BD) -------------------------------------
def generate_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def hash_refresh_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def refresh_token_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
