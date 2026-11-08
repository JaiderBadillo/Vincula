"""
Test Suite de Verificación de la Fase 4 - Paso 1:
Infraestructura Multi-Sede Corporativa y Equipo de Reclutadores en PostgreSQL.

Valida:
1. Autenticación y registro de 2 Empresas Aprobadas por SuperAdmin (Multi-Tenant Setup).
2. CRUD de Sedes Corporativas (Sede Principal única, Seccionales, consulta y actualización).
3. Creación y consulta de Áreas Departamentales dentro de Sedes.
4. Alta de Reclutadores de Talento con creación de Usuario IAM (Bcrypt) y asignación a sedes.
5. Autenticación y expedición de token para el nuevo Reclutador de Empresa.
6. Aislamiento Multi-Tenant Estricto (HTTP 403 / 404 ante intentos de acceso cruzado entre empresas).
7. Prevención Pedagógica de Duplicidad de Correo Corporativo (HTTP 400 CORREO_YA_REGISTRADO).
8. Reasignación dinámica de sedes y cambio de estado del reclutador (Active -> Suspended).
9. Acceso de auditoría para SuperAdmin (query_company_id).
"""

import sys
import os
import io
import uuid
import asyncio
from httpx import AsyncClient, ASGITransport

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app


def create_mock_pdf_stream(title: str) -> io.BytesIO:
    content = f"%PDF-1.4\n1 0 obj\n<< /Title ({title}) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF".encode("utf-8")
    buf = io.BytesIO(content)
    buf.name = f"{title.lower().replace(' ', '_')}.pdf"
    return buf


