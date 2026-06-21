"""Endpoints de logging de entrenamiento: sesiones y series."""
from __future__ import annotations

from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.workout import (
    SetLogCreate,
    SetLogRead,
    SetLogUpdate,
    WorkoutSessionCreate,
    WorkoutSessionRead,
    WorkoutSessionSummary,
    WorkoutSessionUpdate,
)
from app.services import workout as workout_service

router = APIRouter(tags=["workouts"])


# --- Sesiones -----------------------------------------------------------
@router.get("/sessions", response_model=list[WorkoutSessionSummary])
def list_sessions(
    db: DbSession, user: CurrentUser
) -> list[WorkoutSessionSummary]:
    return workout_service.list_sessions(db, user)


@router.post(
    "/sessions",
    response_model=WorkoutSessionRead,
    status_code=status.HTTP_201_CREATED,
)
def create_session(
    data: WorkoutSessionCreate, db: DbSession, user: CurrentUser
) -> WorkoutSessionRead:
    return workout_service.create_session(db, user, data)


@router.get("/sessions/{session_id}", response_model=WorkoutSessionRead)
def get_session(
    session_id: int, db: DbSession, user: CurrentUser
) -> WorkoutSessionRead:
    return workout_service.get_session(db, user, session_id)


@router.patch("/sessions/{session_id}", response_model=WorkoutSessionRead)
def update_session(
    session_id: int,
    data: WorkoutSessionUpdate,
    db: DbSession,
    user: CurrentUser,
) -> WorkoutSessionRead:
    return workout_service.update_session(db, user, session_id, data)


@router.delete(
    "/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT
)
def delete_session(session_id: int, db: DbSession, user: CurrentUser) -> None:
    workout_service.delete_session(db, user, session_id)


# --- Series -------------------------------------------------------------
@router.post(
    "/sessions/{session_id}/sets",
    response_model=SetLogRead,
    status_code=status.HTTP_201_CREATED,
)
def add_set(
    session_id: int,
    data: SetLogCreate,
    db: DbSession,
    user: CurrentUser,
) -> SetLogRead:
    return workout_service.add_set(db, user, session_id, data)


@router.patch("/sets/{set_id}", response_model=SetLogRead)
def update_set(
    set_id: int,
    data: SetLogUpdate,
    db: DbSession,
    user: CurrentUser,
) -> SetLogRead:
    return workout_service.update_set(db, user, set_id, data)


@router.delete("/sets/{set_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_set(set_id: int, db: DbSession, user: CurrentUser) -> None:
    workout_service.delete_set(db, user, set_id)
