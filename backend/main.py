"""
Punto de Entrada del Backend Vincula.
Inicia el Monolito Modular Híbrido Asíncrono en FastAPI.
Ejecutar con:
    uvicorn app.main:app --reload --port 8000
o directamente:
    python main.py
"""

import sys
import os

# Asegurar que el directorio raíz de backend esté en el PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app

if __name__ == "__main__":
    import uvicorn
    from app.core.config import settings

    print("============================================================================")
    print(" INICIANDO VINCULA API - MONOLITO MODULAR HÍBRIDO ASÍNCRONO")
    print(f" Servidor: http://{settings.HOST}:{settings.PORT}")
    print(f" Documentación Swagger UI: http://localhost:{settings.PORT}/docs")
    print(f" Documentación ReDoc: http://localhost:{settings.PORT}/redoc")
    print("============================================================================")

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
