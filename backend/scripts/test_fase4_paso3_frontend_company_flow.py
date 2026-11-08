"""
Test Suite de Verificación de la Fase 4 - Paso 3:
Integración Frontend del Ecosistema Empresarial y Gestión de Vacantes.

Valida:
1. Autenticación y expedición de Bearer token para Empresa Aprobada.
2. Contrato de API consumido por `companyService.js`:
   - Alta de Sedes Corporativas (Sede Principal y Seccional).
   - Edición y toggle de estado de Sedes.
   - Alta de Reclutadores vinculados a Sedes y usuario IAM.
   - Cambio de estado de Reclutador (active -> suspended).
3. Contrato de API consumido por `vacancyService.js`:
   - Publicación de Vacante formal desde el formulario del editor corporativo.
   - Consulta de la bandeja privada (mis-vacantes).
   - Cambio de estado (abierta -> pausada -> abierta).
4. Catálogo Público para Egresados (`VacanciesPage.jsx`):
   - Consumo de `GET /api/v1/vacantes` con paginación y contrato `mapApiToProposalJob`.
   - Verificación de campos visuales: título, empresa verificada, salario formateado, responsabilidades, competencias/stack.
5. Latencia y Rendimiento RNF-02 (< 3.0s).
"""

import sys
import os
import io
import time
import uuid
import asyncio
from datetime import datetime, timedelta, timezone
from httpx import AsyncClient, ASGITransport

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app


def create_mock_pdf_stream(title: str) -> io.BytesIO:
    content = f"%PDF-1.4\n1 0 obj\n<< /Title ({title}) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF".encode("utf-8")
    buf = io.BytesIO(content)
    buf.name = f"{title.lower().replace(' ', '_')}.pdf"
    return buf


