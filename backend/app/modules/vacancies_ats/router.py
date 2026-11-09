"""
Router del Motor de Vacantes y Pipeline ATS Kanban (Fase 4 Paso 2).
Endpoints oficiales bajo /api/v1/vacantes y /api/v1/reclutador:
- Catálogo público seguro de vacantes para egresados (GATING RNF-01).
- Paginación y búsqueda multicriterio con SLA < 3.0s (RNF-02).
- Creación, actualización y control de estados de vacantes para empresas y reclutadores.
- Tablero ATS Kanban y transición de fases.
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role, require_approved_company
from app.modules.vacancies_ats.schemas import (
    VacanteCreateRequest,
    VacanteUpdateRequest,
    VacanteStatusUpdateRequest,
    VacanteResponse,
    PaginatedVacanciesResponse,
    MoveCandidatePhaseRequest,
    KanbanBoardResponse,
    PostulacionCreateRequest,
    PostulacionResponse,
    KanbanCandidateCardResponse,
    KanbanBoardDetailedResponse,
    MoverFaseRequest,
    NotaReclutadorRequest,
    NotaReclutadorResponse,
    ProgramarEntrevistaRequest,
    EntrevistaResponse,
)
from app.modules.vacancies_ats.services import VacancyATSService

router = APIRouter(tags=["Vacantes y ATS Kanban"])


def _get_user_id(current_user: Dict[str, Any]) -> str:
    """Extrae el UUID del usuario autenticado desde los claims del JWT ('sub' o 'user_id')."""
    uid = current_user.get("sub") or current_user.get("user_id") or current_user.get("id")
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"codigo": "TOKEN_INVALIDO", "mensaje": "Token no contiene identificador de usuario válido."}
        )
    return str(uid)


def _resolve_company_context(current_user: Dict[str, Any], query_company_id: Optional[str] = None) -> str:
    """Resuelve el ID de la empresa garantizando aislamiento multi-tenant."""
    user_role = current_user.get("rol", "")
    if query_company_id and user_role in ("superadmin_vincula", "superadmin"):
        return query_company_id

    company_id = current_user.get("id_entidad")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"codigo": "TOKEN_SIN_ENTIDAD", "mensaje": "El token no está vinculado a una empresa."}
        )

    if query_company_id and str(query_company_id) != str(company_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"codigo": "ACCESO_EMPRESA_DENEGADO", "mensaje": "No tienes autorización sobre recursos de otra entidad."}
        )

    return str(company_id)


# =========================================================================
# 1. CATÁLOGO PÚBLICO DE VACANTES (EGRESADOS)
# =========================================================================

@router.get("/vacantes", response_model=PaginatedVacanciesResponse)
async def list_public_vacancies(
    page: int = Query(1, ge=1, description="Número de página"),
    limit: int = Query(10, ge=1, le=50, description="Registros por página"),
    modalidad: Optional[str] = Query(None, description="Filtro por modalidad ('Presencial', 'Remoto', 'Híbrido')"),
    categoria: Optional[str] = Query(None, description="Filtro por área profesional o categoría"),
    departamento: Optional[str] = Query(None, description="Filtro por departamento geográfico"),
    ciudad: Optional[str] = Query(None, description="Filtro por ciudad"),
    q: Optional[str] = Query(None, description="Búsqueda por texto en título, descripción o empresa"),
    salario_min: Optional[float] = Query(None, description="Salario mínimo pretendido"),
    nivel_experiencia: Optional[str] = Query(None, description="Nivel de experiencia requerido"),
    db: AsyncSession = Depends(get_db)
):
    """
    Ruta pública segura para egresados: Solo retorna ofertas verificadas
    de empresas auditadas y aprobadas por el Super Admin (Gating de Cuarentena).
    SLA garantizado < 3.0 segundos (RNF-02).
    """
    return await VacancyATSService.list_public_vacancies(
        session=db,
        page=page,
        limit=limit,
        modalidad=modalidad,
        categoria=categoria,
        departamento=departamento,
        ciudad=ciudad,
        q=q,
        salario_min=salario_min,
        nivel_experiencia=nivel_experiencia
    )


@router.get("/vacantes/empresa/mis-vacantes", response_model=PaginatedVacanciesResponse)
async def list_company_vacancies(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    estado: Optional[str] = Query(None, description="Filtro por estado ('abierta', 'borrador', 'pausada', 'cerrada')"),
    sede_id: Optional[str] = Query(None, description="Filtro por sede corporativa"),
    q: Optional[str] = Query(None, description="Búsqueda por título o código"),
    id_empresa: Optional[str] = Query(None, description="Opcional para SuperAdmin"),
    current_user: Dict[str, Any] = Depends(require_approved_company),
    db: AsyncSession = Depends(get_db)
):
    """
    Bandeja de gestión corporativa: Lista todas las vacantes de la empresa autenticada.
    """
    company_id = _resolve_company_context(current_user, id_empresa)
    return await VacancyATSService.list_company_vacancies(
        session=db,
        company_id=company_id,
        page=page,
        limit=limit,
        estado=estado,
        sede_id=sede_id,
        q=q
    )


@router.get("/vacantes/{vacancy_id}", response_model=VacanteResponse)
async def get_public_vacancy_detail(
    vacancy_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Detalle público de una vacante: Solo accesible si la empresa está aprobada y la vacante abierta.
    """
    return await VacancyATSService.get_public_vacancy_detail(session=db, vacancy_id=vacancy_id)


