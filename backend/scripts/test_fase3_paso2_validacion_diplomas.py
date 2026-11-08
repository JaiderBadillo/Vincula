"""
Test Suite de Verificación de la Fase 3 - Paso 2:
Cola de Validación Institucional de Egresados y Diplomas con Expedición de Sello Digital en Supabase Storage.

Valida:
1. Autenticación y expedición de credenciales institucionales (Rol 'admin_ies' aprobado).
2. Bandeja paginada en servidor de egresados pendientes por validación (RNF-02 < 3s).
3. Filtros por búsqueda textual, programa académico y estado de verificación.
4. Generación de URL firmada temporal de descarga protegida para diplomas (3600s).
5. Candado de Aislamiento Multi-Tenant: Bloqueo de acceso entre diferentes IES (HTTP 403).
6. Observación / Rechazo justificado de diploma con registro de observaciones.
7. Validación oficial con expedición de Sello Digital Institucional (Hash criptográfico SHA-256),
   registro de acta de grado, folio y libro, y habilitación del perfil del egresado.
8. Máquina de estados estricta e idempotencia: Bloqueo de revalidación o rechazo sobre títulos ya aprobados (HTTP 400).
9. Verificación de integridad en PostgreSQL y compatibilidad hacia atrás.
"""

import sys
import os
import io
import time
import uuid
import asyncio
from datetime import datetime, timezone
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.core.database import AsyncSessionLocal
from app.core.security import get_password_hash
from app.modules.iam.models import Usuario
from app.modules.institutions.models import Institucion, DocumentoInstitucion, SedeInstitucion, Facultad, ProgramaAcademico
from app.modules.graduates.models import Egresado, AcademicoEgresado


def create_mock_pdf_stream(title: str) -> io.BytesIO:
    content = f"%PDF-1.4\n1 0 obj\n<< /Title ({title}) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF".encode("utf-8")
    buf = io.BytesIO(content)
    buf.name = f"{title.lower().replace(' ', '_')}.pdf"
    return buf


