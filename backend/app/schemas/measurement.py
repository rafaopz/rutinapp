"""Schemas de medidas corporales (recomposición)."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class BodyMeasurementCreate(BaseModel):
    measured_at: datetime | None = None
    weight: float | None = Field(default=None, ge=0)
    body_fat_pct: float | None = Field(default=None, ge=0, le=100)
    waist_cm: float | None = Field(default=None, ge=0)
    hip_cm: float | None = Field(default=None, ge=0)
    chest_cm: float | None = Field(default=None, ge=0)
    arm_cm: float | None = Field(default=None, ge=0)
    thigh_cm: float | None = Field(default=None, ge=0)
    neck_cm: float | None = Field(default=None, ge=0)
    notes: str | None = None


class BodyMeasurementUpdate(BaseModel):
    measured_at: datetime | None = None
    weight: float | None = Field(default=None, ge=0)
    body_fat_pct: float | None = Field(default=None, ge=0, le=100)
    waist_cm: float | None = Field(default=None, ge=0)
    hip_cm: float | None = Field(default=None, ge=0)
    chest_cm: float | None = Field(default=None, ge=0)
    arm_cm: float | None = Field(default=None, ge=0)
    thigh_cm: float | None = Field(default=None, ge=0)
    neck_cm: float | None = Field(default=None, ge=0)
    notes: str | None = None


class BodyMeasurementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    measured_at: datetime
    weight: float | None
    body_fat_pct: float | None
    waist_cm: float | None
    hip_cm: float | None
    chest_cm: float | None
    arm_cm: float | None
    thigh_cm: float | None
    neck_cm: float | None
    notes: str | None
