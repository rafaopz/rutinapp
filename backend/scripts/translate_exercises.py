"""Traduce al español los nombres de los ejercicios importados (inglés).

Recorre el dataset original (hasaneyldrm) para identificar EXACTAMENTE los
nombres importados y traducirlos; nunca toca los ejercicios curados en español.
Traducción compositiva: separa el equipo (lo manda al final con "con/en"),
traduce el núcleo del movimiento y reordena los modificadores después del
sustantivo (como en español). Las palabras desconocidas se conservan.

Antes de actualizar guarda un backup `_exercise_names_en.json` ({id: nombre_en})
para poder revertir. Idempotente vía DRYRUN.

DRYRUN=1 -> muestra una muestra + cobertura, sin tocar la BD.
Uso:  python scripts/translate_exercises.py
"""
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select  # noqa: E402

from app.db.session import SessionLocal  # noqa: E402
from app.models.exercise import Exercise  # noqa: E402

_CACHE = os.path.join(os.path.dirname(__file__), "_gifs.json")
_BACKUP = os.path.join(os.path.dirname(__file__), "_exercise_names_en.json")

# Equipo -> sufijo "con/en X" (se quita del nombre y se reubica al final).
EQUIP = [
    ("ez barbell", "con barra EZ"), ("olympic barbell", "con barra olímpica"),
    ("trap bar", "con barra hexagonal"), ("smith machine", "en máquina Smith"),
    ("leverage machine", "en máquina"), ("sled machine", "en máquina de trineo"),
    ("resistance band", "con banda elástica"), ("medicine ball", "con balón medicinal"),
    ("stability ball", "en fitball"), ("exercise ball", "en fitball"),
    ("bosu ball", "en bosu"), ("wheel roller", "con rueda abdominal"),
    ("barbell", "con barra"), ("dumbbells", "con mancuernas"),
    ("dumbbell", "con mancuernas"), ("kettlebell", "con kettlebell"),
    ("cable", "en polea"), ("band", "con banda"), ("weighted", "con lastre"),
    ("smith", "en máquina Smith"), ("leverage", "en máquina"),
    ("lever", "en máquina"), ("machine", "en máquina"), ("sled", "en máquina de trineo"),
    ("bosu", "en bosu"), ("roller", "con rodillo"),
    ("sz bar", "con barra EZ"), ("cambered bar", "con barra"),
    ("bodyweight", ""), ("body weight", ""),
]