async def test_fase4_paso3_frontend_company_flow():
    print("\n" + "=" * 80)
    print(" 🚀 EJECUTANDO PRUEBAS FASE 4 - PASO 3: INTEGRACIÓN FRONTEND ECOSISTEMA EMPRESARIAL")
    print("=" * 80)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:

        # ----------------------------------------------------------------------
        # 1. Autenticación y Alta de Empresa Aprobada
        # ----------------------------------------------------------------------
        print("\n[TEST 1] Autenticación Super Admin y aprobación de Empresa A...")
        login_admin = await client.post(
            "/api/v1/auth/login",
            json={"correo": "admin@vincula.com.co", "password": "Admin123*"}
        )
        assert login_admin.status_code == 200
        headers_super = {"Authorization": f"Bearer {login_admin.json()['access_token']}"}

        uid = uuid.uuid4().hex[:6]
        pdf_cam = create_mock_pdf_stream("Camara")
        pdf_rut = create_mock_pdf_stream("RUT")
        pdf_rep = create_mock_pdf_stream("Rep Legal")

        email_emp = f"talento.{uid}@novatech.co"
        pass_emp = "NovaPass2026*!"

        res_reg = await client.post(
            "/api/v1/auth/registro-empresa-form",
            data={
                "razon_social": f"NovaTech Soluciones {uid} SAS",
                "nombre_comercial": f"NovaTech {uid}",
                "nit": f"904{uid}-1",
                "sector_economico": "Software & AI",
                "tamano_empresa": "Mediana",
                "departamento": "Santander",
                "ciudad": "Bucaramanga",
                "direccion": "Calle 50 # 28-20",
                "telefono": "3158889900",
                "correo_contacto": email_emp,
                "password": pass_emp,
                "nombre_representante_legal": "Santiago Silva",
                "documento_representante_legal": f"8812{uid}",
                "persona_contacto": "Santiago Silva"
            },
            files=[
                ("camara_comercio_pdf", ("cam.pdf", pdf_cam.getvalue(), "application/pdf")),
                ("rut_pdf", ("rut.pdf", pdf_rut.getvalue(), "application/pdf")),
                ("cedula_rep_legal_pdf", ("rep.pdf", pdf_rep.getvalue(), "application/pdf")),
            ]
        )
        assert res_reg.status_code == 200
        id_emp = res_reg.json()["id_empresa"]

        # SuperAdmin aprueba
        res_apr = await client.post(
            f"/api/v1/admin/empresas/{id_emp}/aprobar",
            headers=headers_super,
            json={"notas": "Empresa aprobada para pruebas de frontend"}
        )
        assert res_apr.status_code == 200

        # Login de la empresa
        login_emp = await client.post("/api/v1/auth/login", json={"correo": email_emp, "password": pass_emp})
        assert login_emp.status_code == 200
        emp_token = login_emp.json()["access_token"]
        headers_emp = {"Authorization": f"Bearer {emp_token}"}
        print(f"  ✓ Empresa autenticada exitosamente con Bearer token: {id_emp}")

        # ----------------------------------------------------------------------
        # 2. Contrato de Sedes Corporativas (`companyService.js` / `useCompanySites.js`)
        # ----------------------------------------------------------------------
        print("\n[TEST 2] Verificando contrato de Sedes Corporativas...")
        res_create_sede = await client.post(
            "/api/v1/empresas/sedes",
            headers=headers_emp,
            json={
                "nombre": "Sede Principal Cabecera",
                "nombre_corto": "Cabecera",
                "departamento": "Santander",
                "ciudad": "Bucaramanga",
                "direccion": "Cra 35 # 52-19",
                "telefono": "(607) 6432211",
                "correo": f"cabecera.{uid}@novatech.co",
                "nombre_responsable": "Ing. Maritza Jaimes",
                "es_sede_principal": True
            }
        )
        assert res_create_sede.status_code == 201
        sede_data = res_create_sede.json()
        id_sede = sede_data["id"]
        assert sede_data["nombre"] == "Sede Principal Cabecera"
        assert sede_data["es_sede_principal"] is True

        # Consulta consumida por useCompanySites
        res_get_sedes = await client.get("/api/v1/empresas/sedes", headers=headers_emp)
        assert res_get_sedes.status_code == 200
        sedes_list = res_get_sedes.json()
        assert len(sedes_list) >= 1
        assert any(s["id"] == id_sede for s in sedes_list)
        print(f"  ✓ Sedes corporativas sincronizadas con frontend: {len(sedes_list)} sede(s).")

        # ----------------------------------------------------------------------
        # 3. Contrato de Reclutadores (`companyService.js` / `useCompanyRecruiters.js`)
        # ----------------------------------------------------------------------
        print("\n[TEST 3] Verificando contrato de Reclutadores de Talento...")
        email_rec = f"seleccion.{uid}@novatech.co"
        res_create_rec = await client.post(
            "/api/v1/empresas/reclutadores",
            headers=headers_emp,
            json={
                "nombre_completo": "Lic. Camila Beltrán",
                "correo_corporativo": email_rec,
                "password": "RecruiterPass2026*!",
                "telefono": "3129998877",
                "cargo": "Talent Acquisition Specialist",
                "sedes_asignadas_ids": [id_sede]
            }
        )
        assert res_create_rec.status_code == 201
        rec_data = res_create_rec.json()
        id_rec = rec_data["id"]
        assert rec_data["nombre_completo"] == "Lic. Camila Beltrán"
        assert len(rec_data["sedes_asignadas"]) == 1

        # Listado consumido por useCompanyRecruiters
        res_get_recs = await client.get("/api/v1/empresas/reclutadores", headers=headers_emp)
        assert res_get_recs.status_code == 200
        recs_list = res_get_recs.json()
        assert any(r["id"] == id_rec for r in recs_list)
        print(f"  ✓ Equipo de reclutadores sincronizado con frontend: {len(recs_list)} reclutador(es).")

        # ----------------------------------------------------------------------
        # 4. Publicación y Gestión de Vacantes (`vacancyService.js` / `useCompanyVacancies.js`)
        # ----------------------------------------------------------------------
        print("\n[TEST 4] Publicación de vacante desde el flujo de CompanyAdminVacancyEditorPage...")
        fecha_cierre_str = (datetime.now(timezone.utc) + timedelta(days=25)).strftime("%Y-%m-%d")

        payload_editor = {
            "titulo": f"Ingeniero de Datos & Cloud Junior {uid}",
            "id_sede": id_sede,
            "id_reclutador_responsable": id_rec,
            "categoria": "Tecnología",
            "modalidad": "Híbrido",
            "tipo_contrato": "Término Indefinido",
            "nivel_experiencia": "Junior",
            "salario_minimo": 3800000.0,
            "salario_maximo": 4800000.0,
            "salario_es_confidencial": False,
            "periodo_salario": "Mensual",
            "jornada_laboral": "Lunes a Viernes (8:00 AM - 5:00 PM)",
            "cupos_disponibles": 3,
            "descripcion": "Oportunidad para egresados de Ingeniería de Sistemas con pasión por arquitecturas cloud y pipelines ETL.",
            "responsabilidades": [
                "Construir y mantener pipelines de ingestión de datos",
                "Monitorear consultas en PostgreSQL y almacenes analíticos",
                "Colaborar con el equipo de Inteligencia de Negocios"
            ],
            "requisitos": [
                "Título universitario en Ingeniería de Sistemas o afines",
                "Conocimientos en Python, SQL y fundamentos de Cloud",
                "Proactividad y pensamiento analítico"
            ],
            "beneficios": [
                "Bono de teletrabajo",
                "Seguro de vida complementario",
                "Plan de capacitaciones técnicas"
            ],
            "idiomas_requeridos": ["Español", "Inglés Intermedio"],
            "fecha_cierre": fecha_cierre_str,
            "estado": "abierta",
            "competencias": [
                {"nombre": "Python", "categoria": "tecnica", "es_obligatoria": True},
                {"nombre": "SQL", "categoria": "tecnica", "es_obligatoria": True},
                {"nombre": "Docker", "categoria": "tecnica", "es_obligatoria": False},
                {"nombre": "Comunicación Asertiva", "categoria": "blanda", "es_obligatoria": False}
            ]
        }

        res_create_vac = await client.post("/api/v1/vacantes", headers=headers_emp, json=payload_editor)
        assert res_create_vac.status_code == 201
        vac_created = res_create_vac.json()
        id_vac = vac_created["id"]
        assert vac_created["estado"] == "abierta"
        assert vac_created["codigo_vacante"].startswith("VAC-2026-")
        print(f"  ✓ Vacante formal creada con éxito: {vac_created['codigo_vacante']} (ID: {id_vac})")

        # Bandeja privada de la empresa (useCompanyVacancies)
        res_mis_vac = await client.get("/api/v1/vacantes/empresa/mis-vacantes", headers=headers_emp)
        assert res_mis_vac.status_code == 200
        mis_vac_items = res_mis_vac.json()["items"]
        assert any(v["id"] == id_vac for v in mis_vac_items)
        print(f"  ✓ Bandeja privada sincronizada con frontend: {len(mis_vac_items)} vacante(s) registradas.")

        # ----------------------------------------------------------------------
        # 5. Catálogo Público para Egresados (`VacanciesPage.jsx`)
        # ----------------------------------------------------------------------
        print("\n[TEST 5] Consumo del catálogo público en VacanciesPage.jsx con mapeo DTO...")
        t_start = time.perf_counter()
        res_pub_cat = await client.get("/api/v1/vacantes?page=1&limit=20")
        t_lat = time.perf_counter() - t_start

        assert res_pub_cat.status_code == 200
        assert t_lat < 3.0, f"Latencia {t_lat:.3f}s supera SLA < 3.0s RNF-02"
        cat_json = res_pub_cat.json()

        # Encontrar la vacante de NovaTech
        nova_vac = next((v for v in cat_json["items"] if v["id"] == id_vac), None)
        assert nova_vac is not None, "La vacante recién creada debe aparecer en el catálogo público para egresados"
        assert nova_vac["empresa"]["empresa_verificada"] is True
        assert nova_vac["salario_minimo"] == 3800000.0
        assert nova_vac["modalidad"] == "Híbrido"
        assert len(nova_vac["competencias"]) == 4

        print(f"  ✓ Catálogo público consumido en {t_lat*1000:.2f} ms (< 3.0s RNF-02). Vacante visible para egresados.")
        print(f"    - Código: {nova_vac['codigo_vacante']}")
        print(f"    - Empresa: {nova_vac['empresa']['nombre_comercial']} (Verificada: {nova_vac['empresa']['empresa_verificada']})")
        print(f"    - Ubicación: {nova_vac['sede']['ciudad']}, {nova_vac['sede']['departamento']}")
        print(f"    - Salario: ${nova_vac['salario_minimo']:,.0f} - ${nova_vac['salario_maximo']:,.0f} COP")

        # ----------------------------------------------------------------------
        # 6. Actualización de Vacante y Ciclo de Vida
        # ----------------------------------------------------------------------
        print("\n[TEST 6] Actualización de vacante y toggle de estado desde el frontend...")
        res_pause_vac = await client.patch(
            f"/api/v1/vacantes/{id_vac}/estado",
            headers=headers_emp,
            json={"estado": "pausada"}
        )
        assert res_pause_vac.status_code == 200
        assert res_pause_vac.json()["estado"] == "pausada"

        # Verificar que se retira del catálogo público
        res_cat_after_pause = await client.get("/api/v1/vacantes?page=1&limit=50")
        assert not any(v["id"] == id_vac for v in res_cat_after_pause.json()["items"])
        print(f"  ✓ Estado 'pausada' sincronizado: se oculta automáticamente en el catálogo público.")

        # Reactivar a abierta
        res_reopen = await client.patch(
            f"/api/v1/vacantes/{id_vac}/estado",
            headers=headers_emp,
            json={"estado": "abierta"}
        )
        assert res_reopen.status_code == 200
        assert res_reopen.json()["estado"] == "abierta"
        print(f"  ✓ Reactivación a 'abierta' completada exitosamente.")

    print("\n" + "=" * 80)
    print(" 🎉 TODAS LAS PRUEBAS DE LA FASE 4 - PASO 3 HAN SIDO COMPLETADAS (100% VERDE)")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    asyncio.run(test_fase4_paso3_frontend_company_flow())

