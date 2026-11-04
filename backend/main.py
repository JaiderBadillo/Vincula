"""
Backend FastAPI - Vincula Bolsa de Empleo y Trazabilidad IES
Servicio ligero, determinista y preparado para escalar sin costos de tokens.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints.traceability import router as traceability_router

app = FastAPI(
    title="Vincula IES - API de Trazabilidad Curricular",
    description="Servicio backend para extracción de pensums (PDF) y cálculo de pertinencia laboral.",
    version="1.0.0"
)

# Permitir CORS para el frontend en Vite (puerto 5173 y afines)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir router de trazabilidad
app.include_router(traceability_router, prefix="/api")


@app.get("/")
def root():
    return {
        "app": "Vincula IES API",
        "status": "online",
        "modules": {
            "traceability": "/api/traceability/health",
            "pdf_extractor": "/api/traceability/upload-pensum-pdf",
            "curriculum_matcher": "/api/traceability/match"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
