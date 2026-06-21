"""Schemas de grupos musculares (lookup)."""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class MuscleGroupCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)


class MuscleGroupRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
