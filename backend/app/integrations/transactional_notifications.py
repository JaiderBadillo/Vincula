"""Correos transaccionales de Vincula entregados a n8n por HTTPS."""

import logging
from html import escape

from app.core.config import settings
from app.integrations.email_service import _generate_vincula_email_html, get_stage_display_info
from app.integrations.n8n_webhooks import N8nWebhookDispatcher

logger = logging.getLogger("vincula.notifications")


def _clean(value, fallback=""):
    return escape(str(value or fallback), quote=True)


def build_message(kind, data):
    """Construye asunto, texto y HTML con la identidad visual existente."""
    name = _clean(data.get("nombre"), "Usuario de Vincula")
    institution = _clean(data.get("institucion"), "tu institución")
    company = _clean(data.get("empresa"), "tu empresa")
    vacancy = _clean(data.get("vacante"), "la convocatoria")
    stage = get_stage_display_info(data.get("fase_nueva"))

    content = {
        "registro_egresado": ("Bienvenido a Vincula", "Cuenta registrada", "REGISTRO DE EGRESADOS",
            "Tu registro en Vincula se ha completado",
            "Tu cuenta está activa. Los documentos académicos que aportaste están pendientes de revisión por tu IES.",
            [("Programa", _clean(data.get("carrera"), "Pendiente de completar")), ("Estado documental", "En revisión")]),
        "registro_empresa": ("Registro de empresa recibido · Vincula", "Documentos en revisión", "REGISTRO DE EMPRESA",
            "Recibimos el registro de tu empresa",
            "La documentación de tu empresa está siendo revisada por el equipo de Vincula. Te informaremos cuando termine la verificación.",
            [("Empresa", company), ("Radicado", _clean(data.get("radicado")))]),
        "registro_ies": ("Registro institucional recibido · Vincula", "Documentos en revisión", "REGISTRO IES",
            "Recibimos el registro de tu institución",
            "La documentación institucional está siendo revisada por el equipo de Vincula. Te informaremos cuando termine la verificación.",
            [("Institución", institution), ("Radicado", _clean(data.get("radicado")))]),
        "egresado_verificado": ("Tu título fue aprobado por tu IES · Vincula", "Título aprobado", "VALIDACIÓN ACADÉMICA",
            "Tus documentos han sido aprobados",
            f"Tus documentos han sido aprobados por {institution}. Ya puedes consultar tu sello de validación en Vincula.",
            [("Institución", institution), ("Programa", _clean(data.get("programa"))), ("Acta", _clean(data.get("acta")))]),
        "empresa_aprobada": ("Empresa verificada · Vincula", "Empresa aprobada", "VERIFICACIÓN DE EMPRESA",
            "Tu empresa fue verificada",
            "El equipo de Vincula aprobó los documentos de tu empresa. Ya puedes utilizar las funciones habilitadas para empresas verificadas.",
            [("Empresa", company), ("Estado", "Aprobada")]),
        "ies_aprobada": ("Institución verificada · Vincula", "IES aprobada", "VERIFICACIÓN INSTITUCIONAL",
            "Tu institución fue verificada",
            "El equipo de Vincula aprobó los documentos de tu institución. Ya puedes gestionar las funciones institucionales habilitadas.",
            [("Institución", institution), ("Estado", "Aprobada")]),
        "fase_postulacion": ("Actualización de tu postulación · Vincula", "Nueva fase", "SEGUIMIENTO DE POSTULACIÓN",
            "Cambió la fase de tu postulación",
            f"Tu postulación a {vacancy} cambió a la fase {escape(stage['label'])}.",
            [("Convocatoria", vacancy), ("Empresa", company), ("Fase actual", escape(stage['label']))]),
    }
    if kind not in content:
        raise ValueError(f"Tipo de correo desconocido: {kind}")
    subject, pill, eyebrow, title, paragraph, metadata = content[kind]
    html = _generate_vincula_email_html(
        preheader=paragraph, status_pill=pill, eyebrow=eyebrow, title=title,
        greeting=f"Hola, {name}:", paragraphs=[paragraph], metadata_rows=metadata,
        pipeline_stage=data.get("fase_nueva") if kind == "fase_postulacion" else None,
        cta_text="Ingresar a Vincula", cta_url="https://vincula.vercel.app/login",
    )
    # El logo CID de la plantilla SMTP no se adjunta al enviar con Gmail API.
    html = html.replace('<img src="cid:vincula_logo" width="300" height="64" alt="Vincula" style="display: block; margin: 0 auto; border: 0;" />',
                        '<span style="font-size:30px;font-weight:800;color:#FFFFFF;letter-spacing:.02em">Vincula</span>')
    return subject, paragraph, html


async def send_vincula_email(kind, recipient, **data):
    """Entrega a n8n; nunca interpreta un webhook ausente como correo enviado."""
    if not recipient:
        logger.warning("Correo %s omitido: destinatario vacío", kind)
        return False
    if not settings.N8N_WEBHOOK_BASE_URL or not settings.N8N_WEBHOOK_SECRET:
        logger.error("Correo %s no enviado: n8n no configurado", kind)
        return False
    subject, plain, html = build_message(kind, data)
    accepted = await N8nWebhookDispatcher.dispatch_event("correo-transaccional", {
        "tipo": kind, "correo": recipient, "asunto": subject,
        "texto": plain, "html": html,
    })
    if not accepted:
        logger.error("n8n no confirmó correo %s", kind)
    return accepted
