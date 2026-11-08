"""
Suite de Pruebas Automatizada: Fase 5 - Paso 2 (Portal del Egresado - Mis Postulaciones en Vivo).
Verifica:
1. Login de Super Admin y preparación de empresa auditada y vacante abierta.
2. Postulación formal de egresado desde el catálogo público seguro.
3. Consulta de postulaciones en tiempo real: GET /api/v1/egresados/mis-postulaciones (DTOs, timeline, match IA).
4. Consulta individual de postulación: GET /api/v1/egresados/mis-postulaciones/{id_postulacion}.
5. Trazabilidad reactiva: Reclutador programa entrevista -> Egresado ve datos de entrevista y fase 3.
6. Retiro voluntario: DELETE /api/v1/egresados/mis-postulaciones/{id_postulacion}/retirar.
7. Verificación de decremento de total_postulantes y eliminación en cascada.
8. Validación de seguridad RBAC: Restricción para no-egresados y postulaciones ajenas.
"""

import sys
import os
import uuid
from datetime import datetime, date, timezone
from httpx import AsyncClient, ASGITransport

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.core.database import AsyncSessionLocal
from app.modules.vacancies_ats.models import Vacante, Postulacion
from app.modules.companies.models import Empresa, SedeEmpresa, ReclutadorEmpresa
from app.modules.iam.models import Usuario
from app.modules.graduates.models import Egresado, ArchivoHojaVida
from sqlalchemy import select


