"""Punto de entrada de FastAPI.

Por ahora solo expone metadatos y un healthcheck que verifica la conexión a
PostgreSQL. Los routers de negocio (auth, rutinas, logs) se añadirán en la
siguiente fase bajo `app/api/v1`.
"""
from fastapi import Depends, FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.v1.router import api_router
from app.core.config import settings
from app.db.session import get_db
from app.services.exceptions import (
    ConflictError,
    DomainError,
    ForbiddenError,
    NotFoundError,
)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.1.0",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> dict:
    return {
        "app": settings.PROJECT_NAME,
        "version": "0.1.0",
        "docs": "/docs",
    }


@app.get("/health")
def health(db: Session = Depends(get_db)) -> dict:
    """Verifica que la app levanta y que la BD responde."""
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "connected"}


_DOMAIN_ERROR_STATUS = {
    NotFoundError: status.HTTP_404_NOT_FOUND,
    ConflictError: status.HTTP_409_CONFLICT,
    ForbiddenError: status.HTTP_403_FORBIDDEN,
}


@app.exception_handler(DomainError)
def handle_domain_error(request: Request, exc: DomainError) -> JSONResponse:
    code = _DOMAIN_ERROR_STATUS.get(type(exc), status.HTTP_400_BAD_REQUEST)
    return JSONResponse(status_code=code, content={"detail": str(exc)})


app.include_router(api_router, prefix=settings.API_V1_PREFIX)
