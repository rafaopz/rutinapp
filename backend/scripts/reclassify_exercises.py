"""Reclasifica el grupo muscular de los ejercicios importados usando el campo
`target` del dataset (músculo primario canónico), mucho más fiable que el
`muscle_group` usado en la importación inicial.

Solo toca los globales importados (los del backup `_exercise_names_en.json`);
nunca los 32 curados. Idempotente.

DRYRUN=1 -> muestra la distribución resultante sin tocar la BD.
Uso:  python scripts/reclassify_exercises.py
"""
from __future__ import annotations

import json
import os
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select  # noqa: E402

from app.db.session import SessionLocal  # noqa: E402
from app.models.exercise import Exercise, MuscleGroup  # noqa: E402

_CACHE = os.path.join(os.path.dirname(__file__), "_gifs.json")
_BACKUP = os.path.join(os.path.dirname(__file__), "_exercise_names_en.json")

# target (ExerciseDB) -> nuestro grupo muscular
TARGET_MAP = {
    "abs": "Abdomen",
    "pectorals": "Pecho",
    "biceps": "Bíceps",
    "glutes": "Glúteos",
    "delts": "Hombros",
    "triceps": "Tríceps",
    "upper back": "Espalda",
    "lats": "Espalda",
    "spine": "Espalda",
    "calves": "Pantorrillas",
    "quads": "Cuádriceps",
    "hamstrings": "Femoral",
    "forearms": "Antebrazo",
    "traps": "Trapecio",
    "levator scapulae": "Trapecio",
    "adductors": "Cuádriceps",
    "abductors": "Glúteos",
    "serratus anterior": "Pecho",
    "cardiovascular system": None,
}


def load() -> list:
    if os.path.exists(_CACHE):
        return json.load(open(_CACHE, encoding="utf-8"))
    import urllib.request
    url = "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json"
    with urllib.request.urlopen(url) as r:
        return json.loads(r.read())


def title(name: str) -> str:
    return " ".join(w.capitalize() for w in name.split())


def main() -> None:
    dry = os.environ.get("DRYRUN") == "1"
    if not os.path.exists(_BACKUP):
        raise SystemExit("Falta el backup; ejecuta translate_exercises.py primero.")

    data = load()
    by_title = {title(it["name"]): it for it in data}
    backup = json.load(open(_BACKUP, encoding="utf-8"))  # {id: nombre_en_titulado}

    db = SessionLocal()
    try:
        groups = {g.name: g.id for g in db.scalars(select(MuscleGroup))}

        dist = Counter()
        changed = 0
        unmapped = []
        for sid, en_titled in backup.items():
            item = by_title.get(en_titled)
            if item is None:
                unmapped.append(en_titled)
                continue
            target = (item.get("target") or "").lower()
            group_name = TARGET_MAP.get(target)
            gid = groups.get(group_name) if group_name else None
            dist[group_name or "(sin grupo)"] += 1

            if not dry:
                ex = db.get(Exercise, int(sid))
                if ex is not None and ex.primary_muscle_id != gid:
                    ex.primary_muscle_id = gid
                    changed += 1

        print("Distribución resultante (por target):")
        for name, c in dist.most_common():
            print(f"  {c:4}  {name}")
        if unmapped:
            print(f"Sin match en dataset: {len(unmapped)}")

        if dry:
            print("\n[DRYRUN] no se escribió nada.")
            return

        db.commit()
        print(f"\nReclasificados (cambiaron de grupo): {changed}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