# Núcleo del movimiento (frase inglesa -> español). Longest-first.
MOVE = [
    ("romanian deadlift", "peso muerto rumano"),
    ("stiff leg deadlift", "peso muerto piernas rígidas"),
    ("sumo deadlift", "peso muerto sumo"), ("deadlift", "peso muerto"),
    ("bench press", "press de banca"), ("shoulder press", "press de hombros"),
    ("chest press", "press de pecho"), ("military press", "press militar"),
    ("overhead press", "press militar"), ("leg press", "prensa de piernas"),
    ("french press", "press francés"), ("push press", "push press"),
    ("floor press", "press en el suelo"), ("calf press", "prensa de pantorrilla"),
    ("lat pulldown", "jalón al pecho"), ("pulldown", "jalón"),
    ("pull ups", "dominadas"), ("pull up", "dominada"), ("pullup", "dominada"),
    ("chin ups", "dominadas supinas"), ("chin up", "dominada supina"),
    ("push ups", "flexiones"), ("push up", "flexión"), ("pushup", "flexión"),
    ("sit ups", "abdominales"), ("sit up", "abdominal"), ("situp", "abdominal"),
    ("step ups", "subidas al cajón"),
    ("calf raise", "elevación de talones"), ("leg raise", "elevación de piernas"),
    ("lateral raise", "elevación lateral"), ("front raise", "elevación frontal"),
    ("raise", "elevación"),
    ("preacher curl", "curl predicador"), ("hammer curl", "curl martillo"),
    ("concentration curl", "curl concentrado"), ("wrist curl", "curl de muñeca"),
    ("bicep curl", "curl de bíceps"), ("biceps curl", "curl de bíceps"),
    ("leg curl", "curl femoral"), ("drag curl", "curl arrastrado"),
    ("spider curl", "curl araña"), ("curl", "curl"),
    ("triceps extension", "extensión de tríceps"), ("tricep extension", "extensión de tríceps"),
    ("leg extension", "extensión de cuádriceps"), ("back extension", "extensión de espalda"),
    ("hip extension", "extensión de cadera"), ("extension", "extensión"),
    ("hip thrust", "empuje de cadera"), ("thrust", "empuje"),
    ("hip abduction", "abducción de cadera"), ("hip adduction", "aducción de cadera"),
    ("abduction", "abducción"), ("adduction", "aducción"),
    ("good morning", "buenos días"), ("face pull", "face pull"),
    ("upright row", "remo al mentón"), ("bent over row", "remo inclinado"),
    ("row", "remo"), ("shrug", "encogimiento de hombros"),
    ("crossover", "cruce en polea"), ("flyes", "aperturas"), ("fly", "aperturas"),
    ("crunches", "crunch"), ("crunch", "crunch"), ("twist", "giro"),
    ("plank", "plancha"), ("dips", "fondos"), ("dip", "fondo"),
    ("lunges", "zancadas"), ("lunge", "zancada"),
    ("split squat", "sentadilla búlgara"),
    ("squats", "sentadillas"), ("squat", "sentadilla"),
    ("side bend", "flexión lateral de tronco"),
    ("air bike", "bicicleta en el aire"), ("v up", "V-up"),
    ("russian twist", "giro ruso"),
    ("pullover", "pullover"), ("kickbacks", "patadas"), ("kickback", "patada"),
    ("pushdown", "extensión en polea"), ("skullcrusher", "press francés"),
    ("stretch", "estiramiento"), ("rotation", "rotación"),
    ("step up", "subida al cajón"), ("snatch", "arrancada"),
    ("clean and jerk", "cargada y envión"), ("clean", "cargada"), ("jerk", "envión"),
    ("swing", "swing"), ("bridge", "puente"), ("pull through", "pull through"),
    ("good morning", "buenos días"), ("walk", "caminata"), ("carry", "caminata"),
    ("hold", "isométrico"), ("press", "press"),
]

# Modificadores multipalabra (se reubican tras el núcleo). Longest-first.
MODP = [
    ("close grip", "agarre cerrado"), ("wide grip", "agarre abierto"),
    ("narrow grip", "agarre cerrado"), ("neutral grip", "agarre neutro"),
    ("reverse grip", "agarre supino"), ("underhand grip", "agarre supino"),
    ("overhand grip", "agarre prono"), ("mixed grip", "agarre mixto"),
    ("one arm", "a un brazo"), ("single arm", "a un brazo"),
    ("one leg", "a una pierna"), ("single leg", "a una pierna"),
    ("bent over", "inclinado"), ("rear delt", "posterior"),
    ("behind the neck", "tras nuca"), ("behind neck", "tras nuca"),
]

