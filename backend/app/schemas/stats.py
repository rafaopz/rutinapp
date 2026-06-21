"""Schemas de analítica: progresión y récords personales (1RM estimado)."""
from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel


class ProgressionPoint(BaseModel):
    """Mejor serie de trabajo de un día para un ejercicio (Epley)."""

    performed_date: date
    weight: float
    reps: int
    rpe: float | None
    est_1rm: float


class PersonalRecord(BaseModel):
    """Mejor 1RM estimado histórico de un ejercicio."""

    exercise_id: int
    exercise_name: str
    weight: float
    reps: int
    est_1rm: float
    performed_date: date


class SessionStat(BaseModel):
    """Agregados de una sesión para KPIs y gráficos (excluye calentamiento)."""

    session_id: int
    performed_at: datetime
    duration_seconds: int | None
    volume: float
    reps: int
    sets: int


class ExerciseHistoryPoint(BaseModel):
    """Mejores marcas de un día para un ejercicio (excluye calentamiento)."""

    performed_date: date
    max_weight: float
    best_1rm: float
    best_volume: float


class TopExercise(BaseModel):
    """Ejercicio realizado con más frecuencia (por series acumuladas)."""

    exercise_id: int
    exercise_name: str
    sets: int
    sessions: int


class MacroMuscle(BaseModel):
    """Series por macro-grupo muscular en el periodo actual vs el anterior."""

    name: str
    current: int
    previous: int


class PeriodTotals(BaseModel):
    workouts: int
    duration_seconds: int
    volume: float
    sets: int


class MuscleDistribution(BaseModel):
    """Distribución muscular + KPIs comparando dos periodos consecutivos."""

    muscles: list[MacroMuscle]
    current: PeriodTotals
    previous: PeriodTotals
