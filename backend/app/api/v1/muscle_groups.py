"""Endpoints del catálogo de grupos musculares (lookup)."""
from __future__ import annotations

from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.muscle_group import MuscleGroupCreate, MuscleGroupRead
from app.services import exercise as exercise_service

router = APIRouter(prefix="/muscle-groups", tags=["muscle-groups"])


@router.get("", response_model=list[MuscleGroupRead])
def list_muscle_groups(db: DbSession, _: CurrentUser) -> list[MuscleGroupRead]:
    return exercise_service.list_muscle_groups(db)


@router.post(
    "", response_model=MuscleGroupRead, status_code=status.HTTP_201_CREATED
)
def create_muscle_group(
    data: MuscleGroupCreate, db: DbSession, _: CurrentUser
) -> MuscleGroupRead:
    return exercise_service.create_muscle_group(db, data)
