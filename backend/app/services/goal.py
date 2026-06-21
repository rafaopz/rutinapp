"""Lógica de negocio de objetivos (acotada al usuario)."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.goal import Goal
from app.models.user import User
from app.schemas.goal import GoalCreate, GoalUpdate
from app.services import exercise as exercise_service
from app.services.exceptions import NotFoundError


def list_goals(db: Session, user: User) -> list[Goal]:
    return list(
        db.scalars(
            select(Goal)
            .where(Goal.user_id == user.id)
            .order_by(Goal.created_at.desc())
        )
    )


def get_goal(db: Session, user: User, goal_id: int) -> Goal:
    goal = db.get(Goal, goal_id)
    if goal is None or goal.user_id != user.id:
        raise NotFoundError("Objetivo no encontrado")
    return goal


def create_goal(db: Session, user: User, data: GoalCreate) -> Goal:
    if data.exercise_id is not None:
        # Valida que el ejercicio sea accesible (global o propio).
        exercise_service.get_accessible_exercise(db, user, data.exercise_id)
    goal = Goal(
        user_id=user.id,
        goal_type=data.goal_type,
        target_value=data.target_value,
        exercise_id=data.exercise_id,
        target_date=data.target_date,
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


def update_goal(
    db: Session, user: User, goal_id: int, data: GoalUpdate
) -> Goal:
    goal = get_goal(db, user, goal_id)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(goal, key, value)
    db.commit()
    db.refresh(goal)
    return goal


def delete_goal(db: Session, user: User, goal_id: int) -> None:
    goal = get_goal(db, user, goal_id)
    db.delete(goal)
    db.commit()
