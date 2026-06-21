"""Asigna GIFs animados a los ejercicios (cuando hay match).

Fuente: hasaneyldrm/exercises-dataset (GIFs en raw.githubusercontent.com).
Empareja por palabras clave (español→inglés). Donde hay GIF, sustituye la
imagen estática; donde no, deja la imagen actual (free-exercise-db).

DRYRUN=1  -> solo imprime los emparejamientos (no toca la BD).
Uso:  PYTHONPATH=. python scripts/seed_exercise_gifs.py
"""
from __future__ import annotations

import json
import os
import urllib.request

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.exercise import Exercise

GIF_JSON = "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json"
BASE = "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/"
_CACHE = os.path.join(os.path.dirname(__file__), "_gifs.json")
# Las imágenes estáticas que SÍ podemos sustituir por un GIF.
_REPLACEABLE = ("free-exercise-db", "exercises-dataset")

# nombre -> (incluir_todas, excluir_cualquiera)
MAP = {
 # --- catálogo global ---
 "Press banca con barra": (["barbell","bench","press"], ["smith","incline","decline","close","reverse","wide","floor"]),
 "Press inclinado con mancuernas": (["incline","dumbbell","press"], ["reverse","hammer","rotation","fly"]),
 "Aperturas en polea": (["cable","fly"], ["low","decline","incline","lying","seated","one"]),
 "Fondos en paralelas": (["chest","dip"], ["assisted","machine","bench","band"]),
 "Dominadas": (["pull-up"], ["assisted","close","wide","commando","kipping","muscle","l-sit","reverse"]),
 "Remo con barra": (["barbell","bent","over","row"], ["reverse","yates","pendlay"]),
 "Jalón al pecho": (["cable","lat","pulldown"], ["reverse","twin","underhand","straight","one"]),
 "Remo en polea sentado": (["cable","seated","row"], ["wide","reverse","one"]),
 "Press militar con barra": (["barbell","standing","military","press"], []),
 "Elevaciones laterales": (["lateral","raise"], ["cable","leaning","incline","seated","bent","rear","front","lying","one"]),
 "Pájaros": (["rear","delt","raise"], ["row","cable","band"]),
 "Curl con barra": (["barbell","curl"], ["reverse","preacher","wide","drag","spider","lying","prone"]),
 "Curl con mancuernas": (["dumbbell","biceps","curl"], ["incline","concentration","preacher","hammer","seated","one"]),
 "Curl martillo": (["hammer","curl"], ["incline","cross","seated"]),
 "Press francés": (["lying","triceps","extension"], ["one","dumbbell","cable"]),
 "Extensión en polea": (["cable","pushdown"], ["reverse","rope","one"]),
 "Fondos en banco": (["bench","dip"], ["machine"]),
 "Sentadilla con barra": (["barbell","full","squat"], []),
 "Prensa de piernas": (["leg","press"], ["calf","single","vertical"]),
 "Extensión de cuádriceps": (["leg","extension"], ["single","band"]),
 "Zancadas": (["walking","lunge"], []),
 "Peso muerto rumano": (["romanian","deadlift"], ["single","dumbbell","band"]),
 "Curl femoral tumbado": (["lying","leg","curl"], ["single","band","standing"]),
 "Hip thrust": (["barbell","glute","bridge"], ["bench","march","leg"]),
 "Patada de glúteo en polea": (["cable","kickback"], ["tricep","two arm"]),
 "Elevación de talones de pie": (["standing","calf","raise"], ["single","band","smith","donkey","seated","reverse"]),
 "Elevación de talones sentado": (["seated","calf","raise"], ["single","band","barbell"]),
 "Plancha": (["plank"], ["side","up","down","knee","rotation","spiderman","with","tap"]),
 "Crunch en polea": (["cable","crunch"], ["reverse","standing","side","kneeling","oblique"]),
 "Elevación de piernas colgado": (["hanging","leg","raise"], ["oblique","single","straight","bent"]),
 "Encogimientos con mancuernas": (["dumbbell","shrug"], ["incline","one","seated"]),
 "Curl de muñeca": (["barbell","wrist","curl"], ["reverse","standing","seated","behind"]),
 # --- personalizados de valentina ---
 "Sentadilla goblet (con mancuerna)": (["goblet","squat"], []),
 "Extensión de cuádriceps (máquina)": (["leg","extension"], ["single","band"]),
 "Peso muerto rumano con mancuernas": (["dumbbell","romanian","deadlift"], ["single"]),
 "Elevación de talones de pie (máquina)": (["standing","calf","raise"], ["single","band","smith","donkey","seated"]),
 "Press de banca con mancuernas": (["dumbbell","bench","press"], ["incline","decline","reverse","rotation","neutral","one"]),
 "Remo con mancuerna a 1 brazo": (["dumbbell","one","arm","bent-over","row"], []),
 "Press de hombro con mancuernas (sentada)": (["seated","dumbbell","shoulder","press"], ["arnold","one"]),
 "Jalón al pecho (máquina/polea)": (["cable","lat","pulldown"], ["reverse","twin","straight","underhand","one"]),
 "Curl de bíceps con mancuernas": (["dumbbell","biceps","curl"], ["incline","concentration","preacher","hammer","seated","one"]),
 "Extensión de tríceps en polea": (["cable","pushdown"], ["reverse","rope","one"]),
 "Hip thrust con barra": (["barbell","glute","bridge"], ["bench","march","leg"]),
 "Sentadilla búlgara con mancuernas": (["split","squat"], ["band","side","smith","barbell","one","v. 2"]),
 "Curl femoral acostada (máquina)": (["lying","leg","curl"], ["single","band"]),
 "Abducción de cadera (máquina)": (["hip","abduction"], ["standing","cable","band","external"]),
 "Elevación de talones sentada": (["seated","calf","raise"], ["single","band","barbell"]),
 "Remo en máquina o polea baja": (["cable","seated","row"], ["wide","reverse","one"]),
 "Face pull en polea": (["cable","rear","delt","row"], ["band","barbell","standing","stirrups","dumbbell"]),
 "Elevaciones laterales con mancuernas": (["dumbbell","lateral","raise"], ["seated","incline","leaning","rear","lying","one"]),
 "Curl martillo con mancuernas": (["hammer","curl"], ["incline","cross","seated"]),
 "Fondos en máquina asistida o press francés": (["lying","triceps","extension"], ["one","dumbbell","cable"]),
 "Sentadilla en máquina Smith o hack squat": (["hack","squat"], ["sled closer"]),
 "Hip thrust en máquina o con barra": (["barbell","glute","bridge"], ["bench","march","leg"]),
 "Zancadas caminando con mancuernas": (["walking","lunge"], []),
 "Curl femoral sentada (máquina)": (["seated","leg","curl"], ["single"]),
}


