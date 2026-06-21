"""Endpoints de analítica: progresión y récords personales."""
from __future__ import annotations

from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, DbSession
from app.schemas.stats import (
    ExerciseHistoryPoint,
    MuscleDistribution,
    PersonalRecord,
    ProgressionPoint,
    SessionStat,
    TopExercise,
)
from app.services import stats as stats_service

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/sessions", response_model=list[SessionStat])
def session_stats(db: DbSession, user: CurrentUser) -> list[SessionStat]:
    """Agregados por sesión (volumen, reps, series, duración) para KPIs/gráficos."""
    return stats_service.get_session_stats(db, user)


@router.get(
    "/exercises/{exercise_id}/history",
    response_model=list[ExerciseHistoryPoint],
)
def exercise_history(
    exercise_id: int, db: DbSession, user: CurrentUser
) -> list[ExerciseHistoryPoint]:
    """Mejores marcas por día (peso máx, 1RM, mejor volumen) de un ejercicio."""
    return stats_service.get_exercise_history(db, user, exercise_id)


@router.get("/top-exercises", response_model=list[TopExercise])
def top_exercises(
    db: DbSession,
    user: CurrentUser,
    limit: int = Query(default=20, ge=1, le=100),
) -> list[TopExercise]:
    """Ejercicios realizados con más frecuencia (por series acumuladas)."""
    return stats_service.get_top_exercises(db, user, limit)


@router.get("/muscle-distribution", response_model=MuscleDistribution)
def muscle_distribution(
    db: DbSession,
    user: CurrentUser,
    days: int = Query(default=30, ge=1, le=365),
) -> MuscleDistribution:
    """Distribución por macro-grupo muscular + KPIs (periodo actual vs anterior)."""
    return stats_service.get_muscle_distribution(db, user, days)


@router.get(
    "/exercises/{exercise_id}/progression",
    response_model=list[ProgressionPoint],
)
def exercise_progression(
    exercise_id: int, db: DbSession, user: CurrentUser
) -> list[ProgressionPoint]:
    """Serie temporal del mejor 1RM estimado por día para un ejercicio."""
    return stats_service.get_progression(db, user, exercise_id)


@router.get("/personal-records", response_model=list[PersonalRecord])
def personal_records(
    db: DbSession, user: CurrentUser
) -> list[PersonalRecord]:
    """Mejor 1RM estimado histórico de cada ejercicio entrenado."""
    return stats_service.get_personal_records(db, user)
