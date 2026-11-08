"""
Test Suite de Verificación de la Fase 2 - Paso 1:
Endpoints de Auditoría y SLA 72H en Backend (Super Admin Vincula).
Valida:
1. Login de SuperAdmin y emisión de JWT autorizado.
2. Listado de empresas en cola de auditoría con horas restantes del SLA 72h.
3. Listado de IES en verificación SNIES.
4. Generación de URLs firmadas temporales para PDFs en Supabase Storage.
5. Acción de Subsanación: cambio a 'en_subsanacion' y marcado de documentos.
6. Acción de Rechazo: inhabilitación definitiva.
7. Acción de Aprobación: levantamiento del modo cuarentena y desbloqueo del Gating 403.
8. Aprobación oficial de Institución de Educación Superior.
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


async def test_fase2_paso1_auditoria():
    print("\n" + "=" * 80)
    print(" 🚀 EJECUTANDO PRUEBAS FASE 2 - PASO 1: SUPER ADMIN & AUDITORÍA 72H (BACKEND)")
    print("=" * 80)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:

        # ----------------------------------------------------------------------
        # 1. Login de SuperAdmin Vincula
        # ----------------------------------------------------------------------
        print("\n[TEST 1] Autenticación como Super Admin Vincula...")
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"correo": "admin@vincula.com.co", "password": "Admin123*"}
        )
        assert login_res.status_code == 200, f"Error {login_res.text}"
        admin_data = login_res.json()
        assert admin_data["rol"] == "superadmin_vincula"
        admin_token = admin_data["access_token"]
        headers_admin = {"Authorization": f"Bearer {admin_token}"}
        print(f"  ✓ Token emitido exitosamente para: {admin_data['nombre']} | Rol: {admin_data['rol']}")

        # ----------------------------------------------------------------------
        # 2. Registrar dos Empresas en Cuarentena para Auditoría
        # ----------------------------------------------------------------------
        print("\n[TEST 2] Radicando empresas de prueba en Supabase para auditar...")
        uid1 = uuid.uuid4().hex[:6]
        uid2 = uuid.uuid4().hex[:6]

        pdf_camara = create_mock_pdf_stream("Camara Comercio Test")
        pdf_rut = create_mock_pdf_stream("RUT Test")
        pdf_rep = create_mock_pdf_stream("Cedula Rep Test")

        files1 = [
            ("camara_comercio_pdf", ("camara.pdf", pdf_camara.getvalue(), "application/pdf")),
            ("rut_pdf", ("rut.pdf", pdf_rut.getvalue(), "application/pdf")),
            ("cedula_rep_legal_pdf", ("cedula.pdf", pdf_rep.getvalue(), "application/pdf")),
        ]

        # Empresa A: Se usará para Subsanar y luego Aprobar
        res_emp_a = await client.post(
            "/api/v1/auth/registro-empresa-form",
            data={
                "razon_social": f"Constructora Santander SAS {uid1}",
                "nombre_comercial": f"Constructora Santander {uid1}",
                "nit": f"900{uid1}-1",
                "sector_economico": "Construcción",
                "tamano_empresa": "Mediana (51 - 200 empleados)",
                "departamento": "Santander",
                "ciudad": "Bucaramanga",
                "direccion": "Calle 45 # 29-10",
                "telefono": "(607) 6331122",
                "correo_contacto": f"talento.{uid1}@constructorasantander.co",
                "password": "EmpresaPass2026*!",
                "nombre_representante_legal": "Alonso Quintero",
                "documento_representante_legal": "91234888",
                "persona_contacto": "Sandra Milena Rueda"
            },
            files=files1
        )
        assert res_emp_a.status_code == 200, f"Error {res_emp_a.text}"
        emp_a = res_emp_a.json()
        id_emp_a = emp_a["id_empresa"]

        # Empresa B: Se usará para Rechazar
        files2 = [
            ("camara_comercio_pdf", ("camara.pdf", pdf_camara.getvalue(), "application/pdf")),
            ("rut_pdf", ("rut.pdf", pdf_rut.getvalue(), "application/pdf")),
        ]
        res_emp_b = await client.post(
            "/api/v1/auth/registro-empresa-form",
            data={
                "razon_social": f"Inversiones Fantasma SAS {uid2}",
                "nombre_comercial": f"Inversiones Fantasma {uid2}",
                "nit": f"900{uid2}-9",
                "sector_economico": "Financiero",
                "tamano_empresa": "Pequeña",
                "departamento": "Santander",
                "ciudad": "Floridablanca",
                "direccion": "Calle Falsa 123",
                "telefono": "3001234567",
                "correo_contacto": f"contacto.{uid2}@fantasma.co",
                "password": "EmpresaPass2026*!",
                "nombre_representante_legal": "Sujeto Sospechoso",
                "documento_representante_legal": "109876",
                "persona_contacto": "Sujeto Sospechoso"
            },
            files=files2
        )
        assert res_emp_b.status_code == 200, f"Error {res_emp_b.text}"
        emp_b = res_emp_b.json()
        id_emp_b = emp_b["id_empresa"]

        print(f"  ✓ Empresa A creada (Pendiente): {emp_a['razon_social']} (ID: {id_emp_a})")
        print(f"  ✓ Empresa B creada (Pendiente): {emp_b['razon_social']} (ID: {id_emp_b})")

        # ----------------------------------------------------------------------
        # 3. Consultar Bandeja de Auditoría de Empresas (/api/v1/admin/auditoria/empresas)
        # ----------------------------------------------------------------------
        print("\n[TEST 3] GET /api/v1/admin/auditoria/empresas...")
        audit_res = await client.get("/api/v1/admin/auditoria/empresas", headers=headers_admin)
        assert audit_res.status_code == 200, f"Error {audit_res.text}"
        audit_json = audit_res.json()
        empresas_list = audit_json.get("items", audit_json) if isinstance(audit_json, dict) else audit_json
        assert len(empresas_list) >= 2

        found_a = next((e for e in empresas_list if e["id"] == id_emp_a), None)
        assert found_a is not None, "Empresa A no encontrada en la bandeja de auditoría"
        assert found_a["estado"] == "pendiente"
        assert found_a["sla_horas_restantes"] <= 72
        assert len(found_a["documentos"]) >= 2
        primer_doc_id = found_a["documentos"][0]["id"]
        print(f"  ✓ Cola de auditoría consultada: {len(empresas_list)} empresas registradas")
        print(f"  ✓ Radicado: {found_a['radicado']} | SLA: {found_a['sla_texto']} | Docs: {len(found_a['documentos'])}")

        # ----------------------------------------------------------------------
        # 4. Generación de URL Firmada para Visualizar PDF en Supabase Storage
        # ----------------------------------------------------------------------
        print(f"\n[TEST 4] GET /api/v1/admin/auditoria/documento/{primer_doc_id}/secure-url...")
        sec_url_res = await client.get(
            f"/api/v1/admin/auditoria/documento/{primer_doc_id}/secure-url",
            headers=headers_admin
        )
        assert sec_url_res.status_code == 200, f"Error {sec_url_res.text}"
        sec_data = sec_url_res.json()
        assert "secure_url" in sec_data
        assert sec_data["expira_en_segundos"] == 3600
        print(f"  ✓ URL firmada generada exitosamente para Super Admin:")
        print(f"    - Archivo: {sec_data['nombre_archivo']}")
        print(f"    - URL Segura: {sec_data['secure_url'][:75]}...")

        # ----------------------------------------------------------------------
        # 5. Solicitar Subsanación Documental a Empresa A
        # ----------------------------------------------------------------------
        print(f"\n[TEST 5] POST /api/v1/admin/empresas/{id_emp_a}/solicitar-subsanacion...")
        subsanar_res = await client.post(
            f"/api/v1/admin/empresas/{id_emp_a}/solicitar-subsanacion",
            headers=headers_admin,
            json={
                "motivo": "El Certificado de Cámara de Comercio tiene más de 30 días de expedición. Adjuntar uno vigente.",
                "documentos_requeridos": ["camara_comercio"]
            }
        )
        assert subsanar_res.status_code == 200, f"Error {subsanar_res.text}"
        sub_data = subsanar_res.json()
        assert sub_data["nuevo_estado"] == "en_subsanacion"
        print(f"  ✓ Subsanación solicitada exitosamente:")
        print(f"    - Estado cambiado a: {sub_data['nuevo_estado']}")
        print(f"    - Motivo registrado en auditorias_superadmin: {sub_data['motivo']}")

        # ----------------------------------------------------------------------
        # 6. Rechazo Definitivo de Empresa B
        # ----------------------------------------------------------------------
        print(f"\n[TEST 6] POST /api/v1/admin/empresas/{id_emp_b}/rechazar...")
        rechazo_res = await client.post(
            f"/api/v1/admin/empresas/{id_emp_b}/rechazar",
            headers=headers_admin,
            json={
                "motivo_rechazo": "Inconsistencias graves en el NIT y falta de existencia legal verificada ante RUES."
            }
        )
        assert rechazo_res.status_code == 200, f"Error {rechazo_res.text}"
        rech_data = rechazo_res.json()
        assert rech_data["nuevo_estado"] == "rechazado"
        print(f"  ✓ Empresa rechazada definitivamente: {rech_data['mensaje']}")

        # ----------------------------------------------------------------------
        # 7. Aprobación Oficial de Empresa A (Liberación de Cuarentena)
        # ----------------------------------------------------------------------
        print(f"\n[TEST 7] POST /api/v1/admin/empresas/{id_emp_a}/aprobar...")
        aprobar_res = await client.post(
            f"/api/v1/admin/empresas/{id_emp_a}/aprobar",
            headers=headers_admin,
            json={"notas": "Documentos cotejados y aprobados formalmente ante RUES y DIAN."}
        )
        assert aprobar_res.status_code == 200, f"Error {aprobar_res.text}"
        apr_data = aprobar_res.json()
        assert apr_data["nuevo_estado"] == "aprobado"
        print(f"  ✓ Empresa aprobada formalmente: {apr_data['mensaje']}")

        # ----------------------------------------------------------------------
        # 8. Verificación de Desbloqueo de Gating: La Empresa Aprobada ya puede operar
        # ----------------------------------------------------------------------
        print("\n[TEST 8] Verificando que la empresa aprobada puede operar sin bloqueo 403...")
        login_emp_a = await client.post(
            "/api/v1/auth/login",
            json={"correo": f"talento.{uid1}@constructorasantander.co", "password": "EmpresaPass2026*!"}
        )
        assert login_emp_a.status_code == 200
        token_emp_a = login_emp_a.json()["access_token"]
        assert login_emp_a.json()["estado_validacion"] == "aprobado"

        # Intentar llamar al endpoint de sedes
        headers_emp_a = {"Authorization": f"Bearer {token_emp_a}"}
        res_sedes = await client.get("/api/v1/empresas/sedes", headers=headers_emp_a)
        assert res_sedes.status_code == 200, f"Esperado 200 tras aprobación, obtenido {res_sedes.status_code}"
        print(f"  ✓ GATING DESBLOQUEADO: /api/v1/empresas/sedes responde 200 OK (Cuarentena levantada)")

        # ----------------------------------------------------------------------
        # 9. Consultar y Aprobar Institución Educativa (IES)
        # ----------------------------------------------------------------------
        print("\n[TEST 9] Auditoría y Aprobación de IES...")
        ies_audit_res = await client.get("/api/v1/admin/auditoria/ies", headers=headers_admin)
        assert ies_audit_res.status_code == 200
        ies_json = ies_audit_res.json()
        ies_list = ies_json.get("items", ies_json) if isinstance(ies_json, dict) else ies_json
        assert len(ies_list) >= 1
        primera_ies = ies_list[0]
        print(f"  ✓ IES en auditoría: {primera_ies['nombre_oficial']} (SNIES: {primera_ies['codigo_snies']})")

        res_apr_ies = await client.post(
            f"/api/v1/admin/ies/{primera_ies['id']}/aprobar",
            headers=headers_admin,
            json={"notas": "Institución y personería jurídica verificadas con resolución ministerial."}
        )
        assert res_apr_ies.status_code == 200
        print(f"  ✓ IES avalada oficialmente: {res_apr_ies.json()['mensaje']}")

    print("\n" + "=" * 80)
    print(" 🎉 TODAS LAS PRUEBAS DE LA FASE 2 - PASO 1 PASARON AL 100% DE FORMA EXITOSA")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(test_fase2_paso1_auditoria())

