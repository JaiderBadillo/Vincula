"""
Suite de Pruebas de Verificación de la FASE 1: Paso 1.
Verifica:
1. Conectividad en vivo con PostgreSQL / Supabase y soporte pgvector.
2. Autenticación JWT asíncrona real contra la base de datos para los roles.
3. Gating de Cuarentena (Opción 2): Empresa en cuarentena puede loguearse pero
   tiene bloqueado el acceso a recursos protegidos (403 EMPRESA_EN_CUARENTENA).
4. Consulta de /me con claims correctos y permisos resueltos.
"""

import sys
import os
import asyncio
import httpx

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app


async def run_tests():
    print("================================================================================")
    print(" 🚀 EJECUTANDO PRUEBAS DE FASE 1 - PASO 1 (IAM, POSTGRESQL & CUARENTENA GATING)")
    print("================================================================================")

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # TEST 1: Health Check y Conexión a Base de Datos
        print("\n[TEST 1] Verificando salud del servidor y conexión a PostgreSQL...")
        r = await client.get("/api/v1/health")
        assert r.status_code == 200, f"Error en health check: {r.text}"
        print(f"  ✓ /api/v1/health responde 200 OK: {r.json()}")

        r_db = await client.get("/api/v1/health/db")
        assert r_db.status_code == 200, f"Error en health check DB: {r_db.text}"
        db_data = r_db.json()
        assert db_data["connected"] is True, "La base de datos no está conectada"
        print(f"  ✓ /api/v1/health/db: Conectado a {db_data.get('database')} (latencia: {db_data.get('latency_ms')} ms, pgvector: {db_data.get('pgvector_active')})")

        # TEST 2: Login SuperAdmin
        print("\n[TEST 2] Probando Login de Super Administrador Vincula...")
        r_admin = await client.post("/api/v1/auth/login", json={
            "correo": "admin@vincula.com.co",
            "password": "Admin123*"
        })
        assert r_admin.status_code == 200, f"Error en login SuperAdmin: {r_admin.text}"
        admin_data = r_admin.json()
        assert admin_data["rol"] == "superadmin_vincula"
        assert admin_data["estado_validacion"] == "aprobado"
        token_admin = admin_data["access_token"]
        print(f"  ✓ Login exitoso como '{admin_data['nombre']}' | Rol: {admin_data['rol']}")

        # Verificar /me con SuperAdmin
        r_me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token_admin}"})
        assert r_me.status_code == 200
        assert r_me.json()["es_cuenta_aprobada"] is True
        print(f"  ✓ /api/v1/auth/me validado: {r_me.json()['correo']} (Aprobado: {r_me.json()['es_cuenta_aprobada']})")

        # TEST 3: Login Empresa Aprobada (Tech Innovations SAS)
        print("\n[TEST 3] Probando Login de Empresa Aprobada (Tech Innovations SAS)...")
        r_emp = await client.post("/api/v1/auth/login", json={
            "correo": "empresa@techinnovations.co",
            "password": "Empresa123*"
        })
        assert r_emp.status_code == 200, f"Error en login empresa aprobada: {r_emp.text}"
        emp_data = r_emp.json()
        assert emp_data["rol"] == "admin_empresa"
        assert emp_data["estado_validacion"] == "aprobado"
        assert emp_data["id_entidad"] is not None
        token_emp_approved = emp_data["access_token"]
        print(f"  ✓ Login exitoso: {emp_data['nombre']} | Estado: {emp_data['estado_validacion']} | ID Empresa: {emp_data['id_entidad']}")

        # Empresa aprobada accede a endpoint operativo de sedes (Gated)
        r_sedes = await client.get("/api/v1/empresas/sedes", headers={"Authorization": f"Bearer {token_emp_approved}"})
        assert r_sedes.status_code == 200, f"Empresa aprobada debería acceder a sedes: {r_sedes.text}"
        print(f"  ✓ GATING PERMITIDO: Empresa aprobada accedió a /api/v1/empresas/sedes (200 OK)")

        # TEST 4: Login y Gating de Empresa en MODO CUARENTENA (Startup en Espera SAS)
        print("\n[TEST 4] Probando Login y Gating de Empresa en CUARENTENA (Opción 2)...")
        r_q = await client.post("/api/v1/auth/login", json={
            "correo": "empresa.nueva@startup.co",
            "password": "Empresa123*"
        })
        assert r_q.status_code == 200, f"Error: la empresa en cuarentena DEBE poder hacer login: {r_q.text}"
        q_data = r_q.json()
        assert q_data["estado_validacion"] == "pendiente", "El estado de validación debe ser 'pendiente'"
        token_q = q_data["access_token"]
        print(f"  ✓ LOGIN EN CUARENTENA PERMITIDO: {q_data['nombre']} | Estado: {q_data['estado_validacion']}")

        # Consulta de pantalla de Cuarentena (Permitido)
        r_q_panel = await client.get("/api/v1/empresas/estado-cuarentena", headers={"Authorization": f"Bearer {token_q}"})
        assert r_q_panel.status_code == 200, f"Debe poder ver su pantalla de cuarentena: {r_q_panel.text}"
        q_panel_data = r_q_panel.json()
        print(f"  ✓ Consulta de panel de cuarentena permitida (200 OK) | Radicado: {q_panel_data.get('radicado')} | SLA: {q_panel_data.get('tiempo_sla_horas')}h")

        # Intento de acceso a recurso operativo (BLOQUEADO POR GATING - 403 Forbidden)
        r_gated = await client.get("/api/v1/empresas/sedes", headers={"Authorization": f"Bearer {token_q}"})
        assert r_gated.status_code == 403, f"La empresa en cuarentena NO debe poder acceder a sedes: {r_gated.status_code}"
        gated_detail = r_gated.json()["detail"]
        assert gated_detail["codigo"] == "EMPRESA_EN_CUARENTENA"
        print(f"  🛡️ GATING BLOQUEADO EXITOSAMENTE: HTTP 403 Forbidden ({gated_detail['codigo']})")
        print(f"     Motivo de protección: {gated_detail['mensaje'][:80]}...")

        # TEST 5: Login IES Aprobada (UTS)
        print("\n[TEST 5] Probando Login de Institución Educativa (UTS)...")
        r_ies = await client.post("/api/v1/auth/login", json={
            "correo": "ies@uts.edu.co",
            "password": "IesAdmin123*"
        })
        assert r_ies.status_code == 200
        ies_data = r_ies.json()
        assert ies_data["rol"] == "admin_ies"
        assert ies_data["estado_validacion"] == "aprobado"
        print(f"  ✓ Login IES exitoso: {ies_data['nombre']} | Rol: {ies_data['rol']} | ID IES: {ies_data['id_entidad']}")

        # TEST 6: Login Egresado (Jaider Niño)
        print("\n[TEST 6] Probando Login de Egresado (Jaider Niño)...")
        r_egr = await client.post("/api/v1/auth/login", json={
            "correo": "egresado@correo.uts.edu.co",
            "password": "Egresado123*"
        })
        assert r_egr.status_code == 200
        egr_data = r_egr.json()
        assert egr_data["rol"] == "egresado"
        print(f"  ✓ Login Egresado exitoso: {egr_data['nombre']} | Rol: {egr_data['rol']}")

        # TEST 7: Contraseña Inválida
        print("\n[TEST 7] Probando rechazo de credenciales inválidas...")
        r_bad = await client.post("/api/v1/auth/login", json={
            "correo": "admin@vincula.com.co",
            "password": "PasswordIncorrecta999"
        })
        assert r_bad.status_code == 401
        print(f"  ✓ Rechazo correcto: HTTP 401 Unauthorized ({r_bad.json()['detail']})")

    print("\n================================================================================")
    print(" 🎉 TODAS LAS PRUEBAS DE LA FASE 1 - PASO 1 PASARON AL 100% DE FORMA EXITOSA")
    print("================================================================================")


if __name__ == "__main__":
    asyncio.run(run_tests())
