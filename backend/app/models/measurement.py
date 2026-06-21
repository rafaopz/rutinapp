"""Medidas corporales: el eje de la recomposición corporal."""
from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    ForeignKey,
    Identity,
    Numeric,
    Text,
    TIMESTAMP,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class BodyMeasurement(Base):
    """Peso, % grasa y circunferencias en el tiempo (independiente de entrenar)."""

    __tablename__ = "body_measurements"

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    measured_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )
    weight: Mapped[float | None] = mapped_column(Numeric(5, 2))
    body_fat_pct: Mapped[float | None] = mapped_column(Numeric(4, 1))
    waist_cm: Mapped[float | None] = mapped_column(Numeric(5, 2))
    hip_cm: Mapped[float | None] = mapped_column(Numeric(5, 2))
    chest_cm: Mapped[float | None] = mapped_column(Numeric(5, 2))
    arm_cm: Mapped[float | None] = mapped_column(Numeric(5, 2))
    thigh_cm: Mapped[float | None] = mapped_column(Numeric(5, 2))
    neck_cm: Mapped[float | None] = mapped_column(Numeric(5, 2))
    notes: Mapped[str | None] = mapped_column(Text)

    user: Mapped["User"] = relationship(back_populates="measurements")
