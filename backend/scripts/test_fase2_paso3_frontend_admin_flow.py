"""
Test Suite de Verificación de la Fase 2 - Paso 3:
Conexión de la Bandeja de Auditoría del Super Admin con Frontend y Previsualización Segura de PDFs.

Valida:
1. Autenticación del Super Administrador (Bearer token JWT).
2. Consumo de /api/v1/admin/auditoria/empresas con paginación y esquemas compatibles con mapBackendCompanyToUi.
3. Consumo de /api/v1/admin/auditoria/ies con paginación y esquemas compatibles con mapBackendInstitutionToUi.
4. Generación de URLs firmadas temporales (3600s) para PDFs en Supabase Storage consumida por el visor.
5. Flujo de aprobación oficial con notas de auditoría desde el Drawer de inspección.
6. Flujo de solicitud de subsanación con selección de documentos observados desde CorrectionModal.
7. Flujo de rechazo formal con registro de motivo en la bitácora de auditoría.
8. Validación de mensajes de error estructurados y pedagógicos ante intentos inválidos de mutación.
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


async def test_fase2_paso3_frontend_admin_flow():
    print("\n" + "=" * 80)
    print(" 🚀 EJECUTANDO PRUEBAS FASE 2 - PASO 3: BANDEJA SUPER ADMIN, VISOR PDF & MODALES")
    print("=" * 80)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:

        # ----------------------------------------------------------------------
        # 1. Login de SuperAdmin Vincula
        # ----------------------------------------------------------------------
        print("\n[TEST 1] Autenticación como Super Admin para adminService.js...")
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"correo": "admin@vincula.com.co", "password": "Admin123*"}
        )
        assert login_res.status_code == 200, f"Error {login_res.text}"
        admin_data = login_res.json()
        assert admin_data["rol"] == "superadmin_vincula"
        admin_token = admin_data["access_token"]
        headers_admin = {"Authorization": f"Bearer {admin_token}"}
        print(f"  ✓ Token emitido exitosamente para: {admin_data['nombre']} (Rol: {admin_data['rol']})")

        # ----------------------------------------------------------------------
        # 2. Registrar Empresa e IES de prueba para alimentar la bandeja
        # ----------------------------------------------------------------------
        print("\n[TEST 2] Radicando expedientes reales con documentos PDF...")
        uid = uuid.uuid4().hex[:6]

        pdf_camara = create_mock_pdf_stream(f"Camara Comercio {uid}")
        pdf_rut = create_mock_pdf_stream(f"RUT {uid}")
        pdf_rep = create_mock_pdf_stream(f"Cedula {uid}")

        files_emp = [
            ("camara_comercio_pdf", ("camara.pdf", pdf_camara.getvalue(), "application/pdf")),
            ("rut_pdf", ("rut.pdf", pdf_rut.getvalue(), "application/pdf")),
            ("cedula_rep_legal_pdf", ("cedula.pdf", pdf_rep.getvalue(), "application/pdf")),
        ]

        emp_res = await client.post(
            "/api/v1/auth/registro-empresa-form",
            data={
                "razon_social": f"Soluciones Cloud Caribe SAS {uid}",
                "nombre_comercial": f"CloudCaribe {uid}",
                "nit": f"901{uid}-3",
                "sector_economico": "Tecnología e Información",
                "tamano_empresa": "Mediana (51 - 200 empleados)",
                "departamento": "Atlántico",
                "ciudad": "Barranquilla",
                "direccion": "Cra 52 # 74-12",
                "telefono": "3159988776",
                "correo_contacto": f"contacto.{uid}@cloudcaribe.com",
                "password": "Password123*",
                "nombre_representante_legal": f"Carlos Mendoza {uid}",
                "documento_representante_legal": f"1045{uid}",
                "persona_contacto": f"Carlos Mendoza {uid}"
            },
            files=files_emp
        )
        assert emp_res.status_code == 200, f"Error registro empresa: {emp_res.text}"
        emp_created = emp_res.json()
        company_id = emp_created["id_empresa"]
        print(f"  ✓ Empresa radicada: {emp_created['razon_social']} (ID: {company_id})")

        # Registrar IES
        pdf_men = create_mock_pdf_stream(f"Resolucion MEN {uid}")
        pdf_rut_ies = create_mock_pdf_stream(f"RUT IES {uid}")

        files_ies = [
            ("resolucion_men_pdf", ("resolucion_men.pdf", pdf_men.getvalue(), "application/pdf")),
            ("rut_pdf", ("rut_ies.pdf", pdf_rut_ies.getvalue(), "application/pdf")),
        ]

        ies_res = await client.post(
            "/api/v1/auth/registro-institucion-form",
            data={
                "nombre_institucion": f"Corporación Universitaria de la Costa {uid}",
                "sigla": f"CUC-{uid.upper()}",
                "codigo_snies": f"99{uid[:4]}",
                "nit": f"890{uid}-9",
                "caracter_academico": "Institución Universitaria",
                "origen_institucional": "Privada",
                "correo_institucional": f"rectoria.{uid}@cuc.edu.co",
                "password": "Password123*",
                "telefono": "3001234567",
                "direccion": "Calle 58 # 55-66",
                "ciudad": "Barranquilla",
                "departamento": "Atlántico",
                "sitio_web": f"https://www.{uid}cuc.edu.co",
                "nombre_rector": f"Dra. Elena Silva {uid}",
                "documento_rector": f"4567{uid}",
                "nombre_contacto_asesor": "Coordinador de Empleo",
                "cargo_asesor": "Director de Egresados",
            },
            files=files_ies
        )
        assert ies_res.status_code == 200, f"Error registro IES: {ies_res.text}"
        ies_created = ies_res.json()
        institution_id = ies_created["id_institucion"]
        print(f"  ✓ IES radicada: {ies_created['nombre_institucion']} (ID: {institution_id})")

        # ----------------------------------------------------------------------
        # 3. Consumo del listado de empresas con formato paginado
        # ----------------------------------------------------------------------
        print("\n[TEST 3] Verificando endpoint adminService.getCompaniesAudit con paginación...")
        list_emp_res = await client.get(
            "/api/v1/admin/auditoria/empresas?page=1&limit=10&estado=todos",
            headers=headers_admin
        )
        assert list_emp_res.status_code == 200, f"Error listado empresas: {list_emp_res.text}"
        emp_page = list_emp_res.json()
        assert "items" in emp_page
        assert "total" in emp_page
        assert "page" in emp_page
        assert "limit" in emp_page
        assert "total_pages" in emp_page
        assert emp_page["total"] >= 1

        # Encontrar la empresa radicada en los items
        target_emp = next((x for x in emp_page["items"] if x["id"] == company_id), None)
        assert target_emp is not None, "La empresa radicada no aparece en el listado de auditoría"
        assert target_emp["radicado"].startswith("RAD-EMP-2026-")
        assert target_emp["estado"] == "pendiente"
        assert target_emp["sla_horas_restantes"] <= 72
        assert len(target_emp["documentos"]) == 3
        emp_doc_id = target_emp["documentos"][0]["id"]
        print(f"  ✓ Estructura de empresa validada para frontend. Radicado: {target_emp['radicado']}, SLA: {target_emp['sla_texto']}")

        # ----------------------------------------------------------------------
        # 4. Consumo del listado de IES con formato paginado
        # ----------------------------------------------------------------------
        print("\n[TEST 4] Verificando endpoint adminService.getInstitutionsAudit con paginación...")
        list_ies_res = await client.get(
            "/api/v1/admin/auditoria/ies?page=1&limit=10&estado=todos",
            headers=headers_admin
        )
        assert list_ies_res.status_code == 200, f"Error listado IES: {list_ies_res.text}"
        ies_page = list_ies_res.json()
        assert "items" in ies_page
        assert ies_page["total"] >= 1

        target_ies = next((x for x in ies_page["items"] if x["id"] == institution_id), None)
        assert target_ies is not None, "La IES radicada no aparece en el listado de auditoría"
        assert target_ies["radicado"].startswith("RAD-IES-2026-")
        assert target_ies["codigo_snies"] == f"99{uid[:4]}"
        assert len(target_ies["documentos"]) >= 1
        ies_doc_id = target_ies["documentos"][0]["id"]
        print(f"  ✓ Estructura de IES validada para frontend. Radicado: {target_ies['radicado']}, SNIES: {target_ies['codigo_snies']}")

        # ----------------------------------------------------------------------
        # 5. Generación de URLs firmadas temporales para el Visor PDF
        # ----------------------------------------------------------------------
        print("\n[TEST 5] Verificando visor PDF seguro mediante adminService.getDocumentSecureUrl...")
        # URL firmada para documento de empresa
        sec_emp_res = await client.get(
            f"/api/v1/admin/auditoria/documento/{emp_doc_id}/secure-url?expires_in=3600",
            headers=headers_admin
        )
        assert sec_emp_res.status_code == 200, f"Error secure url empresa: {sec_emp_res.text}"
        sec_emp_data = sec_emp_res.json()
        assert "secure_url" in sec_emp_data
        assert sec_emp_data["expira_en_segundos"] == 3600
        assert "token=" in sec_emp_data["secure_url"] or "test-signed-token" in sec_emp_data["secure_url"]
        print(f"  ✓ URL firmada para empresa generada: {sec_emp_data['nombre_archivo']} (Token S3 3600s)")

        # URL firmada para documento de IES
        sec_ies_res = await client.get(
            f"/api/v1/admin/auditoria/documento/{ies_doc_id}/secure-url?expires_in=3600",
            headers=headers_admin
        )
        assert sec_ies_res.status_code == 200, f"Error secure url IES: {sec_ies_res.text}"
        sec_ies_data = sec_ies_res.json()
        assert "secure_url" in sec_ies_data
        print(f"  ✓ URL firmada para IES generada: {sec_ies_data['nombre_archivo']}")

        # ----------------------------------------------------------------------
        # 6. Flujo de Subsanación con selección de documentos (CorrectionModal)
        # ----------------------------------------------------------------------
        print("\n[TEST 6] Solicitud de subsanación desde CorrectionModal con documentos específicos...")
        sub_res = await client.post(
            f"/api/v1/admin/empresas/{company_id}/solicitar-subsanacion",
            headers=headers_admin,
            json={
                "motivo": "El Certificado de Cámara de Comercio tiene fecha de expedición mayor a 30 días.",
                "documentos_requeridos": ["camara_comercio"]
            }
        )
        assert sub_res.status_code == 200, f"Error solicitando subsanación: {sub_res.text}"
        sub_data = sub_res.json()
        assert sub_data["nuevo_estado"] == "en_subsanacion"
        assert sub_data["documentos_requeridos"] == ["camara_comercio"]
        print(f"  ✓ Subsanación solicitada formalmente. Empresa en estado 'en_subsanacion'.")

        # ----------------------------------------------------------------------
        # 7. Flujo de Aprobación Oficial con Notas (CompanyVerificationDrawer)
        # ----------------------------------------------------------------------
        print("\n[TEST 7] Aprobación de empresa con notas de verificación desde el Drawer...")
        app_res = await client.post(
            f"/api/v1/admin/empresas/{company_id}/aprobar",
            headers=headers_admin,
            json={"notas": "Verificación mercantil y tributaria completa y conforme a ley."}
        )
        assert app_res.status_code == 200, f"Error aprobando empresa: {app_res.text}"
        app_data = app_res.json()
        assert app_data["nuevo_estado"] == "aprobado"
        print(f"  ✓ Empresa aprobada formalmente. Cuarentena levantada y notas archivadas.")

        # ----------------------------------------------------------------------
        # 8. Flujo de Rechazo Formal (CorrectionModal modo rejection)
        # ----------------------------------------------------------------------
        print("\n[TEST 8] Rechazo formal de IES con motivo justificado desde CorrectionModal...")
        rej_res = await client.post(
            f"/api/v1/admin/instituciones/{institution_id}/rechazar",
            headers=headers_admin,
            json={"motivo_rechazo": "Documentación remitida no corresponde a los registros del Ministerio de Educación Nacional."}
        )
        assert rej_res.status_code == 200, f"Error rechazando IES: {rej_res.text}"
        rej_data = rej_res.json()
        assert rej_data["nuevo_estado"] == "rechazado"
        print(f"  ✓ IES rechazada formalmente: '{rej_data['motivo_rechazo']}'.")

        # ----------------------------------------------------------------------
        # 9. Verificación de Explicación de Error Pedagógica (HTTP 400 Contextualizado)
        # ----------------------------------------------------------------------
        print("\n[TEST 9] Validación de mensajes explicativos de error 400 (no en seco)...")
        # Iniciar sesión con la empresa (que ahora está 'aprobada')
        login_emp = await client.post(
            "/api/v1/auth/login",
            json={"correo": f"contacto.{uid}@cloudcaribe.com", "password": "Password123*"}
        )
        assert login_emp.status_code == 200, f"Error login empresa: {login_emp.text}"
        token_emp = login_emp.json()["access_token"]
        headers_emp = {"Authorization": f"Bearer {token_emp}"}

        # Intentar subsanar la empresa que ya fue aprobada (debe retornar 400 con motivo y por qué ocurre)
        invalid_sub_res = await client.post(
            "/api/v1/empresas/subsanar-documento",
            headers=headers_emp,
            json={
                "tipo_documento": "camara_comercio",
                "nombre_archivo": "nueva_camara.pdf",
                "archivo_base64_o_url": "JVBERi0xLjQKMSAwIG9ia...",
                "observaciones": "Intento de reemplazo indebido en empresa aprobada"
            }
        )
        assert invalid_sub_res.status_code == 400, f"Se esperaba 400, obtuvo {invalid_sub_res.status_code}: {invalid_sub_res.text}"
        err_body = invalid_sub_res.json()
        assert "detail" in err_body
        err_detail = err_body["detail"]
        assert isinstance(err_detail, dict)
        assert err_detail.get("codigo") == "ESTADO_NO_SUBSANABLE"
        assert "mensaje" in err_detail
        assert "motivo" in err_detail or "por_que_ocurre" in err_detail
        assert "accion_sugerida" in err_detail
        print(f"  ✓ Mensaje de error pedagógico validado exitosamente:")
        print(f"    - Código: {err_detail.get('codigo')}")
        print(f"    - Mensaje: {err_detail.get('mensaje')}")
        print(f"    - Motivo / Por qué ocurre: {err_detail.get('por_que_ocurre') or err_detail.get('motivo')}")
        print(f"    - Acción sugerida: {err_detail.get('accion_sugerida')}")

    print("\n" + "=" * 80)
    print(" 🎉 TODAS LAS PRUEBAS DE LA FASE 2 - PASO 3 PASARON SATISFACTORIAMENTE (100% VERDE)")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    asyncio.run(test_fase2_paso3_frontend_admin_flow())
