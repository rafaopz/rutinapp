"""Excepciones de dominio compartidas por los servicios.

Los servicios lanzan estas excepciones; FastAPI las traduce a respuestas HTTP
mediante los handlers registrados en `app.main` (sin try/except por endpoint).
"""
from __future__ import annotations


class DomainError(Exception):
    """Base de los errores de dominio."""


class NotFoundError(DomainError):
    """El recurso solicitado no existe (→ 404)."""


class ConflictError(DomainError):
    """Conflicto de estado, p. ej. duplicado (→ 409)."""


class ForbiddenError(DomainError):
    """El usuario no es dueño del recurso (→ 403)."""
