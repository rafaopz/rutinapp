"""Asigna imágenes (free-exercise-db, dominio público) e instrucciones en
español a los ejercicios del catálogo global y a los personalizados conocidos.

Las imágenes se resuelven por palabras clave contra el dataset; el video se deja
vacío a propósito: el frontend genera un enlace de búsqueda de YouTube por nombre
cuando no hay `video_url`, lo que cubre el 100% de los ejercicios.

Idempotente: solo rellena campos vacíos (re-ejecutable).

Uso:  python scripts/seed_exercise_media.py
"""
from __future__ import annotations

import json
import os
import urllib.request

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.exercise import Exercise

DB_URL = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json"
IMG_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/"
_CACHE = os.path.join(os.path.dirname(__file__), "_fe.json")

# nombre -> (incluir_todas, excluir_cualquiera, instrucciones_es)
GLOBAL = {
 "Press banca con barra": (["barbell","bench","press"], ["smith","incline","decline","close"], "Escápulas retraídas; baja la barra al pecho con control y empuja sin rebotar."),
 "Press inclinado con mancuernas": (["incline","dumbbell","press"], [], "Banco a ~30°; baja las mancuernas a la altura del pecho y sube sin chocarlas."),
 "Aperturas en polea": (["cable","crossover"], [], "Codos algo flexionados; junta las manos al frente apretando el pecho."),
 "Fondos en paralelas": (["dips","chest"], [], "Inclina el torso adelante; baja hasta ~90° de codo y sube sin bloquear."),
 "Dominadas": (["pullups"], [], "Cuelga con escápulas activas; lleva el pecho a la barra sin balanceo."),
 "Remo con barra": (["bent","over","barbell","row"], ["reverse"], "Torso a ~45°, espalda neutra; lleva la barra al abdomen apretando la espalda."),
 "Jalón al pecho": (["wide","grip","lat","pulldown"], [], "Pecho arriba; lleva la barra a la clavícula bajando los codos, sin inercia."),
 "Remo en polea sentado": (["seated","cable","row"], [], "Espalda recta; lleva el agarre al abdomen juntando las escápulas."),
 "Press militar con barra": (["barbell","shoulder","press"], ["seated","machine","dumbbell"], "Core firme; empuja la barra sobre la cabeza sin arquear la espalda."),
 "Elevaciones laterales": (["side","lateral","raise"], ["seated","cable","bent"], "Sube las mancuernas a la altura de los hombros con codos algo flexionados."),
 "Pájaros": (["reverse","flyes"], [], "Torso inclinado; abre los brazos atrás apretando el deltoides posterior."),
 "Curl con barra": (["barbell","curl"], ["reverse","preacher","wide","drag","spider"], "Codos pegados al cuerpo; sube sin balanceo y baja con control."),
 "Curl con mancuernas": (["dumbbell","bicep","curl"], ["incline","concentration","preacher","hammer"], "Sin mover los codos; controla la bajada."),
 "Curl martillo": (["hammer","curls"], ["incline","cross"], "Agarre neutro (pulgares arriba); sube sin balanceo."),
 "Press francés": (["skullcrusher"], [], "Codos fijos apuntando arriba; baja a la frente y extiende."),
 "Extensión en polea": (["triceps","pushdown"], ["reverse","rope","v-bar","face"], "Codos pegados; extiende hacia abajo apretando el tríceps."),
 "Fondos en banco": (["bench","dips"], [], "Manos en el banco; baja flexionando codos y sube."),
 "Sentadilla con barra": (["barbell","squat"], ["smith","split","full","box","jefferson","overhead","front","hack","sumo"], "Pies al ancho de hombros; baja con espalda neutra rompiendo la paralela."),
 "Prensa de piernas": (["leg","press"], ["calf","sled"], "Pies a media plataforma; baja a ~90° sin despegar la cadera."),
 "Extensión de cuádriceps": (["leg","extensions"], [], "Extiende las rodillas apretando el cuádriceps; baja con control."),
 "Zancadas": (["dumbbell","lunges"], [], "Paso firme; baja la rodilla trasera sin tocar el suelo, torso erguido."),
 "Peso muerto rumano": (["romanian","deadlift"], [], "Cadera atrás, espalda neutra; baja la barra pegada a las piernas."),
 "Curl femoral tumbado": (["lying","leg","curls"], [], "Lleva los talones a los glúteos apretando el isquio; baja lento."),
 "Hip thrust": (["barbell","hip","thrust"], [], "Espalda apoyada en el banco; empuja con los talones y aprieta glúteos arriba."),
 "Patada de glúteo en polea": (["glute","kickback"], [], "Lleva la pierna atrás extendiendo la cadera; aprieta el glúteo."),
 "Elevación de talones de pie": (["standing","calf","raises"], ["rocking","smith","dumbbell"], "Sube sobre las puntas al máximo y baja con estiramiento completo."),
 "Elevación de talones sentado": (["seated","calf","raise"], ["barbell"], "Empuja con la punta del pie enfocando el sóleo; rango completo."),
 "Plancha": (["plank"], ["side"], "Cuerpo en línea recta; abdomen y glúteo apretados, sin hundir la cadera."),
 "Crunch en polea": (["cable","crunch"], ["bosu","standing","side","kneeling"], "De rodillas; enrolla la columna llevando los codos a los muslos."),
 "Elevación de piernas colgado": (["hanging","leg","raise"], [], "Sin balanceo; sube las piernas controlando con el abdomen."),
 "Encogimientos con mancuernas": (["dumbbell","shrug"], [], "Eleva los hombros hacia las orejas y aprieta el trapecio arriba."),
 "Curl de muñeca": (["wrist","curl"], ["reverse","cable","standing","seated"], "Antebrazos apoyados; flexiona las muñecas hacia arriba con rango completo."),
}

