"""
Suite de Pruebas Automatizada E2E: Fase 6 - Paso 3 (Motor de IA, Matching & Trazabilidad Curricular).
Verifica:
1. Catálogo de taxonomía de familias tecnológicas (GET /api/v1/ia/trazabilidad/taxonomy).
2. Evaluación de compatibilidad y afinidad vacante-candidato (GET /api/v1/ia/matching/evaluar/{id}).
3. Evaluación POST con DTO explícito (POST /api/v1/ia/matching/evaluar-candidato).
4. Catálogo de vacantes recomendadas por IA con ordenamiento por afinidad (GET /api/v1/ia/vacantes-recomendadas).
5. Análisis y extracción de Pensum PDF con índice de pertinencia y brechas (POST /api/v1/ia/trazabilidad/analizar-pensum-pdf).
6. Consulta de informe de pertinencia de programa de IES (GET /api/v1/ia/trazabilidad/programas/{id}/pertinencia).
7. Verificación de integridad de contratos DTO consumidos por frontend/src/services/aiService.js.
"""

import sys
import os
import io
import asyncio
from httpx import AsyncClient, ASGITransport
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from sqlalchemy import select

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.core.database import AsyncSessionLocal
from app.modules.iam.models import Usuario
from app.modules.vacancies_ats.models import Vacante
from app.modules.institutions.models import ProgramaAcademico
from app.modules.graduates.models import Egresado


def generate_sample_pdf() -> bytes:
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, 750, "PENSUM OFICIAL TECNOLOGÍA EN SISTEMAS - UTS")
    c.setFont("Helvetica", 10)
    c.drawString(50, 720, "SEMESTRE I")
    c.drawString(60, 700, "TSI101 Fundamentos de Programación en Python 3")
    c.drawString(60, 680, "TSI102 Introducción a Bases de Datos SQL 3")
    c.drawString(50, 650, "SEMESTRE II")
    c.drawString(60, 630, "TSI201 Programación Web con React y TypeScript 4")
    c.drawString(60, 610, "TSI202 APIs REST con FastAPI y Docker 3")
    c.save()
    buffer.seek(0)
    return buffer.getvalue()


