Actúa como un Arquitecto de Software y Desarrollador Full-Stack experto. Quiero construir una aplicación web para gestionar mis rutinas de gimnasio, enfocada en la recomposición corporal y el seguimiento estricto de la sobrecarga progresiva.

Mi objetivo es desarrollar este proyecto poco a poco y de forma iterativa. Por lo tanto, en esta primera interacción NO quiero que escribas código funcional de la aplicación. Quiero que nos enfoquemos exclusivamente en la arquitectura, los cimientos y el modelo de datos.

Para darte contexto sobre la lógica de negocio, la app debe soportar:

-Estructuras de entrenamiento (splits) de 5 días a la semana, pero que sea variable.
-Registro detallado de variables por ejercicio (peso, series, repeticiones).
-Historial limpio para visualizar la evolución y medir la sobrecarga progresiva a lo largo del tiempo.

A nivel técnico, mi stack a utilizar es Python para el backend y PostgreSQL como base de datos (idealmente con una estructura que me permita en el futuro extraer la data a Pandas o BigQuery para hacer mis propios análisis). Para el frontend, busco algo moderno, responsivo para usar en el celular en el gimnasio, pero fácil de integrar.

Por favor, entrégame lo siguiente:

Propuesta de Arquitectura: Detalla el diseño del sistema. Sugiéreme el framework de Python más adecuado (ej. FastAPI, Django o Flask) y una tecnología para el frontend que sea ágil y el diseño sea agradable facil y bonito.

Diseño de la Base de Datos Relacional: Propón el esquema inicial para PostgreSQL (tablas de rutinas, ejercicios, logs de entrenamiento diario, etc.) detallando sus claves y relaciones.

Estructura del Repositorio: Muestra un árbol de directorios sugerido para organizar el proyecto de forma escalable.

Plan de Acción (Fase 1): Enumera los comandos exactos de inicialización del entorno (virtualenv, dependencias base, setup inicial de la BD) para sentar estas bases hoy mismo.

Espera mis comentarios y mi confirmación sobre la base de datos y la arquitectura antes de que pasemos a programar los primeros endpoints.


¡Excelente enfoque! Arrancar por la arquitectura y el modelo de datos antes de escribir endpoints es exactamente lo correcto para un proyecto que quieres hacer crecer iterativamente. Aquí va mi propuesta completa. **No escribiré código de la app**, solo cimientos, esquema y comandos de setup.

---

## 1. Propuesta de Arquitectura

### Backend: **FastAPI** ✅
Es la elección óptima para tu caso, por encima de Django y Flask:   

| Criterio | Por qué FastAPI gana aquí |
|---|---|
| **API para móvil** | Es API-first puro. No arrastras plantillas/admin como Django. |
| **Validación** | Pydantic v2 valida pesos/reps/series automáticamente (evita basura en la BD = historial limpio). |
| **Docs gratis** | Swagger/OpenAPI autogenerado en `/docs` — pruebas endpoints desde el móvil sin frontend. |
| **Async** | Escala bien y maneja bien la latencia móvil en el gym. |
| **Analítica futura** | SQLAlchemy + PostgreSQL te da SQL crudo cuando quieras volcar a Pandas/BigQuery. |

> Django solo valdría la pena si quisieras un panel de administración pesado out-of-the-box; para una app de tracking personal es sobreingeniería. Flask te dejaría reimplementando lo que FastAPI ya trae.

**Librerías base del backend:**
- **SQLAlchemy 2.0** (ORM) + **Alembic** (migraciones versionadas — clave para iterar el esquema sin romper datos).
- **psycopg 3** (driver PostgreSQL).
- **Pydantic v2 / pydantic-settings** (schemas + configuración por `.env`).
- **Uvicorn** (servidor ASGI).

### Frontend: **React + Vite + TypeScript + Tailwind CSS + shadcn/ui** (como PWA) ✅
- **Vite**: arranque y recarga instantáneos, iteración ágil.
- **Tailwind + shadcn/ui**: componentes bonitos y accesibles sin diseñar desde cero. Mobile-first nativo → perfecto para usar en el gym.
- **PWA (Progressive Web App)**: la instalas en la pantalla de inicio del celular como si fuera app nativa, funciona con conexión intermitente (útil en sótanos de gimnasios sin señal). Sin pasar por App Store.
- **Integración fácil**: consume el JSON de FastAPI directamente; opcionalmente generas un cliente TypeScript desde el OpenAPI de FastAPI (tipado de punta a punta).

