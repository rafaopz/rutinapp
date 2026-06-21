"""Lógica de negocio de medidas corporales (acotada al usuario)."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.measurement import BodyMeasurement
from app.models.user import User
from app.schemas.measurement import (
    BodyMeasurementCreate,
    BodyMeasurementUpdate,
)
from app.services.exceptions import NotFoundError


def list_measurements(db: Session, user: User) -> list[BodyMeasurement]:
    return list(
        db.scalars(
            select(BodyMeasurement)
            .where(BodyMeasurement.user_id == user.id)
            .order_by(BodyMeasurement.measured_at.desc())
        )
    )


def get_measurement(
    db: Session, user: User, measurement_id: int
) -> BodyMeasurement:
    m = db.get(BodyMeasurement, measurement_id)
    if m is None or m.user_id != user.id:
        raise NotFoundError("Medida no encontrada")
    return m


def create_measurement(
    db: Session, user: User, data: BodyMeasurementCreate
) -> BodyMeasurement:
    fields = data.model_dump(exclude_unset=True)
    # measured_at es None por defecto → deja el server_default (now()).
    if fields.get("measured_at") is None:
        fields.pop("measured_at", None)
    m = BodyMeasurement(user_id=user.id, **fields)
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


def update_measurement(
    db: Session, user: User, measurement_id: int, data: BodyMeasurementUpdate
) -> BodyMeasurement:
    m = get_measurement(db, user, measurement_id)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(m, key, value)
    db.commit()
    db.refresh(m)
    return m


def delete_measurement(db: Session, user: User, measurement_id: int) -> None:
    m = get_measurement(db, user, measurement_id)
    db.delete(m)
    db.commit()
