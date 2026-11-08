"""
Router de Egresados - Perfil y Mis Postulaciones.
Endpoints oficiales bajo prefijo /api/v1/egresados
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.modules.graduates.schemas import (
    GraduateProfileSchema,
    GraduateApplicationResponse,
    ApplicationHistoryItem
)
from app.modules.graduates.services import GraduateService

router = APIRouter(prefix="/egresados", tags=["Egresados - Perfil y Postulaciones"])


def _get_user_id(current_user: Dict[str, Any]) -> str:
    """Extrae el UUID del usuario autenticado desde los claims del JWT ('sub' o 'user_id')."""
    uid = current_user.get("sub") or current_user.get("user_id") or current_user.get("id")
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"codigo": "TOKEN_INVALIDO", "mensaje": "Token no contiene identificador de usuario válido."}
        )
    return str(uid)


@router.get("/perfil", response_model=GraduateProfileSchema)
async def get_my_profile(
    current_user: Dict[str, Any] = Depends(require_role(["egresado"]))
):
    """
    Retorna el perfil integral del egresado autenticado.
    """
    graduate_id = current_user.get("id_entidad", "egr-001")
    return GraduateService.get_profile(graduate_id)


@router.get("/mis-postulaciones", response_model=List[GraduateApplicationResponse])
async def get_my_applications(
    current_user: Dict[str, Any] = Depends(require_role(["egresado"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Retorna el historial en vivo de postulaciones del egresado autenticado desde PostgreSQL
    con el pipeline ATS Kanban, timeline de fases, estado de entrevista y datos de la vacante.
    """
    user_id = _get_user_id(current_user)
    return await GraduateService.get_my_applications_async(db, user_id)


@router.get("/mis-postulaciones/{id_postulacion}", response_model=GraduateApplicationResponse)
async def get_application_detail(
    id_postulacion: str,
    current_user: Dict[str, Any] = Depends(require_role(["egresado"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Retorna el detalle completo y estado en tiempo real de una postulación individual del egresado.
    """
    user_id = _get_user_id(current_user)
    return await GraduateService.get_application_detail_async(db, user_id, id_postulacion)


@router.delete("/mis-postulaciones/{id_postulacion}/retirar")
async def withdraw_application(
    id_postulacion: str,
    current_user: Dict[str, Any] = Depends(require_role(["egresado"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Permite al egresado retirar voluntariamente su postulación.
    Limpia en cascada el historial de fases y notas, y decrementa el contador de la vacante.
    """
    user_id = _get_user_id(current_user)
    return await GraduateService.withdraw_application_async(db, user_id, id_postulacion)
