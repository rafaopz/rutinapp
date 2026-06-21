"""Endpoints de medidas corporales."""
from __future__ import annotations

from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.measurement import (
    BodyMeasurementCreate,
    BodyMeasurementRead,
    BodyMeasurementUpdate,
)
from app.services import measurement as measurement_service

router = APIRouter(prefix="/measurements", tags=["measurements"])


@router.get("", response_model=list[BodyMeasurementRead])
def list_measurements(
    db: DbSession, user: CurrentUser
) -> list[BodyMeasurementRead]:
    return measurement_service.list_measurements(db, user)


@router.post(
    "", response_model=BodyMeasurementRead, status_code=status.HTTP_201_CREATED
)
def create_measurement(
    data: BodyMeasurementCreate, db: DbSession, user: CurrentUser
) -> BodyMeasurementRead:
    return measurement_service.create_measurement(db, user, data)


@router.get("/{measurement_id}", response_model=BodyMeasurementRead)
def get_measurement(
    measurement_id: int, db: DbSession, user: CurrentUser
) -> BodyMeasurementRead:
    return measurement_service.get_measurement(db, user, measurement_id)


@router.patch("/{measurement_id}", response_model=BodyMeasurementRead)
def update_measurement(
    measurement_id: int,
    data: BodyMeasurementUpdate,
    db: DbSession,
    user: CurrentUser,
) -> BodyMeasurementRead:
    return measurement_service.update_measurement(
        db, user, measurement_id, data
    )


@router.delete(
    "/{measurement_id}", status_code=status.HTTP_204_NO_CONTENT
)
def delete_measurement(
    measurement_id: int, db: DbSession, user: CurrentUser
) -> None:
    measurement_service.delete_measurement(db, user, measurement_id)
