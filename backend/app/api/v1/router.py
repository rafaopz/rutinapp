"""Agrega todos los routers de la versión 1 de la API."""
from fastapi import APIRouter

from app.api.v1 import (
    auth,
    exercises,
    goals,
    measurements,
    muscle_groups,
    routines,
    stats,
    workouts,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(muscle_groups.router)
api_router.include_router(exercises.router)
api_router.include_router(routines.router)
api_router.include_router(workouts.router)
api_router.include_router(measurements.router)
api_router.include_router(goals.router)
api_router.include_router(stats.router)
