"""Carga la rutina de recomposición de 5 días al usuario rafael415oropeza.

Trabaja directamente contra la BD (capa de servicios), sin pasar por la API,
de modo que no requiere la contraseña del usuario. Reutiliza ejercicios
existentes por nombre (normalizado, sin acentos/mayúsculas) y crea como
personalizados los que falten. Idempotente: si ya existe la rutina, no la
duplica.

Uso:  python scripts/seed_rafael_routine.py
"""
from __future__ import annotations

import sys
import unicodedata
from pathlib import Path

# Permite ejecutar el script desde backend/ con `python scripts/...`.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select  # noqa: E402

from app.db.session import SessionLocal  # noqa: E402
from app.models.exercise import Exercise, MuscleGroup  # noqa: E402
from app.models.routine import Routine  # noqa: E402
from app.models.user import User  # noqa: E402
from app.schemas.exercise import ExerciseCreate  # noqa: E402
from app.schemas.routine import (  # noqa: E402
    RoutineCreate,
    RoutineDayCreate,
    RoutineDayExerciseCreate,
)
from app.services import exercise as exercise_service  # noqa: E402
from app.services import routine as routine_service  # noqa: E402

USERNAME = "rafael415oropeza"
ROUTINE_NAME = "Recomposición corporal · 5 días (PPL · Upper/Lower)"

# (nombre, grupo_muscular, equipo, sets, reps_min, reps_max, rest_seg)
DAYS = [
    (
        "Lunes · LEGS (Cuádriceps · Isquios · Glúteos · Pantorrillas)",
        [
            ("Sentadilla con barra", "Cuádriceps", "barra", 4, 6, 8, 180),
            ("Prensa de piernas", "Cuádriceps", "máquina", 3, 10, 12, 120),
            ("Extensión de cuádriceps", "Cuádriceps", "máquina", 3, 12, 15, 75),
            ("Curl femoral tumbado", "Femoral", "máquina", 3, 10, 12, 90),
            ("Peso muerto rumano", "Femoral", "mancuerna", 3, 10, 12, 120),
            ("Elevación de talones de pie", "Pantorrillas", "máquina", 4, 10, 15, 60),
        ],
    ),
    (
        "Martes · PUSH (Pecho · Deltoides anterior · Tríceps)",
        [
            ("Press banca con barra", "Pecho", "barra", 4, 6, 8, 150),
            ("Press inclinado con mancuernas", "Pecho", "mancuerna", 3, 8, 10, 120),
            ("Aperturas en polea", "Pecho", "polea", 3, 12, 15, 75),
            ("Press militar con mancuernas", "Hombros", "mancuerna", 3, 8, 10, 120),
            ("Elevaciones laterales", "Hombros", "polea", 3, 12, 15, 60),
            ("Fondos en paralelas", "Tríceps", "peso corporal", 3, 8, 12, 90),
            ("Extensión en polea", "Tríceps", "polea", 3, 12, 15, 60),
        ],
    ),
    (
        "Miércoles · PULL (Espalda · Deltoides posterior · Bíceps)",
        [
            ("Dominadas", "Espalda", "peso corporal", 4, 6, 8, 150),
            ("Remo con barra", "Espalda", "barra", 3, 8, 10, 120),
            ("Remo en polea sentado", "Espalda", "polea", 3, 10, 12, 90),
            ("Pullover en polea", "Espalda", "polea", 3, 12, 15, 75),
            ("Face pull en polea", "Hombros", "polea", 3, 15, 20, 60),
            ("Curl con barra", "Bíceps", "barra", 3, 8, 10, 90),
            ("Curl inclinado con mancuernas", "Bíceps", "mancuerna", 2, 10, 12, 60),
        ],
    ),
    (
        "Jueves · UPPER (Torso completo)",
        [
            ("Press banca inclinado con barra", "Pecho", "barra", 3, 6, 8, 150),
            ("Remo con mancuerna a 1 brazo", "Espalda", "mancuerna", 3, 8, 10, 90),
            ("Aperturas en polea", "Pecho", "polea", 3, 12, 15, 75),
            ("Jalón al pecho", "Espalda", "polea", 3, 10, 12, 90),
            ("Elevaciones laterales", "Hombros", "mancuerna", 3, 12, 15, 60),
            ("Press francés", "Tríceps", "barra", 3, 10, 12, 90),
            ("Curl martillo", "Bíceps", "mancuerna", 3, 10, 12, 60),
        ],
    ),
    (
        "Viernes · LOWER (Piernas completo)",
        [
            ("Sentadilla búlgara con mancuernas", "Cuádriceps", "mancuerna", 3, 8, 10, 120),
            ("Prensa de piernas", "Cuádriceps", "máquina", 3, 10, 12, 120),
            ("Extensión de cuádriceps", "Cuádriceps", "máquina", 3, 12, 15, 75),
            ("Curl femoral sentado", "Femoral", "máquina", 3, 10, 12, 90),
            ("Hip thrust", "Glúteos", "barra", 3, 10, 12, 120),
            ("Elevación de talones sentado", "Pantorrillas", "máquina", 4, 12, 15, 60),
        ],
    ),
]