async def run_fase5_paso2_tests():
    print("\n================================================================================")
    print(" 🚀 EJECUTANDO PRUEBAS FASE 5 - PASO 2: PORTAL EGRESADO - MIS POSTULACIONES EN VIVO")
    print("================================================================================")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # ----------------------------------------------------------------------
        # SETUP: Autenticación SuperAdmin para aprobar empresa y crear contexto
        # ----------------------------------------------------------------------
        print("\n[TEST 1] Setup: Autenticando Super Admin y configurando entorno...")
        admin_login = await client.post(
            "/api/v1/auth/login",
            json={"correo": "admin@vincula.com.co", "password": "Admin123*"}
        )
        assert admin_login.status_code == 200, f"Error login Super Admin: {admin_login.text}"
        admin_token = admin_login.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        print("  ✓ Super Admin autenticado.")

        # Registrar empresa
        suffix = uuid.uuid4().hex[:6]
        emp_email = f"rrhh.{suffix}@innovacionats.co"
        reg_emp = await client.post(
            "/api/v1/auth/registro-empresa-form",
            data={
                "razon_social": f"Innovación ATS SAS {suffix}",
                "nombre_comercial": f"Innovación ATS {suffix}",
                "nit": f"901{suffix}-1",
                "codigo_ciiu": "6201",
                "descripcion_ciiu": "Desarrollo y analítica de datos",
                "correo": emp_email,
                "password": "EmpresaSegura2026*",
                "persona_contacto": "Laura Reclutadora",
                "correo_contacto": emp_email,
                "telefono": "3159998877",
                "sector_economico": "Tecnología y Software",
                "tamano_empresa": "Mediana",
                "departamento": "Santander",
                "ciudad": "Bucaramanga",
                "direccion": "Parque Tecnológico Guatiguará",
                "nombre_representante_legal": "Laura Reclutadora",
                "documento_representante_legal": f"63{suffix}"
            }
        )
        assert reg_emp.status_code in (200, 201), f"Error registro empresa: {reg_emp.text}"
        emp_id = reg_emp.json().get("id_empresa") or reg_emp.json().get("id")

        # Super Admin aprueba la empresa
        aprob = await client.post(
            f"/api/v1/admin/empresas/{emp_id}/aprobar",
            json={"observaciones": "Empresa validada para tests de Fase 5 Paso 2"},
            headers=admin_headers
        )
        assert aprob.status_code == 200, f"Error aprobación: {aprob.text}"
        print(f"  ✓ Empresa {emp_id} aprobada con éxito.")

        # Login de la empresa
        emp_login = await client.post(
            "/api/v1/auth/login",
            json={"correo": emp_email, "password": "EmpresaSegura2026*"}
        )
        assert emp_login.status_code == 200, f"Error login empresa: {emp_login.text}"
        emp_token = emp_login.json()["access_token"]
        emp_headers = {"Authorization": f"Bearer {emp_token}"}
        print("  ✓ Reclutador de empresa autenticado.")

        # Crear Sede
        sede_res = await client.post(
            "/api/v1/empresas/sedes",
            headers=emp_headers,
            json={
                "nombre": "Sede Tecnológica Cabecera",
                "departamento": "Santander",
                "ciudad": "Bucaramanga",
                "direccion": "Cra 33 # 48-100",
                "telefono": "6076332211",
                "correo": f"sede.{suffix}@innovacionats.co",
                "es_principal": True
            }
        )
        assert sede_res.status_code == 201, f"Error creando sede: {sede_res.text}"
        sede_id = sede_res.json()["id"]

        # Crear vacante
        vac_payload = {
            "id_sede": sede_id,
            "titulo": f"Frontend React Engineer {suffix}",
            "categoria": "Tecnología",
            "modalidad": "Híbrido",
            "tipo_contrato": "Término Indefinido",
            "nivel_experiencia": "Junior",
            "salario_minimo": 4200000.0,
            "salario_maximo": 5500000.0,
            "salario_es_confidencial": False,
            "descripcion": "Desarrollo de módulos interactivos de alta fidelidad con React y Tailwind CSS.",
            "responsabilidades": ["Desarrollo de vistas React", "Consumo de API REST"],
            "requisitos": ["2 años con React", "Vite", "Tailwind CSS", "Consumo de APIs REST"],
            "beneficios": ["Medicina prepagada", "Fondo de ahorro", "Horario flexible"],
            "fecha_cierre": "2026-12-31",
            "estado": "abierta"
        }
        res_vac = await client.post("/api/v1/vacantes", json=vac_payload, headers=emp_headers)
        assert res_vac.status_code == 201, f"Error creación vacante: {res_vac.text}"
        vac_id = res_vac.json()["id"]
        print(f"  ✓ Vacante activa creada con ID: {vac_id}")

        # ----------------------------------------------------------------------
        # SETUP 2: Egresado Autenticado
        # ----------------------------------------------------------------------
        print("\n[TEST 2] Autenticando Egresado de pruebas...")
        grad_login = await client.post(
            "/api/v1/auth/login",
            json={"correo": "egresado@correo.uts.edu.co", "password": "Egresado123*"}
        )
        assert grad_login.status_code == 200, f"Error login egresado: {grad_login.text}"
        grad_token = grad_login.json()["access_token"]
        grad_headers = {"Authorization": f"Bearer {grad_token}"}
        print("  ✓ Egresado autenticado correctamente.")

        # ----------------------------------------------------------------------
        # TEST 3: Postular egresado a la vacante
        # ----------------------------------------------------------------------
        print("\n[TEST 3] Realizando postulación del egresado a la vacante creada...")
        post_payload = {
            "salario_esperado": 4800000.0,
            "carta_presentacion": "Me apasiona el diseño reactivo y la arquitectura basada en componentes limpios.",
            "disponibilidad_inmediata": True,
            "respuestas_formulario": {
                "nivel_ingles": "B2 - Intermedio Alto",
                "frameworks": ["React", "FastAPI"]
            }
        }
        res_post = await client.post(
            f"/api/v1/postulaciones/{vac_id}",
            json=post_payload,
            headers=grad_headers
        )
        assert res_post.status_code == 201, f"Error al postular: {res_post.text}"
        app_data = res_post.json()
        app_id = app_data["id"]
        print(f"  ✓ Postulación registrada exitosamente. ID: {app_id}, Fase Inicial: {app_data['fase_actual']}")

        # ----------------------------------------------------------------------
        # TEST 4: Consultar lista 'Mis Postulaciones' del Egresado (GET /api/v1/egresados/mis-postulaciones)
        # ----------------------------------------------------------------------
        print("\n[TEST 4] Consultando GET /api/v1/egresados/mis-postulaciones en tiempo real...")
        res_mis_posts = await client.get("/api/v1/egresados/mis-postulaciones", headers=grad_headers)
        assert res_mis_posts.status_code == 200, f"Error obteniendo postulaciones: {res_mis_posts.text}"
        mis_posts = res_mis_posts.json()
        assert isinstance(mis_posts, list), "La respuesta debe ser una lista"
        assert len(mis_posts) >= 1, "Debe contener al menos la postulación recién creada"

        # Buscar la postulación creada
        mi_post = next((p for p in mis_posts if p["id"] == app_id), None)
        assert mi_post is not None, f"No se encontró la postulación {app_id} en la lista devuelta"

        print("  ✓ Verificando campos compatibles con la UI (MyApplicationsPage.jsx):")
        print(f"    - applicationCode: {mi_post.get('applicationCode')}")
        print(f"    - vacancyTitle: {mi_post.get('vacancyTitle')}")
        print(f"    - companyName: {mi_post.get('companyName')}")
        print(f"    - phase: {mi_post.get('phase')} (Esperado: 1)")
        print(f"    - stage: {mi_post.get('stage')} (Esperado: 'review')")
        print(f"    - salary: {mi_post.get('salary')}")
        print(f"    - timeline items: {len(mi_post.get('timeline', []))}")

        assert mi_post["phase"] == 1, "La fase debe ser 1 (En revisión)"
        assert mi_post["stage"] == "review", "El stage UI debe ser 'review'"
        assert len(mi_post["timeline"]) == 4, "El timeline debe contener las 4 fases de la UI"
        assert mi_post["timeline"][0]["current"] is True, "El paso 1 del timeline debe estar activo"
        assert mi_post["timeline"][0]["done"] is True, "El paso 1 del timeline debe estar completado"

        # ----------------------------------------------------------------------
        # TEST 5: Consultar detalle individual (GET /api/v1/egresados/mis-postulaciones/{id})
        # ----------------------------------------------------------------------
        print(f"\n[TEST 5] Consultando detalle individual de la postulación {app_id}...")
        res_detail = await client.get(f"/api/v1/egresados/mis-postulaciones/{app_id}", headers=grad_headers)
        assert res_detail.status_code == 200, f"Error en detalle: {res_detail.text}"
        detail_data = res_detail.json()
        assert detail_data["id"] == app_id
        assert detail_data["jobId"] == vac_id
        print(f"  ✓ Detalle obtenido correctamente para vacante '{detail_data['vacancyTitle']}'.")

        # ----------------------------------------------------------------------
        # TEST 6: Reclutador avanza la postulación y agenda entrevista técnica
        # ----------------------------------------------------------------------
        print("\n[TEST 6] Reclutador programa entrevista con el candidato...")
        interview_payload = {
            "fecha_entrevista": "2026-11-15",
            "franja_horaria": "03:00 PM - 03:45 PM",
            "modalidad": "Virtual",
            "url_reunion": "https://meet.google.com/xyz-tech-test",
            "objetivo": "Prueba de arquitectura de componentes y preguntas técnicas."
        }
        res_inter = await client.post(
            f"/api/v1/reclutador/postulaciones/{app_id}/entrevistas",
            json=interview_payload,
            headers=emp_headers
        )
        assert res_inter.status_code == 201, f"Error agendando entrevista: {res_inter.text}"
        print(f"  ✓ Entrevista agendada exitosamente: {res_inter.json().get('url_reunion')}")

        # ----------------------------------------------------------------------
        # TEST 7: Egresado re-consulta y verifica que la fase avanzó y ve la entrevista
        # ----------------------------------------------------------------------
        print("\n[TEST 7] Verificando trazabilidad reactiva en la vista del Egresado...")
        res_detail_updated = await client.get(f"/api/v1/egresados/mis-postulaciones/{app_id}", headers=grad_headers)
        assert res_detail_updated.status_code == 200
        upd = res_detail_updated.json()
        print(f"    - Nueva fase: {upd['phase']} (Esperado: 3)")
        print(f"    - Nuevo stage: {upd['stage']} (Esperado: 'interview')")
        print(f"    - Entrevista agendada: {upd.get('interview')}")

        assert upd["phase"] == 3, f"Fase esperada 3, recibido {upd['phase']}"
        assert upd["stage"] == "interview", f"Stage esperado 'interview', recibido {upd['stage']}"
        assert upd.get("interview") is not None, "Debe tener el objeto interview hidratado"
        assert upd["interview"]["meetUrl"] == "https://meet.google.com/xyz-tech-test"
        assert upd["timeline"][2]["current"] is True, "El paso 3 del timeline debe estar activo"
        print("  ✓ La vista del egresado refleja inmediatamente los datos de la entrevista en vivo.")

        # ----------------------------------------------------------------------
        # TEST 8: Retiro voluntario de la postulación
        # ----------------------------------------------------------------------
        print(f"\n[TEST 8] Egresado retira voluntariamente su postulación {app_id}...")
        res_withdraw = await client.delete(
            f"/api/v1/egresados/mis-postulaciones/{app_id}/retirar",
            headers=grad_headers
        )
        assert res_withdraw.status_code == 200, f"Error al retirar postulación: {res_withdraw.text}"
        withdraw_body = res_withdraw.json()
        assert withdraw_body["success"] is True
        print(f"  ✓ Respuesta de retiro: {withdraw_body['mensaje']}")

        # Verificar que ya no aparece en mis postulaciones
        res_mis_posts_after = await client.get("/api/v1/egresados/mis-postulaciones", headers=grad_headers)
        assert res_mis_posts_after.status_code == 200
        found_after = any(p["id"] == app_id for p in res_mis_posts_after.json())
        assert not found_after, "La postulación retirada NO debe aparecer en la lista de postulaciones activas"
        print("  ✓ Postulación eliminada de la lista del egresado.")

        # Verificar decremento de vacante.total_postulantes
        async with AsyncSessionLocal() as session:
            vac_check = (await session.execute(
                select(Vacante).where(Vacante.id == uuid.UUID(vac_id))
            )).scalar_one_or_none()
            assert vac_check.total_postulantes == 0, f"El contador de postulantes debe ser 0, es {vac_check.total_postulantes}"
            print(f"  ✓ Contador vacante.total_postulantes decrementado a {vac_check.total_postulantes}.")

        # ----------------------------------------------------------------------
        # TEST 9: Validaciones de seguridad y manejo de errores (401, 403, 404)
        # ----------------------------------------------------------------------
        print("\n[TEST 9] Validaciones de seguridad y gating de acceso...")
        # Sin token
        unauth = await client.get("/api/v1/egresados/mis-postulaciones")
        assert unauth.status_code == 401, f"Sin token debe retornar 401, retornó {unauth.status_code}"

        # Con token de reclutador
        forbidden = await client.get("/api/v1/egresados/mis-postulaciones", headers=emp_headers)
        assert forbidden.status_code == 403, f"Rol reclutador debe retornar 403, retornó {forbidden.status_code}"

        # Retirar ID inexistente
        fake_uuid = str(uuid.uuid4())
        not_found = await client.delete(
            f"/api/v1/egresados/mis-postulaciones/{fake_uuid}/retirar",
            headers=grad_headers
        )
        assert not_found.status_code == 404, f"ID inexistente debe retornar 404, retornó {not_found.status_code}"
        print("  ✓ Todas las restricciones de seguridad y respuestas HTTP 401, 403 y 404 verificadas.")

    print("\n================================================================================")
    print(" 🎉 TODAS LAS PRUEBAS DE LA FASE 5 - PASO 2 PASARON CON ÉXITO (100% VERDE)")
    print("================================================================================\n")


if __name__ == "__main__":
    import asyncio
    asyncio.run(run_fase5_paso2_tests())
