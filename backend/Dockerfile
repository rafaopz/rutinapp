# Imagen del backend FastAPI para producción (Render).
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

# Render inyecta $PORT. Aplica migraciones pendientes y arranca el servidor.
# `alembic upgrade head` es idempotente: si la BD ya está al día, no hace nada.
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