# Modificadores y palabras sueltas (palabra inglesa -> español).
WORD = {
    "incline": "inclinado", "decline": "declinado", "reverse": "inverso",
    "reversed": "inverso", "revers": "inverso", "seated": "sentado",
    "sitted": "sentado", "standing": "de pie", "lying": "tumbado",
    "kneeling": "de rodillas", "alternating": "alternado", "alternate": "alternado",
    "overhead": "sobre la cabeza", "rear": "posterior", "front": "frontal",
    "wide": "abierto", "close": "cerrado", "closer": "cerrado", "narrow": "estrecho",
    "high": "alto", "low": "bajo", "flat": "plano", "single": "individual",
    "double": "doble", "underhand": "supino", "overhand": "prono",
    "supinated": "supino", "pronated": "prono", "supine": "boca arriba",
    "prone": "boca abajo", "assisted": "asistido", "unilateral": "unilateral",
    "twisting": "con giro", "twisted": "con giro", "bent": "inclinado",
    "straight": "recto", "cross": "cruzado", "crossed": "cruzado",
    "jump": "con salto", "jumping": "con salto", "walking": "caminando",
    "half": "medio", "full": "completo", "deep": "profundo", "quarter": "parcial",
    "side": "lateral", "lateral": "lateral", "inner": "interno", "outer": "externo",
    "inside": "interno", "outside": "externo", "external": "externo",
    "internal": "interno", "elevated": "elevado", "raised": "elevado",
    "negative": "negativo", "isometric": "isométrico", "explosive": "explosivo",
    "dynamic": "dinámico", "static": "estático", "slow": "lento",
    "wide": "abierto", "vertical": "vertical", "horizontal": "horizontal",
    "diagonal": "diagonal", "angled": "en ángulo", "decline": "declinado",
    # músculos / partes
    "arm": "brazo", "arms": "brazos", "leg": "pierna", "legs": "piernas",
    "legged": "pierna", "chest": "pecho", "shoulder": "hombro", "shoulders": "hombros",
    "back": "espalda", "hip": "cadera", "knee": "rodilla", "knees": "rodillas",
    "ankle": "tobillo", "ankles": "tobillos", "wrist": "muñeca", "calf": "pantorrilla",
    "calves": "pantorrillas", "glute": "glúteo", "glutes": "glúteos",
    "gluteus": "glúteo", "neck": "cuello", "oblique": "oblicuo", "obliques": "oblicuos",
    "abdominal": "abdominal", "abs": "abdomen", "bicep": "bíceps", "biceps": "bíceps",
    "tricep": "tríceps", "triceps": "tríceps", "hamstring": "isquio",
    "hamstrings": "isquios", "quad": "cuádriceps", "quads": "cuádriceps",
    "forearm": "antebrazo", "forearms": "antebrazos", "delt": "deltoides",
    "deltoid": "deltoides", "trap": "trapecio", "traps": "trapecio",
    "pec": "pectoral", "lat": "dorsal", "lats": "dorsales", "core": "core",
    "spine": "columna", "pelvic": "pélvico", "groin": "ingle", "heel": "talón",
    "toe": "punta", "finger": "dedos", "hand": "mano", "hands": "manos",
    "shin": "espinilla", "tibialis": "tibial",
    # estilos / nombres
    "goblet": "goblet", "sumo": "sumo", "zercher": "zercher", "hack": "hack",
    "bulgarian": "búlgara", "cossack": "cosaca", "pistol": "pistol",
    "sissy": "sissy", "russian": "ruso", "turkish": "turca", "cuban": "cubano",
    "arnold": "Arnold", "spider": "araña", "preacher": "predicador",
    "hindu": "hindú", "scott": "Scott", "zottman": "Zottman", "pendlay": "Pendlay",
    "jefferson": "Jefferson", "bradford": "Bradford", "svend": "Svend",
    "pallof": "Pallof", "renegade": "renegado", "farmers": "del granjero",
    "superman": "superman", "windmill": "molino", "windshield": "limpiaparabrisas",
    "wipers": "limpiaparabrisas", "frog": "rana", "donkey": "burro",
    "spell": "spell", "caster": "caster", "gironda": "Gironda", "scott": "Scott",
    "concentration": "concentrado", "preacher": "predicador", "drag": "arrastrado",
    "upright": "al mentón", "rope": "con cuerda", "rope": "con cuerda",
    "v": "en V", "y": "en Y", "t": "en T", "w": "en W", "l": "en L",
    "split": "split", "step": "subida", "box": "al cajón", "wall": "en pared",
    "floor": "en el suelo", "incline": "inclinado", "decline": "declinado",
    "pulse": "pulso", "around": "alrededor", "world": "del mundo",
    "good": "buenos", "morning": "días", "fire": "fuego", "hydrant": "hidrante",
    "clam": "almeja", "clamshell": "almeja", "monster": "monster",
    "band": "con banda", "battling": "con cuerda", "battle": "con cuerda",
    "ropes": "cuerdas", "rope": "con cuerda", "tire": "neumático",
    "sledge": "trineo", "stir": "remover", "pot": "olla", "the": "",
    # núcleos sueltos (cuando no son la cabeza)
    "squat": "sentadilla", "row": "remo", "press": "press", "curl": "curl",
    "raise": "elevación", "lunge": "zancada", "fly": "aperturas",
    "dip": "fondo", "dips": "fondos", "bench": "en banco", "bike": "bicicleta",
    "bend": "flexión", "two": "dos", "three": "tres", "good": "buenos",
    "extension": "extensión", "pull": "tirón", "pulls": "tirones",
    "curls": "curl", "rows": "remo", "raises": "elevación", "presses": "press",
    "extensions": "extensión", "twists": "giro", "pulldowns": "jalones",
    "snatches": "arrancadas", "thrusts": "empujes", "swings": "swing",
    # leftovers frecuentes
    "hammer": "martillo", "hanging": "colgado", "hang": "colgado",
    "touch": "toque", "touchers": "toques", "touches": "toques",
    "grip": "agarre", "gripless": "sin agarre", "head": "cabeza",
    "body": "cuerpo", "forward": "adelante", "backward": "atrás",
    "lower": "inferior", "upper": "superior", "throw": "lanzamiento",
    "down": "abajo", "lift": "levantamiento", "lifting": "levantamiento",
    "lifts": "levantamientos", "march": "marcha", "ground": "suelo",
    "inverse": "inverso", "inverted": "invertido", "pike": "pica",
    "tuck": "recogido", "jackknife": "navaja", "knife": "navaja",
    "saw": "sierra", "sprint": "sprint", "sprints": "sprints", "wind": "viento",
    "scissor": "tijera", "scissors": "tijera", "flutter": "aleteo",
    "mountain": "escalador", "climber": "escalador", "climbers": "escaladores",
    "kick": "patada", "kicks": "patadas", "bird": "pájaro", "dog": "perro",
    "pose": "postura", "reach": "alcance", "reaches": "alcances",
    "slam": "golpe", "slams": "golpes", "woodchop": "leñador", "wood": "leñador",
    "chop": "hacha", "chops": "hacha", "run": "carrera", "runners": "del corredor",
    "climb": "escalada", "crawl": "gateo", "drive": "impulso", "punch": "golpe",
    "jack": "salto", "jacks": "saltos", "bicycle": "bicicleta",
    "bar": "barra", "palms": "palmas", "palm": "palma", "behind": "detrás",
    "elbow": "codo", "elbows": "codos", "muscle": "músculo",
    "suspended": "suspendido", "hyperextension": "hiperextensión",
    "hyper": "hiper", "parallel": "paralelo", "stance": "postura",
    "tap": "toque", "neutral": "neutro", "circles": "círculos",
    "circular": "circular", "motion": "movimiento", "wheel": "rueda",
    "chair": "silla", "extended": "extendido", "support": "soporte",
    "supported": "con soporte", "plyo": "pliométrico", "chin": "barbilla",
    "scapula": "escápula", "scapular": "escapular", "tilt": "inclinación",
    "apart": "separados", "fours": "cuatro", "squad": "sentadilla",
    "squatting": "sentadilla", "sit": "sentado", "iron": "hierro",
    "cross": "cruzado", "release": "suelta", "fixed": "fija",
    "depth": "en profundidad", "drop": "drop", "lean": "inclinación",
    "frog": "rana", "gorilla": "gorila", "cat": "gato", "cobra": "cobra",
    "around": "alrededor", "archer": "arquero", "range": "rango",
    "rotational": "rotacional", "rotations": "rotaciones", "point": "punta",
    "handstand": "pino", "inchworm": "oruga", "balance": "equilibrio",
    "rocking": "balanceo", "flip": "giro", "crossovers": "cruces",
    "pronation": "pronación", "supination": "supinación", "hug": "abrazo",
    "pulley": "polea", "bottoms": "fondos", "stork": "cigüeña",
    "rollerout": "con rueda", "seesaw": "balancín", "peacher": "predicador",
    "thruster": "thruster", "flag": "bandera", "windmill": "molino",
    "rotary": "rotatorio", "rotate": "rotación", "skull": "press francés",
}

