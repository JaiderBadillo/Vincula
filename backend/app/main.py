"""
Vincula API - Monolito Modular Híbrido Asíncrono
FastAPI 2.0+ con Gating de Cuarentena (Opción 2) y 7 Dominios Modulares Desacoplados.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import check_database_connection

# Importación de los Routers Modulares
from app.modules.iam.router import router as iam_router
from app.modules.superadmin.router import router as superadmin_router
from app.modules.companies.router import router as companies_router
from app.modules.institutions.router import router as institutions_router
from app.modules.graduates.router import router as graduates_router
from app.modules.vacancies_ats.router import router as vacancies_router
from app.modules.vacancies_ats.interview_response import router as interview_response_router
from app.modules.ai_engine.router import router as ai_engine_router
from app.api.endpoints.traceability import router as legacy_traceability_router
from app.modules.moderation.router import router as moderation_router

@asynccontextmanager
async def lifespan(_app):
    """Carga las cuentas suspendidas para cortar también sus sesiones abiertas tras un reinicio."""
    try:
        from app.core import database
        from app.core.dependencies import revoke_sessions
        from app.modules.moderation.services import load_suspended_users
        if database.AsyncSessionLocal is not None:
            async with database.AsyncSessionLocal() as session:
                for uid in await load_suspended_users(session):
                    revoke_sessions(uid)
    except Exception as exc:  # noqa: BLE001  (p. ej. antes de aplicar la migración)
        import logging
        logging.getLogger(__name__).warning("No se cargaron las cuentas suspendidas: tipo=%s", type(exc).__name__)
    yield


app = FastAPI(
    lifespan=lifespan,
    title="Vincula API - Plataforma de Empleabilidad IES",
    description=(
        "Backend estructurado bajo arquitectura de Monolito Modular Híbrido Asíncrono. "
        "Integra autenticación multirrol, modelo de cuarentena 72h contra fraudes (Opción 2), "
        "gestión de egresados, multi-sede empresarial, validación curricular y ATS Kanban de 6 fases."
    ),
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configuración de CORS con soporte de orígenes explícitos y previews dinámicas de Vercel
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"^https:\/\/.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware de Seguridad HTTP para Producción
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response

# Montaje de los 7 Dominios Modulares bajo /api/v1
app.include_router(iam_router, prefix="/api/v1")
app.include_router(superadmin_router, prefix="/api/v1")
app.include_router(moderation_router, prefix="/api/v1")
app.include_router(companies_router, prefix="/api/v1")
app.include_router(institutions_router, prefix="/api/v1")
app.include_router(graduates_router, prefix="/api/v1")
app.include_router(vacancies_router, prefix="/api/v1")
app.include_router(interview_response_router, prefix="/api/v1")
app.include_router(ai_engine_router, prefix="/api/v1")

# Compatibilidad hacia atrás con endpoints previos de trazabilidad
app.include_router(legacy_traceability_router, prefix="/api")


@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "arquitectura": "Monolito Modular Híbrido Asíncrono",
        "modelo_seguridad": "Gating de Cuarentena (Opción 2) - 100% Blindado contra Estafas",
        "docs": "/docs",
        "modulos": [
            {"modulo": "iam", "prefix": "/api/v1/auth"},
            {"modulo": "superadmin", "prefix": "/api/v1/admin"},
            {"modulo": "companies", "prefix": "/api/v1/empresas"},
            {"modulo": "institutions", "prefix": "/api/v1/instituciones"},
            {"modulo": "graduates", "prefix": "/api/v1/egresados"},
            {"modulo": "vacancies_ats", "prefix": "/api/v1/vacantes"},
            {"modulo": "ai_engine", "prefix": "/api/v1/ia/trazabilidad"}
        ]
    }


@app.get("/api/v1/health")
def health_check():
    return {
        "status": "online",
        "environment": settings.ENVIRONMENT,
        "version": settings.APP_VERSION
    }


@app.get("/api/v1/health/db")
async def health_check_db():
    """
    Fase 0: Monitoreo en vivo de infraestructura y conexión con PostgreSQL / Supabase.
    Retorna latencia (ms), versión del motor, estado del pool asyncpg y pgvector.
    """
    return await check_database_connection()


