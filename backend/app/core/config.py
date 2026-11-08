"""
Configuración Transversal del Backend Vincula.
Utiliza Pydantic Settings con carga de variables de entorno desde .env.
"""

import os
import json
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Entorno
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    APP_NAME: str = "Vincula API"
    APP_VERSION: str = "2.0.0"

    # Servidor
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "https://vincula.vercel.app",
        "*"
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            v_clean = v.strip()
            if v_clean.startswith("[") and v_clean.endswith("]"):
                try:
                    return json.loads(v_clean)
                except Exception:
                    pass
            return [i.strip() for i in v_clean.split(",") if i.strip()]
        return v

    # Seguridad JWT
    JWT_SECRET_KEY: str = "vincula_secret_key_development_token_2026_super_secure_hash"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Base de Datos PostgreSQL / Supabase
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/postgres"

    # Supabase Integraciones (Storage de PDFs y Webhooks)
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_STORAGE_BUCKET_DOCS: str = "vincula-documentos-auditoria"
    SUPABASE_STORAGE_BUCKET_DIPLOMAS: str = "vincula-diplomas-validados"

    # Orquestador n8n (Webhooks de Automatizaciones)
    N8N_WEBHOOK_BASE_URL: str = ""
    N8N_WEBHOOK_SECRET: str = ""

    # Correo Electrónico Transaccional (Gmail SMTP)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 465
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_NAME: str = "Vincula - Red de Empleabilidad IES"
    SMTP_FROM_EMAIL: str = ""

    # Google Gemini AI (Matching Semántico Vectorial)
    GEMINI_API_KEY: str = ""

    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