def load() -> list:
    if os.path.exists(_CACHE):
        return json.load(open(_CACHE, encoding="utf-8"))
    with urllib.request.urlopen(GIF_JSON) as r:
        data = json.loads(r.read())
    json.dump(data, open(_CACHE, "w", encoding="utf-8"), ensure_ascii=False)
    return data


def resolve(ds, inc, exc):
    cands = [
        e for e in ds
        if e.get("gif_url")
        and all(k in e["name"].lower() for k in inc)
        and not any(b in e["name"].lower() for b in exc)
    ]
    if not cands:
        return None, None
    best = min(cands, key=lambda e: len(e["name"]))
    return best["name"], BASE + best["gif_url"]


def main() -> None:
    ds = load()
    dry = os.environ.get("DRYRUN") == "1"
    resolved = {}
    misses = []
    for name, (inc, exc) in MAP.items():
        en, url = resolve(ds, inc, exc)
        if url:
            resolved[name] = url
            if dry:
                print(f"  OK  {name}  ->  {en}")
        else:
            misses.append(name)
            if dry:
                print(f"  !!  {name}  (sin gif, conserva imagen estática)")
    print(f"\nCon GIF: {len(resolved)}/{len(MAP)} · sin gif: {len(misses)}")
    if misses and not dry:
        print("Sin gif:", ", ".join(misses))
    if dry:
        return

    db = SessionLocal()
    updated = 0
    try:
        for name, url in resolved.items():
            for ex in db.scalars(select(Exercise).where(Exercise.name == name)):
                # Solo sustituye imágenes auto (no las que el usuario haya puesto).
                if ex.image_url is None or any(s in ex.image_url for s in _REPLACEABLE):
                    ex.image_url = url
                    updated += 1
        db.commit()
    finally:
        db.close()
    print(f"Filas actualizadas con GIF: {updated}")


if __name__ == "__main__":
    main()
