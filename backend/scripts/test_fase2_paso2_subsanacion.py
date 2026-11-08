"""
Test Suite de Verificación de la Fase 2 - Paso 2:
Endpoint y Flujo de Subsanación Estricto, Higiene de Storage, Reinicio del Reloj SLA y Paginación en Bandejas.

Valida:
1. Intento de subsanación cuando el estado no es 'en_subsanacion' -> Rechazo 400 (ESTADO_NO_SUBSANABLE).
2. Super Admin solicita subsanación de 2 documentos -> Empresa pasa a 'en_subsanacion' y SLA se pausa (0h).
3. Intento de subsanar un documento no observado o ya aprobado -> Rechazo 400 (DOCUMENTO_NO_OBSERVADO / DOCUMENTO_YA_APROBADO).
4. Subsanación parcial del primer documento -> Higiene de almacenamiento (ruta determinista), empresa se mantiene en subsanación.
5. Subsanación total con Multipart Form -> Empresa regresa a 'pendiente' y el reloj SLA se reinicia formalmente a 72h.
6. Bloqueo inmediato tras regresar a 'pendiente' -> Rechazo 400 (ESTADO_NO_SUBSANABLE).
7. Paginación obligatoria en Super Admin Empresas (?page=1&limit=2) -> Envelope estructurado {items, total, page, limit, total_pages}.
8. Paginación obligatoria en Super Admin IES (?page=1&limit=2) -> Envelope estructurado.
9. Flujo de Subsanación institucional para IES -> Validación estricta y reinicio del SLA para universidades.
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


async def test_fase2_paso2_subsanacion():
    print("\n" + "=" * 80)
    print(" 🚀 EJECUTANDO PRUEBAS FASE 2 - PASO 2: FLUJO DE SUBSANACIÓN ESTRICTO & PAGINACIÓN")
    print("=" * 80)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:

        # ----------------------------------------------------------------------
        # 1. Login Super Admin
        # ----------------------------------------------------------------------
        print("\n[PASO 1] Login de Super Admin...")
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"correo": "admin@vincula.com.co", "password": "Admin123*"}
        )
        assert login_res.status_code == 200, f"Error {login_res.text}"
        admin_data = login_res.json()
        headers_admin = {"Authorization": f"Bearer {admin_data['access_token']}"}
        print(f"  ✓ Super Admin autenticado: {admin_data['nombre']}")

        # ----------------------------------------------------------------------
        # 2. Registrar Empresa de Prueba en Cuarentena
        # ----------------------------------------------------------------------
        print("\n[PASO 2] Registrando empresa para ciclo de subsanación...")
        uid = uuid.uuid4().hex[:6]
        email_emp = f"recluta.{uid}@solucionesandinas.com"
        pass_emp = "Empresa2026*!"

        pdf_camara = create_mock_pdf_stream("Camara Comercio Inicial")
        pdf_rut = create_mock_pdf_stream("RUT Inicial")
        pdf_cedula = create_mock_pdf_stream("Cedula Rep Legal Inicial")

        reg_emp = await client.post(
            "/api/v1/auth/registro-empresa-form",
            data={
                "razon_social": f"Soluciones Andinas SAS {uid}",
                "nombre_comercial": f"Soluciones Andinas {uid}",
                "nit": f"901{uid}-5",
                "sector_economico": "Tecnología de la Información",
                "tamano_empresa": "Mediana",
                "departamento": "Santander",
                "ciudad": "Bucaramanga",
                "direccion": "Cra 33 # 48-120",
                "telefono": "6076451234",
                "correo_contacto": email_emp,
                "password": pass_emp,
                "nombre_representante_legal": "Carlos Valenzuela",
                "documento_representante_legal": "88123456",
                "persona_contacto": "Carlos Valenzuela"
            },
            files=[
                ("camara_comercio_pdf", ("camara.pdf", pdf_camara.getvalue(), "application/pdf")),
                ("rut_pdf", ("rut.pdf", pdf_rut.getvalue(), "application/pdf")),
                ("cedula_rep_legal_pdf", ("cedula.pdf", pdf_cedula.getvalue(), "application/pdf")),
            ]
        )
        assert reg_emp.status_code == 200, f"Error {reg_emp.text}"
        emp_data = reg_emp.json()
        id_empresa = emp_data["id_empresa"]

        # Iniciar sesión con la empresa registrada para obtener su JWT
        login_emp = await client.post(
            "/api/v1/auth/login",
            json={"correo": email_emp, "password": pass_emp}
        )
        assert login_emp.status_code == 200, f"Error al iniciar sesión con empresa: {login_emp.text}"
        token_empresa = login_emp.json()["access_token"]
        headers_emp = {"Authorization": f"Bearer {token_empresa}"}
        print(f"  ✓ Empresa radicada (Pendiente): {emp_data['razon_social']} (ID: {id_empresa})")

        # ----------------------------------------------------------------------
        # 3. Test 1: Subsanación rechazada cuando el estado NO es 'en_subsanacion'
        # ----------------------------------------------------------------------
        print("\n[TEST 1] Intento de subsanación en estado 'pendiente' (Debe ser rechazado con 400)...")
        sub_fail = await client.post(
            "/api/v1/empresas/subsanar-documento",
            headers=headers_emp,
            json={
                "tipo_documento": "camara_comercio",
                "nombre_archivo": "Camara_Intento_Fallido.pdf",
                "archivo_base64_o_url": "JVBERi0xLjQKMSAwIG9ia...",
                "observaciones": "Intento prematuro"
            }
        )
        assert sub_fail.status_code == 400, f"Esperado 400, obtenido: {sub_fail.status_code} ({sub_fail.text})"
        fail_json = sub_fail.json()
        assert fail_json["detail"]["codigo"] == "ESTADO_NO_SUBSANABLE"
        print(f"  ✓ REGLA CUMPLIDA: Bloqueado 400 por no estar en subsanación: {fail_json['detail']['mensaje']}")

        # ----------------------------------------------------------------------
        # 4. Test 2: Super Admin solicita subsanación de 2 documentos
        # ----------------------------------------------------------------------
        print(f"\n[TEST 2] Super Admin solicita subsanación formal de 'camara_comercio' y 'rut'...")
        req_sub = await client.post(
            f"/api/v1/admin/empresas/{id_empresa}/solicitar-subsanacion",
            headers=headers_admin,
            json={
                "motivo": "Cámara de comercio con más de 30 días de expedición y RUT borroso en la página 2.",
                "documentos_requeridos": ["camara_comercio", "rut"]
            }
        )
        assert req_sub.status_code == 200, f"Error {req_sub.text}"
        print(f"  ✓ Solicitud radicada: {req_sub.json()['mensaje']}")

        # Verificar estado de cuarentena desde el portal de la empresa
        q_res = await client.get("/api/v1/empresas/estado-cuarentena", headers=headers_emp)
        assert q_res.status_code == 200
        q_data = q_res.json()
        assert q_data["estado"] == "en_subsanacion"
        assert q_data["puede_subsanar"] is True
        assert q_data["tiempo_sla_horas"] == 0  # Reloj pausado durante subsanación
        assert "30 días" in q_data["motivo_subsanacion"]
        print(f"  ✓ Estado verificado: {q_data['estado']} | Puede subsanar: {q_data['puede_subsanar']} | SLA pausado: {q_data['tiempo_sla_horas']}h")

        # ----------------------------------------------------------------------
        # 5. Test 3: Intento de subsanar documento no observado ('cedula_rep_legal')
        # ----------------------------------------------------------------------
        print("\n[TEST 3] Intento de subsanar 'cedula_rep_legal' que NO fue observada...")
        sub_no_obs = await client.post(
            "/api/v1/empresas/subsanar-documento",
            headers=headers_emp,
            json={
                "tipo_documento": "cedula_rep_legal",
                "nombre_archivo": "Cedula_No_Observada.pdf",
                "archivo_base64_o_url": "JVBERi0xLjQKMSAwIG9ia...",
                "observaciones": "Intento de cambiar cédula válida"
            }
        )
        assert sub_no_obs.status_code == 400, f"Esperado 400, obtenido {sub_no_obs.status_code}"
        assert sub_no_obs.json()["detail"]["codigo"] == "DOCUMENTO_NO_OBSERVADO"
        print(f"  ✓ REGLA CUMPLIDA: Bloqueado 400 al intentar subsanar documento no observado: {sub_no_obs.json()['detail']['mensaje']}")

        # ----------------------------------------------------------------------
        # 6. Test 4: Subsanación Parcial del primer documento ('camara_comercio')
        # ----------------------------------------------------------------------
        print("\n[TEST 4] Subsanación del 1er documento ('camara_comercio') vía JSON...")
        sub_doc1 = await client.post(
            "/api/v1/empresas/subsanar-documento",
            headers=headers_emp,
            json={
                "tipo_documento": "camara_comercio",
                "nombre_archivo": "Camara_Comercio_Vigente_2026.pdf",
                "archivo_base64_o_url": "JVBERi0xLjQKMSAwIG9iai...",
                "observaciones": "Expedida hace 2 días con firma digital de Cámara de Comercio"
            }
        )
        assert sub_doc1.status_code == 200, f"Error {sub_doc1.text}"
        doc1_data = sub_doc1.json()
        assert doc1_data["nuevo_estado"] == "en_subsanacion"
        assert doc1_data["documentos_pendientes_subsanacion"] == 1  # Todavía falta el RUT
        assert doc1_data["reloj_sla_reiniciado"] is False
        assert f"empresas/{id_empresa}/camara_comercio.pdf" in doc1_data["url"]
        print(f"  ✓ Higiene de Storage: Ruta fija respetada -> {doc1_data['url']}")
        print(f"  ✓ Empresa sigue en 'en_subsanacion' porque resta 1 documento.")

        # ----------------------------------------------------------------------
        # 7. Test 5: Subsanación Total con Multipart Form ('rut') -> Reinicio SLA 72h
        # ----------------------------------------------------------------------
        print("\n[TEST 5] Subsanación del 2do documento ('rut') vía Multipart Form...")
        pdf_rut_corregido = create_mock_pdf_stream("RUT Corregido en Alta Resolucion")
        sub_doc2 = await client.post(
            "/api/v1/empresas/subsanar-documento-form",
            headers=headers_emp,
            data={
                "tipo_documento": "rut",
                "observaciones": "RUT escaneado a 300 DPI con página 2 legible"
            },
            files=[
                ("archivo_pdf", ("RUT_Corregido_2026.pdf", pdf_rut_corregido.getvalue(), "application/pdf"))
            ]
        )
        assert sub_doc2.status_code == 200, f"Error {sub_doc2.text}"
        doc2_data = sub_doc2.json()
        assert doc2_data["nuevo_estado"] == "pendiente"
        assert doc2_data["documentos_pendientes_subsanacion"] == 0
        assert doc2_data["reloj_sla_reiniciado"] is True
        assert doc2_data["sla_horas_restantes"] == 72
        assert f"empresas/{id_empresa}/rut.pdf" in doc2_data["url"]
        print(f"  ✓ Higiene de Storage: Ruta fija respetada -> {doc2_data['url']}")
        print(f"  ✓ REGLA CUMPLIDA: Todas las subsanaciones completadas.")
        print(f"  ✓ Estado cambió a: '{doc2_data['nuevo_estado']}' y Reloj SLA reiniciado a: {doc2_data['sla_horas_restantes']} horas.")

        # Verificar estado de cuarentena después de completar subsanación
        q_after = await client.get("/api/v1/empresas/estado-cuarentena", headers=headers_emp)
        assert q_after.json()["estado"] == "pendiente"
        assert q_after.json()["puede_subsanar"] is False
        assert q_after.json()["tiempo_sla_horas"] >= 71
        print(f"  ✓ Cuarentena actualizada: Estado 'pendiente' | SLA activo: {q_after.json()['tiempo_sla_horas']}h | Puede subsanar: {q_after.json()['puede_subsanar']}")

        # ----------------------------------------------------------------------
        # 8. Test 6: Re-intento bloqueado (Ya está en pendiente)
        # ----------------------------------------------------------------------
        print("\n[TEST 6] Verificando bloqueo de subsanación tras haber reingresado a 'pendiente'...")
        sub_post_lock = await client.post(
            "/api/v1/empresas/subsanar-documento",
            headers=headers_emp,
            json={
                "tipo_documento": "rut",
                "nombre_archivo": "RUT_Otra_Vez.pdf",
                "archivo_base64_o_url": "JVBERi0xLjQKMSAwIG9ia..."
            }
        )
        assert sub_post_lock.status_code == 400
        assert sub_post_lock.json()["detail"]["codigo"] == "ESTADO_NO_SUBSANABLE"
        print(f"  ✓ REGLA CUMPLIDA: Candado activo. No se puede modificar sin requerimiento de Super Admin.")

        # ----------------------------------------------------------------------
        # 9. Test 7: Paginación Obligatoria en Bandeja Super Admin de Empresas
        # ----------------------------------------------------------------------
        print("\n[TEST 7] Verificando Paginación en GET /api/v1/admin/auditoria/empresas...")
        page1_res = await client.get("/api/v1/admin/auditoria/empresas?page=1&limit=2", headers=headers_admin)
        assert page1_res.status_code == 200, f"Error {page1_res.text}"
        p1_data = page1_res.json()

        assert "items" in p1_data, "Respuesta debe incluir envelope 'items'"
        assert "total" in p1_data, "Respuesta debe incluir 'total'"
        assert "page" in p1_data and p1_data["page"] == 1
        assert "limit" in p1_data and p1_data["limit"] == 2
        assert "total_pages" in p1_data
        assert len(p1_data["items"]) <= 2
        print(f"  ✓ Paginación Página 1: {len(p1_data['items'])} items | Total registros: {p1_data['total']} | Páginas: {p1_data['total_pages']}")

        if p1_data["total_pages"] > 1:
            page2_res = await client.get("/api/v1/admin/auditoria/empresas?page=2&limit=2", headers=headers_admin)
            assert page2_res.status_code == 200
            p2_data = page2_res.json()
            assert p2_data["page"] == 2
            print(f"  ✓ Paginación Página 2 consultada exitosamente ({len(p2_data['items'])} items)")

        # ----------------------------------------------------------------------
        # 10. Test 8: Paginación Obligatoria en Bandeja Super Admin de IES
        # ----------------------------------------------------------------------
        print("\n[TEST 8] Verificando Paginación en GET /api/v1/admin/auditoria/ies...")
        ies_page_res = await client.get("/api/v1/admin/auditoria/ies?page=1&limit=5", headers=headers_admin)
        assert ies_page_res.status_code == 200
        ies_p_data = ies_page_res.json()
        assert "items" in ies_p_data
        assert "total" in ies_p_data
        assert ies_p_data["page"] == 1
        assert ies_p_data["limit"] == 5
        print(f"  ✓ Bandeja IES paginada: {len(ies_p_data['items'])} items | Total IES: {ies_p_data['total']} | Páginas: {ies_p_data['total_pages']}")

        # ----------------------------------------------------------------------
        # 11. Test 9: Flujo de Subsanación Estricto para IES
        # ----------------------------------------------------------------------
        print("\n[TEST 9] Validando Flujo de Subsanación Institucional en IES...")
        uid_ies = uuid.uuid4().hex[:6]
        pdf_res_men = create_mock_pdf_stream("Resolucion MEN Original")
        pdf_rut_inst = create_mock_pdf_stream("RUT Institucional Original")

        reg_ies = await client.post(
            "/api/v1/auth/registro-institucion-form",
            data={
                "nombre_institucion": f"Universidad Metropolitana de Santander {uid_ies}",
                "sigla": f"UNISANTANDER {uid_ies}",
                "codigo_snies": f"SNIES-{uid_ies}",
                "nit": f"890{uid_ies}-3",
                "caracter_academico": "Universidad",
                "departamento": "Santander",
                "ciudad": "Bucaramanga",
                "direccion": "Calle 16 # 22-40",
                "telefono": "6076348899",
                "correo_institucional": f"rectoria.{uid_ies}@unisantander.edu.co",
                "password": "IesPass2026*!",
                "nombre_rector": "Dra. Helena Barajas",
                "documento_rector": "63219876",
                "nombre_contacto_asesor": "Dr. Jorge Mendoza",
                "cargo_asesor": "Coordinador de Egresados"
            },
            files=[
                ("resolucion_men_pdf", ("resolucion_men.pdf", pdf_res_men.getvalue(), "application/pdf")),
                ("rut_pdf", ("rut_inst.pdf", pdf_rut_inst.getvalue(), "application/pdf")),
            ]
        )
        assert reg_ies.status_code == 200, f"Error {reg_ies.text}"
        ies_info = reg_ies.json()
        id_ies = ies_info["id_institucion"]

        # Iniciar sesión con la IES registrada para obtener su JWT
        login_ies = await client.post(
            "/api/v1/auth/login",
            json={"correo": f"rectoria.{uid_ies}@unisantander.edu.co", "password": "IesPass2026*!"}
        )
        assert login_ies.status_code == 200, f"Error al iniciar sesión con IES: {login_ies.text}"
        token_ies = login_ies.json()["access_token"]
        headers_ies = {"Authorization": f"Bearer {token_ies}"}

        # Subsanación rechazada en 'pendiente' para IES
        sub_ies_fail = await client.post(
            "/api/v1/instituciones/subsanar-documento",
            headers=headers_ies,
            json={
                "tipo_documento": "resolucion_men",
                "nombre_archivo": "Res_MEN_Fail.pdf",
                "archivo_base64_o_url": "JVBERi0xLjQKMSAwIG9ia..."
            }
        )
        assert sub_ies_fail.status_code == 400
        assert sub_ies_fail.json()["detail"]["codigo"] == "ESTADO_NO_SUBSANABLE"
        print(f"  ✓ IES protegida contra subsanación anticipada (400 ESTADO_NO_SUBSANABLE)")

        # Super Admin solicita subsanación a la IES
        req_sub_ies = await client.post(
            f"/api/v1/admin/ies/{id_ies}/solicitar-subsanacion",
            headers=headers_admin,
            json={
                "motivo": "Falta el sello digital de la resolución del MEN.",
                "documentos_requeridos": ["resolucion_men"]
            }
        )
        assert req_sub_ies.status_code == 200
        print(f"  ✓ Super Admin colocó a la IES en 'en_subsanacion'")

        # IES subsana el documento con Multipart Form
        pdf_res_men_corr = create_mock_pdf_stream("Resolucion MEN Con Sello Digital")
        sub_ies_ok = await client.post(
            "/api/v1/instituciones/subsanar-documento-form",
            headers=headers_ies,
            data={
                "tipo_documento": "resolucion_men",
                "observaciones": "Resolución ministerial adjuntada con código QR de verificación de autenticidad"
            },
            files=[
                ("archivo_pdf", ("Resolucion_MEN_Oficial.pdf", pdf_res_men_corr.getvalue(), "application/pdf"))
            ]
        )
        assert sub_ies_ok.status_code == 200, f"Error {sub_ies_ok.text}"
        ies_ok_data = sub_ies_ok.json()
        assert ies_ok_data["nuevo_estado"] == "pendiente"
        assert ies_ok_data["reloj_sla_reiniciado"] is True
        assert ies_ok_data["sla_horas_restantes"] == 72
        assert f"instituciones/{id_ies}/resolucion_men.pdf" in ies_ok_data["url"]
        print(f"  ✓ IES completó subsanación. Almacenamiento determinista: {ies_ok_data['url']}")
        print(f"  ✓ IES reingresada a 'pendiente' y SLA 72h reiniciado formalmente.")

    print("\n" + "=" * 80)
    print(" 🎉 TODAS LAS PRUEBAS DE LA FASE 2 - PASO 2 PASARON AL 100% DE FORMA EXITOSA")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    asyncio.run(test_fase2_paso2_subsanacion())
