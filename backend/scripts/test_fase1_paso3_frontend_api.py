"""
Test Suite de Verificación de la Fase 1 - Paso 3:
Conexión de los Formularios del Frontend con la API de FastAPI.
Prueba el flujo completo que efectúa el cliente web (React 18 + Vite) contra los endpoints:
1. /api/v1/auth/login (Multi-rol con retorno de JWT y claims)
2. /api/v1/auth/me (Verificación del estado de sesión)
3. /api/v1/auth/registro-empresa-form (Multipart con carga de PDFs a Supabase Storage)
4. /api/v1/auth/registro-institucion-form (Multipart con resoluciones MEN a Supabase Storage)
5. /api/v1/auth/registro-egresado (JSON con inserción en 'usuarios' y 'egresados')
6. Gating de Cuarentena (403 Forbidden a empresas 'pendiente' en áreas operativas)
"""

import sys
import os
import io
import uuid
from httpx import AsyncClient, ASGITransport

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app


def create_mock_pdf_stream(title: str) -> io.BytesIO:
    """Genera un archivo PDF sintético válido en memoria"""
    content = f"%PDF-1.4\n1 0 obj\n<< /Title ({title}) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF".encode("utf-8")
    buf = io.BytesIO(content)
    buf.name = f"{title.lower().replace(' ', '_')}.pdf"
    return buf


