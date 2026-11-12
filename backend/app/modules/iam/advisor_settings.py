"""Configuración de acceso para la cuenta real del asesor IES."""
import asyncio
import uuid
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import require_role
from app.core.security import verify_password, get_password_hash
from app.modules.iam.models import Usuario, AccesoAsesorIES
from app.modules.institutions.models import AsesorIES, Institucion
from app.integrations.n8n_webhooks import N8nWebhookDispatcher

advisor_only = require_role(["asesor_ies"])
router = APIRouter(prefix="/asesor/configuracion", tags=["Configuración Asesor IES"])
logger = logging.getLogger("vincula.advisor_settings")


class EmailChange(BaseModel):
    correo: EmailStr
    contrasena_actual: str


class PasswordChange(BaseModel):
    contrasena_actual: str
    nueva_contrasena: str = Field(min_length=10, max_length=72)


class GoogleLink(BaseModel):
    credential: str
    contrasena_actual: str


class GoogleUnlink(BaseModel):
    contrasena_actual: str


class ProfileChange(BaseModel):
    nombre_completo: str = Field(min_length=3, max_length=150)
    telefono: str | None = Field(default=None, max_length=50)
    cargo: str | None = Field(default=None, max_length=100)


class NotificationChange(BaseModel):
    avisar_accesos_email: bool
    avisar_cambios_email: bool


async def account(claims, db):
    try:
        user_id = uuid.UUID(str(claims.get("sub")))
    except (TypeError, ValueError):
        raise HTTPException(401, "Sesión inválida.") from None
    user = (await db.execute(select(Usuario).where(Usuario.id == user_id))).scalar_one_or_none()
    if not user or user.rol != "asesor_ies" or user.estado != "activo":
        raise HTTPException(403, "Cuenta de asesor no disponible.")
    return user


def verify_current(user, password):
    if not verify_password(password, user.contrasena_hash):
        raise HTTPException(403, "La contraseña actual es incorrecta.")


async def advisor_profile(user, db):
    advisor = (await db.execute(select(AsesorIES).where(AsesorIES.id_usuario == user.id))).scalar_one_or_none()
    if not advisor:
        raise HTTPException(404, "No se encontró el perfil de asesor IES.")
    return advisor


def profile_data(advisor):
    return {"nombre_completo": advisor.nombre_completo, "telefono": advisor.telefono or "",
            "cargo": advisor.cargo or "", "correo_institucional": advisor.correo_institucional}


def notification_data(advisor):
    return {"avisar_accesos_email": advisor.avisar_accesos_email,
            "avisar_cambios_email": advisor.avisar_cambios_email}


async def send_notice(email, subject, message):
    if not settings.N8N_WEBHOOK_BASE_URL or not settings.N8N_WEBHOOK_SECRET:
        logger.error("Aviso de asesor no enviado: webhook de n8n sin configurar")
        return
    sent = await N8nWebhookDispatcher.dispatch_event("auth.asesor-notificacion", {
        "correo": email, "asunto": subject, "mensaje": message,
        "fecha": datetime.now(timezone.utc).isoformat(),
    })
    if not sent:
        logger.error("n8n no confirmó el aviso de asesor: %s", subject)


def browser_name(user_agent):
    agent = user_agent.lower()
    if "edg/" in agent:
        return "Microsoft Edge"
    if "firefox/" in agent:
        return "Firefox"
    if "chrome/" in agent or "crios/" in agent:
        return "Google Chrome"
    if "safari/" in agent:
        return "Safari"
    return "Navegador no identificado"


async def record_advisor_access(db, user_id, method, request: Request, tasks: BackgroundTasks):
    try:
        advisor = (await db.execute(select(AsesorIES).where(AsesorIES.id_usuario == user_id))).scalar_one_or_none()
        db.add(AccesoAsesorIES(id_usuario=user_id, metodo=method,
                               navegador=browser_name(request.headers.get("user-agent", "")),
                               direccion_ip=request.client.host if request.client else None))
        await db.commit()
        if advisor and advisor.avisar_accesos_email:
            user = (await db.execute(select(Usuario).where(Usuario.id == user_id))).scalar_one_or_none()
            if user:
                when = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
                tasks.add_task(send_notice, user.correo_electronico, "Nuevo acceso a Víncula",
                               f"Se inició sesión en tu cuenta de asesor IES con {method} el {when}.")
    except Exception:
        await db.rollback()
        logger.exception("No se pudo registrar el acceso del asesor IES")


@router.get("")
async def get_settings(claims=Depends(advisor_only), db: AsyncSession = Depends(get_db)):
    user = await account(claims, db)
    advisor = await advisor_profile(user, db)
    institution = (await db.execute(select(Institucion.nombre_corto).where(Institucion.id == advisor.id_institucion))).scalar_one_or_none()
    return {"correo": user.correo_electronico, "google_vinculado": bool(user.google_sub),
            "ultimo_cambio": user.actualizado_en, "perfil": profile_data(advisor),
            "institucion": institution or "IES", "notificaciones": notification_data(advisor)}


