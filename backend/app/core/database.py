"""
Conexión Asíncrona a Base de Datos PostgreSQL / Supabase.
Fase 0: Infraestructura y Gestión de Conexiones (SQLAlchemy 2.0 + asyncpg).
"""

import time
from typing import AsyncGenerator, Dict, Any, Optional
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker,
    AsyncEngine,
)
from sqlalchemy.orm import declarative_base
from sqlalchemy import text
from app.core.config import settings

# Base declarativa para entidades ORM
Base = declarative_base()

# Motor asíncrono con pooling y pre-ping
engine: Optional[AsyncEngine] = None
AsyncSessionLocal: Optional[async_sessionmaker] = None


def init_engine():
    global engine, AsyncSessionLocal
    try:
        engine = create_async_engine(
            settings.DATABASE_URL,
            echo=settings.DEBUG and settings.ENVIRONMENT == "development",
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20,
            pool_recycle=1800,  # Reciclar conexiones cada 30 minutos
            connect_args={"timeout": 5.0}  # Timeout de 5s para no bloquear
        )
        AsyncSessionLocal = async_sessionmaker(
            bind=engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )
    except Exception as e:
        print(f"[AVISO DB] No se pudo inicializar engine: {e}")


# Inicializar el engine al importar
init_engine()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Inyector de dependencias FastAPI para sesiones asíncronas de base de datos.
    Garantiza commit automático en transacciones exitosas y rollback ante excepciones.
    """
    if AsyncSessionLocal is None:
        raise RuntimeError(
            "El motor de base de datos no está inicializado. "
            "Revisa DATABASE_URL en tu archivo .env."
        )

    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def check_database_connection() -> Dict[str, Any]:
    """
    Verifica la conectividad en vivo con la base de datos PostgreSQL/Supabase.
    Mide la latencia de respuesta (ms) y retorna metadatos del pool.
    """
    if engine is None or AsyncSessionLocal is None:
        return {
            "connected": False,
            "status": "uninitialized",
            "driver": "asyncpg",
            "error": "Engine no inicializado. Verifica DATABASE_URL."
        }

    start_time = time.perf_counter()
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(text("SELECT version();"))
            db_version = result.scalar()
            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

            # Verificar si existe la extensión pgvector
            has_pgvector = False
            try:
                vec_res = await session.execute(
                    text("SELECT 1 FROM pg_extension WHERE extname = 'vector';")
                )
                has_pgvector = vec_res.scalar() is not None
            except Exception:
                has_pgvector = False

            pool = engine.pool
            pool_info = {
                "size": pool.size(),
                "checked_in": pool.checkedin(),
                "checked_out": pool.checkedout(),
                "overflow": pool.overflow(),
            }

            return {
                "connected": True,
                "status": "healthy",
                "database": "PostgreSQL",
                "driver": "asyncpg",
                "version": db_version,
                "pgvector_active": has_pgvector,
                "latency_ms": latency_ms,
                "pool": pool_info,
                "error": None
            }
    except Exception as e:
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            "connected": False,
            "status": "unreachable",
            "database": "PostgreSQL",
            "driver": "asyncpg",
            "latency_ms": latency_ms,
            "error": str(e)
        }
