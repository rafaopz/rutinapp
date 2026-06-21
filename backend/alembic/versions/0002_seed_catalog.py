"""seed muscle groups and starter exercise catalog

Revision ID: 0002
Revises: 0001
Create Date: 2026-06-20
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

MUSCLE_GROUPS = [
    "Pecho", "Espalda", "Hombros", "Bíceps", "Tríceps", "Cuádriceps",
    "Femoral", "Glúteos", "Pantorrillas", "Abdomen", "Trapecio", "Antebrazo",
]

# (nombre, grupo muscular, equipamiento)
EXERCISES = [
    ("Press banca con barra", "Pecho", "barra"),
    ("Press inclinado con mancuernas", "Pecho", "mancuerna"),
    ("Aperturas en polea", "Pecho", "polea"),
    ("Fondos en paralelas", "Pecho", "peso corporal"),
    ("Dominadas", "Espalda", "peso corporal"),
    ("Remo con barra", "Espalda", "barra"),
    ("Jalón al pecho", "Espalda", "polea"),
    ("Remo en polea sentado", "Espalda", "polea"),
    ("Press militar con barra", "Hombros", "barra"),
    ("Elevaciones laterales", "Hombros", "mancuerna"),
    ("Pájaros", "Hombros", "mancuerna"),
    ("Curl con barra", "Bíceps", "barra"),
    ("Curl con mancuernas", "Bíceps", "mancuerna"),
    ("Curl martillo", "Bíceps", "mancuerna"),
    ("Press francés", "Tríceps", "barra"),
    ("Extensión en polea", "Tríceps", "polea"),
    ("Fondos en banco", "Tríceps", "peso corporal"),
    ("Sentadilla con barra", "Cuádriceps", "barra"),
    ("Prensa de piernas", "Cuádriceps", "máquina"),
    ("Extensión de cuádriceps", "Cuádriceps", "máquina"),
    ("Zancadas", "Cuádriceps", "mancuerna"),
    ("Peso muerto rumano", "Femoral", "barra"),
    ("Curl femoral tumbado", "Femoral", "máquina"),
    ("Hip thrust", "Glúteos", "barra"),
    ("Patada de glúteo en polea", "Glúteos", "polea"),
    ("Elevación de talones de pie", "Pantorrillas", "máquina"),
    ("Elevación de talones sentado", "Pantorrillas", "máquina"),
    ("Plancha", "Abdomen", "peso corporal"),
    ("Crunch en polea", "Abdomen", "polea"),
    ("Elevación de piernas colgado", "Abdomen", "peso corporal"),
    ("Encogimientos con mancuernas", "Trapecio", "mancuerna"),
    ("Curl de muñeca", "Antebrazo", "barra"),
]


def upgrade() -> None:
    mg_values = ", ".join(["(:mg%d)" % i for i in range(len(MUSCLE_GROUPS))])
    params = {f"mg{i}": name for i, name in enumerate(MUSCLE_GROUPS)}
    op.get_bind().execute(
        _text(f"INSERT INTO muscle_groups (name) VALUES {mg_values}"), params
    )

    for i, (name, muscle, equipment) in enumerate(EXERCISES):
        op.get_bind().execute(
            _text(
                """
                INSERT INTO exercises
                    (name, primary_muscle_id, equipment, is_custom, owner_id)
                SELECT :name, mg.id, :equipment, false, NULL
                FROM muscle_groups mg
                WHERE mg.name = :muscle
                """
            ),
            {"name": name, "equipment": equipment, "muscle": muscle},
        )


def downgrade() -> None:
    bind = op.get_bind()
    for name, _muscle, _equipment in EXERCISES:
        bind.execute(
            _text(
                "DELETE FROM exercises WHERE owner_id IS NULL AND name = :name"
            ),
            {"name": name},
        )
    for name in MUSCLE_GROUPS:
        bind.execute(
            _text("DELETE FROM muscle_groups WHERE name = :name"),
            {"name": name},
        )


def _text(sql: str):
    from sqlalchemy import text

    return text(sql)
