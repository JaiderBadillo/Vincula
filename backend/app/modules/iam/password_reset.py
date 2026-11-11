"""Recuperación de contraseña con códigos de un solo uso enviados por n8n."""
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_password_hash
from app.integrations.n8n_webhooks import N8nWebhookDispatcher
from app.integrations.email_service import EmailService
from app.modules.iam.models import Usuario, PasswordResetCode

router = APIRouter(prefix="/recuperar-contrasena", tags=["IAM - Recuperación"])
GENERIC_MESSAGE = "Si el correo está registrado, recibirás un código para restablecer tu contraseña."


class RequestCode(BaseModel):
    correo: EmailStr


class ResetPassword(BaseModel):
    correo: EmailStr
    codigo: str = Field(pattern=r"^\d{6}$")
    nueva_contrasena: str = Field(min_length=10, max_length=72)


def code_digest(user_id, code):
    return hmac.new(settings.JWT_SECRET_KEY.encode(), f"{user_id}:{code}".encode(), hashlib.sha256).hexdigest()


@router.post("/solicitar")
async def request_code(payload: RequestCode, db: AsyncSession = Depends(get_db)):
    email = str(payload.correo).strip().lower()
    user = (await db.execute(select(Usuario).where(func.lower(Usuario.correo_electronico) == email))).scalar_one_or_none()
    if not user or user.estado != "activo":
        return {"mensaje": GENERIC_MESSAGE}
    use_n8n = bool(settings.N8N_WEBHOOK_BASE_URL and settings.N8N_WEBHOOK_SECRET)
    use_smtp = bool(settings.SMTP_USER and settings.SMTP_PASSWORD)
    if not use_n8n and not use_smtp:
        raise HTTPException(503, "El servicio de recuperación por correo no está configurado.")
    now = datetime.now(timezone.utc)
    record = (await db.execute(select(PasswordResetCode).where(PasswordResetCode.id_usuario == user.id).with_for_update())).scalar_one_or_none()
    if record and record.solicitado_en > now - timedelta(seconds=60):
        return {"mensaje": GENERIC_MESSAGE}
    code = f"{secrets.randbelow(1000000):06d}"
    if record:
        record.codigo_hash = code_digest(user.id, code)
        record.expira_en = now + timedelta(minutes=10)
        record.solicitado_en = now
        record.intentos = 0
    else:
        record = PasswordResetCode(id_usuario=user.id, codigo_hash=code_digest(user.id, code),
                                   expira_en=now + timedelta(minutes=10), solicitado_en=now, intentos=0)
        db.add(record)
    # El proveedor debe confirmar la recepción antes de comprometer el código.
    if use_n8n:
        delivered = await N8nWebhookDispatcher.dispatch_event("auth.password-reset", {
            "correo": user.correo_electronico, "codigo": code, "minutos_validez": 10,
        })
    else:
        body = (f"Tu código de recuperación de Víncula es: {code}\n\n"
                "Vence en 10 minutos. Si no solicitaste este cambio, ignora este mensaje. "
                "No compartas este código con nadie.")
        result = await EmailService.send_email(user.correo_electronico,
                                               "Código para restablecer tu contraseña de Víncula",
                                               f"<p>{body.replace(chr(10), '<br>')}</p>", body)
        delivered = result.get("success", False)
    if not delivered:
        await db.rollback()
        raise HTTPException(503, "No fue posible enviar el correo. Intenta de nuevo más tarde.")
    await db.commit()
    return {"mensaje": GENERIC_MESSAGE}


@router.post("/confirmar")
async def confirm_reset(payload: ResetPassword, db: AsyncSession = Depends(get_db)):
    email = str(payload.correo).strip().lower()
    # Nunca revelar si el correo existe al validar un código.
    invalid = HTTPException(400, "Código inválido o vencido. Solicita uno nuevo.")
    user = (await db.execute(select(Usuario).where(func.lower(Usuario.correo_electronico) == email))).scalar_one_or_none()
    if not user or user.estado != "activo":
        raise invalid
    record = (await db.execute(select(PasswordResetCode).where(PasswordResetCode.id_usuario == user.id).with_for_update())).scalar_one_or_none()
    now = datetime.now(timezone.utc)
    if not record or record.expira_en <= now or record.intentos >= 5:
        raise invalid
    if not hmac.compare_digest(record.codigo_hash, code_digest(user.id, payload.codigo)):
        record.intentos += 1
        await db.commit()
        raise invalid
    user.contrasena_hash = get_password_hash(payload.nueva_contrasena)
    await db.delete(record)
    await db.commit()
    return {"mensaje": "Contraseña actualizada. Ya puedes iniciar sesión."}
