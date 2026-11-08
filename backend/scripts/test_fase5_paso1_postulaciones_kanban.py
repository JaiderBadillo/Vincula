"""
Suite de Pruebas Automatizada: Fase 5 - Paso 1 (Postulaciones & Pipeline ATS Kanban en PostgreSQL).
Verifica:
1. Setup de Vacante Activa con Empresa Aprobada.
2. Login de Egresado y Postulación 1-Clic (POST /api/v1/postulaciones/{id_vacante}).
3. Candado de Seguridad: Prevención de postulaciones duplicadas (uq_postulacion_vacante_egresado).
4. Tablero ATS Kanban de 6 columnas (GET /api/v1/reclutador/kanban/{id_vacante}).
5. Adición de Notas Privadas de Reclutador (POST /api/v1/reclutador/postulaciones/{id}/notas).
6. Transición Drag-and-Drop entre fases (PATCH /api/v1/reclutador/postulaciones/{id}/mover-fase).
7. Programación de Entrevistas (POST /api/v1/reclutador/postulaciones/{id}/entrevistas).
8. Descarte formal con motivo y timestamp.
9. Trazabilidad y auditoría completa en PostgreSQL (historial_fases_postulacion).
"""

import sys
import os
import uuid
from datetime import datetime, date, timezone
from httpx import AsyncClient, ASGITransport

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.core.database import AsyncSessionLocal
from app.modules.vacancies_ats.models import (
    Vacante,
    Postulacion,
    HistorialFasePostulacion,
    NotaReclutadorPostulacion,
    EntrevistaPostulacion,
)
from app.modules.companies.models import Empresa, SedeEmpresa, ReclutadorEmpresa
from app.modules.iam.models import Usuario
from app.modules.graduates.models import Egresado
from sqlalchemy import select


