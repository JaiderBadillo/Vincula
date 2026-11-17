"""
Moderación. Prefijo /api/v1/moderacion.
- Reportar una vacante: cualquier usuario autenticado que no sea administrador de Vincula.
- Ver reportes y actuar (inhabilitar vacantes, suspender cuentas y empresas): solo superadmin.
"""

from typing import Any, Dict

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import require_role
from app.modules.moderation import services
from app.modules.moderation.schemas import ModerationNote, ModerationReason, ReportRequest

router = APIRouter(prefix="/moderacion", tags=["Moderación"])

REPORTANTES = ["egresado", "admin_empresa", "reclutador_empresa", "admin_ies", "asesor_ies"]
ADMIN = ["superadmin_vincula", "superadmin"]


@router.post("/vacantes/{vacante_id}/reportes", status_code=201)
async def report_vacancy(
    vacante_id: str,
    payload: ReportRequest,
    current_user: Dict[str, Any] = Depends(require_role(REPORTANTES)),
    db: AsyncSession = Depends(get_db),
):
    """Un usuario reporta una vacante como irregular. Una vez por usuario y vacante."""
    return await services.report_vacancy(db, current_user, vacante_id, payload)


@router.get("/reportes")
async def list_reports(
    estado: str = Query("pendiente", description="pendiente, resuelto, descartado o todos"),
    _: Dict[str, Any] = Depends(require_role(ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    return await services.list_reports(db, estado)


@router.post("/vacantes/{vacante_id}/descartar-reportes")
async def dismiss_reports(
    vacante_id: str, payload: ModerationNote,
    admin: Dict[str, Any] = Depends(require_role(ADMIN)), db: AsyncSession = Depends(get_db),
):
    return await services.dismiss_reports(db, admin, vacante_id, payload.nota)


@router.post("/vacantes/{vacante_id}/inhabilitar")
async def disable_vacancy(
    vacante_id: str, payload: ModerationReason,
    admin: Dict[str, Any] = Depends(require_role(ADMIN)), db: AsyncSession = Depends(get_db),
):
    return await services.disable_vacancy(db, admin, vacante_id, payload.motivo)


@router.post("/vacantes/{vacante_id}/rehabilitar")
async def enable_vacancy(
    vacante_id: str, payload: ModerationNote,
    admin: Dict[str, Any] = Depends(require_role(ADMIN)), db: AsyncSession = Depends(get_db),
):
    return await services.enable_vacancy(db, admin, vacante_id, payload.nota)


@router.get("/vacantes-inhabilitadas")
async def list_disabled_vacancies(_: Dict[str, Any] = Depends(require_role(ADMIN)), db: AsyncSession = Depends(get_db)):
    return await services.list_disabled_vacancies(db)


@router.get("/cuentas")
async def search_accounts(
    q: str = Query(..., description="Parte del correo"),
    _: Dict[str, Any] = Depends(require_role(ADMIN)), db: AsyncSession = Depends(get_db),
):
    return await services.search_accounts(db, q)


@router.post("/cuentas/{usuario_id}/suspender")
async def suspend_account(
    usuario_id: str, payload: ModerationReason,
    admin: Dict[str, Any] = Depends(require_role(ADMIN)), db: AsyncSession = Depends(get_db),
):
    return await services.suspend_account(db, admin, usuario_id, payload.motivo)


@router.post("/cuentas/{usuario_id}/reactivar")
async def reactivate_account(
    usuario_id: str, payload: ModerationNote,
    admin: Dict[str, Any] = Depends(require_role(ADMIN)), db: AsyncSession = Depends(get_db),
):
    return await services.reactivate_account(db, admin, usuario_id, payload.nota)


@router.post("/empresas/{empresa_id}/suspender")
async def suspend_company(
    empresa_id: str, payload: ModerationReason,
    admin: Dict[str, Any] = Depends(require_role(ADMIN)), db: AsyncSession = Depends(get_db),
):
    return await services.suspend_company(db, admin, empresa_id, payload.motivo)


@router.post("/empresas/{empresa_id}/reactivar")
async def reactivate_company(
    empresa_id: str, payload: ModerationNote,
    admin: Dict[str, Any] = Depends(require_role(ADMIN)), db: AsyncSession = Depends(get_db),
):
    return await services.reactivate_company(db, admin, empresa_id, payload.nota)


@router.get("/historial")
async def list_history(_: Dict[str, Any] = Depends(require_role(ADMIN)), db: AsyncSession = Depends(get_db)):
    return await services.list_history(db)
