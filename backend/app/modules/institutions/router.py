"""
Router de IES - Gobernanza Académica, Estructura Curricular y Validación de Títulos.
Endpoints oficiales bajo prefijo /api/v1/instituciones:
- CRUD de Sedes Institucionales
- CRUD de Facultades
- CRUD de Programas Académicos con Código SNIES
- Asignación de Asesores de Empleabilidad a Programas
- Subsanación Documental
- Cola de Validación de Diplomas de Egresados
"""

import uuid
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Form, File, UploadFile, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import require_role, require_approved_institution
from app.modules.institutions.schemas import (
    SedeCreateRequest,
    SedeResponse,
    FacultadCreateRequest,
    FacultadResponse,
    ProgramaCreateRequest,
    ProgramaUpdateRequest,
    ProgramaStatusUpdateRequest,
    ProgramaItemResponse,
    PaginatedProgramsResponse,
    AsesorCreateRequest,
    AsesorUpdateRequest,
    AsesorItemResponse,
    AsignarAsesorRequest,
    AsignacionResponse,
    ProgramSchema,
    GraduatePendingValidationItem,
    PaginatedGraduateValidationResponse,
    ValidateGraduateRequest,
    ValidateDiplomaRequest,
    SelloDigitalResponse,
    RejectDiplomaRequest,
    RejectDiplomaResponse,
    DiplomaSecureUrlResponse,
    SubsanarDocumentoIESRequest,
)
from app.modules.institutions.services import InstitutionService

router = APIRouter(prefix="/instituciones", tags=["IES - Academia, SNIES y Asesores"])


def _resolve_ies_id(current_user: Dict[str, Any], query_ies_id: Optional[str] = None) -> str:
    """Resuelve el ID de la institución desde el token o query param (para superadmin)."""
    if query_ies_id and current_user.get("rol") in ("superadmin_vincula", "superadmin"):
        return query_ies_id
    ies_id = current_user.get("id_entidad")
    if not ies_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"codigo": "TOKEN_SIN_ENTIDAD", "mensaje": "El token de autenticación no está vinculado a una IES registrada."}
        )
    return ies_id


# =============================================================================
# 1. SEDES INSTITUCIONALES
# =============================================================================

@router.get("/sedes", response_model=List[SedeResponse])
async def list_sedes(
    id_institucion: Optional[str] = Query(None, description="UUID de la IES (Superadmin)"),
    current_user: Dict[str, Any] = Depends(require_role(["admin_ies", "ies_admin", "asesor_ies", "ies_asesor", "superadmin_vincula", "superadmin"])),
    db: AsyncSession = Depends(get_db)
):
    """Retorna las sedes (campus) registradas para la institución educativa."""
    ies_id = _resolve_ies_id(current_user, id_institucion)
    return await InstitutionService.list_sedes(db, ies_id)


@router.post("/sedes", response_model=SedeResponse, status_code=status.HTTP_201_CREATED)
async def create_sede(
    payload: SedeCreateRequest,
    id_institucion: Optional[str] = Query(None, description="UUID de la IES (Superadmin)"),
    current_user: Dict[str, Any] = Depends(require_role(["admin_ies", "ies_admin", "superadmin_vincula", "superadmin"])),
    db: AsyncSession = Depends(get_db)
):
    """Crea una nueva sede institucional (ej: Campus Principal, Seccional Norte)."""
    ies_id = _resolve_ies_id(current_user, id_institucion)
    return await InstitutionService.create_sede(db, ies_id, payload)


# =============================================================================
# 2. FACULTADES
# =============================================================================

@router.get("/facultades", response_model=List[FacultadResponse])
async def list_facultades(
    id_institucion: Optional[str] = Query(None, description="UUID de la IES (Superadmin)"),
    current_user: Dict[str, Any] = Depends(require_role(["admin_ies", "ies_admin", "asesor_ies", "ies_asesor", "superadmin_vincula", "superadmin"])),
    db: AsyncSession = Depends(get_db)
):
    """Retorna las facultades o divisiones académicas de la institución."""
    ies_id = _resolve_ies_id(current_user, id_institucion)
    return await InstitutionService.list_facultades(db, ies_id)


@router.post("/facultades", response_model=FacultadResponse, status_code=status.HTTP_201_CREATED)
async def create_facultad(
    payload: FacultadCreateRequest,
    id_institucion: Optional[str] = Query(None, description="UUID de la IES (Superadmin)"),
    current_user: Dict[str, Any] = Depends(require_role(["admin_ies", "ies_admin", "superadmin_vincula", "superadmin"])),
    db: AsyncSession = Depends(get_db)
):
    """Registra una nueva facultad con código interno único dentro de la institución."""
    ies_id = _resolve_ies_id(current_user, id_institucion)
    return await InstitutionService.create_facultad(db, ies_id, payload)


