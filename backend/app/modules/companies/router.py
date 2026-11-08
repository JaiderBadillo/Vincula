"""
Router de Gestión Empresarial, Cuarentena, Sedes Corporativas y Equipo de Reclutadores.
Endpoints oficiales bajo prefijo /api/v1/empresas:
- Estado de cuarentena y subsanación documental
- CRUD de Sedes Corporativas y Áreas Departamentales
- Gestión del Equipo de Reclutadores y Asignación de Sedes
"""

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, Form, File, UploadFile, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role, require_approved_company
from app.modules.companies.schemas import (
    SubsanarDocumentoRequest,
    QuarantineStatusResponse,
    SedeEmpresaCreateRequest,
    SedeEmpresaUpdateRequest,
    SedeEmpresaResponse,
    AreaSedeCreateRequest,
    AreaSedeResponse,
    ReclutadorCreateRequest,
    ReclutadorUpdateRequest,
    ReclutadorStatusUpdateRequest,
    ReclutadorItemResponse,
    AsignarSedesRequest,
    AsignacionSedesResponse,
    SiteSchema,
    RecruiterSchema,
)
from app.modules.companies.services import CompanyService

router = APIRouter(prefix="/empresas", tags=["Empresas - Gestión, Sedes y Reclutadores"])


def _resolve_company_id(current_user: Dict[str, Any], query_company_id: Optional[str] = None) -> str:
    """
    Resuelve el ID de la empresa desde el token de autenticación.
    SuperAdmin puede operar en nombre de una empresa específica indicando query_company_id.
    Para administradores o reclutadores de empresa, se garantiza estricto aislamiento multi-tenant.
    """
    user_role = current_user.get("rol", "")
    if query_company_id and user_role in ("superadmin_vincula", "superadmin"):
        return query_company_id

    company_id = current_user.get("id_entidad")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"codigo": "TOKEN_SIN_ENTIDAD", "mensaje": "El token de autenticación no está vinculado a una empresa registrada."}
        )

    # Si se envía query_company_id diferente al token para un rol de empresa, bloquear por seguridad multi-tenant
    if query_company_id and str(query_company_id) != str(company_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"codigo": "ACCESO_EMPRESA_DENEGADO", "mensaje": "No tienes autorización para operar sobre recursos de otra entidad corporativa."}
        )

    return str(company_id)


# =========================================================================
# 1. CUARENTENA Y SUBSANACIÓN DOCUMENTAL (Libres de Cuarentena)
# =========================================================================

