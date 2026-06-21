"""Importación masiva de ejercicios al catálogo GLOBAL, con GIF animado.

Fuente: hasaneyldrm/exercises-dataset (1300+ ejercicios, todos con gif_url).
Cada ejercicio se importa como global (owner_id NULL) con:
  - nombre en inglés (Title Case)  -> no existe una base masiva en español
  - image_url = GIF animado (mismo formato que los ejercicios actuales)
  - primary_muscle mapeado a nuestros 12 grupos
  - equipment traducido al español

Se omiten los de cardio. Idempotente: salta los nombres globales ya existentes
(no duplica en re-ejecuciones). Las instrucciones quedan vacías (el dataset solo
trae en/it/tr); el frontend ya genera un enlace de YouTube por nombre.

DRYRUN=1 -> solo imprime el resumen, sin tocar la BD.
Uso:  python scripts/seed_global_exercises.py
"""
from __future__ import annotations

import json
import os
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select  # noqa: E402

from app.db.session import SessionLocal  # noqa: E402
from app.models.exercise import Exercise, MuscleGroup  # noqa: E402

DATA_URL = "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json"
BASE = "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/"
_CACHE = os.path.join(os.path.dirname(__file__), "_gifs.json")

# muscle_group del dataset -> grupo muscular nuestro
MUSCLE_MAP = {
    "chest": "Pecho",
    "shoulders": "Hombros", "deltoids": "Hombros", "rotator cuff": "Hombros",
    "biceps": "Bíceps",
    "triceps": "Tríceps",
    "forearms": "Antebrazo", "wrist flexors": "Antebrazo",
    "wrist extensors": "Antebrazo", "wrists": "Antebrazo", "hands": "Antebrazo",
    "quadriceps": "Cuádriceps",
    "hamstrings": "Femoral",
    "glutes": "Glúteos",
    "calves": "Pantorrillas", "soleus": "Pantorrillas", "ankles": "Pantorrillas",
    "ankle stabilizers": "Pantorrillas",
    "obliques": "Abdomen", "core": "Abdomen", "abdominals": "Abdomen",
    "hip flexors": "Abdomen",
    "trapezius": "Trapecio", "traps": "Trapecio",
    "lower back": "Espalda", "lats": "Espalda", "latissimus dorsi": "Espalda",
    "rhomboids": "Espalda", "upper back": "Espalda",
}

# Fallback por body_part cuando el muscle_group no mapea.
BODYPART_MAP = {
    "chest": "Pecho", "back": "Espalda", "shoulders": "Hombros",
    "waist": "Abdomen", "upper legs": "Cuádriceps", "lower legs": "Pantorrillas",
    "lower arms": "Antebrazo", "neck": "Trapecio",
    # "upper arms" es ambiguo (bíceps/tríceps) -> sin grupo
}

EQUIP_MAP = {
    "body weight": "peso corporal", "dumbbell": "mancuerna", "cable": "polea",
    "barbell": "barra", "leverage machine": "máquina", "band": "banda",
    "smith machine": "máquina Smith", "kettlebell": "kettlebell",
    "weighted": "con lastre", "stability ball": "fitball", "ez barbell": "barra EZ",
    "assisted": "asistida", "sled machine": "máquina de trineo",
    "medicine ball": "balón medicinal", "rope": "cuerda", "roller": "rodillo",
    "resistance band": "banda elástica", "bosu ball": "bosu",
    "olympic barbell": "barra olímpica", "wheel roller": "rueda abdominal",
    "trap bar": "barra hexagonal", "hammer": "martillo", "tire": "neumático",
}


def load() -> list:
    if os.path.exists(_CACHE):
        return json.load(open(_CACHE, encoding="utf-8"))
    with urllib.request.urlopen(DATA_URL) as r:
        data = json.loads(r.read())
    json.dump(data, open(_CACHE, "w", encoding="utf-8"), ensure_ascii=False)
    return data


def title(name: str) -> str:
    return " ".join(w.capitalize() for w in name.split())


def muscle_for(item: dict) -> str | None:
    mg = (item.get("muscle_group") or "").lower()
    if mg in MUSCLE_MAP:
        return MUSCLE_MAP[mg]
    bp = (item.get("body_part") or "").lower()
    return BODYPART_MAP.get(bp)


def main() -> None:
    data = load()
    dry = os.environ.get("DRYRUN") == "1"

    db = SessionLocal()
    try:
        groups = {g.name: g.id for g in db.scalars(select(MuscleGroup))}
        existing = {
            (n or "").lower()
            for n in db.scalars(
                select(Exercise.name).where(Exercise.owner_id.is_(None))
            )
        }

        to_create: list[Exercise] = []
        seen: set[str] = set()
        skipped_cardio = skipped_dup = skipped_nogif = 0
        no_muscle = 0

        for item in data:
            if (item.get("body_part") or "").lower() == "cardio":
                skipped_cardio += 1
                continue
            gif = item.get("gif_url")
            if not gif:
                skipped_nogif += 1
                continue
            name = title(item["name"])
            key = name.lower()
            if key in existing or key in seen:
                skipped_dup += 1
                continue
            seen.add(key)

            muscle = muscle_for(item)
            if muscle is None:
                no_muscle += 1
            equip = EQUIP_MAP.get((item.get("equipment") or "").lower())

            to_create.append(
                Exercise(
                    name=name,
                    primary_muscle_id=groups.get(muscle) if muscle else None,
                    equipment=equip,
                    image_url=BASE + gif,
                    is_custom=False,
                    owner_id=None,
                )
            )

        print(f"Fuente: {len(data)} ejercicios")
        print(f"  - cardio omitidos:     {skipped_cardio}")
        print(f"  - sin gif omitidos:    {skipped_nogif}")
        print(f"  - duplicados omitidos: {skipped_dup}")
        print(f"  - a crear:             {len(to_create)} (sin grupo muscular: {no_muscle})")

        if dry:
            print("\n[DRYRUN] no se escribió nada. Muestra:")
            for ex in to_create[:8]:
                mg = next((n for n, i in groups.items() if i == ex.primary_muscle_id), None)
                print(f"  {ex.name}  [{mg}]  ({ex.equipment})")
            return

        db.add_all(to_create)
        db.commit()
        print(f"\nInsertados {len(to_create)} ejercicios globales con GIF.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