> **Alternativa "todo en Python"** si quieres evitar JavaScript del todo: **Reflex** o **NiceGUI**. Reducen el cambio de contexto, pero el pulido visual y la experiencia móvil quedan por debajo de React+Tailwind. Mi recomendación firme es React+Vite+Tailwind por el resultado "bonito y fácil" que pides; es el estándar moderno y hay muchísimo soporte.

### Diagrama de alto nivel
```
[ PWA React/Vite ]  --HTTPS/JSON-->  [ FastAPI ]  --SQLAlchemy-->  [ PostgreSQL ]
   (móvil/gym)                         (Pydantic)                       │
                                                                        └──> export → Pandas / BigQuery
```

---

## 2. Diseño de la Base de Datos Relacional

El principio rector es **separar la "prescripción" (lo planeado) de la "ejecución" (lo realmente levantado)**. Esto te da un historial limpio y una tabla de hechos (`set_logs`) ideal para análisis tipo *tidy data* en Pandas/BigQuery.

### Tablas

**`users`** — soporta multiusuario desde el día 1 (aunque seas tú solo).
| Columna | Tipo | Notas |
|---|---|---|
| `id` | `BIGINT GENERATED ALWAYS AS IDENTITY` PK | |
| `email` | `TEXT UNIQUE NOT NULL` | |
| `display_name` | `TEXT` | |
| `created_at` | `TIMESTAMPTZ DEFAULT now()` | |

**`exercises`** — catálogo de ejercicios (reutilizable, sin duplicar nombres en cada log).
| Columna | Tipo | Notas |
|---|---|---|
| `id` | `BIGINT IDENTITY` PK | |
| `name` | `TEXT NOT NULL` | "Press banca con barra" |
| `primary_muscle` | `TEXT` | pecho, espalda, cuádriceps… (luego lookup table o ENUM) |
| `equipment` | `TEXT` | barra, mancuerna, polea, máquina |
| `is_custom` | `BOOLEAN DEFAULT false` | |
| `owner_id` | `BIGINT FK→users(id)` NULL | NULL = ejercicio global; lleno = creado por el user |

**`routines`** — un split/plan completo (ej. "Push/Pull/Legs 5 días").
| Columna | Tipo | Notas |
|---|---|---|
| `id` | `BIGINT IDENTITY` PK | |
| `user_id` | `BIGINT FK→users(id) NOT NULL` | |
| `name` | `TEXT NOT NULL` | |
| `days_per_week` | `SMALLINT` | **variable** (3, 5, 6…) |
| `is_active` | `BOOLEAN DEFAULT true` | una rutina activa a la vez |
| `created_at` | `TIMESTAMPTZ DEFAULT now()` | |

**`routine_days`** — cada día dentro del split (ej. "Día 1 – Pecho/Tríceps").
| Columna | Tipo | Notas |
|---|---|---|
| `id` | `BIGINT IDENTITY` PK | |
| `routine_id` | `BIGINT FK→routines(id) ON DELETE CASCADE` | |
| `day_order` | `SMALLINT NOT NULL` | 1..N (el "5 días variable" sale de aquí) |
| `name` | `TEXT` | "Push A", "Pierna" |
| `UNIQUE(routine_id, day_order)` | | |

**`routine_day_exercises`** — la **prescripción**: qué ejercicios y objetivos toca ese día.
| Columna | Tipo | Notas |
|---|---|---|
| `id` | `BIGINT IDENTITY` PK | |
| `routine_day_id` | `BIGINT FK→routine_days(id) ON DELETE CASCADE` | |
| `exercise_id` | `BIGINT FK→exercises(id)` | |
| `order_index` | `SMALLINT` | orden en la sesión |
| `target_sets` | `SMALLINT` | objetivo |
| `target_reps_min` | `SMALLINT` | rango bajo (ej. 8) |
| `target_reps_max` | `SMALLINT` | rango alto (ej. 12) |
| `target_weight` | `NUMERIC(6,2)` | opcional |
| `rest_seconds` | `SMALLINT` | |

