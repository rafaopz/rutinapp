"""Base declarativa de SQLAlchemy y convención de nombres de constraints.

La convención de nombres es importante para que Alembic genere migraciones
con nombres estables y deterministas (constraints, índices, FKs).
"""
from datetime import datetime

from sqlalchemy import MetaData, TIMESTAMP, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)


class TimestampMixin:
    """Añade `created_at` con TIMESTAMPTZ poblado por el servidor."""

    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )
