"""Correos transaccionales de Vincula entregados mediante Brevo API HTTPS."""

import logging
import re
from datetime import date

import httpx
from html import escape

from app.core.config import settings
from app.integrations.email_service import _generate_vincula_email_html, get_stage_display_info

logger = logging.getLogger("vincula.notifications")


def _clean(value, fallback=""):
    return escape(str(value or fallback), quote=True)


_MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
_DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]


def _long_date(value):
    """'2026-11-20' -> 'viernes 20 de noviembre de 2026' (sin depender del idioma del servidor)."""
    try:
        d = date.fromisoformat(str(value)[:10])
    except ValueError:
        return _clean(value)
    return f"{_DIAS[d.weekday()]} {d.day} de {_MESES[d.month - 1]} de {d.year}"


FRONTEND_URL = "https://vincula-henna.vercel.app"


def _response_url(data):
    """Enlace para que el egresado confirme; solo se acepta el de nuestra propia página, sin caracteres raros."""
    url = str(data.get("responder_url") or "")
    ok = url.startswith(f"{FRONTEND_URL}/entrevista/responder?token=") and re.fullmatch(r"[A-Za-z0-9._:/?=-]+", url)
    return url if ok else None


def _interview_content(data, company, vacancy):
    """Texto y filas de la cita: enlace si es virtual, lugar si es presencial."""
    virtual = str(data.get("modalidad", "")).strip().lower() == "virtual"
    where = str(data.get("enlace") or "").strip()
    link = where if virtual and re.fullmatch(r"https?://[^\s<>\"']+", where) else None
    when = f"{_long_date(data.get('fecha'))} a las {_clean(data.get('franja'))}"
    text = f"{company} te cita a una entrevista para la vacante {vacancy}: {when} ({'virtual' if virtual else 'presencial'})."
    if link:
        text += f" Únete con este enlace: {link}"  # el enlace ya está validado: sin caracteres que rompan HTML
    elif not virtual and where:
        text += f" Lugar: {_clean(where)}."
    if data.get("objetivo"):
        text += f" Objetivo: {_clean(data.get('objetivo'))}."
    respuesta = _response_url(data)
    text += (f" Confirma si asistirás o pide otra fecha aquí: {respuesta}" if respuesta
             else " Si no puedes asistir, avísale a la empresa con tiempo.")
    rows = [("Vacante", vacancy), ("Empresa", company), ("Fecha", _long_date(data.get("fecha"))),
            ("Hora", _clean(data.get("franja"))), ("Modalidad", "Virtual" if virtual else "Presencial")]
    rows.append(("Enlace", link) if link else ("Lugar", _clean(where, "Por confirmar")))
    if data.get("reclutador"):
        rows.append(("Te entrevista", _clean(data.get("reclutador"))))
    if respuesta:
        rows.append(("Estado", "Pendiente de tu confirmación"))
    return text, rows, link


def build_message(kind, data):
    """Construye asunto, texto y HTML con la identidad visual existente."""
    name = _clean(data.get("nombre"), "Usuario de Vincula")
    institution = _clean(data.get("institucion"), "tu institución")
    company = _clean(data.get("empresa"), "tu empresa")
    vacancy = _clean(data.get("vacante"), "la convocatoria")
    stage = get_stage_display_info(data.get("fase_nueva"))
    code = _clean(data.get("codigo"))
    minutes = _clean(data.get("minutos_validez"), "10")

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
        "vacante_publicada": ("Vacante publicada · Vincula", "Vacante abierta", "PUBLICACIÓN DE VACANTE",
            "Tu vacante ya está publicada",
            f"La vacante {vacancy} ya está visible para los egresados en Vincula.",
            [("Vacante", vacancy), ("Código", _clean(data.get("codigo"), "—")), ("Empresa", company)]),
        "postulacion_creada": ("Postulación enviada · Vincula", "En revisión inicial", "CONFIRMACIÓN DE POSTULACIÓN",
            "Recibimos tu postulación",
            f"Tu postulación a {vacancy} en {company} fue registrada en etapa inicial.",
            [("Convocatoria", vacancy), ("Código", _clean(data.get("codigo"), "—")), ("Empresa", company), ("Fase actual", "En revisión inicial")]),
        "recuperacion_contrasena": ("Código para restablecer tu contraseña · Vincula", "Código de un solo uso", "SEGURIDAD DE LA CUENTA",
            "Restablece tu contraseña",
            f"Tu código para restablecer la contraseña de Vincula es {code}. Vence en {minutes} minutos y solo sirve una vez. "
            "Si no lo solicitaste, ignora este mensaje: tu contraseña no cambia. No compartas este código con nadie.",
            [("Código de verificación", code), ("Vigencia", f"{minutes} minutos")]),
        "contrasena_actualizada": ("Tu contraseña de Vincula fue actualizada", "Contraseña actualizada", "SEGURIDAD DE LA CUENTA",
            "Cambiaste tu contraseña",
            "La contraseña de tu cuenta de Vincula acaba de actualizarse. Si no fuiste tú, restablécela de inmediato desde \"¿Olvidaste tu contraseña?\" en la página de inicio de sesión y avisa al equipo de Vincula.",
            [("Estado", "Contraseña actualizada")]),
        "vacante_inhabilitada": ("Tu vacante fue inhabilitada · Vincula", "Vacante inhabilitada", "MODERACIÓN DE CONTENIDO",
            "Inhabilitamos una de tus vacantes",
            f"El equipo de Vincula inhabilitó la vacante {vacancy} tras una revisión por posible irregularidad. Ya no es visible para los egresados. Si crees que es un error, responde a este correo o contacta a soporte.",
            [("Vacante", vacancy), ("Empresa", company), ("Estado", "Inhabilitada")]),
        "entrevista_programada": ("Te citaron a una entrevista · Vincula", "Entrevista programada", "ENTREVISTA DE SELECCIÓN",
            f"{company} te cita a una entrevista", *_interview_content(data, company, vacancy)[:2]),
        "entrevista_respuesta": ("Respuesta a tu cita de entrevista · Vincula", "Respuesta del candidato", "SEGUIMIENTO DE ENTREVISTA",
            f"{_clean(data.get('candidato'), 'El egresado')} " + ("confirmó su asistencia" if data.get("accion") == "confirmo" else "no podrá asistir"),
            f"{_clean(data.get('candidato'), 'El egresado')} " + ("confirmó que asistirá" if data.get("accion") == "confirmo" else "avisó que no puede asistir y pide otra fecha")
            + f" a la entrevista de {vacancy} del {_long_date(data.get('fecha'))} a las {_clean(data.get('franja'))}."
            + (f" Motivo: {_clean(data.get('motivo'))}." if data.get("motivo") else "")
            + ("" if data.get("accion") == "confirmo" else " Agenda una nueva cita desde Vincula."),
            [("Candidato", _clean(data.get("candidato"), "Egresado")), ("Vacante", vacancy), ("Fecha", _long_date(data.get("fecha"))),
             ("Hora", _clean(data.get("franja"))), ("Respuesta", "Confirmada" if data.get("accion") == "confirmo" else "Solicita reprogramar")]),
        "convenio_propuesta": ("Propuesta de convenio · Vincula", "Propuesta de convenio", "CONVENIOS",
            f"{_clean(data.get('contraparte'), 'Una entidad')} te propone un convenio",
            f"{_clean(data.get('contraparte'), 'Una entidad')} te propone un convenio de {_clean(data.get('tipo'))} con {_clean(data.get('vacantes'))} vacante(s) proyectadas "
            f"y duración de {_clean(data.get('anos'))} año(s)." + (f" Mensaje: {_clean(data.get('mensaje'))}." if data.get("mensaje") else "")
            + " Ingresa a Vincula para aceptarla o rechazarla.",
            [("Propone", _clean(data.get("contraparte"))), ("Tipo", _clean(data.get("tipo"))), ("Vacantes proyectadas", _clean(data.get("vacantes"))),
             ("Duración", f"{_clean(data.get('anos'))} año(s)")]),
        "convenio_respuesta": ("Respuesta a tu propuesta de convenio · Vincula", "Respuesta de convenio", "CONVENIOS",
            f"{_clean(data.get('contraparte'), 'La otra parte')} " + ("aceptó tu propuesta de convenio" if data.get("accion") == "aceptar" else "rechazó tu propuesta de convenio"),
            ("El convenio quedó vigente: ya pueden publicar vacantes exclusivas para sus egresados." if data.get("accion") == "aceptar"
             else "La propuesta no fue aceptada.") + (f" Mensaje: {_clean(data.get('mensaje'))}." if data.get("mensaje") else ""),
            [("Entidad", _clean(data.get("contraparte"))), ("Respuesta", "Aceptada" if data.get("accion") == "aceptar" else "Rechazada")]),
        "nueva_postulacion_empresa": ("Nueva postulación recibida · Vincula", "Nuevo candidato", "SEGUIMIENTO DE VACANTE",
            "Recibiste una nueva postulación",
            f"{_clean(data.get('candidato'), 'Un egresado')} se postuló a {vacancy}.",
            [("Candidato", _clean(data.get("candidato"), "Egresado")), ("Vacante", vacancy), ("Código", _clean(data.get("codigo"), "—")), ("Empresa", company)]),
    }
    if kind not in content:
        raise ValueError(f"Tipo de correo desconocido: {kind}")
    subject, pill, eyebrow, title, paragraph, metadata = content[kind]
    pipeline_stage = data.get("fase_nueva") if kind == "fase_postulacion" else ("en_revision" if kind == "postulacion_creada" else None)
    # Los correos de seguridad no llevan botón: el usuario no debe seguir enlaces para cambiar su clave.
    seguridad = kind in ("recuperacion_contrasena", "contrasena_actualizada")
    if kind == "entrevista_programada":
        link = _interview_content(data, company, vacancy)[2]
        respuesta = _response_url(data)
        cta = (("Confirmar asistencia", escape(respuesta, quote=True)) if respuesta
               else ("Unirme a la reunión", escape(link, quote=True)) if link else (None, None))
    elif seguridad:
        cta = (None, None)
    else:
        cta = ("Ingresar a Vincula", "https://vincula-henna.vercel.app/login")
    html = _generate_vincula_email_html(
        preheader=paragraph, status_pill=pill, eyebrow=eyebrow, title=title,
        greeting="Hola:" if seguridad else f"Hola, {name}:", paragraphs=[paragraph], metadata_rows=metadata,
        pipeline_stage=pipeline_stage,
        cta_text=cta[0], cta_url=cta[1],
    )
    # El logo CID de la plantilla SMTP no se adjunta al enviar con Gmail API.
    html = html.replace('<img src="cid:vincula_logo" width="300" height="64" alt="Vincula" style="display: block; margin: 0 auto; border: 0;" />',
                        '<span style="font-size:30px;font-weight:800;color:#FFFFFF;letter-spacing:.02em">Vincula</span>')
    return subject, paragraph, html


async def _send_with_brevo(recipient, subject, plain, html):
    """Envía por la API HTTPS de Brevo (puerto 443; no depende de SMTP)."""
    sender = settings.SMTP_FROM_EMAIL or settings.SMTP_USER
    if not sender:
        logger.error("Brevo: falta SMTP_FROM_EMAIL (remitente verificado en Brevo)")
        return False
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post("https://api.brevo.com/v3/smtp/email", json={
                "sender": {"name": settings.SMTP_FROM_NAME or "Vincula", "email": sender},
                "to": [{"email": recipient}], "subject": subject,
                "htmlContent": html, "textContent": plain,
            }, headers={"api-key": settings.BREVO_API_KEY, "accept": "application/json"})
        if response.status_code in (200, 201, 202):
            return True
        logger.error("Brevo respondió %s: %s", response.status_code, response.text[:300])
    except Exception as exc:
        logger.error("Brevo falló: %s", exc)
    return False


async def send_vincula_email(kind, recipient, **data):
    """Entrega correos transaccionales por Brevo (HTTPS). Nunca simula un envío."""
    if not recipient:
        logger.warning("Correo %s omitido: destinatario vacío", kind)
        return False
    subject, plain, html = build_message(kind, data)
    if not settings.BREVO_API_KEY:
        logger.error("Correo %s no enviado: BREVO_API_KEY no está configurada", kind)
        return False
    if await _send_with_brevo(recipient, subject, plain, html):
        return True
    logger.error("Brevo no aceptó el correo %s", kind)
    return False
