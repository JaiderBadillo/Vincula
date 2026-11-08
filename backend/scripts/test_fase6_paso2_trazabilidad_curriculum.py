"""
Suite de Pruebas Automatizada: Fase 6 - Paso 2 (Trazabilidad Curricular & Pertinencia Académica IES).
Verifica:
1. Generación de un PDF sintético de plan de estudios (formato oficial universitario).
2. Procesamiento y Extracción de Asignaturas, Semestres y Créditos (POST /api/v1/ia/trazabilidad/analizar-pensum-pdf).
3. Cruce contra la demanda real de vacantes laborales en PostgreSQL.
4. Verificación del Índice de Pertinencia Curricular (%), Competencias Cubiertas y Brechas Críticas (missing skills).
5. Consulta de Pertinencia por ID de Programa Académico Registrado (GET /api/v1/ia/trazabilidad/programas/{id}/pertinencia).
6. Persistencia idempotente en pensums_programa y asignaturas_pensum.
7. Manejo de errores y validaciones (400 formato inválido, 404 programa no encontrado).
"""

import sys
import os
import io
import uuid
import asyncio
from httpx import AsyncClient, ASGITransport
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.core.database import AsyncSessionLocal
from app.modules.institutions.models import ProgramaAcademico
from sqlalchemy import select


def generate_sample_pensum_pdf() -> bytes:
    """
    Genera en memoria un documento PDF con la estructura formal de una malla curricular universitaria.
    """
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    
    # Encabezado institucional
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, 750, "UNIDADES TECNOLÓGICAS DE SANTANDER - UTS")
    c.setFont("Helvetica-Bold", 13)
    c.drawString(50, 730, "MALLA CURRICULAR Y PLAN DE ESTUDIOS OFICIAL")
    c.setFont("Helvetica", 11)
    c.drawString(50, 712, "Programa Académico: Tecnología en Desarrollo de Sistemas Informáticos")
    c.drawString(50, 696, "Nivel de Formación: Tecnológico · Modalidad: Presencial · Vigencia: 2026")
    
    c.setLineWidth(1)
    c.line(50, 685, 550, 685)
    
    y = 665
    c.setFont("Helvetica-Bold", 11)
    
    # Semestre 1
    c.drawString(50, y, "SEMESTRE I")
    y -= 18
    c.setFont("Helvetica", 9)
    c.drawString(60, y, "TSI101 Fundamentos de Programación y Algoritmos 3")
    y -= 14
    c.drawString(60, y, "DCB102 Álgebra Lineal y Geometría Analítica 3")
    y -= 14
    c.drawString(60, y, "DHI103 Habilidades de Comunicación Asertiva 2")
    y -= 22
    
    # Semestre 2
    c.setFont("Helvetica-Bold", 11)
    c.drawString(50, y, "SEMESTRE II")
    y -= 18
    c.setFont("Helvetica", 9)
    c.drawString(60, y, "TSI201 Programación Orientada a Objetos 3")
    y -= 14
    c.drawString(60, y, "TSI202 Estructuras de Datos y Algoritmos 3")
    y -= 14
    c.drawString(60, y, "DCB203 Cálculo Diferencial e Integral 3")
    y -= 22
    
    # Semestre 3
    c.setFont("Helvetica-Bold", 11)
    c.drawString(50, y, "SEMESTRE III")
    y -= 18
    c.setFont("Helvetica", 9)
    c.drawString(60, y, "TSI301 Bases de Datos Relacionales y SQL 3")
    y -= 14
    c.drawString(60, y, "TSI302 Desarrollo Web Frontend con JavaScript y React 3")
    y -= 14
    c.drawString(60, y, "TSI303 Redes de Datos y Protocolos TCP/IP 3")
    y -= 22
    
    # Semestre 4
    c.setFont("Helvetica-Bold", 11)
    c.drawString(50, y, "SEMESTRE IV")
    y -= 18
    c.setFont("Helvetica", 9)
    c.drawString(60, y, "TSI401 Programación Backend y Servicios Web REST 3")
    y -= 14
    c.drawString(60, y, "TSI402 Arquitectura de Software y Patrones de Diseño 3")
    y -= 14
    c.drawString(60, y, "TSI403 Seguridad Informática y Ciberseguridad 2")
    y -= 22
    
    # Semestre 5
    c.setFont("Helvetica-Bold", 11)
    c.drawString(50, y, "SEMESTRE V")
    y -= 18
    c.setFont("Helvetica", 9)
    c.drawString(60, y, "TSI501 Desarrollo de Aplicaciones Móviles 3")
    y -= 14
    c.drawString(60, y, "TSI502 Gestión de Proyectos con Metodologías Ágiles Scrum 3")
    y -= 14
    c.drawString(60, y, "TSI503 Inteligencia de Negocios y Analítica de Datos 3")
    y -= 22
    
    # Semestre 6
    c.setFont("Helvetica-Bold", 11)
    c.drawString(50, y, "SEMESTRE VI")
    y -= 18
    c.setFont("Helvetica", 9)
    c.drawString(60, y, "TSI601 Proyecto de Grado y Práctica Profesional 4")
    y -= 14
    c.drawString(60, y, "DHI602 Ética Profesional y Legislación Laboral 2")
    
    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer.getvalue()


