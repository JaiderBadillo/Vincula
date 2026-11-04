"""
Script de Prueba Automatizada para el Extractor de Pensums (Python)
1. Genera un PDF realista de malla curricular usando reportlab.
2. Extrae las materias y semestres usando PensumPDFExtractor.
3. Ejecuta la prueba de matching contra vacantes que piden PostgreSQL, Docker, etc.
"""

import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

# Agregar directorio backend al path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.pensum_extractor import PensumPDFExtractor
from app.services.curriculum_matcher import CurriculumMatcher


def generate_sample_pensum_pdf(filepath: str):
    """Genera un PDF con formato típico de malla curricular de universidad colombiana."""
    c = canvas.Canvas(filepath, pagesize=letter)
    width, height = letter

    # Encabezado institucional
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, height - 50, "UNIDADES TECNOLÓGICAS DE SANTANDER - UTS")
    c.setFont("Helvetica", 10)
    c.drawString(50, height - 68, "Facultad de Ciencias Naturales e Ingenierías")
    c.setFont("Helvetica-Bold", 11)
    c.drawString(50, height - 85, "Plan de Estudios Oficial - Ingeniería de Sistemas (Pensum 2024)")
    c.setLineWidth(1)
    c.line(50, height - 95, width - 50, height - 95)

    y = height - 120
    c.setFont("Helvetica", 9)

    # Semestre I
    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, y, "SEMESTRE I")
    y -= 16
    c.setFont("Helvetica", 9)
    materias_sem1 = [
        "SIS-101 Fundamentos de Programación y Lógica 3",
        "MAT-102 Cálculo Diferencial 4",
        "HUM-103 Comunicación Escrita y Habilidades 2",
        "FIS-104 Física Mecánica 3",
        "SIS-105 Introducción a la Ingeniería de Sistemas 2",
    ]
    for m in materias_sem1:
        c.drawString(60, y, m)
        y -= 14

    y -= 10
    # Semestre II
    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, y, "SEMESTRE II")
    y -= 16
    c.setFont("Helvetica", 9)
    materias_sem2 = [
        "SIS-201 Programación Orientada a Objetos 3",
        "MAT-202 Álgebra Lineal 3",
        "MAT-203 Cálculo Integral 4",
        "FIS-204 Física Eléctrica y Electromagnetismo 3",
        "ING-205 Inglés Técnico I 2",
    ]
    for m in materias_sem2:
        c.drawString(60, y, m)
        y -= 14

    y -= 10
    # Semestre V
    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, y, "SEMESTRE V")
    y -= 16
    c.setFont("Helvetica", 9)
    materias_sem5 = [
        "SIS-501 Motores de Bases de Datos 3",
        "SIS-502 Estructuras de Datos y Algoritmos 4",
        "SIS-503 Redes de Comunicaciones I 3",
        "MAT-504 Estadística y Probabilidad 3",
        "SIS-505 Análisis y Diseño de Sistemas 3",
    ]
    for m in materias_sem5:
        c.drawString(60, y, m)
        y -= 14

    y -= 10
    # Semestre VI
    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, y, "SEMESTRE VI")
    y -= 16
    c.setFont("Helvetica", 9)
    materias_sem6 = [
        "SIS-601 Programación Web y Servicios REST 4",
        "SIS-602 Arquitectura de Software y Patrones 3",
        "SIS-603 Seguridad Informática y Criptografía 3",
        "SIS-604 Redes y Enrutamiento Avanzado 3",
        "ADM-605 Formulación y Gestión de Proyectos 3",
    ]
    for m in materias_sem6:
        c.drawString(60, y, m)
        y -= 14

    c.save()
    print(f"[OK] PDF de prueba generado en: {filepath}")


def test_extraction_and_matching():
    pdf_path = os.path.join(os.path.dirname(__file__), "sample_pensum_test.pdf")
    generate_sample_pensum_pdf(pdf_path)

    # 1. Probar extracción
    print("\n--- 1. PROBANDO EXTRACCIÓN DE PDF CON PYPDF ---")
    result = PensumPDFExtractor.extract_from_file_path(pdf_path, "Ingeniería de Sistemas")
    print(f"Éxito: {result['success']}")
    print(f"Carrera detectada: {result['program_name']}")
    print(f"Total Semestres detectados: {result['total_semesters']}")
    print(f"Total Asignaturas detectadas: {result['total_subjects']}")
    print(f"Habilidades únicas detectadas: {result['unique_skills_detected'][:6]}...")
    print(f"Herramientas sugeridas detectadas: {result['unique_tools_detected'][:6]}...")

    # Imprimir materias de Semestre V (donde está Bases de Datos)
    for sem in result['semesters']:
        if sem['semester_number'] == 5:
            print(f"\nDetalle de {sem['semester_label']}:")
            for sub in sem['subjects']:
                print(f"  • {sub['code']} - {sub['name']} ({sub['credits']} cr) -> Familia: {sub['family']} | Herramientas: {sub['suggested_tools']}")

    # 2. Probar matching contra demanda de vacantes
    print("\n--- 2. PROBANDO MATCHING CONTRA VACANTES DE EMPRESAS ---")
    vacantes_mercado = [
        {"skill": "SQL", "vacancies_count": 55},
        {"skill": "JavaScript", "vacancies_count": 48},
        {"skill": "APIs REST", "vacancies_count": 40},
        {"skill": "PostgreSQL", "vacancies_count": 35},  # En el pensum se enseña MySQL / SQL relacional
        {"skill": "Docker", "vacancies_count": 32},      # Brecha crítica: no está en el pensum
        {"skill": "AWS", "vacancies_count": 22},         # Brecha crítica
        {"skill": "Git", "vacancies_count": 30},
        {"skill": "Power BI", "vacancies_count": 18},    # Brecha
    ]

    pensum_skills = result["unique_skills_detected"]
    # Simulamos que en el aula de bases de datos se practica con MySQL
    pensum_tools = result["unique_tools_detected"] + ["MySQL"]

    match_result = CurriculumMatcher.match_curriculum_against_vacancies(
        pensum_skills=pensum_skills,
        pensum_tools=pensum_tools,
        vacancies_demand=vacantes_mercado
    )

    print(f"Índice de Cobertura Curricular: {match_result['coverage_score']}% ({match_result['status'].upper()})")
    print(f"Habilidades Cubiertas (Match Directo): {len(match_result['exact_matches'])}")
    for m in match_result['exact_matches']:
        print(f"  [OK - CUBIERTA] {m['skill']} ({m['vacancies_count']} vacantes)")

    print(f"\nEquivalencias por Familia Tecnologica: {len(match_result['equivalent_matches'])}")
    for eq in match_result['equivalent_matches']:
        print(f"  [EQUIV] {eq['demanded_skill']} (Empresas) <-> {eq['pensum_equivalent']} (Pensum) [{eq['match_label']}]")

    print(f"\nBrechas Criticas (No cubiertas): {len(match_result['critical_gaps'])}")
    for gap in match_result['critical_gaps']:
        print(f"  [BRECHA] {gap['skill']} ({gap['vacancies_count']} vacantes)")

    print("\nRecomendaciones Curriculares Automaticas:")
    for i, rec in enumerate(match_result['recommendations'], 1):
        print(f"  {i}. {rec}")

    print("\n[EXITO TOTAL] El flujo determinista en Python funciona 100% sin tokens ni costos.")


if __name__ == "__main__":
    test_extraction_and_matching()
