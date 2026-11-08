"""
Router de Super Admin Vincula (Bandeja de Auditoría 72h y Gating de Seguridad).
Endpoints oficiales bajo prefijo /api/v1/admin
Todos los endpoints requieren rol 'superadmin_vincula' o 'superadmin'.
"""

import uuid
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import require_role
from app.modules.superadmin.schemas import (
    CompanyAuditItem,
    InstitutionAuditItem,
    CorrectionActionRequest,
    RejectActionRequest,
    ApproveActionRequest,
    SecureUrlResponse,
    PaginatedCompanyAuditResponse,
    PaginatedInstitutionAuditResponse,
)
from app.modules.superadmin.services import SuperAdminService

router = APIRouter(prefix="/admin", tags=["Super Admin - Auditoría y Aprobaciones"])


@router.get("/auditoria/empresas", response_model=PaginatedCompanyAuditResponse)
async def list_companies_audit(
    estado: Optional[str] = Query(None, description="Filtrar por estado: 'pendiente', 'en_subsanacion', 'aprobado', 'rechazado'"),
    page: int = Query(1, ge=1, description="Número de página"),
    limit: int = Query(20, ge=1, le=100, description="Registros por página"),
    current_user: Dict[str, Any] = Depends(require_role(["superadmin_vincula", "superadmin"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Retorna la lista paginada de empresas registradas en la cola de auditoría con horas restantes del SLA 72h.
    """
    return await SuperAdminService.get_companies_audit(db, estado_filtro=estado, page=page, limit=limit)


@router.get("/auditoria/ies", response_model=PaginatedInstitutionAuditResponse)
@router.get("/auditoria/instituciones", response_model=PaginatedInstitutionAuditResponse)
async def list_institutions_audit(
    estado: Optional[str] = Query(None, description="Filtrar por estado: 'pendiente', 'en_subsanacion', 'aprobado', 'rechazado'"),
    page: int = Query(1, ge=1, description="Número de página"),
    limit: int = Query(20, ge=1, le=100, description="Registros por página"),
    current_user: Dict[str, Any] = Depends(require_role(["superadmin_vincula", "superadmin"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Retorna la lista paginada de Instituciones de Educación Superior en verificación SNIES y personería MEN.
    """
    return await SuperAdminService.get_institutions_audit(db, estado_filtro=estado, page=page, limit=limit)


@router.get("/auditoria/documento/{documento_id}/secure-url", response_model=SecureUrlResponse)
async def get_document_secure_url(
    documento_id: str,
    expires_in: int = Query(3600, ge=300, le=86400, description="Vigencia de la URL firmada en segundos (por defecto 1h)"),
    current_user: Dict[str, Any] = Depends(require_role(["superadmin_vincula", "superadmin"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Genera una URL firmada de descarga temporal desde Supabase Storage para previsualizar PDFs de auditoría.
    """
    try:
        return await SuperAdminService.get_document_secure_url(db, documento_id, expires_in=expires_in)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/empresas/{company_id}/aprobar")
async def approve_company(
    company_id: str,
    payload: Optional[ApproveActionRequest] = None,
    current_user: Dict[str, Any] = Depends(require_role(["superadmin_vincula", "superadmin"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Aprueba una empresa tras verificar RUT y Cámara de Comercio.
    Levanta el MODO CUARENTENA y habilita la publicación de vacantes y exploración de talento.
    """
    auditor_id = uuid.UUID(current_user["sub"])
    try:
        return await SuperAdminService.approve_company(db, company_id, id_auditor=auditor_id, payload=payload)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/empresas/{company_id}/solicitar-subsanacion")
async def request_company_correction(
    company_id: str,
    payload: CorrectionActionRequest,
    current_user: Dict[str, Any] = Depends(require_role(["superadmin_vincula", "superadmin"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Solicita subsanación de documentos defectuosos, ilegibles o vencidos a la empresa.
    Mantiene el estado en 'en_subsanacion' hasta que la empresa cargue los nuevos archivos.
    """
    auditor_id = uuid.UUID(current_user["sub"])
    try:
        return await SuperAdminService.request_company_correction(db, company_id, id_auditor=auditor_id, action=payload)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/empresas/{company_id}/rechazar")
async def reject_company(
    company_id: str,
    payload: RejectActionRequest,
    current_user: Dict[str, Any] = Depends(require_role(["superadmin_vincula", "superadmin"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Rechaza definitivamente la solicitud de una empresa por fraude, suplantación o inconsistencias insalvables.
    Inhabilita las cuentas de usuario vinculadas.
    """
    auditor_id = uuid.UUID(current_user["sub"])
    try:
        return await SuperAdminService.reject_company(db, company_id, id_auditor=auditor_id, action=payload)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/ies/{ies_id}/aprobar")
@router.post("/instituciones/{ies_id}/aprobar")
async def approve_institution(
    ies_id: str,
    payload: Optional[ApproveActionRequest] = None,
    current_user: Dict[str, Any] = Depends(require_role(["superadmin_vincula", "superadmin"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Aprueba una Institución de Educación Superior tras validar su aval en el SNIES / MEN.
    """
    auditor_id = uuid.UUID(current_user["sub"])
    try:
        return await SuperAdminService.approve_institution(db, ies_id, id_auditor=auditor_id, payload=payload)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/ies/{ies_id}/solicitar-subsanacion")
@router.post("/instituciones/{ies_id}/solicitar-subsanacion")
async def request_institution_correction(
    ies_id: str,
    payload: CorrectionActionRequest,
    current_user: Dict[str, Any] = Depends(require_role(["superadmin_vincula", "superadmin"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Solicita subsanación de documentos a una IES (ej: Personería Jurídica ilegible o SNIES vencido).
    """
    auditor_id = uuid.UUID(current_user["sub"])
    try:
        return await SuperAdminService.request_institution_correction(db, ies_id, id_auditor=auditor_id, action=payload)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/ies/{ies_id}/rechazar")
@router.post("/instituciones/{ies_id}/rechazar")
async def reject_institution(
    ies_id: str,
    payload: RejectActionRequest,
    current_user: Dict[str, Any] = Depends(require_role(["superadmin_vincula", "superadmin"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Rechaza formalmente la solicitud de vinculación de una IES.
    """
    auditor_id = uuid.UUID(current_user["sub"])
    try:
        return await SuperAdminService.reject_institution(db, ies_id, id_auditor=auditor_id, action=payload)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
