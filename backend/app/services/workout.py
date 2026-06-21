"""Lógica de negocio del logging de entrenamiento: sesiones y series.

Todo está acotado al usuario dueño de la sesión. Los ejercicios deben ser
accesibles (globales o propios) y el `routine_day_id` (si se indica) debe
pertenecer a una rutina del usuario.
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.routine import RoutineDay
from app.models.user import User
from app.models.workout import SetLog, WorkoutSession
from app.schemas.workout import (
    SetLogCreate,
    SetLogUpdate,
    WorkoutSessionCreate,
    WorkoutSessionUpdate,
)
from app.services import exercise as exercise_service
from app.services.exceptions import NotFoundError


def _validate_routine_day(db: Session, user: User, day_id: int | None) -> None:
    if day_id is None:
        return
    day = db.get(RoutineDay, day_id)
    if day is None or day.routine.user_id != user.id:
        raise NotFoundError("Día de rutina no encontrado")


def _build_set_log(db: Session, user: User, data: SetLogCreate) -> SetLog:
    exercise_service.get_accessible_exercise(db, user, data.exercise_id)
    return SetLog(
        exercise_id=data.exercise_id,
        set_number=data.set_number,
        weight=data.weight,
        reps=data.reps,
        rpe=data.rpe,
        is_warmup=data.is_warmup,
    )


# --- Sesiones -----------------------------------------------------------
def list_sessions(db: Session, user: User) -> list[WorkoutSession]:
    return list(
        db.scalars(
            select(WorkoutSession)
            .where(WorkoutSession.user_id == user.id)
            .order_by(WorkoutSession.performed_at.desc())
        )
    )


def get_session(db: Session, user: User, session_id: int) -> WorkoutSession:
    session = db.get(WorkoutSession, session_id)
    if session is None or session.user_id != user.id:
        raise NotFoundError("Sesión no encontrada")
    return session


def create_session(
    db: Session, user: User, data: WorkoutSessionCreate
) -> WorkoutSession:
    _validate_routine_day(db, user, data.routine_day_id)
    session = WorkoutSession(
        user_id=user.id,
        routine_day_id=data.routine_day_id,
        bodyweight=data.bodyweight,
        notes=data.notes,
        duration_seconds=data.duration_seconds,
    )
    if data.performed_at is not None:
        session.performed_at = data.performed_at
    session.set_logs = [_build_set_log(db, user, s) for s in data.sets]
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def update_session(
    db: Session, user: User, session_id: int, data: WorkoutSessionUpdate
) -> WorkoutSession:
    session = get_session(db, user, session_id)
    fields = data.model_dump(exclude_unset=True)
    if "routine_day_id" in fields:
        _validate_routine_day(db, user, fields["routine_day_id"])
    for key, value in fields.items():
        setattr(session, key, value)
    db.commit()
    db.refresh(session)
    return session


def delete_session(db: Session, user: User, session_id: int) -> None:
    session = get_session(db, user, session_id)
    db.delete(session)
    db.commit()


# --- Series -------------------------------------------------------------
def _get_set_log(db: Session, user: User, set_id: int) -> SetLog:
    set_log = db.get(SetLog, set_id)
    if set_log is None or set_log.session.user_id != user.id:
        raise NotFoundError("Serie no encontrada")
    return set_log


def add_set(
    db: Session, user: User, session_id: int, data: SetLogCreate
) -> SetLog:
    session = get_session(db, user, session_id)
    set_log = _build_set_log(db, user, data)
    set_log.session_id = session.id
    db.add(set_log)
    db.commit()
    db.refresh(set_log)
    return set_log


def update_set(
    db: Session, user: User, set_id: int, data: SetLogUpdate
) -> SetLog:
    set_log = _get_set_log(db, user, set_id)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(set_log, key, value)
    db.commit()
    db.refresh(set_log)
    return set_log


def delete_set(db: Session, user: User, set_id: int) -> None:
    set_log = _get_set_log(db, user, set_id)
    db.delete(set_log)
    db.commit()