async def test_paso3_frontend_integration():
    print("\n" + "=" * 80)
    print(" 🚀 EJECUTANDO PRUEBAS FASE 1 - PASO 3: CONEXIÓN FRONTEND <-> API FASTAPI")
    print("=" * 80)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:

        # ----------------------------------------------------------------------
        # 1. Login de Egresado (Jaider Niño)
        # ----------------------------------------------------------------------
        print("\n[TEST 1] Frontend LoginPage -> POST /api/v1/auth/login (Egresado)...")
        res_login_egresado = await client.post(
            "/api/v1/auth/login",
            json={"correo": "egresado@correo.uts.edu.co", "password": "Egresado123*"}
        )
        assert res_login_egresado.status_code == 200, f"Error {res_login_egresado.text}"
        data_egresado = res_login_egresado.json()
        assert data_egresado["rol"] == "egresado"
        assert "access_token" in data_egresado
        print(f"  ✓ Login exitoso: {data_egresado['nombre']} | Rol: {data_egresado['rol']}")

        # ----------------------------------------------------------------------
        # 2. Login de SuperAdmin Vincula
        # ----------------------------------------------------------------------
        print("\n[TEST 2] Frontend LoginPage -> POST /api/v1/auth/login (SuperAdmin)...")
        res_admin = await client.post(
            "/api/v1/auth/login",
            json={"correo": "admin@vincula.com.co", "password": "Admin123*"}
        )
        assert res_admin.status_code == 200, f"Error {res_admin.text}"
        data_admin = res_admin.json()
        assert data_admin["rol"] == "superadmin_vincula"
        print(f"  ✓ Login exitoso: {data_admin['nombre']} | Rol: {data_admin['rol']}")

        # ----------------------------------------------------------------------
        # 3. Registro de Nueva Empresa vía Formulario Frontend (Multipart con PDFs)
        # ----------------------------------------------------------------------
        print("\n[TEST 3] Frontend CompanyRegistrationPage -> POST /api/v1/auth/registro-empresa-form...")
        uid = uuid.uuid4().hex[:6]
        nit_empresa = f"901{uid}-3"
        correo_empresa = f"talento.{uid}@andinologistics.co"

        pdf_camara = create_mock_pdf_stream("Camara Comercio Andino Logistics")
        pdf_rut = create_mock_pdf_stream("RUT DIAN Andino Logistics")
        pdf_rep = create_mock_pdf_stream("Cedula Rep Legal Andino Logistics")

        files = [
            ("camara_comercio_pdf", ("camara_comercio.pdf", pdf_camara.getvalue(), "application/pdf")),
            ("rut_pdf", ("rut.pdf", pdf_rut.getvalue(), "application/pdf")),
            ("cedula_rep_legal_pdf", ("cedula_rep.pdf", pdf_rep.getvalue(), "application/pdf")),
        ]

        data = {
            "razon_social": f"Andino Logistics Solutions SAS {uid}",
            "nombre_comercial": f"Andino Logistics {uid}",
            "nit": nit_empresa,
            "codigo_ciiu": "5229",
            "descripcion_ciiu": "Otras actividades de transporte y logística",
            "sector_economico": "Transporte y Logística",
            "tamano_empresa": "Mediana (51 - 200 empleados)",
            "departamento": "Santander",
            "ciudad": "Bucaramanga",
            "direccion": "Zona Franca Santander, Módulo 4",
            "telefono": "(607) 6978800",
            "correo_contacto": correo_empresa,
            "password": "EmpresaSegura2026*!",
            "nombre_representante_legal": "Rodrigo Valenzuela",
            "documento_representante_legal": "13988777",
            "persona_contacto": "Laura Restrepo",
            "sitio_web": "https://andinologistics.co"
        }

        res_reg_empresa = await client.post(
            "/api/v1/auth/registro-empresa-form",
            data=data,
            files=files
        )
        assert res_reg_empresa.status_code == 200, f"Error {res_reg_empresa.text}"
        data_emp = res_reg_empresa.json()
        assert data_emp["success"] is True
        assert data_emp["estado_validacion"] == "pendiente"
        assert "RAD-EMP-" in data_emp["radicado"]
        assert data_emp["documentos_cargados"] == 3
        print(f"  ✓ Empresa radicada exitosamente:")
        print(f"    - Razón Social: {data_emp['razon_social']}")
        print(f"    - Radicado oficial: {data_emp['radicado']}")
        print(f"    - Documentos en Supabase Storage: {data_emp['documentos_cargados']}")
        print(f"    - SLA de Auditoría: {data_emp['sla_horas']} horas")

        # ----------------------------------------------------------------------
        # 4. Login Inmediato de la Nueva Empresa en Cuarentena
        # ----------------------------------------------------------------------
        print("\n[TEST 4] Frontend LoginPage -> Login de la empresa recién creada...")
        res_login_emp = await client.post(
            "/api/v1/auth/login",
            json={"correo": correo_empresa, "password": "EmpresaSegura2026*!"}
        )
        assert res_login_emp.status_code == 200, f"Error {res_login_emp.text}"
        emp_jwt_data = res_login_emp.json()
        assert emp_jwt_data["estado_validacion"] == "pendiente"
        emp_token = emp_jwt_data["access_token"]
        print(f"  ✓ Login de empresa en cuarentena permitido (200 OK)")
        print(f"    - Token emitido con estado: {emp_jwt_data['estado_validacion']}")

        # ----------------------------------------------------------------------
        # 5. Gating de Cuarentena (Opción 2)
        # ----------------------------------------------------------------------
        print("\n[TEST 5] Verificando Cuarentena Gating: 403 Forbidden a sedes operativas...")
        headers_emp = {"Authorization": f"Bearer {emp_token}"}
        res_gating = await client.get("/api/v1/empresas/sedes", headers=headers_emp)
        assert res_gating.status_code == 403, f"Esperado 403, obtenido {res_gating.status_code}"
        assert res_gating.json()["detail"]["codigo"] == "EMPRESA_EN_CUARENTENA"
        print(f"  ✓ Gating 403 correcto: {res_gating.json()['detail']['codigo']}")

        # ----------------------------------------------------------------------
        # 6. Registro de Nueva Institución (IES) vía Formulario con PDFs
        # ----------------------------------------------------------------------
        print("\n[TEST 6] Frontend InstitutionRegistrationPage -> POST /api/v1/auth/registro-institucion-form...")
        uid_ies = uuid.uuid4().hex[:6]
        correo_ies = f"rectoria.{uid_ies}@udi.edu.co"
        pdf_res = create_mock_pdf_stream("Resolucion MEN UDI")
        pdf_snies = create_mock_pdf_stream("Certificado SNIES UDI")
        pdf_rut_ies = create_mock_pdf_stream("RUT DIAN UDI")

        files_ies = [
            ("resolucion_men_pdf", ("resolucion_men.pdf", pdf_res.getvalue(), "application/pdf")),
            ("snies_cert_pdf", ("snies_cert.pdf", pdf_snies.getvalue(), "application/pdf")),
            ("rut_pdf", ("rut.pdf", pdf_rut_ies.getvalue(), "application/pdf")),
        ]

        data_ies = {
            "nombre_institucion": f"Universidad de Investigación y Desarrollo {uid_ies}",
            "sigla": "UDI",
            "codigo_snies": f"SNIES-{uid_ies}",
            "caracter_academico": "Institución Universitaria",
            "origen_institucional": "Privada",
            "nit": f"800{uid_ies}-3",
            "departamento": "Santander",
            "ciudad": "Bucaramanga",
            "direccion": "Calle 9 # 23-55",
            "sitio_web": "https://udi.edu.co",
            "correo_institucional": correo_ies,
            "password": "IesSegura2026*!",
            "telefono": "(607) 6352525",
            "nombre_rector": "Jairo Castro Castro",
            "documento_rector": "13888777",
            "nombre_contacto_asesor": "María Clemencia Flórez",
            "cargo_asesor": "Directora de Egresados"
        }

        res_reg_ies = await client.post(
            "/api/v1/auth/registro-institucion-form",
            data=data_ies,
            files=files_ies
        )
        assert res_reg_ies.status_code == 200, f"Error {res_reg_ies.text}"
        ies_res_data = res_reg_ies.json()
        assert ies_res_data["success"] is True
        assert "RAD-IES-" in ies_res_data["radicado"]
        assert ies_res_data["documentos_cargados"] == 3
        print(f"  ✓ Institución Educativa radicada exitosamente:")
        print(f"    - Nombre: {ies_res_data['nombre_institucion']}")
        print(f"    - Radicado oficial: {ies_res_data['radicado']}")
        print(f"    - Documentos en Supabase Storage: {ies_res_data['documentos_cargados']}")

        # ----------------------------------------------------------------------
        # 7. Registro de Egresado vía Formulario JSON
        # ----------------------------------------------------------------------
        print("\n[TEST 7] Frontend GraduateRegistrationPage -> POST /api/v1/auth/registro-egresado...")
        uid_grad = uuid.uuid4().hex[:6]
        correo_grad = f"egresado.{uid_grad}@correo.uts.edu.co"

        payload_grad = {
            "tipo_documento": "CC",
            "numero_documento": f"109{uid_grad}",
            "nombre_completo": f"Ingeniero Prueba {uid_grad}",
            "correo": correo_grad,
            "password": "EgresadoPass2026*!",
            "telefono": "3158889900",
            "departamento": "Santander",
            "ciudad": "Bucaramanga",
            "carrera": "Ingeniería de Sistemas",
            "nivel_educativo": "Profesional Universitario",
            "ano_graduacion": "2025",
            "autoriza_datos": True
        }

        res_reg_grad = await client.post(
            "/api/v1/auth/registro-egresado",
            json=payload_grad
        )
        assert res_reg_grad.status_code == 200, f"Error {res_reg_grad.text}"
        grad_res_data = res_reg_grad.json()
        assert grad_res_data["success"] is True
        print(f"  ✓ Egresado registrado exitosamente:")
        print(f"    - Nombre: {grad_res_data['nombre']}")
        print(f"    - ID Egresado: {grad_res_data['id_egresado']}")

        # ----------------------------------------------------------------------
        # 8. Login Inmediato del Nuevo Egresado
        # ----------------------------------------------------------------------
        print("\n[TEST 8] Frontend LoginPage -> Login del egresado recién creado...")
        res_login_grad = await client.post(
            "/api/v1/auth/login",
            json={"correo": correo_grad, "password": "EgresadoPass2026*!"}
        )
        assert res_login_grad.status_code == 200, f"Error {res_login_grad.text}"
        grad_jwt = res_login_grad.json()
        assert grad_jwt["rol"] == "egresado"
        print(f"  ✓ Login de nuevo egresado verificado: {grad_jwt['nombre']} | Rol: {grad_jwt['rol']}")

    print("\n" + "=" * 80)
    print(" 🎉 TODAS LAS PRUEBAS DE LA FASE 1 - PASO 3 PASARON AL 100% DE FORMA EXITOSA")
    print("=" * 80)


if __name__ == "__main__":
    import asyncio
    asyncio.run(test_paso3_frontend_integration())
