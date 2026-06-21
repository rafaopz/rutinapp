"""Endpoints de objetivos."""
from __future__ import annotations

from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.goal import GoalCreate, GoalRead, GoalUpdate
from app.services import goal as goal_service

router = APIRouter(prefix="/goals", tags=["goals"])


@router.get("", response_model=list[GoalRead])
def list_goals(db: DbSession, user: CurrentUser) -> list[GoalRead]:
    return goal_service.list_goals(db, user)


@router.post("", response_model=GoalRead, status_code=status.HTTP_201_CREATED)
def create_goal(
    data: GoalCreate, db: DbSession, user: CurrentUser
) -> GoalRead:
    return goal_service.create_goal(db, user, data)


@router.get("/{goal_id}", response_model=GoalRead)
def get_goal(goal_id: int, db: DbSession, user: CurrentUser) -> GoalRead:
    return goal_service.get_goal(db, user, goal_id)


@router.patch("/{goal_id}", response_model=GoalRead)
def update_goal(
    goal_id: int, data: GoalUpdate, db: DbSession, user: CurrentUser
) -> GoalRead:
    return goal_service.update_goal(db, user, goal_id, data)


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(goal_id: int, db: DbSession, user: CurrentUser) -> None:
    goal_service.delete_goal(db, user, goal_id)
