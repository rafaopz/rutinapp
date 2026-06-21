"""Agrupa todos los modelos para que Alembic detecte el metadata completo.

Importar este paquete garantiza que `Base.metadata` conozca todas las tablas
antes de autogenerar migraciones.
"""
from app.models.exercise import Exercise, MuscleGroup
from app.models.goal import Goal
from app.models.measurement import BodyMeasurement
from app.models.routine import Routine, RoutineDay, RoutineDayExercise
from app.models.user import RefreshToken, User
from app.models.workout import SetLog, WorkoutSession

__all__ = [
    "User",
    "RefreshToken",
    "MuscleGroup",
    "Exercise",
    "Routine",
    "RoutineDay",
    "RoutineDayExercise",
    "WorkoutSession",
    "SetLog",
    "BodyMeasurement",
    "Goal",
]
