"""Schemas de rutinas, días y ejercicios prescritos (prescripción)."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.exercise import ExerciseRead


# --- Ejercicio prescrito dentro de un día -------------------------------
class RoutineDayExerciseCreate(BaseModel):
    exercise_id: int
    order_index: int | None = None
    target_sets: int | None = Field(default=None, ge=1, le=20)
    target_reps_min: int | None = Field(default=None, ge=1, le=100)
    target_reps_max: int | None = Field(default=None, ge=1, le=100)
    target_weight: float | None = Field(default=None, ge=0)
    rest_seconds: int | None = Field(default=None, ge=0, le=3600)

    @model_validator(mode="after")
    def _check_reps_range(self) -> "RoutineDayExerciseCreate":
        if (
            self.target_reps_min is not None
            and self.target_reps_max is not None
            and self.target_reps_min > self.target_reps_max
        ):
            raise ValueError("target_reps_min no puede ser mayor que target_reps_max")
        return self


class RoutineDayExerciseUpdate(BaseModel):
    order_index: int | None = None
    target_sets: int | None = Field(default=None, ge=1, le=20)
    target_reps_min: int | None = Field(default=None, ge=1, le=100)
    target_reps_max: int | None = Field(default=None, ge=1, le=100)
    target_weight: float | None = Field(default=None, ge=0)
    rest_seconds: int | None = Field(default=None, ge=0, le=3600)


class RoutineDayExerciseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_index: int | None
    target_sets: int | None
    target_reps_min: int | None
    target_reps_max: int | None
    target_weight: float | None
    rest_seconds: int | None
    exercise: ExerciseRead


# --- Día de la rutina ---------------------------------------------------
class RoutineDayCreate(BaseModel):
    day_order: int = Field(ge=1, le=14)
    name: str | None = Field(default=None, max_length=120)
    exercises: list[RoutineDayExerciseCreate] = Field(default_factory=list)


class RoutineDayUpdate(BaseModel):
    day_order: int | None = Field(default=None, ge=1, le=14)
    name: str | None = Field(default=None, max_length=120)


class RoutineDayRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    day_order: int
    name: str | None
    exercises: list[RoutineDayExerciseRead]


# --- Rutina -------------------------------------------------------------
class RoutineCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    days_per_week: int | None = Field(default=None, ge=1, le=14)
    is_active: bool = True
    notes: str | None = None
    days: list[RoutineDayCreate] = Field(default_factory=list)


class RoutineUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    days_per_week: int | None = Field(default=None, ge=1, le=14)
    is_active: bool | None = None
    notes: str | None = None


class RoutineSummary(BaseModel):
    """Vista ligera para el listado (sin días)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    days_per_week: int | None
    is_active: bool
    notes: str | None
    created_at: datetime


class RoutineRead(RoutineSummary):
    days: list[RoutineDayRead]