**`workout_sessions`** — una sesión real de entrenamiento (instancia ejecutada).
| Columna | Tipo | Notas |
|---|---|---|
| `id` | `BIGINT IDENTITY` PK | |
| `user_id` | `BIGINT FK→users(id) NOT NULL` | |
| `routine_day_id` | `BIGINT FK→routine_days(id)` NULL | qué día tocaba (NULL = sesión libre) |
| `performed_at` | `TIMESTAMPTZ DEFAULT now()` | fecha del entrenamiento |
| `bodyweight` | `NUMERIC(5,2)` | clave para **recomposición corporal** |
| `notes` | `TEXT` | |

**`set_logs`** — ⭐ **el corazón del sistema**: cada serie levantada. Esta es tu *fact table* para sobrecarga progresiva y analítica.
| Columna | Tipo | Notas |
|---|---|---|
| `id` | `BIGINT IDENTITY` PK | |
| `session_id` | `BIGINT FK→workout_sessions(id) ON DELETE CASCADE` | |
| `exercise_id` | `BIGINT FK→exercises(id)` | denormalizado a propósito para queries directas |
| `set_number` | `SMALLINT NOT NULL` | 1, 2, 3… |
| `weight` | `NUMERIC(6,2) NOT NULL` | usa `NUMERIC`, **nunca `FLOAT`** (precisión) |
| `reps` | `SMALLINT NOT NULL` | |
| `rpe` | `NUMERIC(3,1)` NULL | esfuerzo percibido 6.0–10.0 (opcional, muy útil) |
| `is_warmup` | `BOOLEAN DEFAULT false` | separa calentamiento del trabajo real |
| `created_at` | `TIMESTAMPTZ DEFAULT now()` | |

### Relaciones (resumen)
```
users ──1:N── routines ──1:N── routine_days ──1:N── routine_day_exercises ──N:1── exercises
  │                                   │                                              │
  └──1:N── workout_sessions ──N:1─────┘                                             │
                  │                                                                  │
                  └──────────1:N── set_logs ──────────────────N:1───────────────────┘
```

### Decisiones técnicas importantes
- **`NUMERIC` para pesos**, no `FLOAT` → evita errores de redondeo (20.0 ≠ 19.9999).
- **`TIMESTAMPTZ`** siempre (zonas horarias correctas).
- **Surrogate keys `BIGINT IDENTITY`** → simples y rápidas para joins/analítica.
- **Catálogo `exercises` separado** → no repites "Press banca" en cada log; el historial queda limpio y agrupable.
- **Para sobrecarga progresiva**, más adelante crearemos una **vista** (o materialized view) que calcule el **1RM estimado (fórmula de Epley: `weight * (1 + reps/30)`)** y el mejor set por ejercicio/fecha. Esto alimenta directamente las gráficas de evolución.
- **`set_logs` ya es *tidy data***: una fila = una observación → `pd.read_sql` o export a BigQuery sin transformaciones.

---

## 3. Estructura del Repositorio

Monorepo con backend y frontend separados, escalable:

```
rafca-gym/
├── backend/
│   ├── app/
│   │   ├── main.py                 # instancia FastAPI
│   │   ├── core/
│   │   │   ├── config.py           # settings desde .env (pydantic-settings)
│   │   │   └── security.py         # auth/hashing (fase posterior)
│   │   ├── db/
│   │   │   ├── base.py             # Base declarativa SQLAlchemy
│   │   │   └── session.py          # engine + get_db()
│   │   ├── models/                 # modelos SQLAlchemy (1 archivo por entidad)
│   │   │   ├── user.py
│   │   │   ├── exercise.py
│   │   │   ├── routine.py
│   │   │   └── workout.py
│   │   ├── schemas/                # esquemas Pydantic (validación in/out)
│   │   ├── api/
│   │   │   └── v1/                 # routers versionados (/api/v1/...)
│   │   ├── services/               # lógica de negocio (e1RM, sobrecarga…)
│   │   └── analytics/              # helpers de export a Pandas/BigQuery
│   ├── alembic/                    # migraciones
│   │   └── versions/
│   ├── tests/
│   ├── alembic.ini
│   ├── pyproject.toml
│   ├── .env.example
│   └── .env                        # (en .gitignore)
│
├── frontend/                       # React + Vite + TS + Tailwind (PWA)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── lib/                    # cliente API tipado
│   │   └── ...
│   ├── package.json
│   └── ...
│
├── docker-compose.yml              # PostgreSQL local (y pgAdmin opcional)
├── .gitignore
└── README.md
```

---

## 4. Plan de Acción — Fase 1 (comandos exactos)