@router.get("/estado-cuarentena", response_model=QuarantineStatusResponse)
async def get_quarantine_status(
    current_user: Dict[str, Any] = Depends(require_role(["admin_empresa", "reclutador_empresa", "empresa_admin", "reclutador"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Ruta libre de cuarentena: La empresa autenticada puede consultar en todo momento
    el estado de su radicado oficial, tiempo SLA restante y documentos observados.
    """
    company_id = current_user.get("id_entidad", "emp-001")
    return await CompanyService.get_quarantine_status(db, company_id)


@router.post("/subsanar-documento")
async def subsanar_documento(
    payload: SubsanarDocumentoRequest,
    current_user: Dict[str, Any] = Depends(require_role(["admin_empresa", "empresa_admin"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Ruta libre de cuarentena: Permite a la empresa corregir y re-subir PDFs (formato JSON con base64 o URL)
    cuando el Super Admin solicita subsanación (Opción 2 autoservicio).
    """
    company_id = current_user.get("id_entidad")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"codigo": "TOKEN_SIN_ENTIDAD", "mensaje": "El token de autenticación no está vinculado a una empresa."}
        )
    return await CompanyService.subsanar_documento(
        session=db,
        company_id=company_id,
        tipo_documento=payload.tipo_documento,
        nombre_archivo=payload.nombre_archivo,
        archivo_base64_o_url=payload.archivo_base64_o_url,
        observaciones=payload.observaciones
    )


@router.post("/subsanar-documento-form")
async def subsanar_documento_form(
    tipo_documento: str = Form(..., description="Tipo de documento ('camara_comercio', 'rut', 'cedula_rep_legal')"),
    archivo_pdf: UploadFile = File(..., description="Archivo PDF subsanado"),
    observaciones: Optional[str] = Form(None),
    current_user: Dict[str, Any] = Depends(require_role(["admin_empresa", "empresa_admin"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Ruta libre de cuarentena: Permite a la empresa corregir y subir directamente un archivo PDF (Multipart Form)
    con higiene de almacenamiento en Supabase Storage.
    """
    company_id = current_user.get("id_entidad")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"codigo": "TOKEN_SIN_ENTIDAD", "mensaje": "El token de autenticación no está vinculado a una empresa."}
        )
    file_bytes = await archivo_pdf.read()
    return await CompanyService.subsanar_documento(
        session=db,
        company_id=company_id,
        tipo_documento=tipo_documento,
        nombre_archivo=archivo_pdf.filename or f"{tipo_documento}.pdf",
        file_bytes=file_bytes,
        observaciones=observaciones
    )


# =========================================================================
# 2. SEDES CORPORATIVAS (GATING DE LEY)
# =========================================================================

@router.get("/sedes", response_model=List[SedeEmpresaResponse])
async def list_sedes(
    id_empresa: Optional[str] = Query(None, description="Opcional para SuperAdmin"),
    current_user: Dict[str, Any] = Depends(require_approved_company),
    db: AsyncSession = Depends(get_db)
):
    """
    Ruta protegida con GATING: Solo empresas en estado 'aprobado' pueden consultar sus sedes corporativas.
    """
    company_id = _resolve_company_id(current_user, id_empresa)
    return await CompanyService.list_sedes(db, company_id)


@router.post("/sedes", response_model=SedeEmpresaResponse, status_code=status.HTTP_201_CREATED)
async def create_sede(
    payload: SedeEmpresaCreateRequest,
    id_empresa: Optional[str] = Query(None, description="Opcional para SuperAdmin"),
    current_user: Dict[str, Any] = Depends(require_approved_company),
    db: AsyncSession = Depends(get_db)
):
    """
    Ruta protegida con GATING: Crea una nueva sede corporativa para la empresa aprobada.
    """
    company_id = _resolve_company_id(current_user, id_empresa)
    return await CompanyService.create_sede(db, company_id, payload)


@router.get("/sedes/{sede_id}", response_model=SedeEmpresaResponse)
async def get_sede(
    sede_id: str,
    id_empresa: Optional[str] = Query(None, description="Opcional para SuperAdmin"),
    current_user: Dict[str, Any] = Depends(require_approved_company),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene el detalle de una sede corporativa garantizando aislamiento multi-tenant.
    """
    company_id = _resolve_company_id(current_user, id_empresa)
    return await CompanyService.get_sede(db, company_id, sede_id)


@router.put("/sedes/{sede_id}", response_model=SedeEmpresaResponse)
async def update_sede(
    sede_id: str,
    payload: SedeEmpresaUpdateRequest,
    id_empresa: Optional[str] = Query(None, description="Opcional para SuperAdmin"),
    current_user: Dict[str, Any] = Depends(require_approved_company),
    db: AsyncSession = Depends(get_db)
):
    """
    Actualiza la información de una sede corporativa.
    """
    company_id = _resolve_company_id(current_user, id_empresa)
    return await CompanyService.update_sede(db, company_id, sede_id, payload)


# =========================================================================
# 3. ÁREAS DEPARTAMENTALES DE SEDE
# =========================================================================

@router.get("/sedes/{sede_id}/areas", response_model=List[AreaSedeResponse])
async def list_areas(
    sede_id: str,
    id_empresa: Optional[str] = Query(None, description="Opcional para SuperAdmin"),
    current_user: Dict[str, Any] = Depends(require_approved_company),
    db: AsyncSession = Depends(get_db)
):
    """
    Lista las áreas funcionales de una sede corporativa.
    """
    company_id = _resolve_company_id(current_user, id_empresa)
    return await CompanyService.list_areas(db, company_id, sede_id)


@router.post("/sedes/{sede_id}/areas", response_model=AreaSedeResponse, status_code=status.HTTP_201_CREATED)
async def create_area(
    sede_id: str,
    payload: AreaSedeCreateRequest,
    id_empresa: Optional[str] = Query(None, description="Opcional para SuperAdmin"),
    current_user: Dict[str, Any] = Depends(require_approved_company),
    db: AsyncSession = Depends(get_db)
):
    """
    Crea una nueva área funcional dentro de una sede corporativa.
    """
    company_id = _resolve_company_id(current_user, id_empresa)
    return await CompanyService.create_area(db, company_id, sede_id, payload)


# =========================================================================
# 4. EQUIPO DE RECLUTADORES DE TALENTO
# =========================================================================

@router.get("/reclutadores", response_model=List[ReclutadorItemResponse])
async def list_recruiters(
    id_empresa: Optional[str] = Query(None, description="Opcional para SuperAdmin"),
    current_user: Dict[str, Any] = Depends(require_approved_company),
    db: AsyncSession = Depends(get_db)
):
    """
    Ruta protegida con GATING: Lista el equipo de reclutadores de talento de la empresa.
    """
    company_id = _resolve_company_id(current_user, id_empresa)
    return await CompanyService.list_reclutadores(db, company_id)


@router.post("/reclutadores", response_model=ReclutadorItemResponse, status_code=status.HTTP_201_CREATED)
async def create_recruiter(
    payload: ReclutadorCreateRequest,
    id_empresa: Optional[str] = Query(None, description="Opcional para SuperAdmin"),
    current_user: Dict[str, Any] = Depends(require_approved_company),
    db: AsyncSession = Depends(get_db)
):
    """
    Ruta protegida con GATING: Registra un nuevo reclutador de talento con cuenta IAM y asignación de sedes.
    """
    company_id = _resolve_company_id(current_user, id_empresa)
    return await CompanyService.create_reclutador(db, company_id, payload)


@router.post("/reclutadores/{reclutador_id}/asignar-sedes", response_model=AsignacionSedesResponse)
async def assign_sedes_to_recruiter(
    reclutador_id: str,
    payload: AsignarSedesRequest,
    id_empresa: Optional[str] = Query(None, description="Opcional para SuperAdmin"),
    current_user: Dict[str, Any] = Depends(require_approved_company),
    db: AsyncSession = Depends(get_db)
):
    """
    Asigna un grupo de sedes corporativas autorizadas al reclutador.
    """
    company_id = _resolve_company_id(current_user, id_empresa)
    return await CompanyService.assign_sedes_to_reclutador(db, company_id, reclutador_id, payload.sedes_ids)


@router.patch("/reclutadores/{reclutador_id}/estado", response_model=ReclutadorItemResponse)
async def update_recruiter_status(
    reclutador_id: str,
    payload: ReclutadorStatusUpdateRequest,
    id_empresa: Optional[str] = Query(None, description="Opcional para SuperAdmin"),
    current_user: Dict[str, Any] = Depends(require_approved_company),
    db: AsyncSession = Depends(get_db)
):
    """
    Actualiza el estado de un reclutador ('active', 'suspended', 'inactive') y sincroniza sus accesos IAM.
    """
    company_id = _resolve_company_id(current_user, id_empresa)
    return await CompanyService.update_reclutador_status(db, company_id, reclutador_id, payload.estado)
