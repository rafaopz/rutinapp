"""Lógica de negocio del catálogo de ejercicios y grupos musculares.

Un ejercicio es accesible para un usuario si es global (`owner_id IS NULL`) o
si él mismo lo creó. Solo se pueden editar/borrar los propios.
"""
from __future__ import annotations

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.exercise import Exercise, MuscleGroup
from app.models.user import User
from app.schemas.exercise import ExerciseCreate, ExerciseUpdate
from app.schemas.muscle_group import MuscleGroupCreate
from app.services.exceptions import (
    ConflictError,
    ForbiddenError,
    NotFoundError,
)


# --- Grupos musculares --------------------------------------------------
def list_muscle_groups(db: Session) -> list[MuscleGroup]:
    return list(db.scalars(select(MuscleGroup).order_by(MuscleGroup.name)))


def create_muscle_group(db: Session, data: MuscleGroupCreate) -> MuscleGroup:
    exists = db.scalar(
        select(MuscleGroup).where(MuscleGroup.name == data.name)
    )
    if exists is not None:
        raise ConflictError("Ese grupo muscular ya existe")
    mg = MuscleGroup(name=data.name)
    db.add(mg)
    db.commit()
    db.refresh(mg)
    return mg


def _validate_muscle_group(db: Session, muscle_id: int | None) -> None:
    if muscle_id is None:
        return
    if db.get(MuscleGroup, muscle_id) is None:
        raise NotFoundError("Grupo muscular no encontrado")


# --- Ejercicios ---------------------------------------------------------
def list_exercises(
    db: Session,
    user: User,
    muscle_id: int | None = None,
    search: str | None = None,
) -> list[Exercise]:
    stmt = select(Exercise).where(
        or_(Exercise.owner_id.is_(None), Exercise.owner_id == user.id)
    )
    if muscle_id is not None:
        stmt = stmt.where(Exercise.primary_muscle_id == muscle_id)
    if search:
        stmt = stmt.where(Exercise.name.ilike(f"%{search}%"))
    stmt = stmt.order_by(Exercise.name)
    return list(db.scalars(stmt))


def get_accessible_exercise(db: Session, user: User, exercise_id: int) -> Exercise:
    ex = db.get(Exercise, exercise_id)
    if ex is None or (ex.owner_id is not None and ex.owner_id != user.id):
        raise NotFoundError("Ejercicio no encontrado")
    return ex


def _get_own_exercise(db: Session, user: User, exercise_id: int) -> Exercise:
    ex = db.get(Exercise, exercise_id)
    if ex is None:
        raise NotFoundError("Ejercicio no encontrado")
    if ex.owner_id != user.id:
        raise ForbiddenError("No puedes modificar este ejercicio")
    return ex


def create_exercise(db: Session, user: User, data: ExerciseCreate) -> Exercise:
    _validate_muscle_group(db, data.primary_muscle_id)
    ex = Exercise(
        name=data.name,
        primary_muscle_id=data.primary_muscle_id,
        equipment=data.equipment,
        image_url=data.image_url,
        video_url=data.video_url,
        instructions=data.instructions,
        is_custom=True,
        owner_id=user.id,
    )
    db.add(ex)
    db.commit()
    db.refresh(ex)
    return ex


def update_exercise(
    db: Session, user: User, exercise_id: int, data: ExerciseUpdate
) -> Exercise:
    ex = _get_own_exercise(db, user, exercise_id)
    fields = data.model_dump(exclude_unset=True)
    if "primary_muscle_id" in fields:
        _validate_muscle_group(db, fields["primary_muscle_id"])
    for key, value in fields.items():
        setattr(ex, key, value)
    db.commit()
    db.refresh(ex)
    return ex


def delete_exercise(db: Session, user: User, exercise_id: int) -> None:
    ex = _get_own_exercise(db, user, exercise_id)
    db.delete(ex)
    db.commit()