# =============================================================================
# 3. PROGRAMAS ACADÉMICOS CON CÓDIGO SNIES
# =============================================================================

@router.get("/programas", response_model=PaginatedProgramsResponse)
async def list_programas(
    id_institucion: Optional[str] = Query(None, description="UUID de la IES (Superadmin)"),
    id_facultad: Optional[str] = Query(None, description="Filtrar por facultad"),
    id_sede: Optional[str] = Query(None, description="Filtrar por sede"),
    nivel_formacion: Optional[str] = Query(None, description="Filtrar por nivel ('Tecnológico', 'Profesional Universitario', 'Especialización')"),
    estado: Optional[str] = Query(None, description="Filtrar por estado ('activo', 'inactivo')"),
    page: int = Query(1, ge=1, description="Número de página"),
    limit: int = Query(20, ge=1, le=100, description="Registros por página"),
    current_user: Dict[str, Any] = Depends(require_role(["admin_ies", "ies_admin", "asesor_ies", "ies_asesor", "superadmin_vincula", "superadmin"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Retorna la lista paginada de programas académicos con código SNIES oficial de la institución.
    Soporta filtros por facultad, sede, nivel formativo y estado.
    """
    ies_id = _resolve_ies_id(current_user, id_institucion)
    return await InstitutionService.list_programas(
        session=db,
        ies_id=ies_id,
        id_facultad=id_facultad,
        id_sede=id_sede,
        nivel_formacion=nivel_formacion,
        estado=estado,
        page=page,
        limit=limit
    )


@router.post("/programas", response_model=ProgramaItemResponse, status_code=status.HTTP_201_CREATED)
async def create_programa(
    payload: ProgramaCreateRequest,
    id_institucion: Optional[str] = Query(None, description="UUID de la IES (Superadmin)"),
    current_user: Dict[str, Any] = Depends(require_role(["admin_ies", "ies_admin", "superadmin_vincula", "superadmin"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Crea un nuevo programa académico validando unicidad de código SNIES ante la institución,
    asociación a sede y facultad existentes.
    """
    ies_id = _resolve_ies_id(current_user, id_institucion)
    return await InstitutionService.create_programa(db, ies_id, payload)


@router.get("/programas/{program_id}", response_model=ProgramaItemResponse)
async def get_programa(
    program_id: str,
    id_institucion: Optional[str] = Query(None, description="UUID de la IES (Superadmin)"),
    current_user: Dict[str, Any] = Depends(require_role(["admin_ies", "ies_admin", "asesor_ies", "ies_asesor", "superadmin_vincula", "superadmin"])),
    db: AsyncSession = Depends(get_db)
):
    """Consulta la ficha técnica detallada de un programa académico."""
    ies_id = _resolve_ies_id(current_user, id_institucion)
    return await InstitutionService.get_programa_by_id(db, ies_id, program_id)


@router.put("/programas/{program_id}", response_model=ProgramaItemResponse)
async def update_programa(
    program_id: str,
    payload: ProgramaUpdateRequest,
    id_institucion: Optional[str] = Query(None, description="UUID de la IES (Superadmin)"),
    current_user: Dict[str, Any] = Depends(require_role(["admin_ies", "ies_admin", "superadmin_vincula", "superadmin"])),
    db: AsyncSession = Depends(get_db)
):
    """Actualiza los metadatos curriculares de un programa (créditos, director, modalidad, estado)."""
    ies_id = _resolve_ies_id(current_user, id_institucion)
    return await InstitutionService.update_programa(db, ies_id, program_id, payload)


@router.patch("/programas/{program_id}/estado", response_model=ProgramaItemResponse)
async def toggle_programa_status(
    program_id: str,
    payload: Optional[ProgramaStatusUpdateRequest] = None,
    id_institucion: Optional[str] = Query(None, description="UUID de la IES (Superadmin)"),
    current_user: Dict[str, Any] = Depends(require_role(["admin_ies", "ies_admin", "superadmin_vincula", "superadmin"])),
    db: AsyncSession = Depends(get_db)
):
    """Activa o inactiva un programa académico en la oferta curricular de la plataforma."""
    ies_id = _resolve_ies_id(current_user, id_institucion)
    nuevo_estado = payload.estado if payload else None
    return await InstitutionService.toggle_programa_status(db, ies_id, program_id, nuevo_estado=nuevo_estado)


@router.get("/programas-catalogo", response_model=List[ProgramSchema])
async def get_programs_catalog(
    id_institucion: Optional[str] = Query(None, description="UUID de la IES (Superadmin)"),
    current_user: Dict[str, Any] = Depends(require_approved_institution),
    db: AsyncSession = Depends(get_db)
):
    """Endpoint simplificado para listado plano de programas (dropdowns y selectores rápidos)."""
    ies_id = _resolve_ies_id(current_user, id_institucion)
    return await InstitutionService.get_programs_legacy(db, ies_id)


# =============================================================================
# 4. ASESORES DE EMPLEABILIDAD Y ASIGNACIONES
# =============================================================================

@router.get("/asesores", response_model=List[AsesorItemResponse])
async def list_asesores(
    id_institucion: Optional[str] = Query(None, description="UUID de la IES (Superadmin)"),
    current_user: Dict[str, Any] = Depends(require_role(["admin_ies", "ies_admin", "superadmin_vincula", "superadmin"])),
    db: AsyncSession = Depends(get_db)
):
    """Lista los asesores y coordinadores de empleabilidad de la institución."""
    ies_id = _resolve_ies_id(current_user, id_institucion)
    return await InstitutionService.list_asesores(db, ies_id)


@router.post("/asesores", response_model=AsesorItemResponse, status_code=status.HTTP_201_CREATED)
async def create_asesor(
    payload: AsesorCreateRequest,
    id_institucion: Optional[str] = Query(None, description="UUID de la IES (Superadmin)"),
    current_user: Dict[str, Any] = Depends(require_role(["admin_ies", "ies_admin", "superadmin_vincula", "superadmin"])),
    db: AsyncSession = Depends(get_db)
):
    """Crea una cuenta de asesor de empleabilidad y la vincula con la institución."""
    ies_id = _resolve_ies_id(current_user, id_institucion)
    return await InstitutionService.create_asesor(db, ies_id, payload)


@router.put("/asesores/{asesor_id}", response_model=AsesorItemResponse)
async def update_asesor(
    asesor_id: str,
    payload: AsesorUpdateRequest,
    id_institucion: Optional[str] = Query(None, description="UUID de la IES (Superadmin)"),
    current_user: Dict[str, Any] = Depends(require_role(["admin_ies", "ies_admin", "superadmin_vincula", "superadmin"])),
    db: AsyncSession = Depends(get_db)
):
    """Actualiza los datos, sedes de cobertura o estado de un asesor institucional."""
    ies_id = _resolve_ies_id(current_user, id_institucion)
    return await InstitutionService.update_asesor(db, ies_id, asesor_id, payload)


@router.post("/programas/{program_id}/asignar-asesor", response_model=AsignacionResponse)
async def assign_asesor_to_program(
    program_id: str,
    payload: AsignarAsesorRequest,
    id_institucion: Optional[str] = Query(None, description="UUID de la IES (Superadmin)"),
    current_user: Dict[str, Any] = Depends(require_role(["admin_ies", "ies_admin", "superadmin_vincula", "superadmin"])),
    db: AsyncSession = Depends(get_db)
):
    """Asigna un asesor de empleabilidad al seguimiento específico de un programa académico."""
    ies_id = _resolve_ies_id(current_user, id_institucion)
    return await InstitutionService.assign_asesor_to_program(db, ies_id, program_id, payload.id_asesor)


# =============================================================================
# 5. VALIDACIÓN DE DIPLOMAS Y SUBSANACIÓN (Fases 2 / 3 Paso 2)
# =============================================================================

@router.get("/egresados/pendientes", response_model=PaginatedGraduateValidationResponse)
async def get_pending_graduates(
    id_institucion: Optional[str] = Query(None, description="UUID de la IES (Superadmin)"),
    id_programa: Optional[str] = Query(None, description="Filtrar por programa académico específico"),
    estado: Optional[str] = Query("todos", description="Filtrar por estado: 'pendiente', 'aprobado', 'rechazado' o 'todos'"),
    busqueda: Optional[str] = Query(None, description="Búsqueda por nombre de egresado o documento"),
    page: int = Query(1, ge=1, description="Número de página"),
    limit: int = Query(20, ge=1, le=100, description="Items por página (máx. 100)"),
    current_user: Dict[str, Any] = Depends(require_approved_institution),
    db: AsyncSession = Depends(get_db)
):
    """
    Bandeja institucional paginada en el servidor de diplomas y egresados radicados.
    Cumple el límite de respuesta de 3 segundos (RNF-02) y garantiza aislamiento multi-tenant.
    """
    ies_id = _resolve_ies_id(current_user, id_institucion)
    return await InstitutionService.get_pending_graduates_paginated(
        session=db,
        ies_id=ies_id,
        program_id=id_programa,
        estado_filtro=estado or "todos",
        search=busqueda,
        page=page,
        limit=limit
    )


@router.get("/egresados/{identifier}/diploma-secure-url", response_model=DiplomaSecureUrlResponse)
@router.get("/egresados/{identifier}/diploma-url", response_model=DiplomaSecureUrlResponse)
async def get_diploma_secure_url(
    identifier: str,
    id_institucion: Optional[str] = Query(None, description="UUID de la IES (Superadmin)"),
    expires_in: int = Query(3600, ge=60, le=86400, description="Segundos de validez de la URL firmada"),
    current_user: Dict[str, Any] = Depends(require_approved_institution),
    db: AsyncSession = Depends(get_db)
):
    """
    Genera una URL firmada de descarga temporal (3600s por defecto) para visualizar
    el PDF del diploma radicado por el egresado en Supabase Storage (vincula-diplomas-validados).
    """
    ies_id = _resolve_ies_id(current_user, id_institucion)
    return await InstitutionService.get_diploma_secure_url(
        session=db,
        ies_id=ies_id,
        identifier=identifier,
        expires_in=expires_in
    )


@router.post("/egresados/{identifier}/validar-diploma", response_model=SelloDigitalResponse)
async def validate_diploma(
    identifier: str,
    payload: ValidateDiplomaRequest,
    id_institucion: Optional[str] = Query(None, description="UUID de la IES (Superadmin)"),
    current_user: Dict[str, Any] = Depends(require_approved_institution),
    db: AsyncSession = Depends(get_db)
):
    """
    Valida oficialmente el diploma de un egresado otorgándole el Sello Digital Institucional (SHA-256).
    Registra número de acta, folio y libro de grado, y habilita formalmente al egresado.
    """
    ies_id = _resolve_ies_id(current_user, id_institucion)
    validator_user_id = current_user.get("id") or current_user.get("id_usuario")
    validator_name = current_user.get("nombre") or current_user.get("correo")

    return await InstitutionService.validate_graduate_diploma_db(
        session=db,
        ies_id=ies_id,
        identifier=identifier,
        validator_user_id=validator_user_id,
        validator_name=validator_name,
        payload=payload
    )


@router.post("/egresados/{identifier}/rechazar-diploma", response_model=RejectDiplomaResponse)
@router.post("/egresados/{identifier}/observar-diploma", response_model=RejectDiplomaResponse)
async def reject_diploma(
    identifier: str,
    payload: RejectDiplomaRequest,
    id_institucion: Optional[str] = Query(None, description="UUID de la IES (Superadmin)"),
    current_user: Dict[str, Any] = Depends(require_approved_institution),
    db: AsyncSession = Depends(get_db)
):
    """
    Rechaza u observa formalmente el diploma de un egresado por inconsistencias documentales,
    solicitando corrección con justificación explícita.
    """
    ies_id = _resolve_ies_id(current_user, id_institucion)
    validator_user_id = current_user.get("id") or current_user.get("id_usuario")
    validator_name = current_user.get("nombre") or current_user.get("correo")

    return await InstitutionService.reject_graduate_diploma_db(
        session=db,
        ies_id=ies_id,
        identifier=identifier,
        validator_user_id=validator_user_id,
        validator_name=validator_name,
        payload=payload
    )


@router.post("/subsanar-documento")
async def subsanar_documento(
    payload: SubsanarDocumentoIESRequest,
    current_user: Dict[str, Any] = Depends(require_role(["admin_ies", "ies_admin"])),
    db: AsyncSession = Depends(get_db)
):
    """Ruta libre de cuarentena para IES: Subsanación en formato JSON con base64/URL."""
    ies_id = _resolve_ies_id(current_user)
    return await InstitutionService.subsanar_documento(
        session=db,
        ies_id=ies_id,
        tipo_documento=payload.tipo_documento,
        nombre_archivo=payload.nombre_archivo,
        archivo_base64_o_url=payload.archivo_base64_o_url,
        observaciones=payload.observaciones
    )


@router.post("/subsanar-documento-form")
async def subsanar_documento_form(
    tipo_documento: str = Form(..., description="Tipo de documento ('resolucion_men', 'rut_institucional', 'cedula_rector')"),
    archivo_pdf: UploadFile = File(..., description="Archivo PDF subsanado de la IES"),
    observaciones: Optional[str] = Form(None),
    current_user: Dict[str, Any] = Depends(require_role(["admin_ies", "ies_admin"])),
    db: AsyncSession = Depends(get_db)
):
    """Ruta libre de cuarentena para IES: Subsanación directa de PDF (Multipart Form)."""
    ies_id = _resolve_ies_id(current_user)
    file_bytes = await archivo_pdf.read()
    return await InstitutionService.subsanar_documento(
        session=db,
        ies_id=ies_id,
        tipo_documento=tipo_documento,
        nombre_archivo=archivo_pdf.filename or f"{tipo_documento}.pdf",
        file_bytes=file_bytes,
        observaciones=observaciones
    )
