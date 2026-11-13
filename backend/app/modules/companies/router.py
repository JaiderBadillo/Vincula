"""
Router de Gestión Empresarial, Cuarentena, Sedes Corporativas y Equipo de Reclutadores.
Endpoints oficiales bajo prefijo /api/v1/empresas:
- Estado de cuarentena y subsanación documental
- CRUD de Sedes Corporativas y Áreas Departamentales
- Gestión del Equipo de Reclutadores y Asignación de Sedes
"""

from typing import Dict, Any, List, Optional
import base64
import binascii
import re
import uuid
from fastapi import APIRouter, Depends, Form, File, UploadFile, HTTPException, Query, status
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy import select
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
from app.modules.companies.models import Empresa

router = APIRouter(prefix="/empresas", tags=["Empresas - Gestión, Sedes y Reclutadores"])


class CompanyProfileUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    commercialName: str = Field(..., min_length=1, max_length=255)
    legalName: str = Field(..., min_length=1, max_length=255)
    nit: str = Field(..., min_length=1, max_length=30)
    sector: str = Field(..., min_length=1, max_length=100)
    size: str = Field(..., min_length=1, max_length=50)
    department: str = Field(..., min_length=1, max_length=100)
    city: str = Field(..., min_length=1, max_length=100)
    address: str = Field(..., min_length=1, max_length=255)
    phone: str = Field(..., min_length=1, max_length=50)
    contactEmail: EmailStr
    website: str = Field('', max_length=255)
    description: str = Field('', max_length=3000)
    legalRepresentative: Dict[str, str]
    logo: Optional[str] = None
    coverImage: Optional[str] = None


def _company_profile(company: Empresa) -> Dict[str, Any]:
    return {
        "id": str(company.id), "name": company.nombre_comercial or company.razon_social,
        "commercialName": company.nombre_comercial, "legalName": company.razon_social,
        "nit": company.nit, "sector": company.sector_economico,
        "size": company.tamano_empresa, "department": company.departamento,
        "city": company.ciudad, "address": company.direccion, "phone": company.telefono,
        "contactEmail": company.correo_contacto, "website": company.sitio_web or '',
        "description": company.descripcion_corporativa or '',
        "legalRepresentative": {"name": company.nombre_representante_legal, "documentId": company.documento_representante_legal},
        "logo": company.url_logo, "coverImage": company.url_portada,
        "verificationStatus": company.estado,
    }


async def _own_company(db: AsyncSession, current_user: Dict[str, Any]) -> Empresa:
    try:
        company_id = uuid.UUID(str(_resolve_company_id(current_user)))
    except ValueError:
        raise HTTPException(status_code=400, detail="Identificador de empresa inválido.")
    company = (await db.execute(select(Empresa).where(Empresa.id == company_id))).scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="No se encontró la empresa asociada a tu cuenta.")
    return company


def _checked_image(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    match = re.fullmatch(r'data:image/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)', value)
    if not match or len(match.group(2)) > 2_800_000:
        raise HTTPException(status_code=422, detail="La imagen debe ser PNG, JPG o WebP de máximo 2 MB.")
    try:
        data = base64.b64decode(match.group(2), validate=True)
    except binascii.Error:
        raise HTTPException(status_code=422, detail="La imagen está dañada.")
    valid = (match.group(1) == 'png' and data.startswith(b'\x89PNG\r\n\x1a\n')
             or match.group(1) == 'jpeg' and data.startswith(b'\xff\xd8\xff')
             or match.group(1) == 'webp' and data.startswith(b'RIFF') and data[8:12] == b'WEBP')
    if not valid or len(data) > 2 * 1024 * 1024:
        raise HTTPException(status_code=422, detail="La imagen debe ser PNG, JPG o WebP de máximo 2 MB.")
    return value


@router.get('/perfil')
async def get_company_profile(
    current_user: Dict[str, Any] = Depends(require_role(['admin_empresa', 'empresa_admin', 'reclutador_empresa', 'reclutador'])),
    db: AsyncSession = Depends(get_db),
):
    return _company_profile(await _own_company(db, current_user))


@router.put('/perfil')
async def update_company_profile(
    payload: CompanyProfileUpdate,
    current_user: Dict[str, Any] = Depends(require_role(['admin_empresa', 'empresa_admin'])),
    db: AsyncSession = Depends(get_db),
):
    company = await _own_company(db, current_user)
    representative = payload.legalRepresentative
    if company.estado == 'aprobado' and (
        payload.nit.strip() != company.nit or payload.legalName.strip() != company.razon_social
        or representative.get('documentId', '').strip() != company.documento_representante_legal
        or representative.get('name', '').strip() != company.nombre_representante_legal
    ):
        raise HTTPException(status_code=409, detail="La razón social, el NIT y la identidad del representante de una empresa verificada requieren nueva revisión legal.")
    if not representative.get('name', '').strip() or not representative.get('documentId', '').strip():
        raise HTTPException(status_code=422, detail="Completa los datos del representante legal.")
    logo = company.url_logo if payload.logo == company.url_logo else _checked_image(payload.logo)
    cover = company.url_portada if payload.coverImage == company.url_portada else _checked_image(payload.coverImage)
    company.nombre_comercial = payload.commercialName.strip()
    company.razon_social = payload.legalName.strip()
    company.nit = payload.nit.strip()
    company.sector_economico = payload.sector.strip()
    company.tamano_empresa = payload.size.strip()
    company.departamento = payload.department.strip()
    company.ciudad = payload.city.strip()
    company.direccion = payload.address.strip()
    company.telefono = payload.phone.strip()
    company.correo_contacto = str(payload.contactEmail).lower()
    company.sitio_web = payload.website.strip() or None
    company.descripcion_corporativa = payload.description.strip() or None
    company.nombre_representante_legal = representative['name'].strip()
    company.documento_representante_legal = representative['documentId'].strip()
    company.url_logo = logo
    company.url_portada = cover
    await db.commit()
    return _company_profile(company)


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
    if current_user.get('rol') not in ('admin_empresa', 'empresa_admin'):
        raise HTTPException(status_code=403, detail='Solo el administrador de la empresa puede crear reclutadores.')
    company_id = _resolve_company_id(current_user, id_empresa)
    return await CompanyService.create_reclutador(db, company_id, payload)


@router.put('/reclutadores/{reclutador_id}', response_model=ReclutadorItemResponse)
async def update_recruiter(
    reclutador_id: str,
    payload: ReclutadorUpdateRequest,
    current_user: Dict[str, Any] = Depends(require_approved_company),
    db: AsyncSession = Depends(get_db),
):
    if current_user.get('rol') not in ('admin_empresa', 'empresa_admin'):
        raise HTTPException(status_code=403, detail='Solo el administrador de la empresa puede editar reclutadores.')
    return await CompanyService.update_reclutador(db, _resolve_company_id(current_user), reclutador_id, payload)


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
    if current_user.get('rol') not in ('admin_empresa', 'empresa_admin'):
        raise HTTPException(status_code=403, detail='Solo el administrador de la empresa puede asignar sedes.')
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
    if current_user.get('rol') not in ('admin_empresa', 'empresa_admin'):
        raise HTTPException(status_code=403, detail='Solo el administrador de la empresa puede cambiar accesos.')
    company_id = _resolve_company_id(current_user, id_empresa)
    return await CompanyService.update_reclutador_status(db, company_id, reclutador_id, payload.estado)
