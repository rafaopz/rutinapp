"""Modelos de prescripción: rutinas, días y ejercicios planeados."""
from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    Boolean,
    ForeignKey,
    Identity,
    Numeric,
    SmallInteger,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.exercise import Exercise
    from app.models.user import User
    from app.models.workout import WorkoutSession


class Routine(Base, TimestampMixin):
    """Un split/plan completo (ej. 'Push/Pull/Legs 5 días')."""

    __tablename__ = "routines"

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    days_per_week: Mapped[int | None] = mapped_column(SmallInteger)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # Indicaciones generales del plan (calentamiento, progresión, notas).
    notes: Mapped[str | None] = mapped_column(Text)

    user: Mapped["User"] = relationship(back_populates="routines")
    days: Mapped[list["RoutineDay"]] = relationship(
        back_populates="routine",
        cascade="all, delete-orphan",
        order_by="RoutineDay.day_order",
    )


class RoutineDay(Base):
    """Cada día dentro del split (ej. 'Día 1 – Pecho/Tríceps')."""

    __tablename__ = "routine_days"
    __table_args__ = (
        UniqueConstraint("routine_id", "day_order", name="routine_day_order"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    routine_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("routines.id", ondelete="CASCADE"),
        nullable=False,
    )
    day_order: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    name: Mapped[str | None] = mapped_column(Text)

    routine: Mapped["Routine"] = relationship(back_populates="days")
    exercises: Mapped[list["RoutineDayExercise"]] = relationship(
        back_populates="routine_day",
        cascade="all, delete-orphan",
        order_by="RoutineDayExercise.order_index",
    )
    sessions: Mapped[list["WorkoutSession"]] = relationship(
        back_populates="routine_day"
    )


class RoutineDayExercise(Base):
    """Prescripción: qué ejercicios y objetivos toca ese día."""

    __tablename__ = "routine_day_exercises"

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    routine_day_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("routine_days.id", ondelete="CASCADE"),
        nullable=False,
    )
    exercise_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("exercises.id"), nullable=False
    )
    order_index: Mapped[int | None] = mapped_column(SmallInteger)
    target_sets: Mapped[int | None] = mapped_column(SmallInteger)
    target_reps_min: Mapped[int | None] = mapped_column(SmallInteger)
    target_reps_max: Mapped[int | None] = mapped_column(SmallInteger)
    target_weight: Mapped[float | None] = mapped_column(Numeric(6, 2))
    rest_seconds: Mapped[int | None] = mapped_column(SmallInteger)

    routine_day: Mapped["RoutineDay"] = relationship(back_populates="exercises")
    exercise: Mapped["Exercise"] = relationship(
        back_populates="routine_day_exercises"
    )
