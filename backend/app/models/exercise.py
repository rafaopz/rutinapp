"""Catálogo de ejercicios y grupos musculares (lookup)."""
from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Boolean, ForeignKey, Identity, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.routine import RoutineDayExercise
    from app.models.user import User
    from app.models.workout import SetLog


class MuscleGroup(Base):
    """Lookup de grupos musculares: agrupa volumen sin errores de tipeo."""

    __tablename__ = "muscle_groups"

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    name: Mapped[str] = mapped_column(Text, unique=True, nullable=False)

    exercises: Mapped[list["Exercise"]] = relationship(
        back_populates="primary_muscle"
    )


class Exercise(Base):
    """Catálogo reutilizable de ejercicios (globales o creados por el usuario)."""

    __tablename__ = "exercises"

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    primary_muscle_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("muscle_groups.id", ondelete="SET NULL")
    )
    equipment: Mapped[str | None] = mapped_column(Text)
    # Recursos visuales y guía técnica (para usar la app como guía de entreno).
    image_url: Mapped[str | None] = mapped_column(Text)
    video_url: Mapped[str | None] = mapped_column(Text)
    instructions: Mapped[str | None] = mapped_column(Text)
    is_custom: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    # NULL = ejercicio global; con valor = creado por ese usuario.
    owner_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE")
    )

    primary_muscle: Mapped["MuscleGroup | None"] = relationship(
        back_populates="exercises"
    )
    owner: Mapped["User | None"] = relationship(
        back_populates="custom_exercises"
    )
    routine_day_exercises: Mapped[list["RoutineDayExercise"]] = relationship(
        back_populates="exercise"
    )
    set_logs: Mapped[list["SetLog"]] = relationship(back_populates="exercise")
