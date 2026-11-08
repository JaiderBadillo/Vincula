"""
Suite de Pruebas: Creación y Consulta de Asesores de la IES (Fase 3 Cierre Frontend/Backend).
Verifica:
1. Login como Admin IES (ies@uts.edu.co).
2. Creación de un Asesor de Empleabilidad (POST /api/v1/instituciones/asesores).
3. Consulta de lista de Asesores vinculados (GET /api/v1/instituciones/asesores).
4. Persistencia en la tabla usuarios y asesores_ies en PostgreSQL/Supabase.
"""

import sys
import os
import uuid
from httpx import AsyncClient, ASGITransport

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.core.database import AsyncSessionLocal
from app.modules.iam.models import Usuario
from app.modules.institutions.models import AsesorIES
from sqlalchemy import select


async def test_flujo_completo_asesores_ies():
    print("\n================================================================================")
    print(" 🚀 INICIANDO TEST: GESTIÓN DE ASESORES DE LA IES")
    print("================================================================================")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. Login como Admin IES
        print("\n[PASO 1] Login con credenciales de la IES...")
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"correo": "ies@uts.edu.co", "password": "IesAdmin123*"}
        )
        assert login_res.status_code == 200, f"Error login IES: {login_res.text}"
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("  ✓ Login IES exitoso. Token JWT obtenido.")

        # 2. Registrar nuevo Asesor de Empleabilidad
        unique_suffix = uuid.uuid4().hex[:6]
        asesor_email = f"asesor.{unique_suffix}@correo.uts.edu.co"
        asesor_nombre = f"Coordinador Empleabilidad {unique_suffix}"

        print(f"\n[PASO 2] Creando nuevo Asesor: {asesor_email}...")
        create_res = await client.post(
            "/api/v1/instituciones/asesores",
            headers=headers,
            json={
                "correo": asesor_email,
                "password": "Asesor2026*",
                "nombre_completo": asesor_nombre,
                "telefono": "+57 318 999 1122",
                "cargo": "Líder de Prácticas y Vinculación",
            }
        )
        assert create_res.status_code == 201, f"Error creando asesor: {create_res.text}"
        asesor_data = create_res.json()
        assert asesor_data["correo_institucional"] == asesor_email
        assert asesor_data["nombre_completo"] == asesor_nombre
        asesor_id = asesor_data["id"]
        print(f"  ✓ Asesor creado exitosamente con ID: {asesor_id}")

        # 3. Consultar lista de asesores
        print("\n[PASO 3] Consultando listado de asesores de la institución...")
        list_res = await client.get("/api/v1/instituciones/asesores", headers=headers)
        assert list_res.status_code == 200, f"Error listando asesores: {list_res.text}"
        asesores_list = list_res.json()
        assert any(a["id"] == asesor_id for a in asesores_list), "El asesor recién creado no aparece en la lista"
        print(f"  ✓ Lista de asesores obtenida ({len(asesores_list)} registrados).")

        # 4. Verificar en base de datos PostgreSQL
        print("\n[PASO 4] Verificando cuenta IAM y perfil en PostgreSQL / Supabase...")
        async with AsyncSessionLocal() as session:
            stmt = select(Usuario).where(Usuario.correo_electronico == asesor_email)
            user_db = (await session.execute(stmt)).scalar_one_or_none()
            assert user_db is not None, "El usuario no existe en la tabla usuarios"
            assert user_db.rol == "admin_ies" or user_db.rol == "asesor_ies"
            assert user_db.estado == "activo"

            stmt_asesor = select(AsesorIES).where(AsesorIES.id == uuid.UUID(asesor_id))
            asesor_db = (await session.execute(stmt_asesor)).scalar_one_or_none()
            assert asesor_db is not None, "El asesor no existe en la tabla asesores_ies"
            print(f"  ✓ Registro validado en PostgreSQL: id_usuario={user_db.id}, estado={user_db.estado}")

    print("\n================================================================================")
    print(" 🎉 TEST DE ASESORES DE LA IES COMPLETADO CON ÉXITO (100% VERDE)")
    print("================================================================================\n")


if __name__ == "__main__":
    import asyncio
    asyncio.run(test_flujo_completo_asesores_ies())