@router.put("/perfil")
async def change_profile(payload: ProfileChange, claims=Depends(advisor_only), db: AsyncSession = Depends(get_db)):
    user = await account(claims, db)
    advisor = await advisor_profile(user, db)
    name = payload.nombre_completo.strip()
    if len(name) < 3:
        raise HTTPException(422, "Escribe un nombre válido.")
    advisor.nombre_completo = name
    advisor.telefono = (payload.telefono or "").strip() or None
    advisor.cargo = (payload.cargo or "").strip() or None
    await db.commit()
    return {"perfil": profile_data(advisor), "mensaje": "Perfil actualizado."}


@router.put("/notificaciones")
async def change_notifications(payload: NotificationChange, claims=Depends(advisor_only), db: AsyncSession = Depends(get_db)):
    user = await account(claims, db)
    advisor = await advisor_profile(user, db)
    advisor.avisar_accesos_email = payload.avisar_accesos_email
    advisor.avisar_cambios_email = payload.avisar_cambios_email
    await db.commit()
    return {"notificaciones": notification_data(advisor), "mensaje": "Preferencias guardadas."}


@router.get("/accesos")
async def recent_accesses(claims=Depends(advisor_only), db: AsyncSession = Depends(get_db)):
    user = await account(claims, db)
    rows = (await db.execute(select(AccesoAsesorIES).where(AccesoAsesorIES.id_usuario == user.id)
                             .order_by(AccesoAsesorIES.fecha.desc()).limit(20))).scalars().all()
    return {"accesos": [{"id": str(row.id), "fecha": row.fecha, "metodo": row.metodo,
                         "navegador": row.navegador, "direccion_ip": row.direccion_ip} for row in rows],
            "ultimo_acceso_anterior": user.ultimo_acceso_en}


@router.put("/correo")
async def change_email(payload: EmailChange, tasks: BackgroundTasks, claims=Depends(advisor_only), db: AsyncSession = Depends(get_db)):
    user = await account(claims, db)
    verify_current(user, payload.contrasena_actual)
    email = str(payload.correo).strip().lower()
    if user.google_sub and email != user.correo_electronico:
        raise HTTPException(409, "Desvincula Google antes de cambiar el correo de acceso.")
    existing = (await db.execute(select(Usuario.id).where(func.lower(Usuario.correo_electronico) == email, Usuario.id != user.id))).first()
    if existing:
        raise HTTPException(409, "Este correo ya pertenece a otra cuenta.")
    previous_email = user.correo_electronico
    advisor = await advisor_profile(user, db)
    notify = advisor.avisar_cambios_email
    user.correo_electronico = email
    await db.commit()
    if notify and email != previous_email:
        tasks.add_task(send_notice, previous_email, "Cambio de correo en Víncula",
                       f"El correo de acceso de tu cuenta de asesor IES cambió a {email}.")
    return {"correo": email, "mensaje": "Correo actualizado. Úsalo en tu próximo inicio de sesión."}


@router.put("/contrasena")
async def change_password(payload: PasswordChange, tasks: BackgroundTasks, claims=Depends(advisor_only), db: AsyncSession = Depends(get_db)):
    user = await account(claims, db)
    verify_current(user, payload.contrasena_actual)
    if verify_password(payload.nueva_contrasena, user.contrasena_hash):
        raise HTTPException(400, "La nueva contraseña debe ser diferente de la actual.")
    advisor = await advisor_profile(user, db)
    notify = advisor.avisar_cambios_email
    user.contrasena_hash = get_password_hash(payload.nueva_contrasena)
    await db.commit()
    if notify:
        tasks.add_task(send_notice, user.correo_electronico, "Cambio de contraseña en Víncula",
                       "La contraseña de tu cuenta de asesor IES fue actualizada.")
    return {"mensaje": "Contraseña actualizada correctamente."}


@router.post("/google")
async def link_google(payload: GoogleLink, claims=Depends(advisor_only), db: AsyncSession = Depends(get_db)):
    user = await account(claims, db)
    verify_current(user, payload.contrasena_actual)
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(503, "El inicio con Google no está configurado.")
    try:
        info = await asyncio.to_thread(id_token.verify_oauth2_token, payload.credential,
                                       google_requests.Request(), settings.GOOGLE_CLIENT_ID)
    except Exception:
        raise HTTPException(400, "No se pudo verificar la cuenta de Google.") from None
    if not info.get("email_verified") or info.get("email", "").lower() != user.correo_electronico.lower() or not info.get("sub"):
        raise HTTPException(400, "Usa una cuenta de Google verificada con el mismo correo de Víncula.")
    owner = (await db.execute(select(Usuario.id).where(Usuario.google_sub == info["sub"], Usuario.id != user.id))).first()
    if owner:
        raise HTTPException(409, "Esta cuenta de Google ya está vinculada a otro usuario.")
    user.google_sub = info["sub"]
    await db.commit()
    return {"google_vinculado": True, "mensaje": "Google vinculado a tu cuenta."}


@router.delete("/google")
async def unlink_google(payload: GoogleUnlink, claims=Depends(advisor_only), db: AsyncSession = Depends(get_db)):
    user = await account(claims, db)
    verify_current(user, payload.contrasena_actual)
    user.google_sub = None
    await db.commit()
    return {"google_vinculado": False, "mensaje": "Google desvinculado. Puedes seguir entrando con contraseña."}
