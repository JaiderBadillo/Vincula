import sys
import os
import asyncio

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def check():
    async with AsyncSessionLocal() as session:
        tables = [
            "usuarios",
            "empresas",
            "instituciones",
            "egresados",
            "reclutadores_empresa",
            "asesores_ies",
            "documentos_empresa",
            "documentos_institucion",
        ]
        for t in tables:
            try:
                res = await session.execute(text(f"SELECT count(*) FROM {t};"))
                count = res.scalar()
                print(f"  {t}: {count} registros")
            except Exception as e:
                print(f"  {t}: ERROR ({e})")

if __name__ == "__main__":
    asyncio.run(check())