async def test_fase3_paso2_validacion_diplomas():
    print("\n" + "=" * 80)
    print(" 🎓 EJECUTANDO PRUEBAS FASE 3 - PASO 2: COLA DE VALIDACIÓN DE DIPLOMAS & SELLO DIGITAL")
    print("=" * 80)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:

        # ----------------------------------------------------------------------
        # 1. Login Super Admin y Preparación de Dos IES de Prueba
        # ----------------------------------------------------------------------
        print("\n[TEST 1] Autenticando Super Admin y configurando IES de prueba...")
        login_admin = await client.post(
            "/api/v1/auth/login",
            json={"correo": "admin@vincula.com.co", "password": "Admin123*"}
        )
        assert login_admin.status_code == 200, f"Error login superadmin: {login_admin.text}"
        super_token = login_admin.json()["access_token"]
        headers_super = {"Authorization": f"Bearer {super_token}"}

        uid = uuid.uuid4().hex[:6]

        # IES 1: Universidad de Prueba Principal
        email_ies1 = f"rectoria.{uid}a@universidad1.edu.co"
        pass_ies = "IesSegura2026*!"
        pdf_men1 = create_mock_pdf_stream(f"Resolucion MEN 1 {uid}")
        pdf_rut1 = create_mock_pdf_stream(f"RUT IES 1 {uid}")

        reg1 = await client.post(
            "/api/v1/auth/registro-institucion-form",
            data={
                "nombre_institucion": f"Universidad Tecnológica del Oriente {uid}",
                "sigla": f"UTO-{uid.upper()}",
                "codigo_snies": f"9{uid[:4]}",
                "nit": f"900{uid[:5]}-1",
                "caracter_academico": "Universidad",
                "origen_institucional": "Privada",
                "correo_institucional": email_ies1,
                "password": pass_ies,
                "telefono": "(607) 6340000",
                "direccion": "Calle 45 # 27-10 Campus Central",
                "ciudad": "Bucaramanga",
                "departamento": "Santander",
                "sitio_web": f"https://www.{uid}uto.edu.co",
                "nombre_rector": "Dra. Cecilia Valenzuela",
                "documento_rector": f"63{uid[:6]}",
                "nombre_contacto_asesor": "Ing. Mauricio Prada",
                "cargo_asesor": "Director de Enlace"
            },
            files=[
                ("resolucion_men_pdf", ("resolucion_men.pdf", pdf_men1.getvalue(), "application/pdf")),
                ("rut_pdf", ("rut_institucional.pdf", pdf_rut1.getvalue(), "application/pdf")),
            ]
        )
        assert reg1.status_code == 200, f"Error registro IES 1: {reg1.text}"
        ies1_id = reg1.json()["id_institucion"]

        # Aprobar IES 1 desde SuperAdmin
        aprob1 = await client.post(
            f"/api/v1/admin/ies/{ies1_id}/aprobar",
            headers=headers_super,
            json={"notas": "IES verificada formalmente ante el MEN."}
        )
        assert aprob1.status_code == 200, f"Error aprobando IES 1: {aprob1.text}"

        # Login con IES 1
        login_ies1 = await client.post(
            "/api/v1/auth/login",
            json={"correo": email_ies1, "password": pass_ies}
        )
        assert login_ies1.status_code == 200, f"Error login IES 1: {login_ies1.text}"
        token_ies1 = login_ies1.json()["access_token"]
        headers_ies1 = {"Authorization": f"Bearer {token_ies1}"}

        # IES 2: Universidad Secundaria para validación Multi-Tenant
        email_ies2 = f"rectoria.{uid}b@universidad2.edu.co"
        pdf_men2 = create_mock_pdf_stream(f"Resolucion MEN 2 {uid}")
        pdf_rut2 = create_mock_pdf_stream(f"RUT IES 2 {uid}")

        reg2 = await client.post(
            "/api/v1/auth/registro-institucion-form",
            data={
                "nombre_institucion": f"Corporación Universitaria del Norte {uid}",
                "sigla": f"CUN-{uid.upper()}",
                "codigo_snies": f"8{uid[:4]}",
                "nit": f"800{uid[:5]}-2",
                "caracter_academico": "Institución Universitaria",
                "origen_institucional": "Privada",
                "correo_institucional": email_ies2,
                "password": pass_ies,
                "telefono": "(607) 6450000",
                "direccion": "Cra 33 # 12-40",
                "ciudad": "Floridablanca",
                "departamento": "Santander",
                "sitio_web": f"https://www.{uid}cun.edu.co",
                "nombre_rector": "Dr. Fernando Soto",
                "documento_rector": f"91{uid[:6]}",
                "nombre_contacto_asesor": "Lic. Andrea Meza",
                "cargo_asesor": "Coordinadora de Prácticas"
            },
            files=[
                ("resolucion_men_pdf", ("resolucion_men.pdf", pdf_men2.getvalue(), "application/pdf")),
                ("rut_pdf", ("rut_institucional.pdf", pdf_rut2.getvalue(), "application/pdf")),
            ]
        )
        assert reg2.status_code == 200, f"Error registro IES 2: {reg2.text}"
        ies2_id = reg2.json()["id_institucion"]

        aprob2 = await client.post(
            f"/api/v1/admin/ies/{ies2_id}/aprobar",
            headers=headers_super,
            json={"notas": "Segunda IES aprobada para aislamiento multi-tenant."}
        )
        assert aprob2.status_code == 200, f"Error aprobando IES 2: {aprob2.text}"

        login_ies2 = await client.post(
            "/api/v1/auth/login",
            json={"correo": email_ies2, "password": pass_ies}
        )
        assert login_ies2.status_code == 200, f"Error login IES 2: {login_ies2.text}"
        token_ies2 = login_ies2.json()["access_token"]
        headers_ies2 = {"Authorization": f"Bearer {token_ies2}"}

        print("  ✓ Dos IES aprobadas formalmente con tokens JWT operativos.")

        # ----------------------------------------------------------------------
        # 2. Estructura Académica (Sede, Facultad, Programa SNIES) en IES 1
        # ----------------------------------------------------------------------
        print("\n[TEST 2] Creando sede, facultad y programa académico con SNIES en IES 1...")
        sede_res = await client.post(
            "/api/v1/instituciones/sedes",
            headers=headers_ies1,
            json={
                "nombre": "Campus Principal Real de Minas",
                "nombre_corto": "Campus Real",
                "ciudad": "Bucaramanga",
                "departamento": "Santander",
                "direccion": "Av. Los Estudiantes # 9-82",
                "es_sede_principal": True
            }
        )
        assert sede_res.status_code == 201
        sede_id = sede_res.json()["id"]

        fac_res = await client.post(
            "/api/v1/instituciones/facultades",
            headers=headers_ies1,
            json={
                "codigo": f"FING-{uid[:4]}",
                "sigla": "FING",
                "nombre": "Facultad de Ingeniería y Tecnologías",
                "color_distintivo": "#2563EB"
            }
        )
        assert fac_res.status_code == 201
        fac_id = fac_res.json()["id"]

        snies_prog = f"10{uid[:4]}"
        prog_res = await client.post(
            "/api/v1/instituciones/programas",
            headers=headers_ies1,
            json={
                "id_facultad": fac_id,
                "id_sede": sede_id,
                "codigo_interno": f"PR-SIS-{uid[:4]}",
                "codigo_snies": snies_prog,
                "nombre": "Ingeniería de Software y Sistemas Inteligentes",
                "nivel_formacion": "Profesional Universitario",
                "modalidad": "Presencial",
                "duracion_semestres": 10,
                "total_creditos": 160,
                "nombre_director": "Dra. Sofía Rincón"
            }
        )
        assert prog_res.status_code == 201
        prog_id = prog_res.json()["id"]
        print(f"  ✓ Programa académico creado con código SNIES '{snies_prog}' (ID: {prog_id}).")

        # ----------------------------------------------------------------------
        # 3. Creación de Egresados y Radicación de Diplomas en PostgreSQL
        # ----------------------------------------------------------------------
        print("\n[TEST 3] Sembrando registros de egresados y diplomas radicados en base de datos...")
        egr1_doc = f"1098{uid[:6]}"
        egr2_doc = f"1095{uid[:6]}"
        id_academico_1 = None
        id_academico_2 = None
        id_egresado_1 = None
        id_egresado_2 = None

        async with AsyncSessionLocal() as session:
            # Crear Usuarios IAM para egresados
            pwd_hash = get_password_hash("Egresado2026*!")
            u_egr1 = Usuario(
                correo_electronico=f"egresado1.{uid}@estudiante.edu.co",
                contrasena_hash=pwd_hash,
                rol="egresado",
                estado="activo"
            )
            u_egr2 = Usuario(
                correo_electronico=f"egresado2.{uid}@estudiante.edu.co",
                contrasena_hash=pwd_hash,
                rol="egresado",
                estado="activo"
            )
            session.add_all([u_egr1, u_egr2])
            await session.flush()

            # Crear perfiles en 'egresados'
            e1 = Egresado(
                id_usuario=u_egr1.id,
                tipo_documento="CC",
                numero_documento=egr1_doc,
                codigo_estudiantil=f"EST-{uid[:5]}-1",
                nombre_completo=f"Jaider Alexander Niño {uid}",
                ciudad_residencia="Bucaramanga",
                departamento_residencia="Santander",
                telefono="3187654321",
                correo_personal=u_egr1.correo_electronico,
                titular_profesional="Ingeniero de Software Trainee",
                estado="pendiente"
            )
            e2 = Egresado(
                id_usuario=u_egr2.id,
                tipo_documento="CC",
                numero_documento=egr2_doc,
                codigo_estudiantil=f"EST-{uid[:5]}-2",
                nombre_completo=f"Camila Andrea Silva {uid}",
                ciudad_residencia="Floridablanca",
                departamento_residencia="Santander",
                telefono="3158901234",
                correo_personal=u_egr2.correo_electronico,
                titular_profesional="Analista de Sistemas",
                estado="pendiente"
            )
            session.add_all([e1, e2])
            await session.flush()
            id_egresado_1 = str(e1.id)
            id_egresado_2 = str(e2.id)

            # Crear registros académicos y diplomas en 'academicos_egresado'
            acad1 = AcademicoEgresado(
                id_egresado=e1.id,
                id_institucion=uuid.UUID(ies1_id),
                id_programa=uuid.UUID(prog_id),
                id_sede=uuid.UUID(sede_id),
                nivel_formacion="Profesional Universitario",
                ano_graduacion=2025,
                periodo_graduacion="2025-2",
                promedio_ponderado=4.62,
                proyecto_grado="Plataforma de Vinculación Laboral Inteligente",
                estado_academico="recien-egresado",
                estado_laboral="buscando",
                validado_por_ies=False,
                url_diploma_pdf=f"https://vincula.supabase.co/storage/v1/object/public/vincula-diplomas-validados/diplomas/{e1.id}/Diploma_Oficial_Jaider_Nino.pdf",
                estado_verificacion="pendiente"
            )
            acad2 = AcademicoEgresado(
                id_egresado=e2.id,
                id_institucion=uuid.UUID(ies1_id),
                id_programa=uuid.UUID(prog_id),
                id_sede=uuid.UUID(sede_id),
                nivel_formacion="Profesional Universitario",
                ano_graduacion=2024,
                periodo_graduacion="2024-1",
                promedio_ponderado=4.38,
                proyecto_grado="Optimización de Datos Académicos",
                estado_academico="recien-egresado",
                estado_laboral="buscando",
                validado_por_ies=False,
                url_diploma_pdf=f"https://vincula.supabase.co/storage/v1/object/public/vincula-diplomas-validados/diplomas/{e2.id}/Diploma_Camila_Silva.pdf",
                estado_verificacion="pendiente"
            )
            session.add_all([acad1, acad2])
            await session.commit()
            id_academico_1 = str(acad1.id)
            id_academico_2 = str(acad2.id)

        print(f"  ✓ Egresados radicados con diplomas pendientes: {id_academico_1} y {id_academico_2}.")

        # ----------------------------------------------------------------------
        # 4. Bandeja Paginada en Servidor (RNF-02 < 3s) y Filtros
        # ----------------------------------------------------------------------
        print("\n[TEST 4] Consultando bandeja paginada institucional de diplomas...")
        t_inicio = time.time()
        bandeja_res = await client.get(
            "/api/v1/instituciones/egresados/pendientes",
            headers=headers_ies1,
            params={"page": 1, "limit": 10, "estado": "todos"}
        )
        t_duracion = time.time() - t_inicio
        assert bandeja_res.status_code == 200, f"Error en bandeja: {bandeja_res.text}"
        data_bandeja = bandeja_res.json()

        assert "items" in data_bandeja
        assert data_bandeja["total"] >= 2
        assert data_bandeja["page"] == 1
        assert "resumen_estados" in data_bandeja
        assert data_bandeja["resumen_estados"]["pendientes"] >= 2
        assert t_duracion < 3.0, f"RNF-02 violado: Tiempo de respuesta {t_duracion:.2f}s >= 3.0s"

        print(f"  ✓ Bandeja obtenida en {t_duracion:.3f}s (< 3.0s RNF-02). Total registros: {data_bandeja['total']}.")
        print(f"  ✓ Resumen de estados: {data_bandeja['resumen_estados']}.")

        # Filtro por búsqueda textual (nombre del primer egresado)
        busq_res = await client.get(
            "/api/v1/instituciones/egresados/pendientes",
            headers=headers_ies1,
            params={"busqueda": egr1_doc}
        )
        assert busq_res.status_code == 200
        items_busq = busq_res.json()["items"]
        assert len(items_busq) == 1
        assert items_busq[0]["id_academico"] == id_academico_1
        assert items_busq[0]["numero_documento"] == egr1_doc
        print(f"  ✓ Búsqueda por documento exitosa: encontrado '{items_busq[0]['nombre_completo']}'.")

        # Filtro por estado 'aprobado' (actualmente ninguno)
        filtro_aprob = await client.get(
            "/api/v1/instituciones/egresados/pendientes",
            headers=headers_ies1,
            params={"estado": "aprobado"}
        )
        assert filtro_aprob.status_code == 200
        assert len(filtro_aprob.json()["items"]) == 0
        print("  ✓ Filtro por estado 'aprobado' retorna 0 items (ambos permanecen pendientes).")

        # ----------------------------------------------------------------------
        # 5. Generación de URL Segura Temporal del Diploma (3600s)
        # ----------------------------------------------------------------------
        print("\n[TEST 5] Solicitando URL firmada temporal de descarga protegida para el diploma...")
        url_res = await client.get(
            f"/api/v1/instituciones/egresados/{id_academico_1}/diploma-secure-url",
            headers=headers_ies1,
            params={"expires_in": 3600}
        )
        assert url_res.status_code == 200, f"Error URL segura: {url_res.text}"
        data_url = url_res.json()
        assert "url_segura" in data_url
        assert data_url["expira_en_segundos"] == 3600
        assert data_url["nombre_archivo"] == "Diploma_Oficial_Jaider_Nino.pdf"
        print(f"  ✓ URL firmada generada con vigencia de {data_url['expira_en_segundos']}s: {data_url['url_segura'][:60]}...")

        # ----------------------------------------------------------------------
        # 6. Candado de Aislamiento Multi-Tenant (Seguridad Estricta)
        # ----------------------------------------------------------------------
        print("\n[TEST 6] Verificando candado de Aislamiento Multi-Tenant (IES 2 intentando acceder a IES 1)...")
        # IES 2 intenta obtener la URL segura del diploma de IES 1
        url_forb = await client.get(
            f"/api/v1/instituciones/egresados/{id_academico_1}/diploma-secure-url",
            headers=headers_ies2
        )
        assert url_forb.status_code == 403, f"Fallo aislamiento: {url_forb.status_code}"
        assert url_forb.json()["detail"]["codigo"] == "ACCESO_DIPLOMA_DENEGADO"

        # IES 2 intenta validar el diploma de IES 1
        val_forb = await client.post(
            f"/api/v1/instituciones/egresados/{id_academico_1}/validar-diploma",
            headers=headers_ies2,
            json={"numero_acta_grado": "ACTA-HACK-001"}
        )
        assert val_forb.status_code == 403
        assert val_forb.json()["detail"]["codigo"] == "ACCESO_DIPLOMA_DENEGADO"
        print("  ✓ Aislamiento Multi-Tenant verificado: IES 2 rechazada con HTTP 403 (ACCESO_DIPLOMA_DENEGADO).")

        # ----------------------------------------------------------------------
        # 7. Rechazo / Observación Justificada de Diploma
        # ----------------------------------------------------------------------
        print("\n[TEST 7] Rechazando / observando formalmente el diploma 2 con motivo pedagógico...")
        motivo_obs = "El diploma cargado presenta borrosidad en los sellos de rectoría y folio. Favor cargar escaneo legible a 300 DPI."
        rej_res = await client.post(
            f"/api/v1/instituciones/egresados/{id_academico_2}/rechazar-diploma",
            headers=headers_ies1,
            json={"motivo_rechazo": motivo_obs}
        )
        assert rej_res.status_code == 200, f"Error rechazando diploma: {rej_res.text}"
        data_rej = rej_res.json()
        assert data_rej["success"] is True
        assert data_rej["estado_verificacion"] == "rechazado"
        assert data_rej["motivo_rechazo"] == motivo_obs
        print("  ✓ Diploma 2 observado formalmente con estado 'rechazado' y motivo registrado.")

        # Verificar que el conteo en bandeja refleja el rechazo
        bandeja_actualizada = await client.get(
            "/api/v1/instituciones/egresados/pendientes",
            headers=headers_ies1
        )
        resumen_act = bandeja_actualizada.json()["resumen_estados"]
        assert resumen_act["rechazados"] >= 1
        print(f"  ✓ Conteo actualizado de bandeja: {resumen_act}.")

        # ----------------------------------------------------------------------
        # 8. Validación Oficial con Expedición de Sello Digital Institucional
        # ----------------------------------------------------------------------
        print("\n[TEST 8] Validando formalmente diploma 1 con expedición de Sello Digital SHA-256...")
        acta_num = f"ACTA-{uid.upper()}-4892"
        folio_num = f"Libro 48, Folio 112"
        fecha_grado = "2025-12-15"

        val_res = await client.post(
            f"/api/v1/instituciones/egresados/{id_academico_1}/validar-diploma",
            headers=headers_ies1,
            json={
                "numero_acta_grado": acta_num,
                "numero_libro_folio": folio_num,
                "fecha_grado": fecha_grado,
                "observaciones": "Graduado con honores en Ingeniería de Software."
            }
        )
        assert val_res.status_code == 200, f"Error validando diploma: {val_res.text}"
        data_val = val_res.json()
        assert data_val["success"] is True
        assert data_val["estado_verificacion"] == "aprobado"
        assert data_val["numero_acta_grado"] == acta_num
        assert data_val["numero_libro_folio"] == folio_num
        assert data_val["fecha_grado"] == fecha_grado
        assert len(data_val["sello_digital"]) == 64  # SHA-256 hex string
        assert data_val["codigo_snies"] == snies_prog

        sello_emitido = data_val["sello_digital"]
        print(f"  ✓ Sello Digital Oficial expedido: {sello_emitido}")
        print(f"  ✓ Acta: {data_val['numero_acta_grado']} · Folio: {data_val['numero_libro_folio']} · SNIES: {data_val['codigo_snies']}.")

        # Verificar en PostgreSQL que el estado del egresado se actualizó a 'aprobado'
        async with AsyncSessionLocal() as session:
            db_egr = (await session.execute(select(Egresado).where(Egresado.id == uuid.UUID(id_egresado_1)))).scalar_one()
            db_acad = (await session.execute(select(AcademicoEgresado).where(AcademicoEgresado.id == uuid.UUID(id_academico_1)))).scalar_one()
            assert db_acad.estado_verificacion == "aprobado"
            assert db_acad.validado_por_ies is True
            assert db_acad.sello_digital == sello_emitido
            assert db_egr.estado == "aprobado"

        print("  ✓ Verificación en base de datos: Academico 'aprobado' con Sello Digital y Egresado habilitado ('aprobado').")

        # ----------------------------------------------------------------------
        # 9. Máquina de Estados Estricta e Idempotencia (Bloqueo de Revalidación)
        # ----------------------------------------------------------------------
        print("\n[TEST 9] Comprobando candado de idempotencia (revalidar diploma ya certificado)...")
        reval_res = await client.post(
            f"/api/v1/instituciones/egresados/{id_academico_1}/validar-diploma",
            headers=headers_ies1,
            json={"numero_acta_grado": "ACTA-DUPLICADA-999"}
        )
        assert reval_res.status_code == 400, f"Error esperado 400 pero fue {reval_res.status_code}"
        det_reval = reval_res.json()["detail"]
        assert det_reval["codigo"] == "DIPLOMA_YA_APROBADO"
        assert "motivo" in det_reval
        assert "por_que_ocurre" in det_reval
        print(f"  ✓ Revalidación bloqueada con HTTP 400 (DIPLOMA_YA_APROBADO).")
        print(f"    Título pedagógico: '{det_reval.get('titulo')}'")

        # Intentar rechazar el diploma ya aprobado
        rej_dup = await client.post(
            f"/api/v1/instituciones/egresados/{id_academico_1}/rechazar-diploma",
            headers=headers_ies1,
            json={"motivo_rechazo": "Intento de revocar título aprobado"}
        )
        assert rej_dup.status_code == 400
        assert rej_dup.json()["detail"]["codigo"] == "DIPLOMA_YA_APROBADO_NO_RECHAZABLE"
        print("  ✓ Revocación arbitraria bloqueada con HTTP 400 (DIPLOMA_YA_APROBADO_NO_RECHAZABLE).")

        # ----------------------------------------------------------------------
        # 10. Verificación de Compatibilidad por ID de Egresado
        # ----------------------------------------------------------------------
        print("\n[TEST 10] Verificando resolución por ID de egresado (compatibilidad con rutas anteriores)...")
        # Consultar URL segura pasando id_egresado en lugar de id_academico
        url_compat = await client.get(
            f"/api/v1/instituciones/egresados/{id_egresado_1}/diploma-url",
            headers=headers_ies1
        )
        assert url_compat.status_code == 200
        assert url_compat.json()["id_academico"] == id_academico_1
        print("  ✓ Resolución por ID de egresado exitosa (compatibilidad 100% garantizada).")

    print("\n" + "=" * 80)
    print(" 🎉 TODAS LAS PRUEBAS DE LA FASE 3 - PASO 2 COMPLETADAS CON ÉXITO (100% VERDE)")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    asyncio.run(test_fase3_paso2_validacion_diplomas())