# =========================================================================
# 2. OPERACIONES CORPORATIVAS DE VACANTES (GATING DE LEY)
# =========================================================================

@router.post("/vacantes", response_model=VacanteResponse, status_code=status.HTTP_201_CREATED)
async def create_vacancy(
    payload: VacanteCreateRequest,
    id_empresa: Optional[str] = Query(None, description="Opcional para SuperAdmin"),
    current_user: Dict[str, Any] = Depends(require_approved_company),
    db: AsyncSession = Depends(get_db)
):
    """
    Ruta protegida con GATING (Opción 2):
    Solo empresas formalmente aprobadas pueden publicar vacantes abiertas.
    Si la empresa estuviese en cuarentena, la vacante se fuerza a 'borrador'.
    """
    company_id = _resolve_company_context(current_user, id_empresa)
    company_status = current_user.get("estado_validacion", "aprobado")
    user_id = current_user.get("sub") or current_user.get("id")
    user_role = current_user.get("rol")

    return await VacancyATSService.create_vacancy(
        session=db,
        company_id=company_id,
        company_status=company_status,
        payload=payload,
        user_id=user_id,
        user_role=user_role
    )


@router.get("/vacantes/empresa/detalle/{vacancy_id}", response_model=VacanteResponse)
async def get_company_vacancy_detail(
    vacancy_id: str,
    id_empresa: Optional[str] = Query(None, description="Opcional para SuperAdmin"),
    current_user: Dict[str, Any] = Depends(require_approved_company),
    db: AsyncSession = Depends(get_db)
):
    """
    Detalle privado de una vacante corporativa (incluso si está en borrador o pausada).
    """
    company_id = _resolve_company_context(current_user, id_empresa)
    return await VacancyATSService.get_company_vacancy_detail(
        session=db,
        company_id=company_id,
        vacancy_id=vacancy_id
    )


@router.put("/vacantes/{vacancy_id}", response_model=VacanteResponse)
async def update_vacancy(
    vacancy_id: str,
    payload: VacanteUpdateRequest,
    id_empresa: Optional[str] = Query(None, description="Opcional para SuperAdmin"),
    current_user: Dict[str, Any] = Depends(require_approved_company),
    db: AsyncSession = Depends(get_db)
):
    """
    Actualiza los datos o requisitos de una vacante existente.
    """
    company_id = _resolve_company_context(current_user, id_empresa)
    return await VacancyATSService.update_vacancy(
        session=db,
        company_id=company_id,
        vacancy_id=vacancy_id,
        payload=payload
    )


@router.patch("/vacantes/{vacancy_id}/estado", response_model=VacanteResponse)
async def update_vacancy_status(
    vacancy_id: str,
    payload: VacanteStatusUpdateRequest,
    id_empresa: Optional[str] = Query(None, description="Opcional para SuperAdmin"),
    current_user: Dict[str, Any] = Depends(require_approved_company),
    db: AsyncSession = Depends(get_db)
):
    """
    Cambia el estado de la vacante ('abierta', 'pausada', 'cerrada', 'borrador').
    Gating: Bloquea apertura pública si la empresa estuviese en cuarentena.
    """
    company_id = _resolve_company_context(current_user, id_empresa)
    company_status = current_user.get("estado_validacion", "aprobado")

    return await VacancyATSService.update_vacancy_status(
        session=db,
        company_id=company_id,
        company_status=company_status,
        vacancy_id=vacancy_id,
        nuevo_estado=payload.estado
    )


# =========================================================================
# 3. POSTULACIONES DE EGRESADOS (FASE 5)
# =========================================================================