Estás en **Windows 11 + PowerShell**. Estos comandos sientan las bases hoy. **Aún no creamos endpoints** — solo entorno, dependencias y BD lista para la primera migración.

### 4.1 Estructura base y Git
```powershell
cd C:\Users\jose.oropeza\Documents
mkdir rafca-gym; cd rafca-gym
git init
mkdir backend, frontend
```

### 4.2 PostgreSQL vía Docker (recomendado — entorno limpio y reproducible)
Crea `docker-compose.yml` en la raíz con un servicio Postgres 16, luego:
```powershell
docker compose up -d
```
> Si prefieres PostgreSQL instalado nativo en Windows en vez de Docker, dímelo y te doy esa variante. Docker es más limpio para no ensuciar tu sistema.

### 4.3 Entorno virtual + dependencias del backend
```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install fastapi "uvicorn[standard]" sqlalchemy alembic "psycopg[binary]" pydantic pydantic-settings python-dotenv
pip freeze > requirements.txt
```
> Si PowerShell bloquea la activación del venv:
> `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`

### 4.4 Inicializar Alembic (migraciones)
```powershell
alembic init alembic
```
(Luego configuramos `alembic.ini` y `env.py` para que lean la URL desde `.env` y apunten a la `Base` de SQLAlchemy — eso lo hacemos juntos al definir los modelos.)

### 4.5 Frontend (lo dejamos andamiado, sin tocar todavía)
```powershell
cd ..\frontend
npm create vite@latest . -- --template react-ts
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 4.6 Verificación rápida del backend (smoke test, sin lógica aún)
```powershell
cd ..\backend
uvicorn app.main:app --reload
```
→ debería responder en `http://127.0.0.1:8000/docs` una vez tengamos un `main.py` mínimo.

---

## 🟡 Espero tu confirmación

Antes de programar nada, dime:

1. **Arquitectura**: ¿OK con **FastAPI + SQLAlchemy/Alembic + React/Vite/Tailwind (PWA)**? ¿O prefieres explorar la opción "todo Python" (Reflex/NiceGUI)?
2. **Base de datos**: ¿El esquema de 8 tablas con la separación **prescripción vs. ejecución** te hace sentido? ¿Agregamos algo desde ya —p. ej. medidas corporales (cintura, % grasa) para la *recomposición*, o lo dejamos para una fase posterior?
3. **PostgreSQL**: ¿**Docker** o instalación **nativa** en Windows?
4. **Multiusuario/Auth**: ¿lo dejamos preparado en el esquema pero sin login real por ahora (uso personal), o quieres auth desde el inicio?

En cuanto confirmes (y ajustemos lo que quieras), pasamos a crear los **modelos SQLAlchemy + la primera migración de Alembic**, y de ahí a los primeros endpoints. 💪

¿Quieres que guarde este plan en la memoria del proyecto para no perder el contexto entre sesiones?

Arquitectura: Todo OK. 
Base de datos: Agreguemos desde ya medidas corporales, que otra cosa se podría agregar?
PostgreSQL: Docker.
Multiusuario/Auth: Auth desde el inicio.

¡Perfecto! Confirmado: Auth desde el inicio, Docker, y medidas corporales dentro. Te detallo qué agrego y qué otras cosas valen la pena (con mi recomendación de cuáles sí ahora y cuáles después).

Lo que agrego sí o sí
body_measurements ⭐ (clave para recomposición)
Tabla separada de workout_sessions para que puedas pesarte/medirte sin entrenar.

Columna	Tipo	Notas
id	BIGINT IDENTITY PK	
user_id	BIGINT FK→users(id)	
measured_at	TIMESTAMPTZ DEFAULT now()	
weight	NUMERIC(5,2)	peso corporal
body_fat_pct	NUMERIC(4,1)	% grasa
waist_cm / hip_cm / chest_cm / arm_cm / thigh_cm / neck_cm	NUMERIC(5,2)	circunferencias
notes	TEXT	
Esto es lo que te permite cruzar fuerza (set_logs) vs. composición (body_measurements) a lo largo del tiempo → el corazón de la recomposición.

