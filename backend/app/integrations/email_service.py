"""
Servicio Transaccional de Correo Electrónico vía Gmail SMTP.
Diseño visual alineado con el sistema de diseño de la plataforma Vincula:
- Paleta oficial: Ink (#001A23), Forest Green (#336F24), Lime (#B1CC74),
  Page (#FBFCF9), Panel (#E9EFF2), Line (#DCE4E6), Blue Muted (#284D5D).
- Soporta envíos asíncronos mediante asyncio.to_thread sin bloquear FastAPI.
"""

import os
import re
import time
import smtplib
import asyncio
import logging
from typing import Dict, Any, Optional, List, Tuple
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage

from app.core.config import settings

logger = logging.getLogger("vincula.email")

# Mapeo oficial de las fases del pipeline ATS de Vincula
ATS_PIPELINE_STAGES: List[Dict[str, str]] = [
    {
        "key": "en_revision",
        "step": "1",
        "label": "En Revisión Inicial",
        "description": "Tu hoja de vida fue recibida y está en revisión por el equipo de selección.",
    },
    {
        "key": "preseleccionados",
        "step": "2",
        "label": "Preselección Curricular",
        "description": "Tu perfil superó el primer filtro curricular y validación de competencias.",
    },
    {
        "key": "prueba_tecnica",
        "step": "3",
        "label": "Evaluación / Prueba Técnica",
        "description": "Etapa de valoración práctica de conocimientos y habilidades específicas.",
    },
    {
        "key": "entrevista",
        "step": "4",
        "label": "Entrevista de Selección",
        "description": "Espacio de conversación directa con el reclutador o líder del área.",
    },
    {
        "key": "oferta_finalistas",
        "step": "5",
        "label": "Selección Final y Oferta",
        "description": "Has sido seleccionado como finalista para el proceso de vinculación.",
    },
    {
        "key": "contratado",
        "step": "6",
        "label": "Contratación Confirmada",
        "description": "La empresa confirmó tu contratación. ¡Felicitaciones!",
    },
]

STAGE_ALIASES: Dict[str, str] = {
    "review": "en_revision",
    "en_revision": "en_revision",
    "postulado": "en_revision",
    "received": "en_revision",
    "preselected": "preseleccionados",
    "preseleccionados": "preseleccionados",
    "cv_visto": "preseleccionados",
    "screening": "preseleccionados",
    "evaluation": "prueba_tecnica",
    "prueba_tecnica": "prueba_tecnica",
    "interview": "entrevista",
    "entrevista": "entrevista",
    "offer": "oferta_finalistas",
    "oferta_finalistas": "oferta_finalistas",
    "hired": "contratado",
    "contratado": "contratado",
    "discarded": "descartados",
    "descartados": "descartados",
    "rejected": "descartados",
}


def normalize_stage_key(raw_stage: Optional[str]) -> str:
    if not raw_stage:
        return "en_revision"
    return STAGE_ALIASES.get(raw_stage.strip().lower(), "en_revision")


def get_stage_display_info(raw_stage: Optional[str]) -> Dict[str, str]:
    norm = normalize_stage_key(raw_stage)
    if norm == "descartados":
        return {
            "key": "descartados",
            "step": "—",
            "label": "Proceso Finalizado",
            "badge": "Proceso Cerrado",
            "description": "La empresa ha finalizado la revisión de tu candidatura para esta convocatoria.",
        }
    for stage in ATS_PIPELINE_STAGES:
        if stage["key"] == norm:
            return {
                **stage,
                "badge": f"Fase {stage['step']} de {len(ATS_PIPELINE_STAGES)} · {stage['label']}",
            }
    return {
        **ATS_PIPELINE_STAGES[0],
        "badge": f"Fase 1 de {len(ATS_PIPELINE_STAGES)} · En Revisión Inicial",
    }


def _build_metadata_card_html(rows: List[Tuple[str, str]]) -> str:
    """Construye una tarjeta de datos clave-valor idéntica a los paneles de resumen de Vincula."""
    if not rows:
        return ""

    trs = []
    total = len(rows)
    for idx, (label, val) in enumerate(rows):
        border_style = "border-bottom: 1px solid #E8EDEF;" if idx < total - 1 else ""
        trs.append(
            f"""<tr>
                <td style="padding: 10px 16px; {border_style} font-size: 12px; font-weight: 600; color: #718188; width: 38%; vertical-align: top;">
                    {label}
                </td>
                <td style="padding: 10px 16px; {border_style} font-size: 13px; font-weight: 700; color: #001A23; vertical-align: top;">
                    {val}
                </td>
            </tr>"""
        )

    return f"""
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FBFCF9; border: 1px solid #DCE4E6; border-radius: 12px; margin: 20px 0; border-collapse: separate; overflow: hidden;">
        {''.join(trs)}
    </table>
    """


