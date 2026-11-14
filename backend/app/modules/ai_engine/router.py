"""
Router del Motor de Inteligencia Artificial, Trazabilidad Curricular y Matching de Talento (Fase 6).
Endpoints oficiales bajo prefijo /api/v1/ia:
- Matching semántico y afinidad de egresados: /api/v1/ia/matching
- Recomendaciones personalizadas de vacantes: /api/v1/ia/vacantes-recomendadas
- Extracción de pensums y análisis curricular: /api/v1/ia/trazabilidad
"""

import uuid
from typing import Optional, List, Dict, Any
from fastapi.concurrency import run_in_threadpool
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.modules.ai_engine.pensum_parser import PensumPDFExtractor
from app.modules.ai_engine.vector_matcher import CurriculumMatcher
from app.modules.ai_engine.taxonomy import KNOWLEDGE_FAMILIES
from app.modules.ai_engine.schemas import (
    CandidateMatchResult,
    EvaluateMatchRequest,
    RecommendedVacanciesResponse,
    CurriculumPertinenceReport,
    PensumSaveRequest
)
from app.modules.ai_engine.services import TalentMatcherService
from app.modules.ai_engine.curriculum_service import CurriculumTraceabilityService
from app.modules.ai_engine.chat import router as chat_router

router = APIRouter(prefix="/ia", tags=["Motor IA & Matching de Talento"])
router.include_router(chat_router)


def _get_user_id(current_user: Dict[str, Any]) -> str:
    """Extrae el UUID del usuario autenticado desde los claims del JWT ('sub' o 'user_id')."""
    uid = current_user.get("sub") or current_user.get("user_id") or current_user.get("id")
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"codigo": "TOKEN_INVALIDO", "mensaje": "Token no contiene identificador de usuario válido."}
        )
    return str(uid)


class MatchCurriculumRequest(BaseModel):
    pensum_skills: List[str]
    pensum_tools: List[str]
    vacancies_demand: List[Dict[str, Any]]


# =========================================================================
# 1. EVALUACIÓN DE AFINIDAD Y MATCHING SEMÁNTICO (FASE 6 - PASO 1)
# =========================================================================

