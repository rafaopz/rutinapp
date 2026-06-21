# Despliegue a producción (uso personal)

Stack: **Frontend → Vercel**, **Backend (FastAPI) → Render**, **Postgres → Neon**.

El código ya está preparado:
- El frontend lee la URL del backend de `VITE_API_BASE` (en dev usa el proxy de Vite).
- El backend lee `DATABASE_URL`, `SECRET_KEY` y `BACKEND_CORS_ORIGINS` del entorno.
- `backend/Dockerfile` aplica migraciones (`alembic upgrade head`, idempotente) y arranca el servidor.

---

## 0. Subir el repo a GitHub
```bash
git init && git add -A && git commit -m "Preparar despliegue"
gh repo create rutinapp --private --source=. --push   # o crea el repo en github.com y haz push
```

## 1. Base de datos: Neon
1. Crea una cuenta en https://neon.tech y un proyecto nuevo.
2. Copia la **connection string** (algo como `postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`).
3. Guárdala en dos formatos:
   - **Para la app (SQLAlchemy):** cambia el prefijo a `postgresql+psycopg://...` → este es tu `DATABASE_URL`.
   - **Para pg_restore/psql:** déjala tal cual (`postgresql://...`).

## 2. Migrar tus datos actuales a Neon
Esto copia TODO (usuarios, rutinas, sesiones, medidas y el catálogo de ~1300 ejercicios ya traducido y clasificado). Se hace con Docker para no depender de tener el cliente de Postgres instalado. **Hazlo antes de desplegar el backend.**

Con el contenedor local `rutinapp_db` en marcha:
```bash
# Volcar la BD local a un archivo
docker exec rutinapp_db pg_dump -U rutinapp -d rutinapp --no-owner --no-privileges -Fc -f /tmp/rutinapp.dump
docker cp rutinapp_db:/tmp/rutinapp.dump ./rutinapp.dump

# Restaurar en Neon (usa la cadena SIN +psycopg)
docker run --rm -v "$(pwd):/b" postgres:16 \
  pg_restore --no-owner --no-privileges --clean --if-exists \
  -d "postgresql://USER:PASS@HOST/neondb?sslmode=require" /b/rutinapp.dump
```
> Tras la restauración, Neon ya tiene el esquema en la versión 0006; el `alembic upgrade head` del backend será un no-op.

## 3. Backend: Render
1. https://render.com → **New → Web Service** → conecta tu repo de GitHub.
2. Configuración:
   - **Root Directory:** `backend`
   - **Runtime:** Docker (detecta el `Dockerfile` automáticamente).
3. **Environment variables:**
   | Clave | Valor |
   |---|---|
   | `DATABASE_URL` | la cadena de Neon **con** `postgresql+psycopg://...` |
   | `SECRET_KEY` | genera uno: `python -c "import secrets; print(secrets.token_hex(32))"` |
   | `BACKEND_CORS_ORIGINS` | `http://localhost:5173` (lo completamos en el paso 5) |
   | `ENVIRONMENT` | `production` |
4. Deploy. Anota la URL pública, p. ej. `https://rutinapp-api.onrender.com`.
5. Verifica: abre `https://rutinapp-api.onrender.com/health` → debe responder OK.

> Plan free de Render: el servicio "duerme" tras ~15 min de inactividad; la primera petición luego tarda ~30–60 s. Normal para uso personal.

## 4. Frontend: Vercel
1. https://vercel.com → **Add New → Project** → importa el repo.
2. Configuración:
   - **Root Directory:** `frontend`
   - Framework: Vite (autodetectado). Build `pnpm build`, output `dist` (por defecto).
3. **Environment variable:**
   - `VITE_API_BASE` = `https://rutinapp-api.onrender.com/api/v1` (tu URL de Render + `/api/v1`)
4. Deploy. Anota el dominio, p. ej. `https://rutinapp.vercel.app`.

## 5. Conectar CORS y redeploy
1. En **Render**, edita `BACKEND_CORS_ORIGINS` →
   `https://rutinapp.vercel.app,http://localhost:5173`
   (sin barra final; añade también el dominio de preview de Vercel si lo usas).
2. Render redeplega solo al guardar la variable.

## 6. Probar
- Abre el dominio de Vercel, inicia sesión (p. ej. `valentina` / `456`).
- Revisa rutinas, calendario, estadísticas y el catálogo de ejercicios.

---

## Notas
- **Auto-deploy:** con el repo conectado, cada `git push` a la rama principal redeploya frontend y backend.
- **Cambiar SECRET_KEY** está bien: los refresh tokens (opacos, en BD) siguen válidos, así que las sesiones se mantienen.
- **Actualizar datos luego:** vuelve a correr el paso 2 (el `--clean --if-exists` sobrescribe). Ojo: eso reemplaza los datos de Neon con los locales.
- **Sin Docker para el dump:** si prefieres, instala el cliente de Postgres 16 y usa `pg_dump`/`pg_restore` directamente con las mismas opciones.