def _build_pipeline_tracker_html(current_stage_raw: str) -> str:
    """Construye el componente visual de trazabilidad de fases del proceso de selección."""
    norm_current = normalize_stage_key(current_stage_raw)

    if norm_current == "descartados":
        return """
        <div style="background-color: #FBFCF9; border: 1px solid #DCE4E6; border-radius: 12px; padding: 16px 18px; margin: 20px 0;">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #718188; margin-bottom: 6px;">
                ESTADO DEL PROCESO DE SELECCIÓN
            </div>
            <div style="font-size: 14px; font-weight: 700; color: #001A23; margin-bottom: 4px;">
                Convocatoria cerrada para tu postulación
            </div>
            <div style="font-size: 13px; color: #61727A; line-height: 1.5;">
                Agradecemos tu interés y participación. Tu perfil continúa activo en Vincula para nuevas oportunidades laborales afines a tu carrera.
            </div>
        </div>
        """

    current_idx = 0
    for idx, st in enumerate(ATS_PIPELINE_STAGES):
        if st["key"] == norm_current:
            current_idx = idx
            break

    stage = ATS_PIPELINE_STAGES[current_idx]
    return f"""
    <div style="margin: 24px 0 8px; text-align: center;">
        <div style="font-size: 13px; font-weight: 700; color: #001A23; margin-bottom: 14px;">Así va tu proceso de selección</div>
        <img src="cid:vincula_fase_{current_idx + 1}" width="520" alt="Fase {stage['step']} de 5: {stage['label']}" style="display: block; margin: 0 auto; max-width: 100%; height: auto; border: 0;" />
        <div style="font-size: 13px; color: #4A5A61; line-height: 1.55; margin-top: 10px;">{stage['description']}</div>
    </div>
    """


