# RutinApp 🏋️

App web para gestionar rutinas de gimnasio, enfocada en **recomposición corporal**
y **sobrecarga progresiva**. Backend API-first con FastAPI + PostgreSQL; frontend
PWA (React/Vite/Tailwind) pensado para usar en el celular en el gimnasio.

## Stack

| Capa | Tecnología |
|---|---|
| Backend | FastAPI · SQLAlchemy 2.0 · Alembic · Pydantic v2 |
| Base de datos | PostgreSQL 16 (Docker) · driver psycopg 3 |
| Auth | OAuth2 Password Flow + JWT (access + refresh) |
| Frontend | React + Vite + TypeScript + Tailwind + shadcn/ui (PWA) — *pendiente* |
| Analítica | `set_logs` como *tidy data* → Pandas / BigQuery |

## Modelo de datos (v1)

11 tablas + 1 vista. Principio rector: **separar la prescripción (lo planeado)
de la ejecución (lo realmente levantado)**.

```
users ──1:N── routines ──1:N── routine_days ──1:N── routine_day_exercises ──N:1── exercises ──N:1── muscle_groups
  │                                  │
  ├──1:N── workout_sessions ──N:1────┘
  │              └──1:N── set_logs ──N:1── exercises
  ├──1:N── body_measurements
  ├──1:N── goals
  └──1:N── refresh_tokens

VIEW personal_records  ←  mejor serie + 1RM estimado (Epley) por usuario/ejercicio/día
```

Decisiones clave: pesos en `NUMERIC` (nunca `FLOAT`), tiempos en `TIMESTAMPTZ`,
PKs `BIGINT IDENTITY`, todo en kg internamente.

## Estructura

```
rutinapp/
├── docker-compose.yml      # PostgreSQL 16 (puerto host 5433) + pgAdmin opcional
├── backend/
│   ├── app/
│   │   ├── main.py         # FastAPI + healthcheck
│   │   ├── core/config.py  # settings desde .env
│   │   ├── db/             # Base declarativa + sesión
│   │   ├── models/         # 11 modelos SQLAlchemy
│   │   ├── schemas/        # Pydantic (pendiente)
│   │   ├── api/v1/         # routers (pendiente)
│   │   ├── services/       # lógica de negocio (pendiente)
│   │   └── analytics/      # export a Pandas/BigQuery (pendiente)
│   ├── alembic/            # migraciones (0001 = esquema inicial)
│   └── requirements.txt
└── frontend/               # andamiaje pendiente
```

## Puesta en marcha (Windows / PowerShell)

> **Nota:** el contenedor publica PostgreSQL en el puerto **5433** del host para
> no chocar con un PostgreSQL nativo que ya escucha en el 5432.

```powershell
# 1. Levantar la base de datos
docker compose up -d db

# 2. Backend
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env        # ajusta SECRET_KEY

# 3. Migrar la base de datos
alembic upgrade head

# 4. Arrancar la API
uvicorn app.main:app --reload
```

Verificación:
- API: http://127.0.0.1:8000/
- Healthcheck: http://127.0.0.1:8000/health → `{"status":"ok","database":"connected"}`
- Docs (Swagger): http://127.0.0.1:8000/docs
- pgAdmin opcional: `docker compose --profile tools up -d` → http://localhost:5050

## Migraciones (Alembic)

```powershell
alembic revision --autogenerate -m "mensaje"   # generar tras cambiar modelos
alembic upgrade head                            # aplicar
alembic downgrade -1                            # revertir
```

## Autenticación