# Ejercicios personalizados (p. ej. de valentina): solo imagen por keywords.
CUSTOM = {
 "Sentadilla goblet (con mancuerna)": (["goblet","squat"], []),
 "Extensión de cuádriceps (máquina)": (["leg","extensions"], []),
 "Peso muerto rumano con mancuernas": (["romanian","deadlift"], []),
 "Elevación de talones de pie (máquina)": (["standing","calf","raises"], ["rocking","smith","dumbbell"]),
 "Press de banca con mancuernas": (["dumbbell","bench","press"], ["incline","decline"]),
 "Remo con mancuerna a 1 brazo": (["arm","dumbbell","row"], ["incline"]),
 "Press de hombro con mancuernas (sentada)": (["seated","dumbbell","press"], ["arnold"]),
 "Jalón al pecho (máquina/polea)": (["lat","pulldown"], ["underhand","v-bar","close"]),
 "Curl de bíceps con mancuernas": (["dumbbell","bicep","curl"], ["incline","concentration","preacher","hammer"]),
 "Extensión de tríceps en polea": (["triceps","pushdown"], ["reverse","rope","v-bar"]),
 "Hip thrust con barra": (["barbell","hip","thrust"], []),
 "Sentadilla búlgara con mancuernas": (["split","squat"], ["barbell","smith"]),
 "Curl femoral acostada (máquina)": (["lying","leg","curls"], []),
 "Abducción de cadera (máquina)": (["abductor"], []),
 "Elevación de talones sentada": (["seated","calf","raise"], ["barbell"]),
 "Remo en máquina o polea baja": (["seated","cable","row"], []),
 "Face pull en polea": (["face","pull"], []),
 "Elevaciones laterales con mancuernas": (["side","lateral","raise"], ["seated","cable","bent"]),
 "Curl martillo con mancuernas": (["hammer","curls"], ["incline","cross"]),
 "Fondos en máquina asistida o press francés": (["skullcrusher"], []),
 "Sentadilla en máquina Smith o hack squat": (["hack","squat"], []),
 "Hip thrust en máquina o con barra": (["barbell","hip","thrust"], []),
 "Zancadas caminando con mancuernas": (["dumbbell","lunges"], []),
 "Curl femoral sentada (máquina)": (["seated","leg","curl"], []),
}


def load_db() -> list:
    if os.path.exists(_CACHE):
        return json.load(open(_CACHE, encoding="utf-8"))
    with urllib.request.urlopen(DB_URL) as r:
        data = json.loads(r.read())
    json.dump(data, open(_CACHE, "w", encoding="utf-8"), ensure_ascii=False)
    return data


def resolve_image(dataset: list, inc: list[str], exc: list[str]) -> str | None:
    cands = [
        e for e in dataset
        if e.get("images")
        and all(k in e["name"].lower() for k in inc)
        and not any(b in e["name"].lower() for b in exc)
    ]
    if not cands:
        return None
    best = min(cands, key=lambda e: len(e["name"]))  # nombre más canónico
    return IMG_BASE + best["images"][0]


def main() -> None:
    dataset = load_db()
    db = SessionLocal()
    updated = 0
    misses = []
    try:
        for name, spec in {**GLOBAL, **CUSTOM}.items():
            inc, exc = spec[0], spec[1]
            cue = spec[2] if len(spec) > 2 else None
            img = resolve_image(dataset, inc, exc)
            if img is None:
                misses.append(name)
            # Puede haber varias filas con el mismo nombre (global + custom).
            rows = list(db.scalars(select(Exercise).where(Exercise.name == name)))
            for ex in rows:
                if img and not ex.image_url:
                    ex.image_url = img
                if cue and not ex.instructions:
                    ex.instructions = cue
                updated += 1
        db.commit()
    finally:
        db.close()

    print(f"Ejercicios actualizados: {updated}")
    if misses:
        print("Sin imagen (usarán enlace YouTube):", ", ".join(misses))


if __name__ == "__main__":
    main()
