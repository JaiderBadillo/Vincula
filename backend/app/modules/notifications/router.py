"""Notificaciones de la plataforma. Prefijo /api/v1/notificaciones. Cada usuario ve y marca solo las suyas."""

import uuid
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.modules.notifications import services

router = APIRouter(prefix="/notificaciones", tags=["Notificaciones"])


def _user_id(claims: Dict[str, Any]) -> uuid.UUID:
    uid = services._uuid(claims.get("sub") or claims.get("id"))
    if not uid:
        raise HTTPException(status_code=401, detail="Sesión no válida.")
    return uid


@router.get("")
async def list_notifications(
    limit: int = Query(30, ge=1, le=services.MAX_PAGE),
    solo_no_leidas: bool = Query(False),
    claims: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await services.listar(db, _user_id(claims), limit, solo_no_leidas)


@router.post("/leer-todas")
async def read_all(claims: Dict[str, Any] = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await services.marcar_todas(db, _user_id(claims))


@router.post("/{notificacion_id}/leer")
async def read_one(notificacion_id: str, claims: Dict[str, Any] = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await services.marcar_leida(db, _user_id(claims), notificacion_id)