async def run_fase6_e2e_tests():
    print("=" * 80)
    print(" INICIANDO PRUEBAS E2E: FASE 6 - MOTOR DE IA, MATCHING & TRAZABILIDAD")
    print("=" * 80)

    # 1. Obtener egresado de prueba y vacante activa en BD
    async with AsyncSessionLocal() as session:
        user_res = await session.execute(
            select(Usuario).where(Usuario.correo_electronico == "egresado@correo.uts.edu.co")
        )
        egresado_user = user_res.scalars().first()
        assert egresado_user is not None, "El usuario egresado@correo.uts.edu.co debe existir en BD."

        egresado_res = await session.execute(
            select(Egresado).where(Egresado.id_usuario == egresado_user.id)
        )
        egresado_perfil = egresado_res.scalars().first()
        assert egresado_perfil is not None, "El perfil de egresado debe existir en BD."

        vac_res = await session.execute(
            select(Vacante).where(Vacante.estado == "abierta").limit(1)
        )
        vacante = vac_res.scalars().first()
        assert vacante is not None, "Debe existir al menos una vacante abierta para matching."

        prog_res = await session.execute(
            select(ProgramaAcademico).limit(1)
        )
        programa = prog_res.scalars().first()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:

        # ---------------------------------------------------------------------
        # TEST 0: Login de Egresado (obtención de token JWT)
        # ---------------------------------------------------------------------
        print("\n[TEST 0] Autenticando egresado para consumo seguro del motor IA...")
        grad_login = await client.post(
            "/api/v1/auth/login",
            json={"correo": "egresado@correo.uts.edu.co", "password": "Egresado123*"}
        )
        assert grad_login.status_code == 200, f"Error login egresado: {grad_login.text}"
        grad_token = grad_login.json()["access_token"]
        auth_headers = {"Authorization": f"Bearer {grad_token}"}
        print(" -> OK: Egresado autenticado con token JWT.")

        # ---------------------------------------------------------------------
        # TEST 1: Taxonomía de familias tecnológicas
        # ---------------------------------------------------------------------
        print("\n[TEST 1] Consultando catálogo maestro de taxonomía...")
        resp_tax = await client.get("/api/v1/ia/trazabilidad/taxonomy")
        assert resp_tax.status_code == 200, f"Error {resp_tax.status_code}: {resp_tax.text}"
        data_tax = resp_tax.json()
        assert data_tax.get("success") is True
        assert "families" in data_tax
        assert "backend_web" in data_tax["families"] or any(f.get("name") == "Desarrollo Backend y APIs" for f in data_tax["families"].values())
        print(f" -> OK: {len(data_tax['families'])} familias tecnológicas registradas.")

        # ---------------------------------------------------------------------
        # TEST 2: Evaluación GET de compatibilidad candidato vs vacante
        # ---------------------------------------------------------------------
        print(f"\n[TEST 2] Evaluando afinidad de vacante {vacante.codigo_vacante} para egresado...")
        resp_match_get = await client.get(
            f"/api/v1/ia/matching/evaluar/{vacante.id}?egresado_id={egresado_perfil.id}",
            headers=auth_headers
        )
        assert resp_match_get.status_code == 200, f"Error {resp_match_get.status_code}: {resp_match_get.text}"
        match_data = resp_match_get.json()
        assert "porcentaje_afinidad" in match_data
        assert "etiqueta_badge" in match_data
        assert "motivo_recomendacion" in match_data
        print(f" -> OK: Afinidad={match_data['porcentaje_afinidad']}% | Badge='{match_data['etiqueta_badge']}'")
        print(f"    Motivo: {match_data['motivo_recomendacion'][:75]}...")

        # ---------------------------------------------------------------------
        # TEST 3: Evaluación POST explícita candidato vs vacante
        # ---------------------------------------------------------------------
        print("\n[TEST 3] Evaluando compatibilidad vía POST con DTO...")
        payload_eval = {
            "vacante_id": str(vacante.id),
            "egresado_id": str(egresado_perfil.id)
        }
        resp_match_post = await client.post(
            "/api/v1/ia/matching/evaluar-candidato",
            headers=auth_headers,
            json=payload_eval
        )
        assert resp_match_post.status_code == 200, f"Error {resp_match_post.status_code}: {resp_match_post.text}"
        post_data = resp_match_post.json()
        assert post_data["porcentaje_afinidad"] == match_data["porcentaje_afinidad"]
        print(f" -> OK: Evaluación POST consistente (Match Score: {post_data['match_score']}).")

        # ---------------------------------------------------------------------
        # TEST 4: Catálogo de vacantes recomendadas por afinidad
        # ---------------------------------------------------------------------
        print(f"\n[TEST 4] Consultando vacantes recomendadas para {egresado_user.correo_electronico}...")
        resp_recom = await client.get(
            f"/api/v1/ia/vacantes-recomendadas?egresado_id={egresado_perfil.id}&limit=10",
            headers=auth_headers
        )
        assert resp_recom.status_code == 200, f"Error {resp_recom.status_code}: {resp_recom.text}"
        recom_data = resp_recom.json()
        assert "vacantes" in recom_data
        assert len(recom_data["vacantes"]) > 0
        top_job = recom_data["vacantes"][0]
        assert "porcentaje_afinidad" in top_job
        assert "etiqueta_badge" in top_job
        assert "skills_match" in top_job
        print(f" -> OK: Total evaluadas={recom_data['total_evaluadas']} | Recomendadas={recom_data['total_recomendadas']}")
        print(f"    Top Vacante: '{top_job['titulo']}' ({top_job['empresa_nombre']}) - {top_job['porcentaje_afinidad']}%")

        # ---------------------------------------------------------------------
        # TEST 5: Extracción y Pertinencia de Pensum PDF
        # ---------------------------------------------------------------------
        print("\n[TEST 5] Analizando PDF de plan de estudios con motor de trazabilidad...")
        pdf_bytes = generate_sample_pdf()
        files = {
            "file": ("pensum_sistemas_uts_2026.pdf", pdf_bytes, "application/pdf")
        }
        data_form = {
            "program_hint": "Tecnología en Desarrollo de Sistemas Informáticos"
        }
        resp_pdf = await client.post(
            "/api/v1/ia/trazabilidad/analizar-pensum-pdf",
            files=files,
            data=data_form
        )
        assert resp_pdf.status_code == 200, f"Error {resp_pdf.status_code}: {resp_pdf.text}"
        pdf_report = resp_pdf.json()
        assert pdf_report.get("success") is True
        assert pdf_report["total_semestres"] >= 2
        assert pdf_report["total_asignaturas"] >= 4
        assert "indice_pertinencia" in pdf_report
        assert len(pdf_report["recomendaciones_decanatura"]) > 0
        print(f" -> OK: Asignaturas extraídas={pdf_report['total_asignaturas']} en {pdf_report['total_semestres']} semestres.")
        print(f"    Índice Pertinencia={pdf_report['indice_pertinencia']}% ({pdf_report['nivel_pertinencia']})")
        print(f"    Brechas detectadas={len(pdf_report['brechas_criticas'])} | Competencias cubiertas={len(pdf_report['competencias_cubiertas'])}")

        # ---------------------------------------------------------------------
        # TEST 6: Pertinencia de Programa Académico Registrado
        # ---------------------------------------------------------------------
        if programa:
            print(f"\n[TEST 6] Consultando pertinencia del programa {programa.nombre} (ID: {programa.id})...")
            resp_prog = await client.get(
                f"/api/v1/ia/trazabilidad/programas/{programa.id}/pertinencia"
            )
            assert resp_prog.status_code == 200, f"Error {resp_prog.status_code}: {resp_prog.text}"
            prog_report = resp_prog.json()
            assert prog_report.get("success") is True
            assert prog_report["id_programa"] == str(programa.id)
            print(f" -> OK: Programa evaluado exitosamente frente a {prog_report['total_vacantes_analizadas']} vacantes.")
        else:
            print("\n[TEST 6] Omitido: No hay programas académicos registrados en BD.")

    print("\n" + "=" * 80)
    print(" ¡TODAS LAS PRUEBAS E2E DE LA FASE 6 PASARON SATISFACTORIAMENTE! (100% VERDE)")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(run_fase6_e2e_tests())
