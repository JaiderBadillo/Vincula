"""
Script de Inicialización y Verificación de Base de Datos (Fase 0).
Ejecuta y verifica schema_vincula_completo.sql en PostgreSQL / Supabase de forma asíncrona.

Uso:
    python scripts/init_database.py
O con flag de ejecución forzada:
    python scripts/init_database.py --apply
"""

import os
import sys
import asyncio
import time
import re
from typing import List

# Agregar directorio backend al path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.core.database import check_database_connection
import asyncpg


def clean_database_url_for_asyncpg(url: str) -> str:
    """Convierte el formato SQLAlchemy 'postgresql+asyncpg://' a 'postgresql://' para asyncpg nativo."""
    if url.startswith("postgresql+asyncpg://"):
        return url.replace("postgresql+asyncpg://", "postgresql://", 1)
    return url


async def get_existing_tables(conn: asyncpg.Connection) -> List[str]:
    """Retorna los nombres de todas las tablas existentes en el esquema public."""
    rows = await conn.fetch("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
    """)
    return [r["table_name"] for r in rows]


async def run_initialization(apply_changes: bool = False):
    print("=" * 80)
    print(" FASE 0: VERIFICACIÓN E INICIALIZACIÓN DE BASE DE DATOS - VINCULA")
    print("=" * 80)
    print(f"URL Configurada: {settings.DATABASE_URL.split('@')[-1] if '@' in settings.DATABASE_URL else 'No configurada'}")
    print()

    # 1. Comprobar Conexión con el Helper Central
    print("1. Verificando conectividad con el motor PostgreSQL...")
    health = await check_database_connection()
    if not health.get("connected"):
        print(f"❌ ERROR DE CONEXIÓN: {health.get('error')}")
        print("\nPara corregir esto:")
        print("  1. Abre el archivo 'backend/.env'")
        print("  2. Configura tu DATABASE_URL con tus credenciales de PostgreSQL o Supabase.")
        print("     Ejemplo Supabase: postgresql+asyncpg://postgres:[CLAVE]@db.[ID_PROYECTO].supabase.co:5432/postgres")
        print("     Ejemplo Local:    postgresql+asyncpg://postgres:[CLAVE]@localhost:5432/postgres")
        return False

    print(f"✅ Conexión exitosa a {health['database']} vía {health['driver']} en {health['latency_ms']} ms.")
    print(f"   Versión del motor: {health['version'][:60]}...")
    print(f"   Soporte pgvector: {'Instalado ✅' if health['pgvector_active'] else 'No detectado (Opcional en dev)'}")
    print()

    # 2. Conectar directamente con asyncpg para inspección del esquema
    dsn = clean_database_url_for_asyncpg(settings.DATABASE_URL)
    conn = await asyncpg.connect(dsn)

    try:
        tables = await get_existing_tables(conn)
        print(f"2. Estado actual del esquema 'public': {len(tables)} tablas encontradas.")
        if tables:
            print(f"   Tablas detectadas: {', '.join(tables[:8])}{'...' if len(tables) > 8 else ''}")

        # 3. Ruta al schema SQL oficial
        schema_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            "database",
            "schema_vincula_completo.sql"
        )

        if not os.path.exists(schema_path):
            print(f"❌ No se encontró el archivo de esquema en: {schema_path}")
            return False

        with open(schema_path, "r", encoding="utf-8") as f:
            sql_script = f.read()

        # Contar cuántas tablas define el script
        expected_tables = re.findall(r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)", sql_script, re.IGNORECASE)
        print(f"   El script 'schema_vincula_completo.sql' define {len(expected_tables)} entidades relacionales.")
        print()

        # 4. Si faltan tablas o se solicita aplicar
        missing_tables = [t for t in expected_tables if t.lower() not in [x.lower() for x in tables]]

        if missing_tables:
            print(f"⚠️  Faltan {len(missing_tables)} de las {len(expected_tables)} tablas en la base de datos.")
            if apply_changes or "--apply" in sys.argv:
                print("\n3. Ejecutando 'schema_vincula_completo.sql'...")
                # Ejecutar script
                try:
                    await conn.execute(sql_script)
                    print("✅ Script ejecutado correctamente.")
                except Exception as e:
                    # Si falla por pgvector en postgres local sin la extensión instalada, reintentar sin vector
                    if "extension \"vector\"" in str(e).lower():
                        print("   [Aviso] La extensión 'vector' no está instalada en este PostgreSQL local.")
                        print("   Ejecutando esquema relacional sin extensión vectorial...")
                        cleaned_sql = re.sub(r"CREATE\s+EXTENSION.*?vector.*?;", "-- extension vector omitida", sql_script, flags=re.IGNORECASE)
                        cleaned_sql = re.sub(r"vector\(\d+\)", "text", cleaned_sql)
                        await conn.execute(cleaned_sql)
                        print("✅ Esquema relacional creado con éxito.")
                    else:
                        raise e

                # Re-comprobar tablas creadas
                updated_tables = await get_existing_tables(conn)
                print(f"\n🎉 BASE DE DATOS INICIALIZADA EXITOSAMENTE: {len(updated_tables)} tablas activas.")
            else:
                print("\n👉 Para ejecutar el esquema y crear todas las tablas automáticamente, ejecuta:")
                print("   python scripts/init_database.py --apply")
        else:
            print(f"✅ ¡La base de datos ya cuenta con las {len(expected_tables)} tablas creadas y verificadas!")

        return True

    finally:
        await conn.close()


if __name__ == "__main__":
    apply = "--apply" in sys.argv
    asyncio.run(run_initialization(apply_changes=apply))

