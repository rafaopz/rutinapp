"""Schemas de ejercicios (catálogo global + personalizados)."""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.muscle_group import MuscleGroupRead


class ExerciseCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    primary_muscle_id: int | None = None
    equipment: str | None = Field(default=None, max_length=80)
    image_url: str | None = Field(default=None, max_length=500)
    video_url: str | None = Field(default=None, max_length=500)
    instructions: str | None = None


class ExerciseUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    primary_muscle_id: int | None = None
    equipment: str | None = Field(default=None, max_length=80)
    image_url: str | None = Field(default=None, max_length=500)
    video_url: str | None = Field(default=None, max_length=500)
    instructions: str | None = None


class ExerciseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    equipment: str | None
    image_url: str | None
    video_url: str | None
    instructions: str | None
    is_custom: bool
    owner_id: int | None
    primary_muscle: MuscleGroupRead | None
