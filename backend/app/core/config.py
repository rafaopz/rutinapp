"""Configuración central de la aplicación.

Carga las variables desde `.env` usando pydantic-settings, de modo que el
resto del código nunca lee `os.environ` directamente.
"""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    PROJECT_NAME: str = "RutinApp"
    ENVIRONMENT: str = "development"
    API_V1_PREFIX: str = "/api/v1"

    # Base de datos
    DATABASE_URL: str = (
        "postgresql+psycopg://rutinapp:rutinapp@localhost:5432/rutinapp"
    )

    # Auth / JWT
    # App de uso personal: tokens de larga duración para no tener que
    # re-loguear. El frontend además refresca automáticamente ante un 401.
    SECRET_KEY: str = "change-me"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 días
    REFRESH_TOKEN_EXPIRE_DAYS: int = 365
    JWT_ALGORITHM: str = "HS256"

    # CORS: se define como CSV en el `.env` y se expone como lista vía propiedad.
    BACKEND_CORS_ORIGINS: str = "http://localhost:5173"

    @property
    def cors_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.BACKEND_CORS_ORIGINS.split(",")
            if origin.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