Cambios para Auth (desde el inicio)
En users: agrego hashed_password TEXT NOT NULL, is_active BOOLEAN DEFAULT true, preferred_unit ('kg'/'lb').
Patrón: OAuth2 Password Flow + JWT (access token corto + refresh token). Lo trae FastAPI nativo.
Dependencias extra: passlib[bcrypt] (hash), python-jose[cryptography] o pyjwt (tokens).
Tabla opcional refresh_tokens (id, user_id, token_hash, expires_at, revoked) si quieres poder cerrar sesión en dispositivos. Mi recomendación: añadirla, es barata y te ahorra dolores luego.
Qué MÁS se podría agregar (con mi recomendación)
Idea	Para qué	¿Ahora?
muscle_groups (tabla lookup) en vez de texto libre en exercises	Agrupar volumen por grupo muscular en análisis (sets/semana por pecho, etc.) sin errores de tipeo	✅ Sí — barato y mejora muchísimo la analítica
Vista personal_records (no tabla)	PRs y 1RM estimado (Epley) calculados desde set_logs	✅ Sí — es una vista, no duplica datos
goals (objetivos: peso meta, 1RM meta por ejercicio)	Medir progreso contra metas	🟡 Recomendable, fácil de añadir luego
progress_photos (fecha + ruta/URL de foto)	Seguimiento visual de recomposición	🟡 Útil pero implica manejo de archivos → mejor fase 2
training_blocks / mesociclos (deload, periodización)	Estructurar bloques de 4–6 semanas	🔴 Después — añade complejidad; tu esquema actual ya lo soporta vía fechas
Volumen de set calculado (weight*reps)	Tonelaje por sesión	✅ Gratis — columna generada o en la vista
Mi recomendación firme para arrancar: las 8 tablas originales + body_measurements + muscle_groups (lookup) + auth + vista personal_records. Lo demás (goals, fotos, mesociclos) lo dejamos preparado para sumarlo sin romper nada.

Para cerrar el modelo de datos y empezar a crear los modelos SQLAlchemy + primera migración, déjame confirmar dos cosas:

Solicitado
Extras BD
¿Qué extras incluimos en el esquema inicial (además de body_measurements y auth, que ya van)? muscle_groups (lookup), Vista personal_records, goals (objetivos)

¿Unidad de peso por defecto para tu usuario? kg

Cerrado entonces. Te dejo el modelo de datos final bloqueado y guardo las decisiones en memoria del proyecto para no perder contexto entre sesiones.

Esquema final (v1)
Tablas (11) + 1 vista:

users ──1:N── routines ──1:N── routine_days ──1:N── routine_day_exercises ──N:1── exercises ──N:1── muscle_groups
  │                                  │                                                  
  ├──1:N── workout_sessions ──N:1────┘                                                  
  │              │                                                                       
  │              └──1:N── set_logs ──N:1── exercises                                     
  ├──1:N── body_measurements                                                            
  ├──1:N── goals                                                                         
  └──1:N── refresh_tokens                                                               
VIEW personal_records  ←  derivada de set_logs (mejor set + 1RM Epley por ejercicio/fecha)
Decisiones bloqueadas:

Auth: OAuth2 Password Flow + JWT (access + refresh). users.hashed_password, is_active, preferred_unit.
muscle_groups como lookup (FK desde exercises.primary_muscle_id).
goals: metas de peso corporal y de 1RM por ejercicio (user_id, goal_type, exercise_id NULL, target_value, target_date).
personal_records como vista (no tabla) → 1RM estimado con Epley weight*(1+reps/30).
Unidad: kg (preferred_unit queda en users por si luego sumas lb, pero internamente todo en kg).
Pesos en NUMERIC, tiempos en TIMESTAMPTZ, PKs BIGINT IDENTITY.
Voy a guardar esto en memoria del proyecto ahora mismo:


Recordado una memoria, guardado 2 memorias
Listo, guardado en memoria. ✅

🟢 Diseño cerrado — siguiente paso
Ya tenemos arquitectura y modelo de datos bloqueados. El siguiente paso de programación (cuando me des luz verde) sería sentar los cimientos reales:

docker-compose.yml con PostgreSQL 16.
Estructura del backend (app/, core/config.py, db/).
Modelos SQLAlchemy de las 11 tablas + la vista personal_records.
Configurar Alembic y generar la primera migración (crea todo el esquema).
main.py mínimo + healthcheck para verificar que FastAPI levanta y conecta a la BD.
Esto todavía no incluye endpoints de negocio (rutinas, logs, auth real) — solo dejar la base corriendo y migrada. Los endpoints vendrían en la fase siguiente.

¿Le damos? ¿O quieres revisar/ajustar algo más del esquema antes de tocar código?
