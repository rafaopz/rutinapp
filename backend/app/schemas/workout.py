"""Schemas de ejecución: sesiones de entrenamiento y series (set_logs)."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.exercise import ExerciseRead


# --- Series (set_logs) --------------------------------------------------
class SetLogCreate(BaseModel):
    exercise_id: int
    set_number: int = Field(ge=1, le=50)
    weight: float = Field(ge=0)
    reps: int = Field(ge=1, le=1000)
    rpe: float | None = Field(default=None, ge=0, le=10)
    is_warmup: bool = False


class SetLogUpdate(BaseModel):
    set_number: int | None = Field(default=None, ge=1, le=50)
    weight: float | None = Field(default=None, ge=0)
    reps: int | None = Field(default=None, ge=1, le=1000)
    rpe: float | None = Field(default=None, ge=0, le=10)
    is_warmup: bool | None = None


class SetLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    set_number: int
    weight: float
    reps: int
    rpe: float | None
    is_warmup: bool
    exercise: ExerciseRead


# --- Sesiones (workout_sessions) ----------------------------------------
class WorkoutSessionCreate(BaseModel):
    routine_day_id: int | None = None
    performed_at: datetime | None = None
    bodyweight: float | None = Field(default=None, ge=0)
    notes: str | None = None
    duration_seconds: int | None = Field(default=None, ge=0)
    sets: list[SetLogCreate] = Field(default_factory=list)


class WorkoutSessionUpdate(BaseModel):
    routine_day_id: int | None = None
    performed_at: datetime | None = None
    bodyweight: float | None = Field(default=None, ge=0)
    notes: str | None = None
    duration_seconds: int | None = Field(default=None, ge=0)


class WorkoutSessionSummary(BaseModel):
    """Listado ligero (sin las series)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    routine_day_id: int | None
    performed_at: datetime
    bodyweight: float | None
    notes: str | None
    duration_seconds: int | None


class WorkoutSessionRead(WorkoutSessionSummary):
    set_logs: list[SetLogRead]
