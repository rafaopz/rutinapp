"""Modelos de ejecución: sesiones reales y series levantadas (fact table)."""
from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    Boolean,
    ForeignKey,
    Identity,
    Integer,
    Numeric,
    SmallInteger,
    Text,
    TIMESTAMP,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.exercise import Exercise
    from app.models.routine import RoutineDay
    from app.models.user import User


class WorkoutSession(Base):
    """Una sesión real de entrenamiento (instancia ejecutada)."""

    __tablename__ = "workout_sessions"

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    # NULL = sesión libre (no asociada a un día prescrito).
    routine_day_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("routine_days.id", ondelete="SET NULL")
    )
    performed_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )
    bodyweight: Mapped[float | None] = mapped_column(Numeric(5, 2))
    notes: Mapped[str | None] = mapped_column(Text)
    # Duración real del entrenamiento en segundos (del cronómetro).
    duration_seconds: Mapped[int | None] = mapped_column(Integer)

    user: Mapped["User"] = relationship(back_populates="sessions")
    routine_day: Mapped["RoutineDay | None"] = relationship(
        back_populates="sessions"
    )
    set_logs: Mapped[list["SetLog"]] = relationship(
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="SetLog.set_number",
    )


class SetLog(Base, TimestampMixin):
    """El corazón del sistema: cada serie levantada. Fact table tidy."""

    __tablename__ = "set_logs"

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    session_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("workout_sessions.id", ondelete="CASCADE"),
        nullable=False,
    )
    # Denormalizado a propósito para queries/analítica directa.
    exercise_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("exercises.id"), nullable=False
    )
    set_number: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    # NUMERIC, nunca FLOAT: evita errores de redondeo en pesos.
    weight: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    reps: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    rpe: Mapped[float | None] = mapped_column(Numeric(3, 1))
    is_warmup: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )

    session: Mapped["WorkoutSession"] = relationship(back_populates="set_logs")
    exercise: Mapped["Exercise"] = relationship(back_populates="set_logs")
