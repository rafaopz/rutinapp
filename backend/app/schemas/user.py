"""Schemas Pydantic para usuarios."""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    # App de uso personal/local: mínimo permisivo a propósito.
    password: str = Field(min_length=3, max_length=128)
    # Email opcional de momento (app de uso personal).
    email: EmailStr | None = None
    display_name: str | None = None
    preferred_unit: Literal["kg", "lb"] = "kg"


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: EmailStr | None
    display_name: str | None
    is_active: bool
    preferred_unit: str
    created_at: datetime
