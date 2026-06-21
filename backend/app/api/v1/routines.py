"""Endpoints de rutinas, días y ejercicios prescritos."""
from __future__ import annotations

from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.routine import (
    RoutineCreate,
    RoutineDayCreate,
    RoutineDayExerciseCreate,
    RoutineDayExerciseRead,
    RoutineDayExerciseUpdate,
    RoutineDayRead,
    RoutineDayUpdate,
    RoutineRead,
    RoutineSummary,
    RoutineUpdate,
)
from app.services import routine as routine_service

router = APIRouter(tags=["routines"])


# --- Rutinas ------------------------------------------------------------
@router.get("/routines", response_model=list[RoutineSummary])
def list_routines(db: DbSession, user: CurrentUser) -> list[RoutineSummary]:
    return routine_service.list_routines(db, user)


@router.post(
    "/routines", response_model=RoutineRead, status_code=status.HTTP_201_CREATED
)
def create_routine(
    data: RoutineCreate, db: DbSession, user: CurrentUser
) -> RoutineRead:
    return routine_service.create_routine(db, user, data)


@router.get("/routines/{routine_id}", response_model=RoutineRead)
def get_routine(
    routine_id: int, db: DbSession, user: CurrentUser
) -> RoutineRead:
    return routine_service.get_routine(db, user, routine_id)


@router.patch("/routines/{routine_id}", response_model=RoutineRead)
def update_routine(
    routine_id: int,
    data: RoutineUpdate,
    db: DbSession,
    user: CurrentUser,
) -> RoutineRead:
    return routine_service.update_routine(db, user, routine_id, data)


@router.delete(
    "/routines/{routine_id}", status_code=status.HTTP_204_NO_CONTENT
)
def delete_routine(routine_id: int, db: DbSession, user: CurrentUser) -> None:
    routine_service.delete_routine(db, user, routine_id)


@router.post("/routines/{routine_id}/activate", response_model=RoutineRead)
def activate_routine(
    routine_id: int, db: DbSession, user: CurrentUser
) -> RoutineRead:
    return routine_service.activate_routine(db, user, routine_id)


# --- Días ---------------------------------------------------------------
@router.post(
    "/routines/{routine_id}/days",
    response_model=RoutineDayRead,
    status_code=status.HTTP_201_CREATED,
)
def add_day(
    routine_id: int,
    data: RoutineDayCreate,
    db: DbSession,
    user: CurrentUser,
) -> RoutineDayRead:
    return routine_service.add_day(db, user, routine_id, data)


@router.patch("/routine-days/{day_id}", response_model=RoutineDayRead)
def update_day(
    day_id: int,
    data: RoutineDayUpdate,
    db: DbSession,
    user: CurrentUser,
) -> RoutineDayRead:
    return routine_service.update_day(db, user, day_id, data)


@router.delete("/routine-days/{day_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_day(day_id: int, db: DbSession, user: CurrentUser) -> None:
    routine_service.delete_day(db, user, day_id)


# --- Ejercicios prescritos ----------------------------------------------
@router.post(
    "/routine-days/{day_id}/exercises",
    response_model=RoutineDayExerciseRead,
    status_code=status.HTTP_201_CREATED,
)
def add_day_exercise(
    day_id: int,
    data: RoutineDayExerciseCreate,
    db: DbSession,
    user: CurrentUser,
) -> RoutineDayExerciseRead:
    return routine_service.add_day_exercise(db, user, day_id, data)


@router.patch(
    "/routine-day-exercises/{rde_id}", response_model=RoutineDayExerciseRead
)
def update_day_exercise(
    rde_id: int,
    data: RoutineDayExerciseUpdate,
    db: DbSession,
    user: CurrentUser,
) -> RoutineDayExerciseRead:
    return routine_service.update_day_exercise(db, user, rde_id, data)


@router.delete(
    "/routine-day-exercises/{rde_id}", status_code=status.HTTP_204_NO_CONTENT
)
def delete_day_exercise(
    rde_id: int, db: DbSession, user: CurrentUser
) -> None:
    routine_service.delete_day_exercise(db, user, rde_id)