DROP = {
    "with", "on", "to", "of", "a", "an", "in", "for", "the", "and",
    "your", "from", "into", "against", "between", "across", "above",
    "around", "both", "self", "male", "female", "version", "variation",
    "exercise", "pro", "advanced", "intermediate", "basic", "modified",
    "up", "ups", "one", "off", "out", "over", "plus",
}


def load_dataset() -> list:
    if os.path.exists(_CACHE):
        return json.load(open(_CACHE, encoding="utf-8"))
    import urllib.request
    url = "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json"
    with urllib.request.urlopen(url) as r:
        return json.loads(r.read())


def title(name: str) -> str:
    return " ".join(w.capitalize() for w in name.split())


def translate(en: str) -> str:
    s = re.sub(r"\(.*?\)", " ", en.lower())
    s = re.sub(r"[^a-z ]", " ", s.replace("-", " ").replace("/", " "))
    s = " " + re.sub(r"\s+", " ", s).strip() + " "

    equip: list[str] = []
    for k, v in EQUIP:
        if f" {k} " in s:
            s = s.replace(f" {k} ", " ")
            if v and v not in equip:
                equip.append(v)
    s = " " + re.sub(r"\s+", " ", s).strip() + " "

    head = None
    for k, v in MOVE:
        if f" {k} " in s:
            head = v
            s = s.replace(f" {k} ", " ", 1)
            break
    s = " " + re.sub(r"\s+", " ", s).strip() + " "

    mods: list[str] = []
    for k, v in MODP:
        if f" {k} " in s:
            s = s.replace(f" {k} ", " ")
            mods.append(v)
    for tok in s.split():
        if tok in DROP:
            continue
        mods.append(WORD.get(tok, tok))

    parts = ([head] if head else []) + mods + equip
    out = re.sub(r"\s+", " ", " ".join(p for p in parts if p)).strip()
    if not out:
        return en
    return out[0].upper() + out[1:]