OAuth2 Password Flow + JWT. Endpoints bajo `/api/v1/auth`:

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/register` | Crea usuario (email + password bcrypt) |
| POST | `/auth/login` | Form `username`(=email)+`password` → access + refresh |
| POST | `/auth/refresh` | Rota el refresh token y emite par nuevo |
| POST | `/auth/logout` | Revoca el refresh token |
| GET | `/auth/me` | Perfil del usuario autenticado (Bearer) |

El refresh token es opaco; en la BD solo se guarda su hash SHA-256
(`refresh_tokens`), es de un solo uso (rotación) y revocable.

## Catálogo y rutinas

Endpoints (todos requieren Bearer token):

| Recurso | Endpoints |
|---|---|
| Grupos musculares | `GET/POST /muscle-groups` |
| Ejercicios | `GET/POST /exercises`, `GET/PATCH/DELETE /exercises/{id}` (filtros `?muscle_id`, `?search`) |
| Rutinas | `GET/POST /routines`, `GET/PATCH/DELETE /routines/{id}`, `POST /routines/{id}/activate` |
| Días | `POST /routines/{id}/days`, `PATCH/DELETE /routine-days/{id}` |
| Ejercicios prescritos | `POST /routine-days/{id}/exercises`, `PATCH/DELETE /routine-day-exercises/{id}` |

- Los ejercicios son **globales** (catálogo sembrado: 12 grupos, 32 ejercicios) o
  **personalizados** por usuario (solo el dueño los edita/borra).
- Las rutinas se crean **anidadas** (días + ejercicios en un solo POST) y todo
  está acotado al usuario dueño. Solo una rutina activa a la vez.

## Logging de entrenamiento y analítica

| Recurso | Endpoints |
|---|---|
| Sesiones | `GET/POST /sessions`, `GET/PATCH/DELETE /sessions/{id}` |
| Series | `POST /sessions/{id}/sets`, `PATCH/DELETE /sets/{id}` |
| Progresión | `GET /stats/exercises/{id}/progression` (1RM estimado por día) |
| Récords | `GET /stats/personal-records` (mejor 1RM por ejercicio) |

- Las sesiones se crean **anidadas** (con sus series en un solo POST); admiten
  `performed_at` y `bodyweight` (para recomposición).
- La analítica sale de la vista `personal_records` (Epley `weight*(1+reps/30)`),
  excluyendo series de calentamiento.

## Medidas corporales y objetivos

| Recurso | Endpoints |
|---|---|
| Medidas | `GET/POST /measurements`, `GET/PATCH/DELETE /measurements/{id}` |
| Objetivos | `GET/POST /goals`, `GET/PATCH/DELETE /goals/{id}` |

- Medidas: peso, % grasa y circunferencias en el tiempo (`measured_at` opcional →
  usa `now()`).
- Objetivos: `goal_type` ∈ {`bodyweight`, `body_fat`, `one_rm`}; las metas
  `one_rm` requieren `exercise_id` (las demás no lo admiten).

## Estado actual

✅ **Cimientos**: Docker + PostgreSQL, 11 modelos SQLAlchemy, vista
`personal_records`, migraciones aplicadas, FastAPI conectado a la BD.

✅ **Auth (fase 1)**: registro, login, refresh con rotación, logout y `/me`.

✅ **Catálogo + rutinas (fase 2)**: grupos musculares, ejercicios (global+custom)
y CRUD de rutinas con días/ejercicios anidados, activación exclusiva.

✅ **Logging + analítica (fase 3)**: sesiones y series con propiedad por usuario,
progresión y récords personales (1RM estimado).

✅ **Medidas + objetivos (fase 4)**: CRUD de medidas corporales y objetivos con
validación de tipo. **Backend completo** (46 rutas), probado end-to-end.

✅ **Frontend — andamiaje + auth (fase 5)**: PWA React/Vite/TS/Tailwind v4 con
cliente API tipado (refresh automático de token), contexto de auth, rutas
protegidas y pantallas de login/registro/dashboard.

✅ **Frontend — Mis rutinas (fase 6)**: listado y creación de rutinas, detalle
con gestión de días y ejercicios (añadir/eliminar), activación y borrado.

✅ **Frontend — app completa (fase 7)**: pantallas de **Entrenar hoy** (registrar
series sobre la rutina activa + ejercicios libres), **Progreso** (récords y
gráfica SVG de 1RM estimado), **Medidas** (con gráfica de peso) y **Objetivos**.
Dashboard enlaza todo. Build OK y flujo completo probado vía proxy.

✅ **Guía visual de ejercicios (fase 8)**: cada ejercicio tiene imagen, video e
instrucciones. Imágenes curadas desde [free-exercise-db](https://github.com/yuhonas/free-exercise-db)
(dominio público) para el catálogo global + ejercicios de valentina; video con
fallback automático a búsqueda de YouTube por nombre; instrucciones en español
para el catálogo global. Miniatura + modal de guía en "Entrenar hoy", detalle de
rutina y un nuevo **Catálogo de ejercicios** (`/exercises`) con edición de medios
para los personalizados. Imágenes cacheadas en el Service Worker (PWA offline).

**🎉 App funcional de punta a punta como guía de entrenamiento.** Mejoras futuras:
historial de sesiones, edición inline de series/medidas, iconos PWA propios, tests.

### Datos / seed scripts (backend/scripts)

- `seed_exercise_media.py` — asigna imágenes estáticas (free-exercise-db) e
  instrucciones. Idempotente. `PYTHONPATH=. python scripts/seed_exercise_media.py`.
- `seed_exercise_gifs.py` — asigna **GIFs animados** (exercises-dataset) que
  sustituyen las imágenes estáticas donde hay match (56/56). `DRYRUN=1` para
  previa. `PYTHONPATH=. python scripts/seed_exercise_gifs.py`.
- `seed_valentina_routine.py` — carga la rutina de 5 días de valentina.

> Las imágenes/GIFs se sirven desde `raw.githubusercontent.com` y se cachean en
> el Service Worker (`runtimeCaching`) para verse offline en el gym.

## Frontend (PWA)

Gestor de paquetes: **pnpm** (vía Corepack, sin instalación global ni admin).

```powershell
cd frontend
corepack pnpm install   # solo la primera vez
corepack pnpm dev       # http://localhost:5173
```

> Si activas el shim global con permisos de admin (`corepack enable`), podrás
> usar `pnpm install` / `pnpm dev` directamente, sin el prefijo `corepack`.

**Seguridad de dependencias** (cadena de suministro de npm): configurado en
`pnpm-workspace.yaml` →
- `onlyBuiltDependencies`: pnpm **bloquea los scripts postinstall** de las
  dependencias por defecto; solo se autorizan los imprescindibles (`esbuild`,
  `@tailwindcss/oxide`).
- `minimumReleaseAge: 1440`: no instala versiones con menos de 24 h (cooldown
  anti-publicaciones maliciosas). pnpm verifica además políticas de cadena de
  suministro contra el lockfile en cada install.

- En desarrollo, Vite **proxea** `/api` → `http://127.0.0.1:8000` (backend), así
  que basta con tener el backend levantado en el 8000.
- Stack: React + Vite + TypeScript + Tailwind v4 + `vite-plugin-pwa`.
- Estructura: `src/lib` (cliente API y tipos), `src/context` (auth),
  `src/components` (UI + rutas protegidas), `src/pages` (login/registro/dashboard).
