"""
Router de Trazabilidad Curricular y Pensums (FastAPI)
Permite subir PDFs de mallas curriculares y calcular alineación con ofertas de trabajo.
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

from app.services.pensum_extractor import PensumPDFExtractor
from app.services.curriculum_matcher import CurriculumMatcher
from app.core.skills_taxonomy import KNOWLEDGE_FAMILIES

router = APIRouter(prefix="/traceability", tags=["Trazabilidad Curricular"])


class MatchRequest(BaseModel):
    pensum_skills: List[str]
    pensum_tools: List[str]
    vacancies_demand: List[Dict[str, Any]]


@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "traceability_extractor",
        "version": "1.0.0"
    }


@router.get("/taxonomy")
def get_taxonomy():
    """
    Retorna el catálogo maestro de familias tecnológicas y herramientas.
    """
    return {
        "success": True,
        "families": KNOWLEDGE_FAMILIES
    }


@router.post("/upload-pensum-pdf")
async def upload_pensum_pdf(
    file: UploadFile = File(...),
    program_hint: Optional[str] = Form(default="")
):
    """
    Recibe un PDF de malla curricular o plan de estudios oficial,
    lo parsea con `pypdf` de forma determinista y retorna la estructura de materias y habilidades.
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

        result = PensumPDFExtractor.extract_from_bytes(pdf_bytes, program_hint=program_hint or "")
        result["filename"] = file.filename
        return result

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al procesar el archivo PDF: {str(e)}"
        )


@router.post("/match")
def match_curriculum(payload: MatchRequest):
    """
    Calcula la alineación y brecha entre el pensum y las vacantes empresariales.
    """
    return CurriculumMatcher.match_curriculum_against_vacancies(
        pensum_skills=payload.pensum_skills,
        pensum_tools=payload.pensum_tools,
        vacancies_demand=payload.vacancies_demand
    )