def main() -> None:
    dry = os.environ.get("DRYRUN") == "1"
    data = load_dataset()
    imported_names = {
        title(it["name"])
        for it in data
        if (it.get("body_part") or "").lower() != "cardio" and it.get("gif_url")
    }

    en_by_title = {title(it["name"]): it["name"] for it in data}

    db = SessionLocal()
    try:
        # Re-ejecutable: si ya existe backup (id -> nombre_en), re-traduce desde
        # ahí (los nombres en BD ya están en español). Si no, primera pasada.
        if os.path.exists(_BACKUP):
            backup = json.load(open(_BACKUP, encoding="utf-8"))
            id_to_en = {int(i): n for i, n in backup.items()}
        else:
            backup = {}
            rows = db.scalars(select(Exercise).where(Exercise.owner_id.is_(None)))
            id_to_en = {e.id: e.name for e in rows if e.name in imported_names}

        # nombre_en titulado -> nombre_en crudo (lower) del dataset
        def raw_en(titled: str) -> str:
            return en_by_title.get(titled, titled)

        samples = []
        for i, (eid, en_titled) in enumerate(id_to_en.items()):
            es = translate(raw_en(en_titled))
            if i < 25:
                samples.append((en_titled, es))
            if not dry:
                ex = db.get(Exercise, eid)
                if ex is not None:
                    backup[str(eid)] = en_titled
                    ex.name = es

        if dry:
            print(f"Objetivo: {len(id_to_en)} ejercicios a traducir")
            for en, es in samples:
                print(f"  {en!r:50} -> {es!r}")
            return

        json.dump(backup, open(_BACKUP, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        db.commit()
        print(f"Traducidos {len(id_to_en)} ejercicios. Backup en {_BACKUP}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