@router.get("/matching/evaluar/{vacante_id}", response_model=CandidateMatchResult)
async def evaluate_vacancy_affinity(
    vacante_id: str,
    egresado_id: Optional[str] = Query(None, description="UUID del egresado a evaluar (opcional si es el autenticado)"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Evalúa en tiempo real el porcentaje de afinidad y compatibilidad explicable
    entre un egresado y una vacante laboral específica.
    """
    user_id = _get_user_id(current_user)
    user_role = current_user.get("rol", "")

    # Si es reclutador o admin y no envió egresado_id, se requiere especificarlo
    target_egr_id = egresado_id
    if not target_egr_id and user_role not in ("egresado",):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"codigo": "EGRESADO_REQUERIDO", "mensaje": "Debes especificar el egresado_id a evaluar."}
        )

    return await TalentMatcherService.evaluate_egresado_vacante_async(
        session=db,
        user_id=user_id,
        vacante_id=vacante_id,
        target_egresado_id=target_egr_id
    )


@router.post("/matching/evaluar-candidato", response_model=CandidateMatchResult)
async def evaluate_candidate_match(
    payload: EvaluateMatchRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Endpoint POST para evaluar compatibilidad egresado vs vacante.
    """
    user_id = _get_user_id(current_user)
    return await TalentMatcherService.evaluate_egresado_vacante_async(
        session=db,
        user_id=user_id,
        vacante_id=payload.vacante_id,
        target_egresado_id=payload.egresado_id
    )


@router.get("/vacantes-recomendadas", response_model=RecommendedVacanciesResponse)
async def get_recommended_vacancies(
    limit: int = Query(20, ge=1, le=50, description="Cantidad máxima de recomendaciones a retornar"),
    egresado_id: Optional[str] = Query(None, description="UUID del egresado a evaluar (opcional si es egresado autenticado)"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retorna el catálogo de vacantes abiertas ordenadas por mayor índice de afinidad IA
    para el egresado autenticado o el egresado especificado.
    """
    user_id = _get_user_id(current_user)
    user_role = current_user.get("rol", "")

    target_id = egresado_id or user_id
    if not egresado_id and user_role not in ("egresado",):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"codigo": "EGRESADO_REQUERIDO", "mensaje": "Debes especificar el egresado_id a evaluar."}
        )

    return await TalentMatcherService.get_recommended_vacancies_async(
        session=db,
        user_id=target_id,
        limit=limit
    )


# =========================================================================
# 2. TRAZABILIDAD CURRICULAR Y FAMILIAS DE CONOCIMIENTO (IES)
# =========================================================================

@router.get("/trazabilidad/health")
def health_check():
    return {
        "status": "ok",
        "modulo": "ai_engine_traceability",
        "version": "2.1.0",
        "async_ready": True
    }


@router.post("/trazabilidad/upload-pensum-pdf")
async def upload_pensum_pdf(
    file: UploadFile = File(...),
    program_hint: Optional[str] = Form(default="")
):
    """
    Recibe un PDF de malla curricular oficial, extrae materias, semestres y competencias.
    Costo en tokens: $0.00.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="El archivo debe tener formato PDF (.pdf)."
        )

    try:
        pdf_bytes = await file.read()
        if len(pdf_bytes) == 0:
            raise HTTPException(status_code=400, detail="El archivo PDF está vacío.")

        result = await run_in_threadpool(PensumPDFExtractor.extract_from_bytes, pdf_bytes, program_hint=program_hint or "")
        result["filename"] = file.filename
        return result

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al procesar el archivo PDF: {str(e)}"
        )


@router.post("/trazabilidad/match")
def match_curriculum(payload: MatchCurriculumRequest):
    """Calcula el índice de cobertura y brechas críticas con las vacantes."""
    return CurriculumMatcher.match_curriculum_against_vacancies(
        pensum_skills=payload.pensum_skills,
        pensum_tools=payload.pensum_tools,
        vacancies_demand=payload.vacancies_demand
    )


IES_LECTURA = ["admin_ies", "ies_admin", "asesor_ies", "ies_asesor", "superadmin_vincula", "superadmin"]
IES_ESCRITURA = ["admin_ies", "ies_admin", "superadmin_vincula", "superadmin"]


@router.post("/trazabilidad/analizar-pensum-pdf", response_model=CurriculumPertinenceReport)
async def analyze_pensum_pdf(
    file: UploadFile = File(..., description="Archivo PDF del pensum o plan de estudios"),
    program_hint: Optional[str] = Form(default="", description="Nombre o sugerencia de la carrera"),
    id_programa: Optional[str] = Form(default=None, description="UUID del programa académico en la IES (opcional)"),
    current_user: Dict[str, Any] = Depends(require_role(IES_ESCRITURA)),
    db: AsyncSession = Depends(get_db)
):
    """
    Vista previa: extrae la malla del PDF y la mide contra las vacantes reales.
    No guarda nada; la malla se guarda con PUT /trazabilidad/programas/{id}/pensum.
    """
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"codigo": "FORMATO_INVALIDO", "mensaje": "El archivo debe tener formato PDF (.pdf)."}
        )

    pdf_bytes = await file.read()
    return await CurriculumTraceabilityService.extract_and_analyze_pdf_async(
        session=db,
        pdf_bytes=pdf_bytes,
        current_user=current_user,
        program_hint=program_hint or "",
        id_programa=id_programa
    )


@router.get("/trazabilidad/programas/{id_programa}/pertinencia", response_model=CurriculumPertinenceReport)
async def get_program_pertinence(
    id_programa: str,
    current_user: Dict[str, Any] = Depends(require_role(IES_LECTURA)),
    db: AsyncSession = Depends(get_db)
):
    """Informe de pertinencia curricular del programa frente a las vacantes dirigidas a él."""
    return await CurriculumTraceabilityService.analyze_program_by_id_async(db, id_programa, current_user)


@router.put("/trazabilidad/programas/{id_programa}/pensum", response_model=CurriculumPertinenceReport)
async def save_program_pensum(
    id_programa: str,
    payload: PensumSaveRequest,
    current_user: Dict[str, Any] = Depends(require_role(IES_ESCRITURA)),
    db: AsyncSession = Depends(get_db)
):
    """Guarda la malla confirmada por la IES (asignaturas y herramientas declaradas) y devuelve el informe."""
    return await CurriculumTraceabilityService.save_pensum_async(db, id_programa, payload, current_user)


@router.get("/trazabilidad/taxonomy")
async def get_curriculum_taxonomy():
    """
    Retorna el catálogo maestro de familias tecnológicas y competencias de la taxonomía.
    """
    return {
        "success": True,
        "total_families": len(KNOWLEDGE_FAMILIES),
        "families": KNOWLEDGE_FAMILIES
    }