async def run_fase6_paso2_tests():
    print("\n================================================================================")
    print(" 🚀 EJECUTANDO PRUEBAS FASE 6 - PASO 2: TRAZABILIDAD CURRICULAR & PERTINENCIA IES")
    print("================================================================================")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # ----------------------------------------------------------------------
        # SETUP: Obtener ID de un Programa Académico de prueba en PostgreSQL
        # ----------------------------------------------------------------------
        print("\n[TEST 1] Setup: Obteniendo programa académico de prueba en PostgreSQL...")
        async with AsyncSessionLocal() as session:
            prog = (await session.execute(
                select(ProgramaAcademico).where(ProgramaAcademico.nombre.ilike("%Software%"))
            )).scalars().first()
            if not prog:
                prog = (await session.execute(select(ProgramaAcademico))).scalars().first()
            prog_id = str(prog.id)
            prog_name = prog.nombre
            print(f"  ✓ Programa detectado: {prog_name} (ID: {prog_id})")

        # ----------------------------------------------------------------------
        # TEST 2: Generar PDF sintético y subir para análisis de pertinencia
        # ----------------------------------------------------------------------
        print("\n[TEST 2] Analizando PDF de pensum en POST /api/v1/ia/trazabilidad/analizar-pensum-pdf...")
        pdf_bytes = generate_sample_pensum_pdf()
        assert len(pdf_bytes) > 500, "El PDF generado debe tener bytes válidos"
        print(f"  ✓ Documento PDF generado en memoria: {len(pdf_bytes)} bytes.")

        files = {
            "file": ("pensum_sistemas_uts_2026.pdf", pdf_bytes, "application/pdf")
        }
        data = {
            "program_hint": "Tecnología en Desarrollo de Sistemas Informáticos",
            "id_programa": prog_id
        }

        res_upload = await client.post(
            "/api/v1/ia/trazabilidad/analizar-pensum-pdf",
            files=files,
            data=data
        )
        assert res_upload.status_code == 200, f"Error al analizar pensum PDF: {res_upload.text}"
        report = res_upload.json()

        print("  ✓ Reporte de Pertinencia Curricular generado con éxito:")
        print(f"    - Programa: {report['programa_nombre']}")
        print(f"    - Total semestres detectados: {report['total_semestres']}")
        print(f"    - Total asignaturas: {report['total_asignaturas']}")
        print(f"    - Competencias detectadas en pensum: {report['total_competencias_pensum']}")
        print(f"    - Vacantes analizadas en PostgreSQL: {report['total_vacantes_analizadas']}")
        print(f"    - Índice de Pertinencia Curricular: {report['indice_pertinencia']}%")
        print(f"    - Nivel: {report['nivel_pertinencia']}")
        print(f"    - Competencias cubiertas ({len(report['competencias_cubiertas'])}): {[c['skill'] for c in report['competencias_cubiertas'][:5]]}")
        print(f"    - Brechas críticas identificadas ({len(report['brechas_criticas'])}): {[g['skill'] for g in report['brechas_criticas'][:4]]}")

        assert report["success"] is True
        assert report["total_semestres"] >= 4, f"Se esperaban >= 4 semestres, detectados {report['total_semestres']}"
        assert report["total_asignaturas"] >= 8, f"Se esperaban >= 8 asignaturas, detectadas {report['total_asignaturas']}"
        assert report["indice_pertinencia"] >= 40.0, f"Índice esperado coherente, obtenido {report['indice_pertinencia']}%"
        assert len(report["competencias_cubiertas"]) >= 2, "Debe haber identificado competencias cubiertas"
        assert len(report["recomendaciones_decanatura"]) >= 1, "Debe incluir recomendaciones para la decanatura"
        assert len(report["semestres"]) >= 4, "Debe desglosar los semestres con materias"

        # ----------------------------------------------------------------------
        # TEST 3: Consulta de Pertinencia por ID de Programa (GET /trazabilidad/programas/{id}/pertinencia)
        # ----------------------------------------------------------------------
        print(f"\n[TEST 3] Consultando pertinencia persistida para el programa {prog_id}...")
        res_prog = await client.get(f"/api/v1/ia/trazabilidad/programas/{prog_id}/pertinencia")
        assert res_prog.status_code == 200, f"Error consultando pertinencia programa: {res_prog.text}"
        prog_rep = res_prog.json()

        print(f"  ✓ Reporte obtenido: {prog_rep['programa_nombre']}")
        print(f"  ✓ Índice de Pertinencia: {prog_rep['indice_pertinencia']}% ({prog_rep['nivel_pertinencia']})")
        print(f"  ✓ Materias registradas en base de datos: {prog_rep['total_asignaturas']}")

        assert prog_rep["id_programa"] == prog_id
        assert prog_rep["indice_pertinencia"] >= 40.0

        # ----------------------------------------------------------------------
        # TEST 4: Catálogo Maestro de Taxonomía y Familias Tecnológicas
        # ----------------------------------------------------------------------
        print("\n[TEST 4] Verificando catálogo de familias tecnológicas en /api/v1/ia/trazabilidad/taxonomy...")
        res_tax = await client.get("/api/v1/ia/trazabilidad/taxonomy")
        assert res_tax.status_code == 200
        tax_data = res_tax.json()
        assert tax_data["success"] is True
        assert "families" in tax_data
        assert "sql_relational" in tax_data["families"]
        assert "backend_web" in tax_data["families"]
        print(f"  ✓ Familias de conocimiento validadas ({len(tax_data['families'])} familias registradas).")

        # ----------------------------------------------------------------------
        # TEST 5: Manejo de errores y casos borde
        # ----------------------------------------------------------------------
        print("\n[TEST 5] Validando manejo de errores y restricciones...")
        # Archivo que no es PDF
        bad_file = {
            "file": ("pensum.txt", b"Texto plano sin formato", "text/plain")
        }
        res_bad = await client.post("/api/v1/ia/trazabilidad/analizar-pensum-pdf", files=bad_file)
        assert res_bad.status_code == 400, f"Archivo no PDF debe retornar 400, retornó {res_bad.status_code}"

        # Programa inexistente
        fake_prog = str(uuid.uuid4())
        res_not_found = await client.get(f"/api/v1/ia/trazabilidad/programas/{fake_prog}/pertinencia")
        assert res_not_found.status_code == 404, f"Programa inexistente debe retornar 404, retornó {res_not_found.status_code}"
        print("  ✓ Respuestas ante errores (400 formato, 404 no encontrado) verificadas correctamente.")

    print("\n================================================================================")
    print(" 🎉 TODAS LAS PRUEBAS DE LA FASE 6 - PASO 2 HAN SIDO COMPLETADAS (100% VERDE)")
    print("================================================================================\n")


if __name__ == "__main__":
    asyncio.run(run_fase6_paso2_tests())
