"""
Esquemas Pydantic para el Motor de IA, Matching Semántico y Trazabilidad Curricular (Fase 6).
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


# =========================================================================
# 1. MATCHING DE TALENTO & RECOMENDACIONES (PASO 1)
# =========================================================================

class CandidateMatchResult(BaseModel):
    """Resultado detallado de evaluación de afinidad egresado vs vacante."""
    match_score: float = Field(..., description="Puntaje de afinidad normalizado 0.0 a 100.0")
    porcentaje_afinidad: int = Field(..., description="Puntaje redondeado para visualización en UI")
    nivel_afinidad: str = Field(..., description="'alta', 'media_alta', 'moderada' o 'baja'")
    etiqueta_badge: str = Field(..., description="Texto para mostrar en la interfaz (ej: '94% Match')")
    skills_match: List[str] = Field(default_factory=list, description="Habilidades cumplidas")
    missing_skills: List[str] = Field(default_factory=list, description="Habilidades exigidas ausentes")
    skills_equivalent: List[str] = Field(default_factory=list, description="Habilidades cubiertas por equivalencia tecnológica")
    afinidad_academica: bool = Field(False, description="Si su carrera o pensum es afín a la vacante")
    motivo_recomendacion: str = Field(..., description="Explicación en lenguaje natural del resultado")


class EvaluateMatchRequest(BaseModel):
    """Solicitud para evaluar compatibilidad de una vacante frente al egresado."""
    vacante_id: str
    egresado_id: Optional[str] = None


class RecommendedVacancyItem(BaseModel):
    """Vacante enriquecida con métricas de compatibilidad IA."""
    id: str
    codigo_vacante: str
    titulo: str
    empresa_nombre: str
    empresa_logo: Optional[str] = None
    empresa_verificada: bool = True
    departamento: str
    ciudad: str
    modalidad: str
    salario_minimo: Optional[float] = None
    salario_maximo: Optional[float] = None
    salario_es_confidencial: bool = False
    salario_formateado: str
    tipo_contrato: str
    nivel_experiencia: str
    categoria: str
    requisitos: List[str] = []
    fecha_publicacion: str
    match_score: float
    porcentaje_afinidad: int
    nivel_afinidad: str
    etiqueta_badge: str
    skills_match: List[str] = []
    missing_skills: List[str] = []
    motivo_recomendacion: str


class RecommendedVacanciesResponse(BaseModel):
    """Respuesta del catálogo de vacantes recomendadas por afinidad."""
    total_evaluadas: int
    total_recomendadas: int
    egresado_nombre: str
    carrera_principal: str
    vacantes: List[RecommendedVacancyItem]


# =========================================================================
# 2. TRAZABILIDAD CURRICULAR & PERTINENCIA ACADÉMICA (PASO 2)
# =========================================================================

class CurriculumCoveredSkillItem(BaseModel):
    """Competencia del pensum demandada por el mercado laboral."""
    skill: str
    frecuencia_mercado: int
    tipo_cobertura: str  # 'exacta' o 'equivalente'
    detalle: str


class CurriculumGapItem(BaseModel):
    """Brecha formativa: Habilidad demandada por empresas ausente en el pensum."""
    skill: str
    frecuencia_mercado: int
    porcentaje_demanda: float
    criticidad: str  # 'alta', 'media', 'baja'
    sugerencia_curricular: str


class CurriculumSubjectResponse(BaseModel):
    """Materia individual del pensum con sus competencias asociadas."""
    id: str
    codigo: str
    nombre: str
    creditos: int
    familia: str
    skills: List[str] = []
    herramientas: List[str] = []


class CurriculumSemesterResponse(BaseModel):
    """Semestre con lista de asignaturas extraídas."""
    numero_semestre: int
    etiqueta: str
    asignaturas: List[CurriculumSubjectResponse] = []


class CurriculumPertinenceReport(BaseModel):
    """Informe integral de pertinencia curricular y análisis de brechas para IES."""
    success: bool = True
    programa_nombre: str
    id_programa: Optional[str] = None
    total_semestres: int
    total_asignaturas: int
    total_competencias_pensum: int
    total_vacantes_analizadas: int
    indice_pertinencia: float
    nivel_pertinencia: str
    competencias_cubiertas: List[CurriculumCoveredSkillItem] = []
    brechas_criticas: List[CurriculumGapItem] = []
    recomendaciones_decanatura: List[str] = []
    semestres: List[CurriculumSemesterResponse] = []
