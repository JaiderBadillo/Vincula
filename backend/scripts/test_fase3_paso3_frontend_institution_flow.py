"""
Test Suite de Verificación de la Fase 3 - Paso 3:
Integración y Conexión Frontend de la IES (Gestión Académica, Bandeja de Diplomas y Visor Seguro Supabase).

Valida el contrato y flujo consumido por:
- institutionService.js
- InstitutionAdminProgramsPage.jsx & useInstitutionPrograms
- InstitutionGraduateValidationPage.jsx
- StudentValidationDrawer.jsx (Visor Seguro y Formulario de Sello Digital)
- StudentObservationModal.jsx (Motivo y Notas de Corrección)
"""

import sys
import os
import io
import time
import uuid
import asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.core.database import AsyncSessionLocal
from app.core.security import get_password_hash
from app.modules.iam.models import Usuario
from app.modules.institutions.models import Institucion, SedeInstitucion, Facultad, ProgramaAcademico
from app.modules.graduates.models import Egresado, AcademicoEgresado


def create_mock_pdf_stream(title: str) -> io.BytesIO:
    content = f"%PDF-1.4\n1 0 obj\n<< /Title ({title}) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF".encode("utf-8")
    buf = io.BytesIO(content)
    buf.name = f"{title.lower().replace(' ', '_')}.pdf"
    return buf


