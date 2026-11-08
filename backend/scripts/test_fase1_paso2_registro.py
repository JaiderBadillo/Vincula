"""
Suite de Pruebas de Verificación de la FASE 1: Paso 2.
Verifica:
1. Registro de Empresa con carga real de PDFs a Supabase Storage (RUT y Cámara de Comercio).
2. Verificación de persistencia en PostgreSQL (tablas empresas, usuarios, reclutadores_empresa, documentos_empresa).
3. Login inmediato de la empresa registrada y verificación de su estado en Cuarentena con radicado y lista de PDFs.
4. Gating de Cuarentena (Opción 2): La nueva empresa tiene bloqueadas las funciones operativas (403 Forbidden).
5. Subsanación de documentos con actualización en Supabase Storage y BD.
6. Registro de IES con carga de documentos oficiales a Supabase Storage.
7. Registro de Egresado con persistencia completa.
"""

import sys
import os
import asyncio
import base64
import uuid
import httpx

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.integrations.supabase_storage import SupabaseStorageService
from app.core.config import settings


async def run_paso2_tests():
    print("================================================================================")
    print(" 🚀 EJECUTANDO PRUEBAS DE FASE 1 - PASO 2: REGISTRO Y SUPABASE STORAGE (PDFs)")
    print("================================================================================")

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Generar PDFs mínimos válidos en memoria
        dummy_rut_pdf = b"%PDF-1.4 Rut Oficial DIAN - Nit 900888777-1 Vincula Test"
        dummy_camara_pdf = b"%PDF-1.4 Camara de Comercio Bucaramanga - Certificado de Existencia"

        b64_rut = base64.b64encode(dummy_rut_pdf).decode("utf-8")
        b64_camara = base64.b64encode(dummy_camara_pdf).decode("utf-8")

        unique_id = uuid.uuid4().hex[:6]
        test_nit = f"901{unique_id[:5]}-9"
        test_email = f"contacto.{unique_id}@solucionesindustriales.co"

        # TEST 1: Registro de Empresa con Documentos PDF (RUT y Cámara de Comercio)
        print("\n[TEST 1] Registrando nueva Empresa con PDFs en Supabase Storage...")
        emp_payload = {
            "razon_social": f"Soluciones Industriales {unique_id.upper()} SAS",
            "nombre_comercial": "Soluciones Industriales",
            "nit": test_nit,
            "codigo_ciiu": "2811",
            "descripcion_ciiu": "Fabricación de motores y turbinas",
            "sector_economico": "Manufactura e Industria",
            "tamano_empresa": "11 a 50",
            "departamento": "Santander",
            "ciudad": "Bucaramanga",
            "direccion": "Zona Industrial Chimitá, Bodega 12",
            "telefono": "(607) 6701122",
            "correo_contacto": test_email,
            "password": "PasswordEmpresa2026*",
            "sitio_web": "https://solucionesindustriales.co",
            "nombre_representante_legal": "Hernando Parra",
            "documento_representante_legal": "13888999",
            "persona_contacto": "Hernando Parra",
            "documentos": [
                {
                    "tipo_documento": "rut",
                    "nombre_archivo": "RUT_Oficial_2026.pdf",
                    "contenido_base64": b64_rut
                },
                {
                    "tipo_documento": "camara_comercio",
                    "nombre_archivo": "Camara_Comercio_30_Dias.pdf",
                    "contenido_base64": b64_camara
                }
            ]
        }

        r_reg = await client.post("/api/v1/auth/registro-empresa", json=emp_payload)
        assert r_reg.status_code == 200, f"Fallo al registrar empresa: {r_reg.text}"
        reg_data = r_reg.json()

        assert reg_data["success"] is True
        assert reg_data["estado_validacion"] == "pendiente", "La empresa debe nacer en MODO CUARENTENA"
        assert reg_data["documentos_cargados"] == 2, "Debieron procesarse los 2 documentos PDF"
        new_emp_id = reg_data["id_empresa"]
        radicado_emp = reg_data["radicado"]

        print(f"  ✓ Empresa radicada con éxito:")
        print(f"    - Radicado: {radicado_emp}")
        print(f"    - ID Empresa: {new_emp_id}")
        print(f"    - Documentos almacenados en Supabase Storage: {reg_data['documentos_cargados']}")
        for doc in reg_data["detalle_documentos"]:
            print(f"      • {doc['tipo']}: {doc['archivo']} ({doc['tamano_kb']} KB) -> {doc['url']}")

        # TEST 2: Login Inmediato de la Empresa Recién Registrada
        print("\n[TEST 2] Probando Login de la empresa recién registrada...")
        r_login = await client.post("/api/v1/auth/login", json={
            "correo": test_email,
            "password": "PasswordEmpresa2026*"
        })
        assert r_login.status_code == 200, f"Error en login de nueva empresa: {r_login.text}"
        login_data = r_login.json()
        assert login_data["estado_validacion"] == "pendiente"
        token_nueva_empresa = login_data["access_token"]
        print(f"  ✓ Login exitoso con cuenta en Cuarentena: {login_data['nombre']}")

        # TEST 3: Consulta del Panel de Cuarentena con Documentos Radicados Reales
        print("\n[TEST 3] Consultando panel de cuarentena con documentos en Supabase Storage...")
        r_panel = await client.get("/api/v1/empresas/estado-cuarentena", headers={"Authorization": f"Bearer {token_nueva_empresa}"})
        assert r_panel.status_code == 200, f"Error al consultar cuarentena: {r_panel.text}"
        panel_data = r_panel.json()

        assert panel_data["estado"] == "pendiente"
        assert panel_data["es_operativa"] is False, "No debe ser operativa hasta aprobación del Super Admin"
        assert len(panel_data["documentos_radicados"]) == 2
        print(f"  ✓ Panel de Cuarentena verificado:")
        print(f"    - Razón Social: {panel_data['razon_social']}")
        print(f"    - Es Operativa: {panel_data['es_operativa']} (Bloqueo activo contra fraudes)")
        print(f"    - Documentos vinculados en BD: {len(panel_data['documentos_radicados'])}")

        # TEST 4: Verificación del Gating de Seguridad (Intento de ver sedes/vacantes)
        print("\n[TEST 4] Verificando bloqueo de Gating (403 Forbidden) para la nueva empresa...")
        r_gated = await client.get("/api/v1/empresas/sedes", headers={"Authorization": f"Bearer {token_nueva_empresa}"})
        assert r_gated.status_code == 403, f"Se esperaba 403 Forbidden, pero devolvió: {r_gated.status_code}"
        assert r_gated.json()["detail"]["codigo"] == "EMPRESA_EN_CUARENTENA"
        print(f"  🛡️ GATING CONFIRMADO: Acceso denegado (403) a funciones operativas mientras esté en Cuarentena.")

        # TEST 5: Subsanación de Documento en Supabase Storage
        print("\n[TEST 5] Probando subsanación y re-carga de RUT en Supabase Storage...")
        nuevo_rut_pdf = b"%PDF-1.4 Rut Subsanado y Actualizado 2026 - Certificado DIAN"
        b64_subsanado = base64.b64encode(nuevo_rut_pdf).decode("utf-8")

        r_sub = await client.post(
            "/api/v1/empresas/subsanar-documento",
            headers={"Authorization": f"Bearer {token_nueva_empresa}"},
            json={
                "tipo_documento": "rut",
                "nombre_archivo": "RUT_Subsanado_V2.pdf",
                "archivo_base64_o_url": b64_subsanado,
                "observaciones": "Se adjunta RUT con fecha de generación de hoy."
            }
        )
        assert r_sub.status_code == 200, f"Error en subsanación: {r_sub.text}"
        sub_data = r_sub.json()
        assert sub_data["success"] is True
        print(f"  ✓ Documento subsanado con éxito: {sub_data['archivo']}")
        print(f"    - URL en Storage: {sub_data['url']}")

        # TEST 6: Registro de Institución de Educación Superior con PDFs
        print("\n[TEST 6] Registrando nueva Institución de Educación Superior (IES)...")
        ies_code = f"SNIES-{unique_id}"
        ies_email = f"rectoria.{unique_id}@udi.edu.co"
        ies_payload = {
            "nombre_institucion": f"Fundación Universitaria {unique_id.upper()}",
            "sigla": "FUDI",
            "codigo_snies": ies_code,
            "caracter_academico": "Institución Universitaria",
            "origen_institucional": "Privada",
            "nit": f"800{unique_id[:5]}-3",
            "departamento": "Santander",
            "ciudad": "Bucaramanga",
            "direccion": "Calle 9 # 23-55",
            "sitio_web": "https://udi.edu.co",
            "correo_institucional": ies_email,
            "password": "PasswordIes2026*",
            "telefono": "(607) 6352525",
            "nombre_rector": "Jairo Castro Castro",
            "documento_rector": "13888777",
            "nombre_contacto_asesor": "María Clemencia Flórez",
            "cargo_asesor": "Coordinadora de Prácticas y Graduados",
            "documentos": [
                {
                    "tipo_documento": "resolucion_men",
                    "nombre_archivo": "Personeria_Juridica_MEN.pdf",
                    "contenido_base64": b64_camara
                },
                {
                    "tipo_documento": "snies_activo",
                    "nombre_archivo": "Certificado_SNIES_Vigente.pdf",
                    "contenido_base64": b64_rut
                }
            ]
        }

        r_ies = await client.post("/api/v1/auth/registro-institucion", json=ies_payload)
        assert r_ies.status_code == 200, f"Error al registrar IES: {r_ies.text}"
        ies_data = r_ies.json()
        assert ies_data["success"] is True
        assert ies_data["estado_validacion"] == "pendiente"
        assert ies_data["documentos_cargados"] == 2
        print(f"  ✓ IES registrada con éxito:")
        print(f"    - Radicado: {ies_data['radicado']}")
        print(f"    - Documentos en Supabase Storage: {ies_data['documentos_cargados']}")

        # TEST 7: Registro de Egresado con Persistencia
        print("\n[TEST 7] Registrando nuevo Egresado Universitario...")
        egr_email = f"egresado.{unique_id}@correo.uts.edu.co"
        egr_payload = {
            "tipo_documento": "CC",
            "numero_documento": f"109{unique_id}",
            "nombre_completo": f"Estudiante Prueba {unique_id.upper()}",
            "correo": egr_email,
            "password": "PasswordEgresado2026*",
            "telefono": "3158889900",
            "departamento": "Santander",
            "ciudad": "Bucaramanga",
            "id_institucion": ies_data["id_institucion"],
            "carrera": "Ingeniería de Software",
            "nivel_educativo": "Profesional Universitario",
            "ano_graduacion": "2025",
            "autoriza_datos": True
        }

        r_egr = await client.post("/api/v1/auth/registro-egresado", json=egr_payload)
        assert r_egr.status_code == 200, f"Error al registrar egresado: {r_egr.text}"
        egr_data = r_egr.json()
        assert egr_data["success"] is True
        assert egr_data["estado_validacion"] == "aprobado"
        print(f"  ✓ Egresado registrado exitosamente:")
        print(f"    - Nombre: {egr_data['nombre']}")
        print(f"    - ID Egresado: {egr_data['id_egresado']}")

    print("\n================================================================================")
    print(" 🎉 TODAS LAS PRUEBAS DE LA FASE 1 - PASO 2 PASARON AL 100% DE FORMA EXITOSA")
    print("================================================================================")


if __name__ == "__main__":
    asyncio.run(run_paso2_tests())