NOTES = """RUTINA DE RECOMPOSICIÓN CORPORAL — 5 DÍAS (Push/Pull/Legs/Upper/Lower)
Frecuencia por músculo: 2x/semana · Volumen: 14–20 series/grupo/semana.

DISTRIBUCIÓN SEMANAL
Lun LEGS · Mar PUSH · Mié PULL · Jue UPPER · Vie LOWER · Sáb y Dom descanso.

CÓMO CALENTAR
• Antes de cada sesión: 5–10 min de cardio ligero (caminadora o bici) para elevar la temperatura corporal.
• Compuestos pesados (sentadilla, press banca, dominadas, remo con barra): rampa progresiva antes de las series de trabajo. Ejemplo a 60 kg de trabajo:
   1) Barra vacía ×10–12 (activar patrón)
   2) ~65% ×6–8 (preparar articulaciones)
   3) ~85% ×3–4 (activar sistema nervioso)
   → Series de trabajo al 100% a RIR 1–2.
   Ninguna serie de calentamiento debe generar fatiga.
• Aislamiento y cables (aperturas, laterales, curls): 1 serie ligera de 8–10 al ~50% y arrancas.
• Regla: solo el primer compuesto de la sesión necesita la rampa completa. Si el segundo usa músculos ya calientes, basta 1 serie al 70–80%.

CÓMO HACER LA RUTINA — Doble progresión (en déficit)
1) Empieza en el extremo bajo del rango de reps con un peso a RIR 1–2.
2) Cada semana intenta sumar 1 rep por serie con el mismo peso.
3) Cuando llegues al tope del rango en TODAS las series, sube el peso un escalón mínimo (2.5 kg compuestos · 1–2 kg aislamiento) y vuelve al rango bajo.

Reglas en déficit calórico:
• No busques PRs de 1RM. Tu progreso son las reps totales con buena técnica.
• Si pierdes reps una semana, mantén la carga (es fatiga del déficit, no regresión).
• Si pierdes reps dos semanas seguidas en un ejercicio, quita 1 serie a ese movimiento (no bajes peso).
• Cada 4–5 semanas, semana de descarga: mitad de volumen a RIR 3–4.
• Prioriza la calidad de cada rep sobre el peso en barra.

NOTAS FINALES
• Cardio: 2–3 sesiones de baja intensidad (caminata 30–45 min) en descanso o post-entreno. Nada de HIIT agresivo.
• Sueño: 7–8 h mínimo.
• Proteína: 1.8–2.2 g/kg de peso corporal."""


def _norm(s: str) -> str:
    """Normaliza para comparar nombres: sin acentos, minúsculas, sin espacios extra."""
    nfkd = unicodedata.normalize("NFKD", s)
    no_accents = "".join(c for c in nfkd if not unicodedata.combining(c))
    return " ".join(no_accents.lower().split())


def main() -> None:
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.username == USERNAME))
        if user is None:
            raise SystemExit(f"Usuario '{USERNAME}' no encontrado.")

        existing_routine = db.scalar(
            select(Routine).where(
                Routine.user_id == user.id, Routine.name == ROUTINE_NAME
            )
        )
        if existing_routine is not None:
            print(
                f"La rutina ya existe (id={existing_routine.id}); no se duplica."
            )
            return

        groups = {g.name: g.id for g in exercise_service.list_muscle_groups(db)}

        # Ejercicios accesibles (globales + propios) por nombre normalizado.
        accessible = exercise_service.list_exercises(db, user)
        by_norm = {_norm(e.name): e.id for e in accessible}

        created_count = 0

        def ensure_exercise(name: str, muscle: str, equip: str) -> int:
            nonlocal created_count
            key = _norm(name)
            if key in by_norm:
                return by_norm[key]
            ex = exercise_service.create_exercise(
                db,
                user,
                ExerciseCreate(
                    name=name,
                    primary_muscle_id=groups.get(muscle),
                    equipment=equip,
                ),
            )
            by_norm[key] = ex.id
            created_count += 1
            print(f"  + ejercicio nuevo: {name}  [{muscle}]")
            return ex.id

        days_payload: list[RoutineDayCreate] = []
        for order, (day_name, exercises) in enumerate(DAYS, start=1):
            day_exercises = []
            for idx, (name, muscle, equip, sets, rmin, rmax, rest) in enumerate(
                exercises, start=1
            ):
                ex_id = ensure_exercise(name, muscle, equip)
                day_exercises.append(
                    RoutineDayExerciseCreate(
                        exercise_id=ex_id,
                        order_index=idx,
                        target_sets=sets,
                        target_reps_min=rmin,
                        target_reps_max=rmax,
                        rest_seconds=rest,
                    )
                )
            days_payload.append(
                RoutineDayCreate(
                    day_order=order, name=day_name, exercises=day_exercises
                )
            )

        routine = routine_service.create_routine(
            db,
            user,
            RoutineCreate(
                name=ROUTINE_NAME,
                days_per_week=5,
                is_active=True,
                notes=NOTES,
                days=days_payload,
            ),
        )

        print(f"\nRutina creada: id={routine.id} · '{routine.name}'")
        print(f"Ejercicios nuevos creados: {created_count}")
        for d in routine.days:
            print(f"  Día {d.day_order}: {d.name} ({len(d.exercises)} ejercicios)")
    finally:
        db.close()


if __name__ == "__main__":
    main()
