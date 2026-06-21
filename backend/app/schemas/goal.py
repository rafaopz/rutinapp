"""Schemas de objetivos (metas de peso corporal, % grasa y 1RM por ejercicio)."""
from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

# bodyweight = peso corporal meta; body_fat = % grasa meta; one_rm = 1RM por ejercicio.
GoalType = Literal["bodyweight", "body_fat", "one_rm"]


class GoalCreate(BaseModel):
    goal_type: GoalType
    target_value: float = Field(gt=0)
    exercise_id: int | None = None
    target_date: date | None = None

    @model_validator(mode="after")
    def _check_exercise(self) -> "GoalCreate":
        if self.goal_type == "one_rm" and self.exercise_id is None:
            raise ValueError("una meta de tipo 'one_rm' requiere exercise_id")
        if self.goal_type != "one_rm" and self.exercise_id is not None:
            raise ValueError("exercise_id solo aplica a metas 'one_rm'")
        return self


class GoalUpdate(BaseModel):
    target_value: float | None = Field(default=None, gt=0)
    target_date: date | None = None


class GoalRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    goal_type: str
    target_value: float
    exercise_id: int | None
    target_date: date | None
    created_at: datetime