async def test_fase4_paso1_sedes_reclutadores():
    print("\n" + "=" * 80)
    print(" 🚀 EJECUTANDO PRUEBAS FASE 4 - PASO 1: SEDES CORPORATIVAS Y RECLUTADORES")
    print("=" * 80)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:

        # ----------------------------------------------------------------------
        # 1. Login Super Admin y Aprobación de 2 Empresas para Multi-Tenancy
        # ----------------------------------------------------------------------
        print("\n[TEST 1] Setup Multi-Tenant: Creando y aprobando 2 empresas...")
        login_admin = await client.post(
            "/api/v1/auth/login",
            json={"correo": "admin@vincula.com.co", "password": "Admin123*"}
        )
        assert login_admin.status_code == 200, f"Error login superadmin: {login_admin.text}"
        super_token = login_admin.json()["access_token"]
        headers_super = {"Authorization": f"Bearer {super_token}"}

        uid_a = uuid.uuid4().hex[:6]
        uid_b = uuid.uuid4().hex[:6]

        pdf_camara = create_mock_pdf_stream("Camara Comercio")
        pdf_rut = create_mock_pdf_stream("RUT")
        pdf_rep = create_mock_pdf_stream("Cedula Rep Legal")

        # Registrar Empresa A
        email_emp_a = f"talento.{uid_a}@empresa-alpha.com"
        pass_emp_a = "AlphaPass2026*!"
        res_reg_a = await client.post(
            "/api/v1/auth/registro-empresa-form",
            data={
                "razon_social": f"Corporacion Alpha {uid_a} SAS",
                "nombre_comercial": f"Alpha Tech {uid_a}",
                "nit": f"901{uid_a}-1",
                "sector_economico": "Tecnología",
                "tamano_empresa": "Mediana",
                "departamento": "Santander",
                "ciudad": "Bucaramanga",
                "direccion": "Cra. 27 # 45-10",
                "telefono": "3001234567",
                "correo_contacto": email_emp_a,
                "password": pass_emp_a,
                "nombre_representante_legal": "Carlos Valderrama",
                "documento_representante_legal": f"8012{uid_a}",
                "persona_contacto": "Carlos Valderrama"
            },
            files=[
                ("camara_comercio_pdf", ("camara.pdf", pdf_camara.getvalue(), "application/pdf")),
                ("rut_pdf", ("rut.pdf", pdf_rut.getvalue(), "application/pdf")),
                ("cedula_rep_legal_pdf", ("rep.pdf", pdf_rep.getvalue(), "application/pdf")),
            ]
        )
        assert res_reg_a.status_code == 200, f"Error registro Empresa A: {res_reg_a.text}"
        id_emp_a = res_reg_a.json()["id_empresa"]

        # Registrar Empresa B
        email_emp_b = f"recursos.{uid_b}@empresa-beta.com"
        pass_emp_b = "BetaPass2026*!"
        res_reg_b = await client.post(
            "/api/v1/auth/registro-empresa-form",
            data={
                "razon_social": f"Industrias Beta {uid_b} SAS",
                "nombre_comercial": f"Beta Logistics {uid_b}",
                "nit": f"902{uid_b}-2",
                "sector_economico": "Logística",
                "tamano_empresa": "Grande",
                "departamento": "Antioquia",
                "ciudad": "Medellín",
                "direccion": "Calle 10 # 30-20",
                "telefono": "3109876543",
                "correo_contacto": email_emp_b,
                "password": pass_emp_b,
                "nombre_representante_legal": "Juan Fernando Quintero",
                "documento_representante_legal": f"8099{uid_b}",
                "persona_contacto": "Juan Fernando Quintero"
            },
            files=[
                ("camara_comercio_pdf", ("camara.pdf", pdf_camara.getvalue(), "application/pdf")),
                ("rut_pdf", ("rut.pdf", pdf_rut.getvalue(), "application/pdf")),
                ("cedula_rep_legal_pdf", ("rep.pdf", pdf_rep.getvalue(), "application/pdf")),
            ]
        )
        assert res_reg_b.status_code == 200, f"Error registro Empresa B: {res_reg_b.text}"
        id_emp_b = res_reg_b.json()["id_empresa"]

        # SuperAdmin aprueba ambas empresas
        apr_a = await client.post(f"/api/v1/admin/empresas/{id_emp_a}/aprobar", headers=headers_super, json={"notas": "Aprobada A"})
        assert apr_a.status_code == 200, f"Error aprobando Empresa A: {apr_a.text}"

        apr_b = await client.post(f"/api/v1/admin/empresas/{id_emp_b}/aprobar", headers=headers_super, json={"notas": "Aprobada B"})
        assert apr_b.status_code == 200, f"Error aprobando Empresa B: {apr_b.text}"

        # Login de ambas empresas
        login_a = await client.post("/api/v1/auth/login", json={"correo": email_emp_a, "password": pass_emp_a})
        assert login_a.status_code == 200, f"Error login Empresa A: {login_a.text}"
        headers_emp_a = {"Authorization": f"Bearer {login_a.json()['access_token']}"}

        login_b = await client.post("/api/v1/auth/login", json={"correo": email_emp_b, "password": pass_emp_b})
        assert login_b.status_code == 200, f"Error login Empresa B: {login_b.text}"
        headers_emp_b = {"Authorization": f"Bearer {login_b.json()['access_token']}"}

        print(f"  ✓ Multi-Tenancy Inicializado: Empresa A ({id_emp_a}) y Empresa B ({id_emp_b}) aprobadas.")

        # ----------------------------------------------------------------------
        # 2. CRUD de Sedes Corporativas (Empresa A)
        # ----------------------------------------------------------------------
        print("\n[TEST 2] Creando Sedes Corporativas (Principal y Seccional) para Empresa A...")
        # Sede Principal
        res_sede1 = await client.post(
            "/api/v1/empresas/sedes",
            headers=headers_emp_a,
            json={
                "nombre": "Sede Corporativa Cabecera",
                "nombre_corto": "Cabecera",
                "departamento": "Santander",
                "ciudad": "Bucaramanga",
                "direccion": "Cra. 33 # 48-20, Edificio Titanium Piso 7",
                "telefono": "(607) 6451234",
                "correo": f"sede.principal.{uid_a}@empresa-alpha.com",
                "nombre_responsable": "Arq. Sergio Mendoza",
                "es_sede_principal": True
            }
        )
        assert res_sede1.status_code == 201, f"Error creando Sede 1: {res_sede1.text}"
        sede_princ = res_sede1.json()
        id_sede_princ = sede_princ["id"]
        assert sede_princ["es_sede_principal"] is True
        print(f"  ✓ Sede Principal creada: {sede_princ['nombre']} (ID: {id_sede_princ})")

        # Sede Seccional
        res_sede2 = await client.post(
            "/api/v1/empresas/sedes",
            headers=headers_emp_a,
            json={
                "nombre": "Centro de Distribución y Logística Ruitoque",
                "nombre_corto": "CEDI Ruitoque",
                "departamento": "Santander",
                "ciudad": "Floridablanca",
                "direccion": "Km 5 Autopista Bucaramanga - Piedecuesta",
                "telefono": "(607) 6789900",
                "correo": f"cedi.{uid_a}@empresa-alpha.com",
                "nombre_responsable": "Ing. Diana Prada",
                "es_sede_principal": False
            }
        )
        assert res_sede2.status_code == 201, f"Error creando Sede 2: {res_sede2.text}"
        sede_sec = res_sede2.json()
        id_sede_sec = sede_sec["id"]
        assert sede_sec["es_sede_principal"] is False
        print(f"  ✓ Sede Seccional creada: {sede_sec['nombre']} (ID: {id_sede_sec})")

        # Listar Sedes de Empresa A
        res_list_sedes = await client.get("/api/v1/empresas/sedes", headers=headers_emp_a)
        assert res_list_sedes.status_code == 200, f"Error listando sedes: {res_list_sedes.text}"
        sedes_a = res_list_sedes.json()
        assert len(sedes_a) == 2
        # La sede principal debe ser la primera en orden
        assert sedes_a[0]["id"] == id_sede_princ
        assert sedes_a[0]["es_sede_principal"] is True
        print(f"  ✓ Listado de sedes verificado: {len(sedes_a)} sedes activas (Principal encabezando).")

        # Actualizar Sede Seccional
        res_up_sede = await client.put(
            f"/api/v1/empresas/sedes/{id_sede_sec}",
            headers=headers_emp_a,
            json={
                "nombre_corto": "Hub Ruitoque Avanzado",
                "telefono": "(607) 6789999"
            }
        )
        assert res_up_sede.status_code == 200, f"Error actualizando sede: {res_up_sede.text}"
        assert res_up_sede.json()["nombre_corto"] == "Hub Ruitoque Avanzado"
        print(f"  ✓ Actualización de metadatos de sede verificada con éxito.")

        # ----------------------------------------------------------------------
        # 3. Áreas Departamentales de Sede
        # ----------------------------------------------------------------------
        print("\n[TEST 3] Registrando áreas departamentales dentro de la Sede Principal...")
        res_area1 = await client.post(
            f"/api/v1/empresas/sedes/{id_sede_princ}/areas",
            headers=headers_emp_a,
            json={"nombre_area": "Desarrollo de Software & Cloud", "personal_asignado": 35}
        )
        assert res_area1.status_code == 201, f"Error creando Área 1: {res_area1.text}"

        res_area2 = await client.post(
            f"/api/v1/empresas/sedes/{id_sede_princ}/areas",
            headers=headers_emp_a,
            json={"nombre_area": "Operaciones y Talento Humano", "personal_asignado": 12}
        )
        assert res_area2.status_code == 201, f"Error creando Área 2: {res_area2.text}"

        # Consultar áreas
        res_get_areas = await client.get(f"/api/v1/empresas/sedes/{id_sede_princ}/areas", headers=headers_emp_a)
        assert res_get_areas.status_code == 200, f"Error consultando áreas: {res_get_areas.text}"
        areas = res_get_areas.json()
        assert len(areas) == 2
        print(f"  ✓ Áreas operativas creadas: {[a['nombre_area'] for a in areas]}")

        # Comprobar que el contador de áreas se refleja en la sede
        res_sede_check = await client.get(f"/api/v1/empresas/sedes/{id_sede_princ}", headers=headers_emp_a)
        assert res_sede_check.status_code == 200
        assert res_sede_check.json()["total_areas"] == 2
        print(f"  ✓ Contador dinámico de áreas en sede verificado: {res_sede_check.json()['total_areas']} áreas.")

        # ----------------------------------------------------------------------
        # 4. Alta de Reclutadores con Cuenta IAM y Asignación de Sedes
        # ----------------------------------------------------------------------
        print("\n[TEST 4] Creando Reclutador de Talento con asignación a sedes corporativas...")
        recruiter_email = f"reclutador.{uid_a}@empresa-alpha.com"
        recruiter_pass = "TalentoPass2026*!"

        res_rec = await client.post(
            "/api/v1/empresas/reclutadores",
            headers=headers_emp_a,
            json={
                "nombre_completo": "Lic. Valentina Restrepo",
                "correo_corporativo": recruiter_email,
                "password": recruiter_pass,
                "telefono": "3154443322",
                "cargo": "Lead Technical Recruiter",
                "sedes_asignadas_ids": [id_sede_princ, id_sede_sec]
            }
        )
        assert res_rec.status_code == 201, f"Error creando reclutador: {res_rec.text}"
        recruiter_data = res_rec.json()
        id_reclutador = recruiter_data["id"]
        assert recruiter_data["nombre_completo"] == "Lic. Valentina Restrepo"
        assert recruiter_data["estado"] == "active"
        assert len(recruiter_data["sedes_asignadas"]) == 2
        print(f"  ✓ Reclutador creado: {recruiter_data['nombre_completo']} (ID: {id_reclutador})")
        print(f"  ✓ Sedes asignadas: {[s['nombre'] for s in recruiter_data['sedes_asignadas']]}")

        # Listar reclutadores de Empresa A
        res_list_rec = await client.get("/api/v1/empresas/reclutadores", headers=headers_emp_a)
        assert res_list_rec.status_code == 200
        assert len(res_list_rec.json()) >= 1
        print(f"  ✓ Equipo de reclutadores listado exitosamente.")

        # ----------------------------------------------------------------------
        # 5. Autenticación IAM del Reclutador
        # ----------------------------------------------------------------------
        print("\n[TEST 5] Autenticación IAM con credenciales del Reclutador creado...")
        login_rec = await client.post(
            "/api/v1/auth/login",
            json={"correo": recruiter_email, "password": recruiter_pass}
        )
        assert login_rec.status_code == 200, f"Error login reclutador: {login_rec.text}"
        rec_jwt_data = login_rec.json()
        assert rec_jwt_data["rol"] in ("reclutador_empresa", "reclutador")
        headers_rec = {"Authorization": f"Bearer {rec_jwt_data['access_token']}"}
        print(f"  ✓ Autenticación exitosa. Rol expedido: {rec_jwt_data['rol']}")

        # Reclutador consulta sedes de su empresa
        res_rec_sedes = await client.get("/api/v1/empresas/sedes", headers=headers_rec)
        assert res_rec_sedes.status_code == 200
        assert len(res_rec_sedes.json()) == 2
        print(f"  ✓ Reclutador autenticado accede exitosamente a sedes autorizadas de su empresa.")

        # ----------------------------------------------------------------------
        # 6. Aislamiento Multi-Tenant Estricto (Seguridad Crítica)
        # ----------------------------------------------------------------------
        print("\n[TEST 6] Validando Aislamiento Multi-Tenant (Empresa B vs Empresa A)...")
        # Intento 1: Empresa B intenta ver sedes de Empresa A pasando query param ?id_empresa={id_a}
        res_leak1 = await client.get(f"/api/v1/empresas/sedes?id_empresa={id_emp_a}", headers=headers_emp_b)
        assert res_leak1.status_code == 403, f"Esperado 403 Forbidden, recibido: {res_leak1.status_code}"
        assert res_leak1.json()["detail"]["codigo"] == "ACCESO_EMPRESA_DENEGADO"
        print(f"  ✓ Bloqueado intento de cruce multi-tenant en listado de sedes (HTTP 403).")

        # Intento 2: Empresa B intenta ver el detalle de la Sede Principal de Empresa A
        res_leak2 = await client.get(f"/api/v1/empresas/sedes/{id_sede_princ}", headers=headers_emp_b)
        assert res_leak2.status_code == 404, f"Esperado 404 Not Found, recibido: {res_leak2.status_code}"
        print(f"  ✓ Bloqueada consulta directa de sede de otra empresa (HTTP 404 seguro).")

        # Intento 3: Empresa B crea una sede y Empresa A intenta asignarla a su reclutador
        res_sede_b = await client.post(
            "/api/v1/empresas/sedes",
            headers=headers_emp_b,
            json={
                "nombre": "Sede Beta Poblado",
                "departamento": "Antioquia",
                "ciudad": "Medellín",
                "direccion": "Calle 10 # 43E-10",
                "es_sede_principal": True
            }
        )
        assert res_sede_b.status_code == 201
        id_sede_b = res_sede_b.json()["id"]

        res_illegal_assign = await client.post(
            f"/api/v1/empresas/reclutadores/{id_reclutador}/asignar-sedes",
            headers=headers_emp_a,
            json={"sedes_ids": [id_sede_b]}
        )
        assert res_illegal_assign.status_code == 403, f"Esperado 403 Forbidden, recibido: {res_illegal_assign.status_code}"
        assert res_illegal_assign.json()["detail"]["codigo"] == "SEDE_NO_AUTORIZADA"
        print(f"  ✓ Bloqueada asignación de sede perteneciente a otra empresa (HTTP 403 SEDE_NO_AUTORIZADA).")

        # ----------------------------------------------------------------------
        # 7. Prevención Pedagógica de Duplicidad de Correo Corporativo
        # ----------------------------------------------------------------------
        print("\n[TEST 7] Prevención de duplicidad de correo corporativo en reclutadores...")
        res_dup = await client.post(
            "/api/v1/empresas/reclutadores",
            headers=headers_emp_a,
            json={
                "nombre_completo": "Copia Reclutador",
                "correo_corporativo": recruiter_email,
                "password": "OtraPassword123*",
                "sedes_asignadas_ids": []
            }
        )
        assert res_dup.status_code == 400, f"Esperado 400 Bad Request, obtenido: {res_dup.status_code}"
        dup_body = res_dup.json()["detail"]
        assert dup_body["codigo"] == "CORREO_YA_REGISTRADO"
        assert "ya se encuentra registrado" in dup_body["mensaje"]
        assert "accion_sugerida" in dup_body
        print(f"  ✓ Prevención de duplicidad validada: {dup_body['codigo']} -> {dup_body['mensaje']}")

        # ----------------------------------------------------------------------
        # 8. Reasignación de Sedes y Actualización de Estado (Active -> Suspended)
        # ----------------------------------------------------------------------
        print("\n[TEST 8] Reasignación de sedes y cambio de estado de reclutador...")
        # Reasignar solo la sede principal
        res_reassign = await client.post(
            f"/api/v1/empresas/reclutadores/{id_reclutador}/asignar-sedes",
            headers=headers_emp_a,
            json={"sedes_ids": [id_sede_princ]}
        )
        assert res_reassign.status_code == 200, f"Error reasignando sedes: {res_reassign.text}"
        assert res_reassign.json()["total_sedes_asignadas"] == 1
        print(f"  ✓ Sedes reasignadas exitosamente: {res_reassign.json()['mensaje']}")

        # Cambiar estado a 'suspended'
        res_status = await client.patch(
            f"/api/v1/empresas/reclutadores/{id_reclutador}/estado",
            headers=headers_emp_a,
            json={"estado": "suspended"}
        )
        assert res_status.status_code == 200, f"Error cambiando estado: {res_status.text}"
        assert res_status.json()["estado"] == "suspended"
        print(f"  ✓ Estado del reclutador actualizado a 'suspended'.")

        # Validar que el usuario suspendido no puede autenticarse
        login_suspended = await client.post(
            "/api/v1/auth/login",
            json={"correo": recruiter_email, "password": recruiter_pass}
        )
        assert login_suspended.status_code in (401, 403), f"Esperado bloqueo de usuario suspendido, obtenido {login_suspended.status_code}"
        print(f"  ✓ Acceso denegado a credenciales suspendidas (HTTP {login_suspended.status_code}).")

        # ----------------------------------------------------------------------
        # 9. SuperAdmin Consulta Sedes y Reclutadores por query_company_id
        # ----------------------------------------------------------------------
        print("\n[TEST 9] SuperAdmin consulta sedes y reclutadores de Empresa A...")
        sa_sedes = await client.get(f"/api/v1/empresas/sedes?id_empresa={id_emp_a}", headers=headers_super)
        assert sa_sedes.status_code == 200, f"Error superadmin consultando sedes: {sa_sedes.text}"
        assert len(sa_sedes.json()) == 2

        sa_rec = await client.get(f"/api/v1/empresas/reclutadores?id_empresa={id_emp_a}", headers=headers_super)
        assert sa_rec.status_code == 200, f"Error superadmin consultando reclutadores: {sa_rec.text}"
        assert len(sa_rec.json()) >= 1
        print(f"  ✓ SuperAdmin tiene visibilidad total auditando empresas con query_company_id.")

    print("\n" + "=" * 80)
    print(" 🎉 TODAS LAS PRUEBAS DE LA FASE 4 - PASO 1 HAN SIDO COMPLETADAS (100% VERDE)")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    asyncio.run(test_fase4_paso1_sedes_reclutadores())