async def test_fase3_paso3_frontend_institution_flow():
    print("\n" + "=" * 80)
    print(" 🎨 EJECUTANDO PRUEBAS FASE 3 - PASO 3: INTEGRACIÓN FRONTEND IES & SERVICIOS REST")
    print("=" * 80)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:

        # ----------------------------------------------------------------------
        # 1. Autenticación SuperAdmin e Incorporación de IES Aprobada
        # ----------------------------------------------------------------------
        print("\n[TEST 1] Autenticando SuperAdmin y creando IES oficial...")
        login_admin = await client.post(
            "/api/v1/auth/login",
            json={"correo": "admin@vincula.com.co", "password": "Admin123*"}
        )
        assert login_admin.status_code == 200
        super_token = login_admin.json()["access_token"]
        headers_super = {"Authorization": f"Bearer {super_token}"}

        uid = uuid.uuid4().hex[:6]
        email_ies = f"rectoria.{uid}@utstest.edu.co"
        pass_ies = "IesSegura2026*!"

        pdf_men = create_mock_pdf_stream(f"Resolucion MEN {uid}")
        pdf_rut = create_mock_pdf_stream(f"RUT IES {uid}")

        reg_ies = await client.post(
            "/api/v1/auth/registro-institucion-form",
            data={
                "nombre_institucion": f"Unidades Tecnológicas de Santander {uid}",
                "sigla": f"UTS-{uid.upper()}",
                "codigo_snies": f"9{uid[:4]}",
                "nit": f"900{uid[:5]}-1",
                "caracter_academico": "Institución Tecnológica",
                "origen_institucional": "Pública",
                "correo_institucional": email_ies,
                "password": pass_ies,
                "telefono": "(607) 6917700",
                "direccion": "Calle de los Estudiantes # 9-82 Ciudadela Real de Minas",
                "ciudad": "Bucaramanga",
                "departamento": "Santander",
                "sitio_web": f"https://www.uts{uid}.edu.co",
                "nombre_rector": "Dr. Omar Lengerke Pérez",
                "documento_rector": f"91{uid[:6]}",
                "nombre_contacto_asesor": "Dra. Camila Morales",
                "cargo_asesor": "Directora de Graduados"
            },
            files=[
                ("resolucion_men_pdf", ("resolucion_men.pdf", pdf_men.getvalue(), "application/pdf")),
                ("rut_pdf", ("rut_institucional.pdf", pdf_rut.getvalue(), "application/pdf")),
            ]
        )
        assert reg_ies.status_code == 200, f"Error registro IES: {reg_ies.text}"
        id_ies = reg_ies.json()["id_institucion"]

        # SuperAdmin aprueba la IES
        app_res = await client.post(
            f"/api/v1/admin/ies/{id_ies}/aprobar",
            headers=headers_super,
            json={"notas": "IES verificada formalmente ante el SNIES y MEN."}
        )
        assert app_res.status_code == 200

        # Login como IES
        login_ies = await client.post(
            "/api/v1/auth/login",
            json={"correo": email_ies, "password": pass_ies}
        )
        assert login_ies.status_code == 200
        token_ies = login_ies.json()["access_token"]
        headers_ies = {"Authorization": f"Bearer {token_ies}"}

        print(f"  ✓ IES autenticada: UTS {uid} (ID: {id_ies}).")

        # ----------------------------------------------------------------------
        # 2. Flujo institutionService: Sedes y Facultades
        # ----------------------------------------------------------------------
        print("\n[TEST 2] Verificando endpoints consumidos por CampusModal y FacultyModal...")
        # Crear sede principal
        res_sede = await client.post(
            "/api/v1/instituciones/sedes",
            headers=headers_ies,
            json={
                "nombre": "Sede Principal Real de Minas",
                "nombre_corto": "Campus Central",
                "ciudad": "Bucaramanga",
                "departamento": "Santander",
                "direccion": "Calle de los Estudiantes # 9-82",
                "es_sede_principal": True
            }
        )
        assert res_sede.status_code == 201
        sede_id = res_sede.json()["id"]

        # Listar sedes
        list_sedes = await client.get("/api/v1/instituciones/sedes", headers=headers_ies)
        assert list_sedes.status_code == 200
        assert len(list_sedes.json()) >= 1
        print("  ✓ Sedes institucionales operativas en institutionService.getSedes().")

        # Crear facultad
        res_fac = await client.post(
            "/api/v1/instituciones/facultades",
            headers=headers_ies,
            json={
                "codigo": f"FCNEI-{uid[:4]}",
                "sigla": "FCNEI",
                "nombre": "Facultad de Ciencias Naturales e Ingenierías",
                "color_distintivo": "#00A86B"
            }
        )
        assert res_fac.status_code == 201
        fac_id = res_fac.json()["id"]

        # Listar facultades
        list_fac = await client.get("/api/v1/instituciones/facultades", headers=headers_ies)
        assert list_fac.status_code == 200
        assert len(list_fac.json()) >= 1
        print("  ✓ Facultades operativas en institutionService.getFacultades().")

        # ----------------------------------------------------------------------
        # 3. Flujo institutionService: Programas Académicos y Bloqueo de SNIES
        # ----------------------------------------------------------------------
        print("\n[TEST 3] Verificando creación de programas y manejo pedagógico de SNIES duplicado...")
        snies_cod = f"10{uid[:4]}"
        res_prog = await client.post(
            "/api/v1/instituciones/programas",
            headers=headers_ies,
            json={
                "id_facultad": fac_id,
                "id_sede": sede_id,
                "codigo_interno": f"PR-SIS-{uid[:4]}",
                "codigo_snies": snies_cod,
                "nombre": "Ingeniería de Sistemas",
                "nivel_formacion": "Profesional Universitario",
                "modalidad": "Presencial",
                "duracion_semestres": 10,
                "total_creditos": 160,
                "nombre_director": "Ing. Carlos Mendoza"
            }
        )
        assert res_prog.status_code == 201
        prog_id = res_prog.json()["id"]
        print(f"  ✓ Programa creado con código SNIES '{snies_cod}'.")

        # Intentar registrar el mismo SNIES -> debe retornar error pedagógico CODIGO_SNIES_DUPLICADO
        dup_snies = await client.post(
            "/api/v1/instituciones/programas",
            headers=headers_ies,
            json={
                "id_facultad": fac_id,
                "id_sede": sede_id,
                "codigo_interno": f"PR-SIS-DUP",
                "codigo_snies": snies_cod,
                "nombre": "Ingeniería de Sistemas Modalidad Virtual",
                "nivel_formacion": "Profesional Universitario",
                "modalidad": "Virtual",
                "duracion_semestres": 10,
                "total_creditos": 160
            }
        )
        assert dup_snies.status_code == 400
        det_dup = dup_snies.json()["detail"]
        assert det_dup["codigo"] == "CODIGO_SNIES_DUPLICADO"
        assert "motivo" in det_dup
        assert "accion_sugerida" in det_dup
        print(f"  ✓ Error pedagógico capturado por el frontend: '{det_dup['titulo']}' (SNIES duplicado).")

        # ----------------------------------------------------------------------
        # 4. Sembrado de Egresados y Consulta de Bandeja (RNF-02 < 3s)
        # ----------------------------------------------------------------------
        print("\n[TEST 4] Sembrando egresados con diplomas para la bandeja de validación...")
        doc_egr1 = f"1098{uid[:6]}"
        doc_egr2 = f"1095{uid[:6]}"
        id_acad1 = None
        id_acad2 = None

        async with AsyncSessionLocal() as session:
            pwd_hash = get_password_hash("Egresado2026*!")
            u1 = Usuario(
                correo_electronico=f"egresado.uts1.{uid}@correo.uts.edu.co",
                contrasena_hash=pwd_hash,
                rol="egresado",
                estado="activo"
            )
            u2 = Usuario(
                correo_electronico=f"egresado.uts2.{uid}@correo.uts.edu.co",
                contrasena_hash=pwd_hash,
                rol="egresado",
                estado="activo"
            )
            session.add_all([u1, u2])
            await session.flush()

            e1 = Egresado(
                id_usuario=u1.id,
                tipo_documento="CC",
                numero_documento=doc_egr1,
                codigo_estudiantil=f"2021102901",
                nombre_completo=f"Brayan Alexis Carreño Suárez {uid}",
                ciudad_residencia="Bucaramanga",
                departamento_residencia="Santander",
                telefono="3184501290",
                correo_personal=u1.correo_electronico,
                titular_profesional="Ingeniero de Software",
                estado="pendiente"
            )
            e2 = Egresado(
                id_usuario=u2.id,
                tipo_documento="CC",
                numero_documento=doc_egr2,
                codigo_estudiantil=f"2020201844",
                nombre_completo=f"Silvia Natalia Duarte Prada {uid}",
                ciudad_residencia="Floridablanca",
                departamento_residencia="Santander",
                telefono="3158904421",
                correo_personal=u2.correo_electronico,
                titular_profesional="Desarrolladora Web",
                estado="pendiente"
            )
            session.add_all([e1, e2])
            await session.flush()

            acad1 = AcademicoEgresado(
                id_egresado=e1.id,
                id_institucion=uuid.UUID(id_ies),
                id_programa=uuid.UUID(prog_id),
                id_sede=uuid.UUID(sede_id),
                nivel_formacion="Profesional Universitario",
                ano_graduacion=2025,
                periodo_graduacion="2025-II",
                promedio_ponderado=4.65,
                proyecto_grado="Plataforma de Intermediación Laboral UTS",
                estado_academico="recien-egresado",
                estado_laboral="buscando",
                validado_por_ies=False,
                url_diploma_pdf=f"https://vincula.supabase.co/storage/v1/object/public/vincula-diplomas-validados/diplomas/{e1.id}/Diploma_Grado_UTS.pdf",
                estado_verificacion="pendiente"
            )
            acad2 = AcademicoEgresado(
                id_egresado=e2.id,
                id_institucion=uuid.UUID(id_ies),
                id_programa=uuid.UUID(prog_id),
                id_sede=uuid.UUID(sede_id),
                nivel_formacion="Profesional Universitario",
                ano_graduacion=2024,
                periodo_graduacion="2024-I",
                promedio_ponderado=4.40,
                proyecto_grado="Sistema de Información para Gestión de Pasantías",
                estado_academico="recien-egresado",
                estado_laboral="buscando",
                validado_por_ies=False,
                url_diploma_pdf=f"https://vincula.supabase.co/storage/v1/object/public/vincula-diplomas-validados/diplomas/{e2.id}/Diploma_Silvia_Duarte.pdf",
                estado_verificacion="pendiente"
            )
            session.add_all([acad1, acad2])
            await session.commit()
            id_acad1 = str(acad1.id)
            id_acad2 = str(acad2.id)

        print(f"  ✓ Egresados radicados en base de datos: {id_acad1} y {id_acad2}.")

        # Consultar bandeja desde el frontend (institutionService.getPendingGraduates)
        t0 = time.time()
        bandeja = await client.get(
            "/api/v1/instituciones/egresados/pendientes",
            headers=headers_ies,
            params={"page": 1, "limit": 20, "estado": "todos"}
        )
        t_resp = time.time() - t0
        assert bandeja.status_code == 200
        data_b = bandeja.json()
        assert data_b["total"] >= 2
        assert data_b["resumen_estados"]["pendientes"] >= 2
        assert t_resp < 3.0, f"RNF-02: {t_resp}s >= 3.0s"
        print(f"  ✓ Bandeja cargada en {t_resp:.3f}s (< 3.0s RNF-02). Conteos: {data_b['resumen_estados']}.")

        # ----------------------------------------------------------------------
        # 5. Visor Seguro de Diploma (StudentValidationDrawer.jsx)
        # ----------------------------------------------------------------------
        print("\n[TEST 5] Probando visor seguro de PDF (institutionService.getDiplomaSecureUrl)...")
        sec_url_res = await client.get(
            f"/api/v1/instituciones/egresados/{id_acad1}/diploma-secure-url",
            headers=headers_ies,
            params={"expires_in": 3600}
        )
        assert sec_url_res.status_code == 200
        url_payload = sec_url_res.json()
        assert "url_segura" in url_payload
        assert url_payload["expira_en_segundos"] == 3600
        assert "Diploma_Grado_UTS.pdf" in url_payload["nombre_archivo"]
        print(f"  ✓ URL temporal generada para visor iframe: {url_payload['url_segura'][:60]}...")

        # ----------------------------------------------------------------------
        # 6. Aprobación con Sello Digital (StudentValidationDrawer -> onApprove)
        # ----------------------------------------------------------------------
        print("\n[TEST 6] Aprobando diploma y expidiendo Sello Digital Criptográfico SHA-256...")
        acta_oficial = f"ACTA-UTS-2026-4892"
        folio_oficial = "Libro 48, Folio 112"
        fecha_grado = "2025-12-15"

        aprob_res = await client.post(
            f"/api/v1/instituciones/egresados/{id_acad1}/validar-diploma",
            headers=headers_ies,
            json={
                "numero_acta_grado": acta_oficial,
                "numero_libro_folio": folio_oficial,
                "fecha_grado": fecha_grado,
                "observaciones": "Graduado con honores en Ingeniería de Sistemas UTS."
            }
        )
        assert aprob_res.status_code == 200
        sello_data = aprob_res.json()
        assert sello_data["success"] is True
        assert sello_data["estado_verificacion"] == "aprobado"
        assert sello_data["numero_acta_grado"] == acta_oficial
        assert len(sello_data["sello_digital"]) == 64
        print(f"  ✓ Sello Digital Oficial expedido: {sello_data['sello_digital']}")
        print(f"  ✓ Acta: {sello_data['numero_acta_grado']} | Folio: {sello_data['numero_libro_folio']} | SNIES: {sello_data['codigo_snies']}")

        # ----------------------------------------------------------------------
        # 7. Rechazo / Observación Formal (StudentObservationModal -> onConfirm)
        # ----------------------------------------------------------------------
        print("\n[TEST 7] Enviando observación documental formal...")
        motivo_rechazo = "Documento ilegible: El acta adjunta carece del sello de Secretaría General y número de folio."
        obs_res = await client.post(
            f"/api/v1/instituciones/egresados/{id_acad2}/rechazar-diploma",
            headers=headers_ies,
            json={"motivo_rechazo": motivo_rechazo}
        )
        assert obs_res.status_code == 200
        rej_data = obs_res.json()
        assert rej_data["success"] is True
        assert rej_data["estado_verificacion"] == "rechazado"
        assert rej_data["motivo_rechazo"] == motivo_rechazo
        print(f"  ✓ Observación registrada exitosamente con estado 'rechazado'.")

        # ----------------------------------------------------------------------
        # 8. Verificación de Pestañas y Filtros Actualizados
        # ----------------------------------------------------------------------
        print("\n[TEST 8] Verificando actualización de conteos en pestañas del frontend...")
        bandeja_act = await client.get(
            "/api/v1/instituciones/egresados/pendientes",
            headers=headers_ies
        )
        resumen_final = bandeja_act.json()["resumen_estados"]
        assert resumen_final["aprobados"] >= 1
        assert resumen_final["rechazados"] >= 1
        print(f"  ✓ Métricas sincronizadas: {resumen_final}")

    print("\n" + "=" * 80)
    print(" 🎉 TODAS LAS PRUEBAS DE LA FASE 3 - PASO 3 COMPLETADAS CON ÉXITO (100% VERDE)")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    asyncio.run(test_fase3_paso3_frontend_institution_flow())

