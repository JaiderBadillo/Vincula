"""
Generador de Documentos Oficiales en PDF (ReportLab).
Produce diplomas universitarios, actas de grado y certificados digitales autenticados
para almacenamiento en Supabase Storage y visualización en el portal de Vincula.
"""

import io
import hashlib
from datetime import datetime
from typing import Optional
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib import colors
from reportlab.pdfgen import canvas


def generate_official_diploma_pdf(
    student_name: str,
    doc_type: str = "CC",
    doc_number: str = "1098765432",
    institution_name: str = "Unidades Tecnológicas de Santander - UTS",
    snies_code: str = "103241",
    career: str = "Tecnología en Desarrollo de Sistemas Informáticos",
    degree_level: str = "Tecnológica",
    grad_date: Optional[str] = None,
    acta_number: Optional[str] = None,
    book_folio: Optional[str] = None,
    sello_digital: Optional[str] = None
) -> bytes:
    """
    Genera un documento PDF oficial con diseño diplomático apaisado (landscape),
    marcos decorativos de seguridad, tipografía institucional, datos de registro académico
    y estampillado criptográfico de Vincula.
    """
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=landscape(letter))
    width, height = landscape(letter)  # 792 x 612 puntos

    # Formateo de fecha por defecto
    if not grad_date:
        now = datetime.now()
        meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                 "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
        grad_date = f"{now.day} de {meses[now.month - 1]} de {now.year}"

    # Números de registro oficial
    clean_num = ''.join(c for c in doc_number if c.isdigit()) or "0842"
    if not acta_number:
        acta_number = f"ACTA-{datetime.now().year}-{clean_num[-4:].zfill(4)}"
    if not book_folio:
        book_folio = f"Libro 48, Folio {clean_num[-3:].zfill(3)}"

    # Generar o computar sello criptográfico SHA-256
    if not sello_digital:
        seed_raw = f"{student_name}|{doc_number}|{institution_name}|{career}|{acta_number}|{book_folio}"
        sello_digital = hashlib.sha256(seed_raw.encode("utf-8")).hexdigest()

    # 1. Fondo sutil de seguridad
    p.setFillColor(colors.HexColor("#FBFDF9"))
    p.rect(0, 0, width, height, fill=1, stroke=0)

    # 2. Marco decorativo institucional exterior
    p.setStrokeColor(colors.HexColor("#0F3E48"))
    p.setLineWidth(4)
    p.rect(24, 24, width - 48, height - 48)

    # Marco decorativo institucional interior (verde salvia)
    p.setStrokeColor(colors.HexColor("#8DA47E"))
    p.setLineWidth(1.5)
    p.rect(30, 30, width - 60, height - 60)

    # Esquinas decorativas
    p.setStrokeColor(colors.HexColor("#0F3E48"))
    p.setLineWidth(1)
    corners = [(36, 36), (width - 46, 36), (36, height - 46), (width - 46, height - 46)]
    for cx, cy in corners:
        p.rect(cx, cy, 10, 10, fill=0, stroke=1)

    # 3. Encabezado de la República y Ministerio de Educación
    p.setFont("Helvetica-Bold", 10)
    p.setFillColor(colors.HexColor("#475569"))
    p.drawCentredString(width / 2, height - 58, "REPÚBLICA DE COLOMBIA")

    p.setFont("Helvetica", 8)
    p.setFillColor(colors.HexColor("#64748B"))
    p.drawCentredString(width / 2, height - 72, f"MINISTERIO DE EDUCACIÓN NACIONAL · CÓDIGO SNIES {snies_code} · PERSONERÍA JURÍDICA VIGENTE")

    # 4. Nombre Oficial de la Institución de Educación Superior
    p.setFont("Helvetica-Bold", 21)
    p.setFillColor(colors.HexColor("#0F3E48"))
    p.drawCentredString(width / 2, height - 105, institution_name.upper())

    p.setFont("Helvetica-Oblique", 10.5)
    p.setFillColor(colors.HexColor("#334155"))
    p.drawCentredString(width / 2, height - 124, "En uso de sus facultades legales, estatutarias y reglamentarias confiere a:")

    # 5. Nombre del Graduando (Destacado central)
    p.setFont("Helvetica-Bold", 24)
    p.setFillColor(colors.HexColor("#051F26"))
    p.drawCentredString(width / 2, height - 170, student_name.upper())

    # Documento de Identidad del Titular
    p.setFont("Helvetica", 11)
    p.setFillColor(colors.HexColor("#334155"))
    p.drawCentredString(width / 2, height - 192, f"Identificado(a) con {doc_type} N.° {doc_number}")

    p.setFont("Helvetica", 10.5)
    p.setFillColor(colors.HexColor("#475569"))
    p.drawCentredString(width / 2, height - 216, "por haber cursado y aprobado con éxito la totalidad del plan de estudios y requisitos de grado, el título de:")

    # 6. Título Obtenido
    p.setFont("Helvetica-Bold", 19)
    p.setFillColor(colors.HexColor("#0F3E48"))
    p.drawCentredString(width / 2, height - 256, career.upper())

    p.setFont("Helvetica-Bold", 10.5)
    p.setFillColor(colors.HexColor("#8DA47E"))
    p.drawCentredString(width / 2, height - 274, f"NIVEL DE FORMACIÓN: {degree_level.upper()}")

    # 7. Fecha y Lugar de Expedición
    p.setFont("Helvetica", 9.5)
    p.setFillColor(colors.HexColor("#334155"))
    p.drawCentredString(width / 2, height - 314, f"Dado en la sede institucional oficial, a los {grad_date}.")

    # 8. Datos de Registro Académico (Secretaría General)
    p.setFont("Helvetica-Bold", 8.5)
    p.setFillColor(colors.HexColor("#0F3E48"))
    p.drawString(56, 142, "REGISTRO ACADÉMICO:")
    p.setFont("Helvetica", 8)
    p.setFillColor(colors.HexColor("#334155"))
    p.drawString(56, 128, f"Acta de Grado: {acta_number}")
    p.drawString(56, 114, f"Registro: {book_folio}")
    p.drawString(56, 100, f"Acreditación: Institucional Avalada")

    # 9. Firmas de Autoridades Académicas
    p.setStrokeColor(colors.HexColor("#94A3B8"))
    p.setLineWidth(1)
    p.line(width - 320, 136, width - 60, 136)
    p.setFont("Helvetica-Bold", 8.5)
    p.setFillColor(colors.HexColor("#0F3E48"))
    p.drawCentredString(width - 190, 122, "SECRETARÍA GENERAL ACADÉMICA")
    p.setFont("Helvetica", 7.5)
    p.setFillColor(colors.HexColor("#64748B"))
    p.drawCentredString(width - 190, 108, "Certificación y Refrendación Digital Oficial")

    # 10. Sello de Seguridad Digital Vincula con Hash SHA-256
    p.setFillColor(colors.HexColor("#F0FDF4"))
    p.setStrokeColor(colors.HexColor("#16A34A"))
    p.setLineWidth(1)
    p.roundRect(width / 2 - 190, 42, 380, 44, 6, fill=1, stroke=1)

    p.setFont("Helvetica-Bold", 8)
    p.setFillColor(colors.HexColor("#166534"))
    p.drawCentredString(width / 2, 72, "SELLO DE SEGURIDAD DIGITAL · VINCULA RED NACIONAL")

    p.setFont("Courier-Bold", 6.5)
    p.setFillColor(colors.HexColor("#14532D"))
    p.drawCentredString(width / 2, 58, f"SHA-256: {sello_digital[:48]}...")

    p.setFont("Helvetica", 6.5)
    p.setFillColor(colors.HexColor("#15803D"))
    p.drawCentredString(width / 2, 48, f"Validado en red ante empresas aliadas · Consultable con Folio {acta_number}")

    p.showPage()
    p.save()
    buffer.seek(0)
    return buffer.getvalue()