def _generate_vincula_email_html(
    preheader: str,
    status_pill: str,
    eyebrow: str,
    title: str,
    greeting: str,
    paragraphs: List[str],
    metadata_rows: Optional[List[Tuple[str, str]]] = None,
    steps_title: Optional[str] = None,
    steps_items: Optional[List[str]] = None,
    pipeline_stage: Optional[str] = None,
    callout_title: Optional[str] = None,
    callout_body: Optional[str] = None,
    cta_text: Optional[str] = None,
    cta_url: Optional[str] = None,
) -> str:
    """
    Correo transaccional de Vincula con estructura tipo PayPal:
    saludo superior, banda de color con logo circular, tarjeta blanca centrada,
    botón en píldora, bloque de columnas, pie con enlaces y texto legal.
    """
    hello = greeting.strip().rstrip(":").replace("Hola, ", "Hola, ")
    paragraphs_html = "".join(
        f"""<p style="margin: 0 0 16px; color: #4A5A61; font-size: 15px; line-height: 1.65; text-align: center;">{p}</p>"""
        for p in paragraphs
    )

    metadata_html = _build_metadata_card_html(metadata_rows or [])
    pipeline_html = _build_pipeline_tracker_html(pipeline_stage) if pipeline_stage else ""

    callout_html = ""
    if callout_body:
        c_title = (
            f"""<div style="font-size: 13px; font-weight: 700; color: #001A23; margin-bottom: 4px;">{callout_title}</div>"""
            if callout_title else ""
        )
        callout_html = f"""
        <div style="background-color: #F4F7F8; border-radius: 12px; padding: 14px 18px; margin: 18px 0; text-align: left;">
            {c_title}
            <div style="font-size: 13px; color: #284D5D; line-height: 1.55;">{callout_body}</div>
        </div>"""

    button_html = ""
    if cta_text and cta_url:
        button_html = f"""
        <div style="text-align: center; margin: 26px 0 6px;">
            <a href="{cta_url}" style="background-color: #336F24; color: #FFFFFF; text-decoration: none; padding: 13px 30px; border-radius: 999px; font-weight: 700; font-size: 14px; display: inline-block;">{cta_text}</a>
        </div>"""

    steps_html = ""
    if steps_items:
        if len(steps_items) <= 3:
            width = int(100 / len(steps_items))
            cols = "".join(
                f"""<td width="{width}%" valign="top" style="padding: 0 8px; text-align: center;">
                    <div style="width: 40px; height: 40px; line-height: 40px; margin: 0 auto 10px; border-radius: 50%; background-color: #EEF5EC; color: #336F24; font-size: 16px; font-weight: 800;">{i}</div>
                    <div style="font-size: 13px; color: #4A5A61; line-height: 1.55;">{item}</div>
                </td>"""
                for i, item in enumerate(steps_items, 1)
            )
            body = f"""<table border="0" cellpadding="0" cellspacing="0" width="100%"><tr>{cols}</tr></table>"""
        else:
            rows = "".join(
                f"""<tr><td style="padding: 6px 0; font-size: 13px; color: #4A5A61;">&#10003;&nbsp; {item}</td></tr>"""
                for item in steps_items
            )
            body = f"""<table border="0" cellpadding="0" cellspacing="0" width="100%">{rows}</table>"""
        heading = (
            f"""<div style="font-size: 15px; font-weight: 700; color: #001A23; text-align: center; margin-bottom: 18px;">{steps_title.title()}</div>"""
            if steps_title else ""
        )
        steps_html = f"""
        <div style="border-top: 1px solid #DCE4E6; margin: 28px 0 0; padding-top: 26px;">
            {heading}
            {body}
        </div>"""

    logo = """<img src="cid:vincula_logo" width="300" height="64" alt="Vincula" style="display: block; margin: 0 auto; border: 0;" />"""

    return f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F5F7FA; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; color: #001A23; -webkit-font-smoothing: antialiased;">
    <div style="display: none; max-height: 0px; overflow: hidden; opacity: 0;">{preheader}</div>
    <table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#F5F7FA" style="background-color: #F5F7FA;">
        <tr>
            <td align="center">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 640px;">
                    <tr>
                        <td align="center" style="padding: 14px 0; font-size: 13px; color: #61727A;">{hello}</td>
                    </tr>
                    <tr>
                        <td align="center" bgcolor="#F5F7FA" style="background-color: #F5F7FA; background-image: linear-gradient(#001A23, #001A23 150px, #F5F7FA 150px); padding: 24px 20px 30px;">
                            <div style="margin: 0 0 22px;">{logo}</div>
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E3E9EC;">
                                <tr>
                                    <td style="padding: 36px 34px 34px;">
                                        <h1 style="margin: 0 0 16px; color: #001A23; font-size: 26px; font-weight: 400; line-height: 1.3; text-align: center;">{title}</h1>
                                        {paragraphs_html}
                                        {metadata_html}
                                        {callout_html}
                                        {pipeline_html}
                                        {button_html}
                                        {steps_html}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding: 8px 24px 30px;">
                            <div style="font-size: 12px; font-weight: 700; margin-bottom: 14px;">
                                <a href="https://vincula-henna.vercel.app/login" style="color: #336F24; text-decoration: none;">Ingresar</a>
                                <span style="color: #9AA8AE;"> | </span>
                                <a href="https://vincula-henna.vercel.app" style="color: #336F24; text-decoration: none;">Ayuda y contacto</a>
                                <span style="color: #9AA8AE;"> | </span>
                                <a href="https://vincula-henna.vercel.app" style="color: #336F24; text-decoration: none;">Privacidad</a>
                            </div>
                            <p style="margin: 0 0 12px; font-size: 11px; color: #718188; line-height: 1.6;">
                                Vincula nunca te pedirá tu contraseña por correo. Si no reconoces esta actividad, ignora este mensaje.
                            </p>
                            <p style="margin: 0; font-size: 11px; color: #718188; line-height: 1.6;">
                                Recibes este correo por tu actividad en Vincula, la bolsa de empleo de las Unidades Tecnológicas de Santander e IES aliadas.
                                Tus datos están protegidos bajo la Ley 1581 de 2012 &middot; Bucaramanga, Colombia.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""


