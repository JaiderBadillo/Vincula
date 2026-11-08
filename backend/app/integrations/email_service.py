"""
Servicio Transaccional de Correo Electrónico vía Gmail SMTP.
Permite enviar correos directos, rápidos y 100% gratuitos para siempre
utilizando una cuenta de Gmail con Contraseña de Aplicación de Google.
Funciona de forma asíncrona mediante asyncio.to_thread para no bloquear el Event Loop.
"""

import smtplib
import asyncio
import logging
from typing import Dict, Any, Optional
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings

logger = logging.getLogger("vincula.email")


def _generate_email_html(
    preheader: str,
    title: str,
    greeting: str,
    intro_paragraphs: list[str],
    bullet_points: Optional[list[str]] = None,
    cta_text: Optional[str] = None,
    cta_url: Optional[str] = None,
    extra_note: Optional[str] = None,
) -> str:
    """Genera una plantilla HTML responsive y moderna para Vincula."""
    bullets_html = ""
    if bullet_points:
        items = "".join(
            f"""<li style="margin-bottom: 8px; color: #1e293b;">
                <span style="color: #059669; font-weight: bold; margin-right: 6px;">✓</span>{pt}
            </li>"""
            for pt in bullet_points
        )
        bullets_html = f"""
        <div style="background-color: #f8fafc; border-radius: 12px; padding: 16px 20px; margin: 20px 0; border: 1px solid #e2e8f0;">
            <ul style="list-style: none; padding: 0; margin: 0; font-size: 14px; line-height: 1.6;">
                {items}
            </ul>
        </div>
        """

    button_html = ""
    if cta_text and cta_url:
        button_html = f"""
        <div style="text-align: center; margin: 32px 0 24px;">
            <a href="{cta_url}" 
               style="background-color: #051F26; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(5, 31, 38, 0.2);">
                {cta_text} &rarr;
            </a>
        </div>
        """

    paragraphs_html = "".join(
        f"""<p style="margin: 0 0 16px; color: #334155; font-size: 15px; line-height: 1.65;">{p}</p>"""
        for p in intro_paragraphs
    )

    note_html = ""
    if extra_note:
        note_html = f"""
        <div style="border-left: 3px solid #f59e0b; background-color: #fffbeb; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 20px 0;">
            <p style="margin: 0; font-size: 13px; color: #78350f; line-height: 1.5;">{extra_note}</p>
        </div>
        """

    return f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <div style="display: none; max-height: 0px; overflow: hidden; opacity: 0;">
        {preheader}
    </div>
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 30px 10px;">
        <tr>
            <td align="center">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0;">
                    <!-- Cabecera Corporativa -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #051F26 0%, #0d3b4c 100%); padding: 36px 32px 30px; text-align: left;">
                            <div style="display: inline-block; background-color: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 20px; padding: 4px 12px; margin-bottom: 12px;">
                                <span style="color: #34d399; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Ecosistema de Empleabilidad IES</span>
                            </div>
                            <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; line-height: 1.2;">
                                VINCULA
                            </h1>
                            <p style="margin: 6px 0 0; color: #94a3b8; font-size: 13px;">
                                Plataforma Universitaria de Prácticas y Empleo
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Cuerpo del Mensaje -->
                    <tr>
                        <td style="padding: 36px 32px 28px;">
                            <h2 style="margin: 0 0 16px; color: #0f172a; font-size: 20px; font-weight: 750; letter-spacing: -0.3px;">
                                {title}
                            </h2>
                            <p style="margin: 0 0 20px; color: #0f172a; font-size: 16px; font-weight: 600;">
                                {greeting}
                            </p>
                            
                            {paragraphs_html}
                            {bullets_html}
                            {button_html}
                            {note_html}
                            
                            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0 20px;" />
                            
                            <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.5;">
                                Atentamente,<br/>
                                <strong style="color: #0f172a;">Equipo Vincula & Dirección de Egresados</strong><br/>
                                <span style="font-size: 12px; color: #94a3b8;">Alianza Unidades Tecnológicas de Santander (UTS) e Instituciones de Educación Superior</span>
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Pie de Página -->
                    <tr>
                        <td style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
                            <p style="margin: 0 0 8px; color: #64748b; font-size: 11px; line-height: 1.5;">
                                Este mensaje fue enviado automáticamente a través del portal oficial <strong>Vincula</strong> en virtud de tu solicitud de registro institucional o laboral.
                            </p>
                            <p style="margin: 0; color: #94a3b8; font-size: 11px;">
                                Tratamiento de datos protegido bajo la Ley 1581 de 2012 de Habeas Data · Bucaramanga, Colombia.
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
    """Servicio para enviar correos directos vía Gmail SMTP."""

    @staticmethod
    def _send_sync(to_email: str, subject: str, html_body: str, plain_body: str) -> Dict[str, Any]:
        """Envío síncrono del correo mediante smtplib (se ejecuta en un thread separado)."""
        smtp_user = settings.SMTP_USER.strip()
        smtp_pass = settings.SMTP_PASSWORD.strip().replace(" ", "")
        smtp_host = settings.SMTP_HOST.strip() or "smtp.gmail.com"
        smtp_port = int(settings.SMTP_PORT) if settings.SMTP_PORT else 465
        from_name = settings.SMTP_FROM_NAME or "Vincula - Red de Empleabilidad"
        from_email = settings.SMTP_FROM_EMAIL.strip() or smtp_user

        if not smtp_user or not smtp_pass:
            logger.info(
                f"[SMTP NOT CONFIG] Correo hacia '{to_email}' omitido. "
                "Para activarlo, agrega SMTP_USER y SMTP_PASSWORD en backend/.env"
            )
            return {
                "success": False,
                "reason": "SMTP no configurado en variables de entorno (SMTP_USER / SMTP_PASSWORD)"
            }

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{from_name} <{from_email}>"
        msg["To"] = to_email

        # Versión en texto plano (fallback)
        msg.attach(MIMEText(plain_body, "plain", "utf-8"))
        # Versión HTML enriquecida
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        try:
            if smtp_port == 465:
                # Conexión directa SSL (estándar seguro recomendado para Gmail)
                with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=12.0) as server:
                    server.login(smtp_user, smtp_pass)
                    server.send_message(msg)
            else:
                # Conexión STARTTLS (puerto 587)
                with smtplib.SMTP(smtp_host, smtp_port, timeout=12.0) as server:
                    server.ehlo()
                    server.starttls()
                    server.ehlo()
                    server.login(smtp_user, smtp_pass)
                    server.send_message(msg)

            logger.info(f"[SMTP OK] Correo enviado exitosamente a {to_email} ({subject})")
            return {"success": True, "to": to_email, "subject": subject}
        except Exception as exc:
            logger.warning(f"[SMTP ERROR] No se pudo enviar correo a {to_email}: {exc}")
            return {"success": False, "error": str(exc)}

    @classmethod
    async def send_email(
        cls,
        to_email: str,
        subject: str,
        html_body: str,
        plain_body: Optional[str] = None
    ) -> Dict[str, Any]:
        """Envía un correo de forma asíncrona delegando el trabajo I/O a un thread."""
        plain = plain_body or "Por favor visualiza este correo en un cliente compatible con HTML."
        return await asyncio.to_thread(cls._send_sync, to_email, subject, html_body, plain)

    # ════════════════════════════════════════════════════════════════════════
    # PLANTILLAS ESPECÍFICAS DE VINCULA
    # ════════════════════════════════════════════════════════════════════════

    @classmethod
    async def send_graduate_welcome_email(
        cls,
        to_email: str,
        name: str,
        career: Optional[str] = None
    ) -> Dict[str, Any]:
        """Envía el correo de bienvenida al registrarse como egresado."""
        subject = "¡Bienvenido a Vincula! 🚀 Da el siguiente nivel a tu empleo"
        preheader = "Tu cuenta en Vincula está lista. Completa tu perfil para conectar con oportunidades."
        greeting = f"Hola, {name}."
        career_text = f" como graduado de <strong>{career}</strong>" if career else ""

        paragraphs = [
            f"Te damos una cordial bienvenida a <strong>Vincula</strong>, la plataforma que conecta a los egresados de las mejores Instituciones de Educación Superior con las empresas más destacadas de la región.",
            f"Tu pre-registro{career_text} ha sido completado con éxito. Ahora estás a un solo paso de acceder a vacantes exclusivas que valoran tu formación profesional y competencias técnicas.",
        ]

        bullets = [
            "<strong>Completa tu Hoja de Vida:</strong> Añade tu experiencia, proyectos y competencias destacadas.",
            "<strong>Matching con IA:</strong> Nuestro algoritmo asociará tu perfil con ofertas afines a tu carrera.",
            "<strong>Postulación con un clic:</strong> Aplica a convocatorias con total trazabilidad y seguimiento en tiempo real.",
        ]

        extra_note = (
            "💡 <strong>Consejo profesional:</strong> Los perfiles que completan sus datos y suben su soporte de grado tienen hasta un 85% más de probabilidades de ser contactados por reclutadores en su primera semana."
        )

        cta_text = "Completar mi perfil y explorar empleos"
        cta_url = "https://vincula-henna.vercel.app/login?redirect=%2Fdashboard%2Fperfil"

        html_body = _generate_email_html(
            preheader=preheader,
            title="¡Bienvenido a tu nuevo portal de empleo!",
            greeting=greeting,
            intro_paragraphs=paragraphs,
            bullet_points=bullets,
            cta_text=cta_text,
            cta_url=cta_url,
            extra_note=extra_note,
        )

        plain_body = f"""
Hola {name},

¡Bienvenido a Vincula! Tu registro ha sido exitoso.
Da el siguiente paso completando tu perfil profesional para conectar con ofertas exclusivas:
https://vincula-henna.vercel.app/login?redirect=%2Fdashboard%2Fperfil

Equipo Vincula & Dirección de Egresados
        """.strip()

        return await cls.send_email(to_email, subject, html_body, plain_body)

    @classmethod
    async def send_company_welcome_email(
        cls,
        to_email: str,
        company_name: str,
        radicado: str
    ) -> Dict[str, Any]:
        """Envía confirmación de radicación y SLA 72h a la empresa solicitante."""
        subject = f"Solicitud de Vinculación Radicada ({radicado}) · Vincula"
        preheader = f"Hemos recibido la solicitud de {company_name}. Inicio de auditoría documental SLA 72h."
        greeting = f"Estimado equipo de {company_name},"

        paragraphs = [
            f"Hemos recibido satisfactoriamente su solicitud de vinculación corporativa en la plataforma <strong>Vincula</strong>.",
            f"Su expediente fue radicado bajo el código oficial: <strong style='font-family: monospace; font-size: 15px; color: #051F26;'>{radicado}</strong>.",
            "Para garantizar la transparencia y seguridad de nuestra comunidad universitaria, nuestro equipo jurídico auditará su Certificado de Existencia y Representación Legal (Cámara de Comercio) y RUT ante el RUES y la DIAN en un plazo máximo de <strong>72 horas hábiles</strong>.",
        ]

        bullets = [
            "Auditoría de antecedentes tributarios y vigencia mercantil en trámite.",
            "Una vez aprobada, se activarán sus credenciales para publicar vacantes.",
            "Acceso directo a banco de talento certificado de las Instituciones aliadas.",
        ]

        cta_text = "Consultar estado de solicitud"
        cta_url = "https://vincula-henna.vercel.app/login"

        html_body = _generate_email_html(
            preheader=preheader,
            title="Solicitud Empresarial Radicada",
            greeting=greeting,
            intro_paragraphs=paragraphs,
            bullet_points=bullets,
            cta_text=cta_text,
            cta_url=cta_url,
        )

        plain_body = f"""
Estimado equipo de {company_name},

Hemos recibido su solicitud de vinculación en Vincula.
Radicado oficial: {radicado}
Plazo de validación: 72 horas hábiles.

Equipo Jurídico Vincula
        """.strip()

        return await cls.send_email(to_email, subject, html_body, plain_body)

    @classmethod
    async def send_institution_welcome_email(
        cls,
        to_email: str,
        institution_name: str,
        radicado: str
    ) -> Dict[str, Any]:
        """Envía confirmación de radicación institucional a una IES."""
        subject = f"Solicitud de Vinculación IES Radicada ({radicado}) · Vincula"
        preheader = f"Registro institucional de {institution_name} recibido para validación SNIES y MEN."
        greeting = f"Apreciadas autoridades de {institution_name},"

        paragraphs = [
            f"Confirmamos la radicación del registro institucional de <strong>{institution_name}</strong> en el ecosistema <strong>Vincula</strong>.",
            f"Su expediente ha quedado registrado con el número: <strong style='font-family: monospace; font-size: 15px; color: #051F26;'>{radicado}</strong>.",
            "Nuestro equipo cotejará la personería jurídica y el registro activo en el SNIES ante el Ministerio de Educación Nacional (MEN) en un plazo máximo de 72 horas.",
        ]

        cta_text = "Acceder al Portal Institucional"
        cta_url = "https://vincula-henna.vercel.app/login"

        html_body = _generate_email_html(
            preheader=preheader,
            title="Vinculación Institucional Radicada",
            greeting=greeting,
            intro_paragraphs=paragraphs,
            cta_text=cta_text,
            cta_url=cta_url,
        )

        plain_body = f"""
{institution_name},

Registro institucional radicado: {radicado}.
Equipo Vincula & Alianza IES
        """.strip()

        return await cls.send_email(to_email, subject, html_body, plain_body)