async def run_fase5_paso1_tests():
    print("\n================================================================================")
    print(" 🚀 EJECUTANDO PRUEBAS FASE 5 - PASO 1: POSTULACIONES & ATS KANBAN (6 FASES)")
    print("================================================================================")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # ----------------------------------------------------------------------
        # SETUP 1: Autenticación SuperAdmin para aprobar empresa de pruebas
        # ----------------------------------------------------------------------
        print("\n[TEST 1] Setup: Autenticando Super Admin y preparando empresa homologada...")
        admin_login = await client.post(
            "/api/v1/auth/login",
            json={"correo": "admin@vincula.com.co", "password": "Admin123*"}
        )
        assert admin_login.status_code == 200, f"Error login Super Admin: {admin_login.text}"
        admin_token = admin_login.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        print("  ✓ Super Admin autenticado.")

        # Registrar empresa de prueba
        suffix = uuid.uuid4().hex[:6]
        emp_email = f"talento.{suffix}@techats.co"
        emp_nit = f"902{suffix}-9"

        reg_emp = await client.post(
            "/api/v1/auth/registro-empresa-form",
            data={
                "razon_social": f"Tech ATS Solutions {suffix} SAS",
                "nombre_comercial": f"TechATS {suffix}",
                "nit": emp_nit,
                "codigo_ciiu": "6201",
                "descripcion_ciiu": "Desarrollo y analítica de datos",
                "sector_economico": "Software & AI",
                "tamano_empresa": "Mediana",
                "departamento": "Santander",
                "ciudad": "Bucaramanga",
                "direccion": "Calle 48 # 32-14",
                "telefono": "3154445566",
                "correo_contacto": emp_email,
                "persona_contacto": "Elena Mantilla",
                "password": "Empresa123*",
                "nombre_representante_legal": "Elena Mantilla",
                "documento_representante_legal": f"63{suffix}",
            }
        )
        assert reg_emp.status_code in (200, 201), f"Error registro empresa: {reg_emp.text}"
        emp_id = reg_emp.json().get("id_empresa") or reg_emp.json().get("id")

        # Aprobar empresa por Super Admin para liberar cuarentena
        apr_emp = await client.post(
            f"/api/v1/admin/empresas/{emp_id}/aprobar",
            headers=admin_headers,
            json={"observaciones": "Empresa validada para pruebas de ATS Kanban"}
        )
        assert apr_emp.status_code == 200
        print(f"  ✓ Empresa homologada: {emp_email} (ID: {emp_id})")

        # Login de Empresa
        emp_login = await client.post(
            "/api/v1/auth/login",
            json={"correo": emp_email, "password": "Empresa123*"}
        )
        assert emp_login.status_code == 200
        emp_token = emp_login.json()["access_token"]
        emp_headers = {"Authorization": f"Bearer {emp_token}"}

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
                "correo": f"sede.{suffix}@techats.co",
                "es_sede_principal": True
            }
        )
        assert sede_res.status_code == 201
        sede_id = sede_res.json()["id"]

        # Crear Reclutador
        rec_email = f"recrutador.{suffix}@techats.co"
        rec_res = await client.post(
            "/api/v1/empresas/reclutadores",
            headers=emp_headers,
            json={
                "nombre_completo": "Andrés Morales Reclutador",
                "correo_corporativo": rec_email,
                "password": "Recruiter123*",
                "telefono": "3187778899",
                "cargo": "Tech Recruiter Senior",
                "sedes_ids": [sede_id]
            }
        )
        assert rec_res.status_code == 201
        rec_id = rec_res.json()["id"]

        # ----------------------------------------------------------------------
        # SETUP 2: Publicar Vacante Abierta
        # ----------------------------------------------------------------------
        print("\n[TEST 2] Publicando vacante formal para postulaciones...")
        vac_res = await client.post(
            "/api/v1/vacantes",
            headers=emp_headers,
            json={
                "titulo": f"Desarrollador Python / React Full Stack {suffix}",
                "id_sede": sede_id,
                "id_reclutador_responsable": rec_id,
                "categoria": "Tecnología",
                "modalidad": "Híbrido",
                "tipo_contrato": "Término Indefinido",
                "nivel_experiencia": "Junior",
                "salario_minimo": 3800000,
                "salario_maximo": 4600000,
                "descripcion": "Buscamos egresado de sistemas o afines con sólidos conocimientos en APIs REST.",
                "responsabilidades": ["Construir endpoints en FastAPI", "Diseñar vistas en React"],
                "requisitos": ["Python 3", "React 18", "SQL relacional"],
                "fecha_cierre": "2026-12-31",
                "estado": "abierta"
            }
        )
        assert vac_res.status_code == 201, f"Error creando vacante: {vac_res.text}"
        vac_data = vac_res.json()
        vac_id = vac_data["id"]
        vac_code = vac_data["codigo_vacante"]
        print(f"  ✓ Vacante publicada: {vac_code} (ID: {vac_id})")

        # ----------------------------------------------------------------------
        # TEST 3: Login de Egresado y Postulación 1-Clic
        # ----------------------------------------------------------------------
        print("\n[TEST 3] Login como Egresado y postulación en 1 clic...")
        egr_login = await client.post(
            "/api/v1/auth/login",
            json={"correo": "egresado@correo.uts.edu.co", "password": "Egresado123*"}
        )
        assert egr_login.status_code == 200, f"Error login egresado: {egr_login.text}"
        egr_token = egr_login.json()["access_token"]
        egr_headers = {"Authorization": f"Bearer {egr_token}"}

        postular_res = await client.post(
            f"/api/v1/postulaciones/{vac_id}",
            headers=egr_headers,
            json={}
        )
        assert postular_res.status_code == 201, f"Error en postulación: {postular_res.text}"
        postulacion = postular_res.json()
        postulacion_id = postulacion["id"]
        assert postulacion["fase_actual"] == "en_revision"
        assert postulacion["vacante_codigo"] == vac_code
        assert postulacion["porcentaje_afinidad"] >= 80.0
        print(f"  ✓ Postulación registrada exitosamente (ID: {postulacion_id})")
        print(f"  ✓ Fase inicial: {postulacion['fase_actual']} | Afinidad: {postulacion['porcentaje_afinidad']}%")

        # ----------------------------------------------------------------------
        # TEST 4: Prevención de Postulación Duplicada (Constraint de Ley)
        # ----------------------------------------------------------------------
        print("\n[TEST 4] Validando prevención de postulación duplicada (HTTP 400)...")
        dup_res = await client.post(
            f"/api/v1/postulaciones/{vac_id}",
            headers=egr_headers,
            json={}
        )
        assert dup_res.status_code == 400, f"Se esperaba 400 pero se obtuvo {dup_res.status_code}"
        assert dup_res.json()["detail"]["codigo"] == "POSTULACION_DUPLICADA"
        print("  ✓ Candado de duplicidad verificado: Bloqueo de postulación repetida exitoso.")

        # ----------------------------------------------------------------------
        # TEST 5: Tablero Kanban ATS del Reclutador (6 Fases Hidratadas)
        # ----------------------------------------------------------------------
        print("\n[TEST 5] Consultando Tablero ATS Kanban de la vacante...")
        kanban_res = await client.get(
            f"/api/v1/reclutador/kanban/{vac_id}",
            headers=emp_headers
        )
        assert kanban_res.status_code == 200, f"Error kanban: {kanban_res.text}"
        board = kanban_res.json()
        assert board["id_vacante"] == vac_id
        assert board["total_candidatos"] == 1
        assert "columnas" in board

        # Verificar que el candidato está en la columna 'review' (En Revisión)
        col_review = board["columnas"]["review"]
        assert len(col_review) == 1, f"Se esperaba 1 candidato en review, hay {len(col_review)}"
        candidato_card = col_review[0]
        assert candidato_card["id"] == postulacion_id
        assert candidato_card["stage"] == "review"
        assert candidato_card["candidateName"] == "Jaider Niño"
        print("  ✓ Tablero Kanban verificado: Candidato visualizado en columna 'review' con datos completos.")

        # ----------------------------------------------------------------------
        # TEST 6: Agregar Nota Privada del Reclutador
        # ----------------------------------------------------------------------
        print("\n[TEST 6] Agregando nota de evaluación de reclutador...")
        nota_res = await client.post(
            f"/api/v1/reclutador/postulaciones/{postulacion_id}/notas",
            headers=emp_headers,
            json={"texto_nota": "Candidato con excelente portafolio en FastAPI y React. Pasa a prueba técnica."}
        )
        assert nota_res.status_code == 201, f"Error nota: {nota_res.text}"
        nota_data = nota_res.json()
        assert nota_data["id_postulacion"] == postulacion_id
        assert "FastAPI" in nota_data["texto_nota"]
        print(f"  ✓ Nota de reclutador registrada: {nota_data['texto_nota'][:50]}...")

        # ----------------------------------------------------------------------
        # TEST 7: Transiciones Drag-and-Drop entre Fases Kanban
        # ----------------------------------------------------------------------
        print("\n[TEST 7] Ejecutando transiciones de fases ATS...")

        # Mover a 'preselected'
        m1 = await client.patch(
            f"/api/v1/reclutador/postulaciones/{postulacion_id}/mover-fase",
            headers=emp_headers,
            json={"fase_nueva": "preselected", "comentario": "Filtro inicial aprobado"}
        )
        assert m1.status_code == 200
        assert m1.json()["stage"] == "preselected"
        print("  ✓ Movido a 'preselected' (Preseleccionados).")

        # Mover a 'evaluation' (prueba técnica)
        m2 = await client.patch(
            f"/api/v1/reclutador/postulaciones/{postulacion_id}/mover-fase",
            headers=emp_headers,
            json={"fase_nueva": "evaluation", "comentario": "Enviado challenge de backend"}
        )
        assert m2.status_code == 200
        assert m2.json()["stage"] == "evaluation"
        print("  ✓ Movido a 'evaluation' (Prueba Técnica).")

        # ----------------------------------------------------------------------
        # TEST 8: Programación de Entrevista y Transición Automática
        # ----------------------------------------------------------------------
        print("\n[TEST 8] Programando entrevista técnica...")
        entrevista_res = await client.post(
            f"/api/v1/reclutador/postulaciones/{postulacion_id}/entrevistas",
            headers=emp_headers,
            json={
                "fecha_entrevista": "2026-11-15",
                "franja_horaria": "10:00 AM - 11:00 AM",
                "modalidad": "Virtual",
                "url_reunion": "https://meet.google.com/xyz-tech-test",
                "objetivo": "Entrevista técnica sobre arquitectura FastAPI y diseño de BD"
            }
        )
        assert entrevista_res.status_code == 201, f"Error entrevista: {entrevista_res.text}"
        ent_data = entrevista_res.json()
        assert ent_data["fecha_entrevista"] == "2026-11-15"
        assert ent_data["estado"] == "programada"
        print(f"  ✓ Entrevista programada para el {ent_data['fecha_entrevista']} ({ent_data['franja_horaria']})")

        # Validar en Kanban que ahora está en 'interview'
        k2 = await client.get(f"/api/v1/reclutador/kanban/{vac_id}", headers=emp_headers)
        assert len(k2.json()["columnas"]["interview"]) == 1
        print("  ✓ Candidato automáticamente posicionado en columna 'interview'.")

        # ----------------------------------------------------------------------
        # TEST 9: Mover a Oferta y posteriormente Descarte con Motivo
        # ----------------------------------------------------------------------
        print("\n[TEST 9] Transición a Oferta y posterior Descarte formal con motivo...")
        m3 = await client.patch(
            f"/api/v1/reclutador/postulaciones/{postulacion_id}/mover-fase",
            headers=emp_headers,
            json={"fase_nueva": "offer", "comentario": "Presentación de propuesta económica"}
        )
        assert m3.status_code == 200
        assert m3.json()["stage"] == "offer"
        print("  ✓ Movido a 'offer' (Finalistas / Oferta).")

        # Descartar con motivo formal
        m_descarte = await client.patch(
            f"/api/v1/reclutador/postulaciones/{postulacion_id}/mover-fase",
            headers=emp_headers,
            json={
                "fase_nueva": "discarded",
                "motivo_descarte": "Expectativa salarial fuera del rango corporativo",
                "retroalimentacion": "Excelente perfil, te tendremos en cuenta para convocatorias Senior."
            }
        )
        assert m_descarte.status_code == 200
        card_desc = m_descarte.json()
        assert card_desc["stage"] == "discarded"
        assert card_desc["rejectionReason"] == "Expectativa salarial fuera del rango corporativo"
        print("  ✓ Candidato movido a 'discarded' con motivo registrado.")

        # ----------------------------------------------------------------------
        # TEST 10: Auditoría Transaccional en Base de Datos PostgreSQL
        # ----------------------------------------------------------------------
        print("\n[TEST 10] Verificando bitácora transaccional en PostgreSQL / Supabase...")
        async with AsyncSessionLocal() as session:
            # 1. Postulacion
            p_db = (await session.execute(
                select(Postulacion).where(Postulacion.id == uuid.UUID(postulacion_id))
            )).scalar_one_or_none()
            assert p_db is not None
            assert p_db.fase_actual == "descartados"
            assert p_db.motivo_descarte == "Expectativa salarial fuera del rango corporativo"
            assert p_db.descartado_en is not None

            # 2. Historial de Fases
            historiales = (await session.execute(
                select(HistorialFasePostulacion)
                .where(HistorialFasePostulacion.id_postulacion == uuid.UUID(postulacion_id))
                .order_by(HistorialFasePostulacion.registrado_en.asc())
            )).scalars().all()

            print(f"  ✓ Total de transiciones registradas en bitácora: {len(historiales)}")
            assert len(historiales) >= 5, f"Se esperaban al menos 5 transiciones, hay {len(historiales)}"
            for h in historiales:
                print(f"    - {h.fase_anterior} ➔ {h.fase_nueva} | Comentario: {h.comentario}")

            # 3. Notas
            notas = (await session.execute(
                select(NotaReclutadorPostulacion)
                .where(NotaReclutadorPostulacion.id_postulacion == uuid.UUID(postulacion_id))
            )).scalars().all()
            assert len(notas) >= 1
            print(f"  ✓ Notas persistidas en PostgreSQL: {len(notas)}")

            # 4. Entrevistas
            entrevistas = (await session.execute(
                select(EntrevistaPostulacion)
                .where(EntrevistaPostulacion.id_postulacion == uuid.UUID(postulacion_id))
            )).scalars().all()
            assert len(entrevistas) >= 1
            print(f"  ✓ Entrevistas persistidas en PostgreSQL: {len(entrevistas)}")

    print("\n================================================================================")
    print(" 🎉 TODAS LAS PRUEBAS DE LA FASE 5 - PASO 1 HAN SIDO COMPLETADAS (100% VERDE)")
    print("================================================================================\n")


if __name__ == "__main__":
    import asyncio
    asyncio.run(run_fase5_paso1_tests())
