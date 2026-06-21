"""Objetivos: metas de peso corporal y de 1RM por ejercicio."""
from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    Date,
    ForeignKey,
    Identity,
    Numeric,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.exercise import Exercise
    from app.models.user import User


class Goal(Base, TimestampMixin):
    """Meta medible. `goal_type` distingue bodyweight / 1RM / etc.

    Si la meta es de 1RM, `exercise_id` apunta al ejercicio; para metas de
    peso corporal queda NULL.
    """

    __tablename__ = "goals"

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    goal_type: Mapped[str] = mapped_column(Text, nullable=False)
    exercise_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("exercises.id", ondelete="CASCADE")
    )
    target_value: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    target_date: Mapped[date | None] = mapped_column(Date)

    user: Mapped["User"] = relationship(back_populates="goals")
    exercise: Mapped["Exercise | None"] = relationship()
