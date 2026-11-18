"""
Respuesta del egresado a la cita de entrevista, sin iniciar sesión.

El correo trae un enlace con un token firmado que solo identifica la entrevista. La página de Vincula lo lee
y muestra dos botones; confirmar o pedir otra fecha cambia el estado y avisa al reclutador por correo.
"""

import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import create_access_token, decode_access_token
from app.integrations.transactional_notifications import FRONTEND_URL, send_vincula_email
from app.modules.vacancies_ats.models import EntrevistaPostulacion, Postulacion, Vacante

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/entrevistas", tags=["ATS - Respuesta a entrevistas"])

VIGENCIA = timedelta(days=45)
ESTADOS_ABIERTOS = ("programada", "confirmada", "reprogramada")


def make_response_token(id_entrevista) -> str:
    # Clave "entrevista" (no "sub"): este token nunca sirve como sesión de usuario.
    return create_access_token({"entrevista": str(id_entrevista)}, expires_delta=VIGENCIA)


def make_response_url(id_entrevista) -> str:
    return f"{FRONTEND_URL}/entrevista/responder?token={make_response_token(id_entrevista)}"


def _id_from_token(token: str) -> uuid.UUID:
    payload = decode_access_token(token) or {}
    try:
        return uuid.UUID(str(payload.get("entrevista")))
    except ValueError:
        raise HTTPException(status_code=400, detail="El enlace no es válido o ya venció. Pide a la empresa que te lo envíe de nuevo.") from None


async def _load(session: AsyncSession, token: str) -> EntrevistaPostulacion:
    entrevista = (await session.execute(
        select(EntrevistaPostulacion).where(EntrevistaPostulacion.id == _id_from_token(token)).options(
            selectinload(EntrevistaPostulacion.postulacion).selectinload(Postulacion.vacante).selectinload(Vacante.empresa),
            selectinload(EntrevistaPostulacion.postulacion).selectinload(Postulacion.egresado),
        )
    )).scalar_one_or_none()
    if entrevista is None:
        raise HTTPException(status_code=404, detail="No encontramos esta entrevista.")
    return entrevista


def _details(e: EntrevistaPostulacion) -> Dict[str, Any]:
    vac = e.postulacion.vacante
    emp = vac.empresa
    return {"empresa": emp.nombre_comercial or emp.razon_social, "vacante": vac.titulo,
            "fecha": e.fecha_entrevista.isoformat(), "franja": e.franja_horaria, "modalidad": e.modalidad,
            "lugar_o_enlace": e.url_reunion, "objetivo": e.objetivo, "estado": e.estado,
            "reclutador": e.reclutador.nombre_completo if e.reclutador else None}


async def get_details(session: AsyncSession, token: str) -> Dict[str, Any]:
    return _details(await _load(session, token))


async def respond(session: AsyncSession, token: str, accion: str, motivo: Optional[str]) -> Dict[str, Any]:
    e = await _load(session, token)
    nuevo = "confirmada" if accion == "confirmar" else "reprogramada"
    if e.estado == nuevo:  # repetir la misma respuesta (doble clic, correo reenviado) no avisa dos veces
        return _details(e)
    if e.estado not in ESTADOS_ABIERTOS:
        raise HTTPException(status_code=409, detail="Esta entrevista ya fue cancelada o realizada y no admite respuesta.")
    if e.fecha_entrevista < datetime.now(timezone(timedelta(hours=-5))).date():
        raise HTTPException(status_code=409, detail="La fecha de esta entrevista ya pasó.")

    e.estado = nuevo
    await session.commit()

    rec, egr = e.reclutador, e.postulacion.egresado
    if rec and rec.correo_corporativo:
        try:
            await send_vincula_email(
                "entrevista_respuesta", rec.correo_corporativo, nombre=rec.nombre_completo,
                candidato=egr.nombre_completo if egr else "El egresado", vacante=e.postulacion.vacante.titulo,
                accion="confirmo" if accion == "confirmar" else "no_puede", fecha=e.fecha_entrevista.isoformat(),
                franja=e.franja_horaria, motivo=(motivo or "").strip() or None)
        except Exception as exc:  # noqa: BLE001  la respuesta ya quedó guardada
            logger.warning("Aviso al reclutador no enviado: tipo=%s", type(exc).__name__)
    return _details(e)


class RespuestaRequest(BaseModel):
    token: str = Field(..., min_length=20, max_length=1500)
    accion: Literal["confirmar", "no_puedo"]
    motivo: Optional[str] = Field(None, max_length=300)


@router.get("/respuesta")
async def entrevista_para_responder(token: str = Query(..., max_length=1500), db: AsyncSession = Depends(get_db)):
    return await get_details(db, token)


@router.post("/respuesta")
async def responder_entrevista(payload: RespuestaRequest, db: AsyncSession = Depends(get_db)):
    return await respond(db, payload.token, payload.accion, payload.motivo)