class EmailService:
    """Servicio para enviar correos transaccionales de Vincula vía Gmail SMTP."""

    @staticmethod
    def _send_sync(to_email: str, subject: str, html_body: str, plain_body: str) -> Dict[str, Any]:
        """Envío síncrono del correo mediante smtplib ejecutado en un thread secundario."""
        smtp_user = settings.SMTP_USER.strip()
        smtp_pass = settings.SMTP_PASSWORD.strip().replace(" ", "")
        smtp_host = settings.SMTP_HOST.strip() or "smtp.gmail.com"
        smtp_port = int(settings.SMTP_PORT) if settings.SMTP_PORT else 465
        from_name = settings.SMTP_FROM_NAME or "Vincula - Bolsa de Empleo IES"
        from_email = settings.SMTP_FROM_EMAIL.strip() or smtp_user

        if not smtp_user or not smtp_pass:
            logger.info(
                f"[SMTP NOT CONFIG] Correo hacia '{to_email}' omitido. "
                "Configura SMTP_USER y SMTP_PASSWORD en backend/.env"
            )
            return {
                "success": False,
                "reason": "SMTP no configurado en variables de entorno (SMTP_USER / SMTP_PASSWORD)",
            }

        msg = MIMEMultipart("related")
        msg["Subject"] = subject
        msg["From"] = f"{from_name} <{from_email}>"
        msg["To"] = to_email

        alt = MIMEMultipart("alternative")
        alt.attach(MIMEText(plain_body, "plain", "utf-8"))
        alt.attach(MIMEText(html_body, "html", "utf-8"))
        msg.attach(alt)

        assets_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "email_assets")
        for cid in sorted(set(re.findall(r"cid:([A-Za-z0-9_]+)", html_body))):
            img_path = os.path.join(assets_dir, f"{cid}.gif")
            if os.path.isfile(img_path):
                with open(img_path, "rb") as fh:
                    img = MIMEImage(fh.read(), _subtype="gif")
                img.add_header("Content-ID", f"<{cid}>")
                img.add_header("Content-Disposition", "inline", filename=f"{cid}.gif")
                msg.attach(img)

        last_error = None
        for attempt in range(1, 4):
            try:
                if smtp_port == 465:
                    with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=20.0) as server:
                        server.login(smtp_user, smtp_pass)
                        server.send_message(msg)
                else:
                    with smtplib.SMTP(smtp_host, smtp_port, timeout=20.0) as server:
                        server.ehlo()
                        server.starttls()
                        server.ehlo()
                        server.login(smtp_user, smtp_pass)
                        server.send_message(msg)

                logger.info(f"[SMTP OK] Correo enviado a {to_email} ({subject})")
                return {"success": True, "to": to_email, "subject": subject}
            except Exception as exc:
                last_error = exc
                logger.warning(f"[SMTP ERROR] Intento {attempt}/3 a {to_email}: {exc}")
                if attempt < 3:
                    time.sleep(1.5)
        return {"success": False, "error": str(last_error)}

    @classmethod
    async def send_email(
        cls,
        to_email: str,
        subject: str,
        html_body: str,
        plain_body: Optional[str] = None,
    ) -> Dict[str, Any]:
        plain = plain_body or "Visualiza este correo en un cliente compatible con HTML."
        return await asyncio.to_thread(cls._send_sync, to_email, subject, html_body, plain)

    # ════════════════════════════════════════════════════════════════════════
    # 1. REGISTRO DE EGRESADO
    # ════════════════════════════════════════════════════════════════════════
    @classmethod
    async def send_graduate_welcome_email(
        cls,
        to_email: str,
        name: str,
        career: Optional[str] = None,
        city: Optional[str] = None,
    ) -> Dict[str, Any]:
        subject = "Bienvenido a Vincula · Tu cuenta de egresado está activa"
        preheader = f"Hola {name}, tu registro en la plataforma de empleabilidad Vincula fue exitoso."

        metadata = [
            ("Profesional registrado", name),
            ("Programa académico", career or "Egresado Universitario"),
            ("Correo electrónico", to_email),
            ("Estado de la cuenta", "Activa · Acceso habilitado"),
        ]
        if city:
            metadata.insert(2, ("Ubicación", city))

        html_body = _generate_vincula_email_html(
            preheader=preheader,
            status_pill="Cuenta Activa",
            eyebrow="REGISTRO DE EGRESADOS · RED IES",
            title="Tu registro en Vincula se ha completado",
            greeting=f"Hola, {name}:",
            paragraphs=[
                "Te damos la bienvenida a <strong>Vincula</strong>, el portal institucional de empleabilidad que conecta a los graduados de Educación Superior con vacantes verificadas del sector productivo.",
                "Tu cuenta ya se encuentra habilitada. Para aprovechar todas las herramientas de vinculación laboral, te recomendamos completar los datos de tu perfil profesional.",
            ],
            metadata_rows=metadata,
            steps_title="ACCIONES DISPONIBLES EN TU PANEL",
            steps_items=[
                "Completa tu experiencia laboral, competencias técnicas y resumen curricular.",
                "Consulta vacantes activas filtradas para tu programa académico.",
                "Postúlate en un clic y sigue en línea cada fase del proceso de selección.",
            ],
            cta_text="Completar mi perfil y ver vacantes",
            cta_url="https://vincula-henna.vercel.app/login?redirect=%2Fdashboard%2Fperfil",
        )

        plain_body = (
            f"Hola {name},\n\n"
            "Tu registro en Vincula se ha completado exitosamente.\n"
            f"Programa: {career or 'Egresado Universitario'}\n"
            "Completa tu perfil profesional en: https://vincula-henna.vercel.app/login?redirect=%2Fdashboard%2Fperfil\n\n"
            "Vincula · Bolsa de Empleo e IES Aliadas"
        )
        return await cls.send_email(to_email, subject, html_body, plain_body)

    # ════════════════════════════════════════════════════════════════════════
    # 2. REGISTRO DE EMPRESA (RADICACIÓN SLA 72H)
    # ════════════════════════════════════════════════════════════════════════
    @classmethod
    async def send_company_welcome_email(
        cls,
        to_email: str,
        company_name: str,
        radicado: str,
        nit: Optional[str] = None,
    ) -> Dict[str, Any]:
        subject = f"Solicitud empresarial radicada ({radicado}) · Vincula"
        preheader = f"Recepción de solicitud de vinculación corporativa para {company_name}."

        metadata = [
            ("Razón Social / Empresa", company_name),
            ("Número de Radicado", radicado),
            ("Estado de Validación", "En revisión documental (SLA 72h)"),
        ]
        if nit:
            metadata.insert(1, ("NIT", nit))

        html_body = _generate_vincula_email_html(
            preheader=preheader,
            status_pill="En Verificación · 72h",
            eyebrow="VINCULACIÓN EMPRESARIAL · AUDITORÍA JURÍDICA",
            title=f"Solicitud radicada para {company_name}",
            greeting="Estimado equipo corporativo:",
            paragraphs=[
                "Hemos recibido su solicitud de vinculación empresarial junto con los soportes jurídicos en nuestra plataforma.",
                "Por protocolo de seguridad institucional, el equipo administrador verificará su Certificado de Cámara de Comercio, RUT y documento de representación legal en un plazo máximo de <strong>72 horas hábiles</strong>.",
            ],
            metadata_rows=metadata,
            steps_title="ETAPAS DE VALIDACIÓN CORPORATIVA",
            steps_items=[
                "Revisión de vigencia mercantil y registro tributario ante RUES y DIAN.",
                "Notificación automática por este medio tan pronto la cuenta sea aprobada.",
                "Habilitación del módulo de publicación de vacantes y tablero ATS de selección.",
            ],
            cta_text="Consultar estado de mi solicitud",
            cta_url="https://vincula-henna.vercel.app/login",
        )

        plain_body = (
            f"Estimado equipo de {company_name},\n\n"
            f"Su solicitud de vinculación fue radicada con el código {radicado}.\n"
            "Plazo máximo de verificación documental: 72 horas hábiles.\n"
            "Consulta el estado en: https://vincula-henna.vercel.app/login"
        )
        return await cls.send_email(to_email, subject, html_body, plain_body)

    # ════════════════════════════════════════════════════════════════════════
    # 3. REGISTRO DE INSTITUCIÓN DE EDUCACIÓN SUPERIOR (RADICACIÓN SLA 72H)
    # ════════════════════════════════════════════════════════════════════════
    @classmethod
    async def send_institution_welcome_email(
        cls,
        to_email: str,
        institution_name: str,
        radicado: str,
        snies_code: Optional[str] = None,
    ) -> Dict[str, Any]:
        subject = f"Solicitud institucional radicada ({radicado}) · Vincula"
        preheader = f"Confirmación de radicación institucional para {institution_name}."

        metadata = [
            ("Institución (IES)", institution_name),
            ("Número de Radicado", radicado),
            ("Estado actual", "En validación MEN / SNIES (SLA 72h)"),
        ]
        if snies_code:
            metadata.insert(1, ("Código SNIES", snies_code))

        html_body = _generate_vincula_email_html(
            preheader=preheader,
            status_pill="Validación MEN · 72h",
            eyebrow="CONVENIO INSTITUCIONAL · EDUCACIÓN SUPERIOR",
            title=f"Expediente radicado para {institution_name}",
            greeting="Apreciadas autoridades universitarias:",
            paragraphs=[
                "Confirmamos la recepción de la solicitud de vinculación institucional en el ecosistema <strong>Vincula</strong>.",
                "Nuestro comité verificará la resolución de personería jurídica y el registro SNIES activo ante el Ministerio de Educación Nacional en un plazo máximo de <strong>72 horas hábiles</strong>.",
            ],
            metadata_rows=metadata,
            cta_text="Acceder al portal institucional",
            cta_url="https://vincula-henna.vercel.app/login",
        )

        plain_body = (
            f"{institution_name},\n\n"
            f"Solicitud institucional radicada con código {radicado}.\n"
            "Plazo de validación SNIES/MEN: 72 horas hábiles.\n"
            "Portal: https://vincula-henna.vercel.app/login"
        )
        return await cls.send_email(to_email, subject, html_body, plain_body)

    # ════════════════════════════════════════════════════════════════════════
    # 4. APROBACIÓN DE EMPRESA POR EL SUPERADMIN
    # ════════════════════════════════════════════════════════════════════════
    @classmethod
    async def send_company_approved_email(
        cls,
        to_email: str,
        company_name: str,
        nit: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        subject = f"Cuenta empresarial aprobada · {company_name} activa en Vincula"
        preheader = f"La auditoría documental de {company_name} fue aprobada exitosamente."

        metadata = [
            ("Empresa Homologada", company_name),
            ("NIT", nit or "Verificado"),
            ("Estado de Cuenta", "Aprobada · Sello Empresa Verificada"),
        ]

        html_body = _generate_vincula_email_html(
            preheader=preheader,
            status_pill="Empresa Verificada",
            eyebrow="AUDITORÍA COMPLETADA · ACCESO CORPORATIVO",
            title=f"{company_name} ha sido aprobada oficialmente",
            greeting="Estimado equipo de gestión humana y representación legal:",
            paragraphs=[
                f"Nos complace informarle que la auditoría documental de <strong>{company_name}</strong> ha concluido satisfactoriamente.",
                "Se ha levantado el periodo de cuarentena y su organización cuenta ahora con acceso total para publicar ofertas de empleo y gestionar procesos de selección con egresados de nuestras instituciones aliadas.",
            ],
            metadata_rows=metadata,
            callout_title="Dictamen de Auditoría Vincula",
            callout_body=notes or "Documentación jurídica y tributaria (Cámara de Comercio y RUT) verificada satisfactoriamente.",
            steps_title="FUNCIONES HABILITADAS EN SU CUENTA",
            steps_items=[
                "Publicación inmediata de vacantes laborales y convocatorias.",
                "Configuración de sedes corporativas y equipo de reclutadores.",
                "Acceso completo al tablero ATS Kanban para filtrar, evaluar y citar candidatos.",
            ],
            cta_text="Ingresar al panel de empresa",
            cta_url="https://vincula-henna.vercel.app/login",
        )

        plain_body = (
            f"Estimado equipo de {company_name},\n\n"
            "Su cuenta empresarial ha sido aprobada oficialmente en Vincula.\n"
            "Ya puede publicar vacantes y gestionar candidatos en: https://vincula-henna.vercel.app/login"
        )
        return await cls.send_email(to_email, subject, html_body, plain_body)

    # ════════════════════════════════════════════════════════════════════════
    # 5. APROBACIÓN DE INSTITUCIÓN (IES) POR EL SUPERADMIN
    # ════════════════════════════════════════════════════════════════════════
    @classmethod
    async def send_institution_approved_email(
        cls,
        to_email: str,
        institution_name: str,
        snies_code: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        subject = f"Institución avalada oficialmente · {institution_name} en Vincula"
        preheader = f"Acreditación institucional aprobada para {institution_name}."

        metadata = [
            ("Institución de Educación Superior", institution_name),
            ("Código SNIES", snies_code or "Verificado MEN"),
            ("Estado de Convenio", "Aprobado · Ecosistema Activo"),
        ]

        html_body = _generate_vincula_email_html(
            preheader=preheader,
            status_pill="IES Avalada MEN",
            eyebrow="ACREDITACIÓN INSTITUCIONAL · SNIES ACTIVO",
            title=f"Vinculación aprobada para {institution_name}",
            greeting="Apreciadas autoridades universitarias y coordinación de egresados:",
            paragraphs=[
                f"Tras validar la personería jurídica y el registro activo ante el Ministerio de Educación Nacional, la cuenta oficial de <strong>{institution_name}</strong> ha sido habilitada en <strong>Vincula</strong>.",
                "A partir de este momento, su institución puede gestionar programas académicos, monitorear indicadores de inserción laboral de sus graduados y formalizar alianzas con empresas verificadas.",
            ],
            metadata_rows=metadata,
            callout_title="Concepto de Validación",
            callout_body=notes or f"Aval institucional y registro SNIES {snies_code or ''} verificados satisfactoriamente.",
            steps_title="MÓDULOS HABILITADOS PARA SU INSTITUCIÓN",
            steps_items=[
                "Tablero de seguimiento y trazabilidad de empleabilidad de egresados.",
                "Administración de facultades, programas académicos y mallas curriculares.",
                "Gestión de convenios marco con el sector empresarial.",
            ],
            cta_text="Ingresar al portal institucional",
            cta_url="https://vincula-henna.vercel.app/login",
        )

        plain_body = (
            f"{institution_name},\n\n"
            "Su solicitud de vinculación institucional ha sido aprobada oficialmente en Vincula.\n"
            "Acceda al panel en: https://vincula-henna.vercel.app/login"
        )
        return await cls.send_email(to_email, subject, html_body, plain_body)

    # ════════════════════════════════════════════════════════════════════════
    # 6. POSTULACIÓN DE EGRESADO A VACANTE (FASE 1)
    # ════════════════════════════════════════════════════════════════════════
    @classmethod
    async def send_application_created_email(
        cls,
        to_email: str,
        graduate_name: str,
        vacancy_title: str,
        company_name: str,
        vacancy_code: Optional[str] = None,
        modality: Optional[str] = None,
        location: Optional[str] = None,
        current_stage: str = "en_revision",
    ) -> Dict[str, Any]:
        stage_info = get_stage_display_info(current_stage)
        subject = f"Postulación registrada: {vacancy_title} en {company_name}"
        preheader = f"Tu postulación a {vacancy_title} se encuentra en {stage_info['label']}."

        mod_loc = " · ".join(filter(None, [modality, location])) or "Colombia"
        vac_display = f"{vacancy_title} ({vacancy_code})" if vacancy_code else vacancy_title

        metadata = [
            ("Candidato", graduate_name),
            ("Convocatoria / Vacante", vac_display),
            ("Empresa", company_name),
            ("Modalidad y Ubicación", mod_loc),
            ("Fase actual del proceso", stage_info["badge"]),
        ]

        html_body = _generate_vincula_email_html(
            preheader=preheader,
            status_pill=f"Fase {stage_info['step']} · {stage_info['label']}",
            eyebrow="CONFIRMACIÓN DE POSTULACIÓN · SEGUIMIENTO ATS",
            title=f"Tu postulación fue enviada a {company_name}",
            greeting=f"Hola, {graduate_name}:",
            paragraphs=[
                f"Hemos registrado tu postulación a la vacante <strong>{vacancy_title}</strong> ofertada por <strong>{company_name}</strong>.",
                f"Actualmente tu candidatura se encuentra en la <strong>Fase {stage_info['step']}: {stage_info['label']}</strong>. Te notificaremos por correo electrónico cada vez que el reclutador actualice o avance tu estado dentro del proceso de selección.",
            ],
            metadata_rows=metadata,
            pipeline_stage=current_stage,
            cta_text="Ver mis postulaciones en tiempo real",
            cta_url="https://vincula-henna.vercel.app/login?redirect=%2Fdashboard%2Fpostulaciones",
        )

        plain_body = (
            f"Hola {graduate_name},\n\n"
            f"Tu postulación a '{vacancy_title}' en {company_name} fue registrada.\n"
            f"Fase actual: {stage_info['badge']}\n"
            "Consulta tu seguimiento en: https://vincula-henna.vercel.app/login?redirect=%2Fdashboard%2Fpostulaciones"
        )
        return await cls.send_email(to_email, subject, html_body, plain_body)

    # ════════════════════════════════════════════════════════════════════════
    # 7. AVANCE O CAMBIO DE FASE EN EL PIPELINE ATS
    # ════════════════════════════════════════════════════════════════════════
    @classmethod
    async def send_application_phase_changed_email(
        cls,
        to_email: str,
        graduate_name: str,
        vacancy_title: str,
        company_name: str,
        new_stage: str,
        previous_stage: Optional[str] = None,
        vacancy_code: Optional[str] = None,
        recruiter_feedback: Optional[str] = None,
        interview_details: Optional[str] = None,
    ) -> Dict[str, Any]:
        new_info = get_stage_display_info(new_stage)
        prev_info = get_stage_display_info(previous_stage) if previous_stage else None
        is_discarded = new_info["key"] == "descartados"

        if is_discarded:
            subject = f"Actualización de tu postulación: {vacancy_title} en {company_name}"
            title = f"Actualización sobre el proceso en {company_name}"
            pill_text = "Proceso Cerrado"
            paragraphs = [
                f"El equipo de selección de <strong>{company_name}</strong> ha actualizado el estado de tu postulación para la vacante <strong>{vacancy_title}</strong>.",
                "En esta ocasión se ha decidido continuar el proceso con otros perfiles. Tus datos y hoja de vida siguen activos en Vincula para futuras convocatorias de nuestras empresas aliadas.",
            ]
        else:
            subject = f"Avanzaste a {new_info['label']} · {vacancy_title} ({company_name})"
            title = f"Tu postulación avanzó a: {new_info['label']}"
            pill_text = f"Fase {new_info['step']} · {new_info['label']}"
            paragraphs = [
                f"Buenas noticias: el equipo de talento humano de <strong>{company_name}</strong> ha avanzado tu postulación para la vacante <strong>{vacancy_title}</strong>.",
                f"Ahora te encuentras en la <strong>{new_info['badge']}</strong>. A continuación puedes consultar el estado actualizado de tu proceso:",
            ]

        vac_display = f"{vacancy_title} ({vacancy_code})" if vacancy_code else vacancy_title
        metadata = [
            ("Candidato", graduate_name),
            ("Vacante", vac_display),
            ("Empresa", company_name),
        ]
        if prev_info and prev_info["key"] != new_info["key"]:
            metadata.append(("Fase anterior", prev_info["label"]))
        metadata.append(("Fase actual", new_info["badge"]))
        if interview_details:
            metadata.append(("Programación de entrevista", interview_details))

        callout_title = None
        callout_body = None
        if interview_details:
            callout_title = "Detalles de tu Citación a Entrevista"
            callout_body = interview_details
            if recruiter_feedback:
                callout_body += f"<br/><br/><strong>Nota del reclutador:</strong> {recruiter_feedback}"
        elif recruiter_feedback:
            callout_title = "Observaciones del Equipo de Selección"
            callout_body = recruiter_feedback

        html_body = _generate_vincula_email_html(
            preheader=f"Actualización de fase en {company_name}: {new_info['label']}.",
            status_pill=pill_text,
            eyebrow="ACTUALIZACIÓN DE PROCESO · TRAZABILIDAD ATS",
            title=title,
            greeting=f"Hola, {graduate_name}:",
            paragraphs=paragraphs,
            metadata_rows=metadata,
            pipeline_stage=new_stage,
            callout_title=callout_title,
            callout_body=callout_body,
            cta_text="Consultar detalle en mis postulaciones",
            cta_url="https://vincula-henna.vercel.app/login?redirect=%2Fdashboard%2Fpostulaciones",
        )

        plain_body = (
            f"Hola {graduate_name},\n\n"
            f"Tu postulación a '{vacancy_title}' en {company_name} fue actualizada.\n"
            f"Nueva fase: {new_info['badge']}\n"
            f"{('Detalles: ' + interview_details) if interview_details else ''}\n"
            "Revisa tu panel en: https://vincula-henna.vercel.app/login?redirect=%2Fdashboard%2Fpostulaciones"
        )
        return await cls.send_email(to_email, subject, html_body, plain_body)
