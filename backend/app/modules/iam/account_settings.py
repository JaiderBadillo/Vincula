"""Configuración de credenciales reales para los roles distintos de asesor IES."""
import asyncio
import uuid

from fastapi import APIRouter, Depends, HTTPException
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.security import get_password_hash, verify_password
from app.modules.iam.models import Usuario
from app.modules.iam.advisor_settings import EmailChange, PasswordChange, GoogleLink, GoogleUnlink

router = APIRouter(prefix="/cuenta/configuracion", tags=["Configuración de cuenta"])


async def current_account(claims, db):
    try:
        user_id = uuid.UUID(str(claims.get("sub")))
    except (TypeError, ValueError):
        raise HTTPException(401, "Sesión inválida.") from None
    user = (await db.execute(select(Usuario).where(Usuario.id == user_id))).scalar_one_or_none()
    if not user or user.estado != "activo" or user.rol != claims.get("rol"):
        raise HTTPException(403, "La cuenta no está disponible.")
    return user


def check_password(user, password):
    if not verify_password(password, user.contrasena_hash):
        raise HTTPException(403, "La contraseña actual es incorrecta.")


@router.get("")
async def get_settings(claims=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = await current_account(claims, db)
    return {"correo": user.correo_electronico, "rol": user.rol, "nombre": claims.get("nombre") or user.correo_electronico,
            "google_vinculado": bool(user.google_sub), "ultimo_acceso": user.ultimo_acceso_en,
            "ultimo_cambio": user.actualizado_en}


@router.put("/correo")
async def change_email(payload: EmailChange, claims=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = await current_account(claims, db)
    check_password(user, payload.contrasena_actual)
    email = str(payload.correo).strip().lower()
    if user.google_sub and email != user.correo_electronico:
        raise HTTPException(409, "Desvincula Google antes de cambiar el correo de acceso.")
    existing = (await db.execute(select(Usuario.id).where(func.lower(Usuario.correo_electronico) == email,
                                                       Usuario.id != user.id))).first()
    if existing:
        raise HTTPException(409, "Este correo ya pertenece a otra cuenta.")
    user.correo_electronico = email
    await db.commit()
    return {"correo": email, "mensaje": "Correo actualizado. Úsalo en tu próximo inicio de sesión."}


@router.put("/contrasena")
async def change_password(payload: PasswordChange, claims=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = await current_account(claims, db)
    check_password(user, payload.contrasena_actual)
    if verify_password(payload.nueva_contrasena, user.contrasena_hash):
        raise HTTPException(400, "La nueva contraseña debe ser diferente de la actual.")
    user.contrasena_hash = get_password_hash(payload.nueva_contrasena)
    await db.commit()
    return {"mensaje": "Contraseña actualizada correctamente."}


@router.post("/google")
async def link_google(payload: GoogleLink, claims=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = await current_account(claims, db)
    check_password(user, payload.contrasena_actual)
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(503, "Google no está configurado.")
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
async def unlink_google(payload: GoogleUnlink, claims=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = await current_account(claims, db)
    check_password(user, payload.contrasena_actual)
    user.google_sub = None
    await db.commit()
    return {"google_vinculado": False, "mensaje": "Google desvinculado. Puedes seguir entrando con contraseña."}