@router.post("/postulaciones/{vacancy_id}", response_model=PostulacionResponse, status_code=status.HTTP_201_CREATED)
async def postular_a_vacante(
    vacancy_id: str,
    payload: Optional[PostulacionCreateRequest] = None,
    current_user: Dict[str, Any] = Depends(require_role(["egresado", "superadmin_vincula", "superadmin"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Postulación en 1 clic para egresados autenticados.
    Garantiza:
    - Vacante abierta de empresa aprobada (GATING RNF-01).
    - Prevención de duplicados (400 si ya se postuló).
    - Registro en historial de fases y suma al conteo de candidatos.
    """
    id_cv = payload.id_hoja_vida if payload else None
    return await VacancyATSService.postular_egresado(
        session=db,
        user_id=_get_user_id(current_user),
        id_vacante=vacancy_id,
        id_hoja_vida=id_cv,
        payload=payload,
        current_user=current_user,
    )


# =========================================================================
# 4. PIPELINE ATS KANBAN (FASE 5)
# =========================================================================

@router.get("/reclutador/kanban/{vacancy_id}", response_model=KanbanBoardDetailedResponse)
async def get_kanban_pipeline(
    vacancy_id: str,
    current_user: Dict[str, Any] = Depends(require_approved_company),
    db: AsyncSession = Depends(get_db)
):
    """
    Tablero ATS Kanban con las 6 columnas del embudo de selección hidratadas:
    - review (En Revisión)
    - preselected (Preseleccionados)
    - evaluation (Prueba Técnica)
    - interview (Entrevista)
    - offer (Oferta / Finalistas)
    - discarded (Descartados)
    GATING: Bloqueado para empresas en cuarentena.
    """
    return await VacancyATSService.get_kanban_board_async(
        session=db,
        user_id=_get_user_id(current_user),
        user_role=current_user.get("rol", ""),
        id_vacante=vacancy_id,
        company_id=current_user.get("id_entidad")
    )


@router.patch("/reclutador/postulaciones/{application_id}/mover-fase", response_model=KanbanCandidateCardResponse)
async def move_candidate_phase(
    application_id: str,
    payload: MoverFaseRequest,
    current_user: Dict[str, Any] = Depends(require_approved_company),
    db: AsyncSession = Depends(get_db)
):
    """
    Transición drag-and-drop de un candidato entre fases del ATS Kanban.
    Registra bitácora de auditoría en historial_fases_postulacion y maneja descartes.
    """
    return await VacancyATSService.mover_fase_candidato(
        session=db,
        user_id=_get_user_id(current_user),
        user_role=current_user.get("rol", ""),
        id_postulacion=application_id,
        payload=payload,
        company_id=current_user.get("id_entidad")
    )


@router.post("/reclutador/postulaciones/{application_id}/notas", response_model=NotaReclutadorResponse, status_code=status.HTTP_201_CREATED)
async def add_candidate_note(
    application_id: str,
    payload: NotaReclutadorRequest,
    current_user: Dict[str, Any] = Depends(require_approved_company),
    db: AsyncSession = Depends(get_db)
):
    """
    Agrega una nota privada de evaluación del reclutador para el candidato.
    """
    return await VacancyATSService.agregar_nota_candidato(
        session=db,
        user_id=_get_user_id(current_user),
        id_postulacion=application_id,
        payload=payload
    )


@router.post("/reclutador/postulaciones/{application_id}/entrevistas", response_model=EntrevistaResponse, status_code=status.HTTP_201_CREATED)
async def schedule_candidate_interview(
    application_id: str,
    payload: ProgramarEntrevistaRequest,
    current_user: Dict[str, Any] = Depends(require_approved_company),
    db: AsyncSession = Depends(get_db)
):
    """
    Programa una entrevista con el candidato y lo transiciona automáticamente a la fase 'entrevista'.
    """
    return await VacancyATSService.programar_entrevista_candidato(
        session=db,
        user_id=_get_user_id(current_user),
        id_postulacion=application_id,
        payload=payload
    )


@router.delete("/postulaciones/{application_id}/retirar")
async def withdraw_application_candidate(
    application_id: str,
    current_user: Dict[str, Any] = Depends(require_role(["egresado"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Ruta alternativa directa para que el egresado retire voluntariamente su postulación.
    """
    from app.modules.graduates.services import GraduateService
    return await GraduateService.withdraw_application_async(
        session=db,
        user_id=_get_user_id(current_user),
        id_postulacion=application_id
    )

