"""Carga la rutina de 5 días (prioridad piernas) al usuario valentina.

Crea los ejercicios del plan como ejercicios personalizados de valentina
(mapeados a su grupo muscular) y luego construye la rutina con sus días y
objetivos. Idempotente a nivel de ejercicios (reutiliza por nombre).

Uso:  python scripts/seed_valentina_routine.py
"""
from __future__ import annotations

import json
import urllib.request
import urllib.parse

BASE = "http://127.0.0.1:8000/api/v1"
USERNAME = "valentina"
PASSWORD = "12345678"

ROUTINE_NAME = "Hipertrofia 5 días · Prioridad piernas"

# (nombre, grupo_muscular, equipo, sets, reps_min, reps_max, rest_seg)
DAYS = [
    (
        "Lunes · Lower A (Cuádriceps)",
        [
            ("Sentadilla goblet (con mancuerna)", "Cuádriceps", "mancuerna", 4, 8, 10, 150),
            ("Prensa de piernas", "Cuádriceps", "máquina", 3, 10, 12, 120),
            ("Extensión de cuádriceps (máquina)", "Cuádriceps", "máquina", 3, 12, 15, 90),
            ("Peso muerto rumano con mancuernas", "Femoral", "mancuerna", 3, 10, 12, 120),
            ("Elevación de talones de pie (máquina)", "Pantorrillas", "máquina", 3, 12, 15, 60),
        ],
    ),
    (
        "Martes · Upper A (Push + Pull)",
        [
            ("Press de banca con mancuernas", "Pecho", "mancuerna", 3, 8, 10, 150),
            ("Remo con mancuerna a 1 brazo", "Espalda", "mancuerna", 3, 10, 12, 90),
            ("Press de hombro con mancuernas (sentada)", "Hombros", "mancuerna", 3, 10, 12, 120),
            ("Jalón al pecho (máquina/polea)", "Espalda", "polea", 3, 10, 12, 90),
            ("Curl de bíceps con mancuernas", "Bíceps", "mancuerna", 2, 12, 15, 60),
            ("Extensión de tríceps en polea", "Tríceps", "polea", 2, 12, 15, 60),
        ],
    ),
    (
        "Jueves · Lower B (Glúteo / Isquio)",
        [
            ("Hip thrust con barra", "Glúteos", "barra", 4, 8, 10, 150),
            ("Sentadilla búlgara con mancuernas", "Glúteos", "mancuerna", 3, 10, 12, 90),
            ("Curl femoral acostada (máquina)", "Femoral", "máquina", 3, 10, 12, 90),
            ("Abducción de cadera (máquina)", "Glúteos", "máquina", 3, 12, 15, 60),
            ("Elevación de talones sentada", "Pantorrillas", "máquina", 3, 15, 20, 60),
        ],
    ),
    (
        "Viernes · Upper B (Pull + Push)",
        [
            ("Remo en máquina o polea baja", "Espalda", "polea", 3, 10, 12, 120),
            ("Press inclinado con mancuernas", "Pecho", "mancuerna", 3, 10, 12, 120),
            ("Face pull en polea", "Hombros", "polea", 3, 15, 20, 60),
            ("Elevaciones laterales con mancuernas", "Hombros", "mancuerna", 3, 12, 15, 60),
            ("Curl martillo con mancuernas", "Bíceps", "mancuerna", 2, 12, 15, 60),
            ("Fondos en máquina asistida o press francés", "Tríceps", "máquina", 2, 10, 12, 60),
        ],
    ),
    (
        "Sábado · Legs C (Volumen completo)",
        [
            ("Sentadilla en máquina Smith o hack squat", "Cuádriceps", "máquina", 3, 10, 12, 150),
            ("Hip thrust en máquina o con barra", "Glúteos", "barra", 3, 10, 12, 120),
            ("Zancadas caminando con mancuernas", "Cuádriceps", "mancuerna", 3, 10, 12, 90),
            ("Curl femoral sentada (máquina)", "Femoral", "máquina", 3, 12, 15, 90),
            ("Elevación de talones de pie (máquina)", "Pantorrillas", "máquina", 3, 12, 15, 60),
        ],
    ),
]


def api(method: str, path: str, token: str | None = None, body=None, form=False):
    url = f"{BASE}{path}"
    headers = {}
    data = None
    if body is not None:
        if form:
            data = urllib.parse.urlencode(body).encode()
            headers["Content-Type"] = "application/x-www-form-urlencoded"
        else:
            data = json.dumps(body).encode()
            headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req) as resp:
        raw = resp.read()
        return json.loads(raw) if raw else None


def main() -> None:
    token = api("POST", "/auth/login", body={"username": USERNAME, "password": PASSWORD}, form=True)[
        "access_token"
    ]

    # Grupos musculares: nombre -> id
    groups = {g["name"]: g["id"] for g in api("GET", "/muscle-groups", token)}

    # Ejercicios ya accesibles para valentina: nombre -> id (evita duplicar)
    existing = {e["name"]: e["id"] for e in api("GET", "/exercises", token)}

    def ensure_exercise(name: str, muscle: str, equipment: str) -> int:
        if name in existing:
            return existing[name]
        created = api(
            "POST",
            "/exercises",
            token,
            body={
                "name": name,
                "primary_muscle_id": groups.get(muscle),
                "equipment": equipment,
            },
        )
        existing[name] = created["id"]
        return created["id"]

    # Construir días con sus ejercicios prescritos
    days_payload = []
    for order, (day_name, exercises) in enumerate(DAYS, start=1):
        day_exercises = []
        for idx, (name, muscle, equip, sets, rmin, rmax, rest) in enumerate(
            exercises, start=1
        ):
            ex_id = ensure_exercise(name, muscle, equip)
            day_exercises.append(
                {
                    "exercise_id": ex_id,
                    "order_index": idx,
                    "target_sets": sets,
                    "target_reps_min": rmin,
                    "target_reps_max": rmax,
                    "rest_seconds": rest,
                }
            )
        days_payload.append(
            {"day_order": order, "name": day_name, "exercises": day_exercises}
        )

    routine = api(
        "POST",
        "/routines",
        token,
        body={
            "name": ROUTINE_NAME,
            "days_per_week": 5,
            "is_active": True,
            "days": days_payload,
        },
    )

    print(f"Rutina creada: id={routine['id']} · '{routine['name']}'")
    for d in routine["days"]:
        print(f"  Día {d['day_order']}: {d['name']} ({len(d['exercises'])} ejercicios)")


if __name__ == "__main__":
    main()
