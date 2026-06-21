"""Lógica de negocio de rutinas, días y ejercicios prescritos.

Todo está acotado al usuario dueño de la rutina. La unicidad
(routine_id, day_order) la garantiza la BD; aquí traducimos el IntegrityError.
"""
from __future__ import annotations

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.routine import Routine, RoutineDay, RoutineDayExercise
from app.models.user import User
from app.schemas.routine import (
    RoutineCreate,
    RoutineDayCreate,
    RoutineDayExerciseCreate,
    RoutineDayExerciseUpdate,
    RoutineDayUpdate,
    RoutineUpdate,
)
from app.services import exercise as exercise_service
from app.services.exceptions import ConflictError, NotFoundError


def _deactivate_others(db: Session, user: User, keep_id: int | None) -> None:
    stmt = update(Routine).where(Routine.user_id == user.id)
    if keep_id is not None:
        stmt = stmt.where(Routine.id != keep_id)
    db.execute(stmt.values(is_active=False))


# --- Rutinas ------------------------------------------------------------
def list_routines(db: Session, user: User) -> list[Routine]:
    return list(
        db.scalars(
            select(Routine)
            .where(Routine.user_id == user.id)
            .order_by(Routine.created_at.desc())
        )
    )


def get_routine(db: Session, user: User, routine_id: int) -> Routine:
    routine = db.get(Routine, routine_id)
    if routine is None or routine.user_id != user.id:
        raise NotFoundError("Rutina no encontrada")
    return routine


def _build_day_exercise(
    db: Session, user: User, data: RoutineDayExerciseCreate
) -> RoutineDayExercise:
    # Valida que el ejercicio sea accesible (global o propio).
    exercise_service.get_accessible_exercise(db, user, data.exercise_id)
    return RoutineDayExercise(
        exercise_id=data.exercise_id,
        order_index=data.order_index,
        target_sets=data.target_sets,
        target_reps_min=data.target_reps_min,
        target_reps_max=data.target_reps_max,
        target_weight=data.target_weight,
        rest_seconds=data.rest_seconds,
    )


def create_routine(db: Session, user: User, data: RoutineCreate) -> Routine:
    routine = Routine(
        user_id=user.id,
        name=data.name,
        days_per_week=data.days_per_week,
        is_active=data.is_active,
        notes=data.notes,
    )
    for day in data.days:
        rd = RoutineDay(day_order=day.day_order, name=day.name)
        rd.exercises = [
            _build_day_exercise(db, user, ex) for ex in day.exercises
        ]
        routine.days.append(rd)

    if data.is_active:
        _deactivate_others(db, user, keep_id=None)
    db.add(routine)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ConflictError("Hay días con el mismo orden (day_order) repetido")
    db.refresh(routine)
    return routine


def update_routine(
    db: Session, user: User, routine_id: int, data: RoutineUpdate
) -> Routine:
    routine = get_routine(db, user, routine_id)
    fields = data.model_dump(exclude_unset=True)
    if fields.get("is_active") is True:
        _deactivate_others(db, user, keep_id=routine.id)
    for key, value in fields.items():
        setattr(routine, key, value)
    db.commit()
    db.refresh(routine)
    return routine


def delete_routine(db: Session, user: User, routine_id: int) -> None:
    routine = get_routine(db, user, routine_id)
    db.delete(routine)
    db.commit()


def activate_routine(db: Session, user: User, routine_id: int) -> Routine:
    routine = get_routine(db, user, routine_id)
    _deactivate_others(db, user, keep_id=routine.id)
    routine.is_active = True
    db.commit()
    db.refresh(routine)
    return routine


# --- Días ---------------------------------------------------------------
def _get_day(db: Session, user: User, day_id: int) -> RoutineDay:
    day = db.get(RoutineDay, day_id)
    if day is None or day.routine.user_id != user.id:
        raise NotFoundError("Día de rutina no encontrado")
    return day


def add_day(
    db: Session, user: User, routine_id: int, data: RoutineDayCreate
) -> RoutineDay:
    routine = get_routine(db, user, routine_id)
    day = RoutineDay(
        routine_id=routine.id, day_order=data.day_order, name=data.name
    )
    day.exercises = [_build_day_exercise(db, user, ex) for ex in data.exercises]
    db.add(day)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ConflictError("Ya existe un día con ese orden en la rutina")
    db.refresh(day)
    return day


def update_day(
    db: Session, user: User, day_id: int, data: RoutineDayUpdate
) -> RoutineDay:
    day = _get_day(db, user, day_id)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(day, key, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ConflictError("Ya existe un día con ese orden en la rutina")
    db.refresh(day)
    return day


def delete_day(db: Session, user: User, day_id: int) -> None:
    day = _get_day(db, user, day_id)
    db.delete(day)
    db.commit()


# --- Ejercicios prescritos ----------------------------------------------
def _get_day_exercise(
    db: Session, user: User, rde_id: int
) -> RoutineDayExercise:
    rde = db.get(RoutineDayExercise, rde_id)
    if rde is None or rde.routine_day.routine.user_id != user.id:
        raise NotFoundError("Ejercicio prescrito no encontrado")
    return rde


def add_day_exercise(
    db: Session, user: User, day_id: int, data: RoutineDayExerciseCreate
) -> RoutineDayExercise:
    day = _get_day(db, user, day_id)
    rde = _build_day_exercise(db, user, data)
    rde.routine_day_id = day.id
    db.add(rde)
    db.commit()
    db.refresh(rde)
    return rde


def update_day_exercise(
    db: Session, user: User, rde_id: int, data: RoutineDayExerciseUpdate
) -> RoutineDayExercise:
    rde = _get_day_exercise(db, user, rde_id)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(rde, key, value)
    db.commit()
    db.refresh(rde)
    return rde


def delete_day_exercise(db: Session, user: User, rde_id: int) -> None:
    rde = _get_day_exercise(db, user, rde_id)
    db.delete(rde)
    db.commit()
