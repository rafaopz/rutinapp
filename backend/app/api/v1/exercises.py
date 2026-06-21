"""Endpoints del catálogo de ejercicios (globales + personalizados)."""
from __future__ import annotations

from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.exercise import ExerciseCreate, ExerciseRead, ExerciseUpdate
from app.services import exercise as exercise_service

router = APIRouter(prefix="/exercises", tags=["exercises"])


@router.get("", response_model=list[ExerciseRead])
def list_exercises(
    db: DbSession,
    user: CurrentUser,
    muscle_id: int | None = None,
    search: str | None = None,
) -> list[ExerciseRead]:
    return exercise_service.list_exercises(db, user, muscle_id, search)


@router.post(
    "", response_model=ExerciseRead, status_code=status.HTTP_201_CREATED
)
def create_exercise(
    data: ExerciseCreate, db: DbSession, user: CurrentUser
) -> ExerciseRead:
    return exercise_service.create_exercise(db, user, data)


@router.get("/{exercise_id}", response_model=ExerciseRead)
def get_exercise(
    exercise_id: int, db: DbSession, user: CurrentUser
) -> ExerciseRead:
    return exercise_service.get_accessible_exercise(db, user, exercise_id)


@router.patch("/{exercise_id}", response_model=ExerciseRead)
def update_exercise(
    exercise_id: int,
    data: ExerciseUpdate,
    db: DbSession,
    user: CurrentUser,
) -> ExerciseRead:
    return exercise_service.update_exercise(db, user, exercise_id, data)


@router.delete("/{exercise_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_exercise(
    exercise_id: int, db: DbSession, user: CurrentUser
) -> None:
    exercise_service.delete_exercise(db, user, exercise_id)
