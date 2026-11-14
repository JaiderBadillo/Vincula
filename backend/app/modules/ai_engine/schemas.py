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

class CurriculumSubjectRef(BaseModel):
    """Asignatura del pensum que respalda la cobertura de una competencia."""
    codigo: str
    nombre: str
    semestre: int
    programa: Optional[str] = None  # solo si viene del ciclo previo


class CurriculumDemandItem(BaseModel):
    """Competencia exigida por vacantes reales dirigidas al programa y su cobertura en la malla."""
    skill: str
    categoria: str  # 'tecnica' o 'blanda' (las blandas no entran al índice)
    vacantes: int
    obligatoria_en: int
    porcentaje_vacantes: float
    cobertura: str  # 'directa', 'afin' o 'brecha'
    area: Optional[str] = None
    asignaturas: List[CurriculumSubjectRef] = []
    criticidad: Optional[str] = None  # solo brechas: 'alta', 'media', 'baja'


class CurriculumAreaItem(BaseModel):
    """Área de formación: cuántas asignaturas la enseñan y cuántas vacantes la piden."""
    area: str
    asignaturas: int
    vacantes: int


class CurriculumSubjectResponse(BaseModel):
    """Materia del pensum. `herramientas` son las declaradas por la IES, no inferidas."""
    id: str
    codigo: str
    nombre: str
    creditos: int
    familia: str
    skills: List[str] = []
    herramientas: List[str] = []


class CurriculumSemesterResponse(BaseModel):
    numero_semestre: int
    etiqueta: str
    programa_origen: Optional[str] = None  # nombre del programa previo; None = malla propia
    asignaturas: List[CurriculumSubjectResponse] = []


class CurriculumPertinenceReport(BaseModel):
    """Informe de pertinencia curricular calculado solo con vacantes reales."""
    success: bool = True
    programa_nombre: str
    id_programa: Optional[str] = None
    programa_previo_id: Optional[str] = None  # ciclo propedéutico: su malla también cuenta
    programa_previo_nombre: Optional[str] = None
    pensum_registrado: bool = False
    pensum_version: Optional[str] = None
    pensum_actualizado_en: Optional[str] = None
    total_semestres: int = 0
    total_asignaturas: int = 0
    total_vacantes_abiertas: int = 0
    total_vacantes_analizadas: int = 0
    vacantes_alta_cobertura: int = 0
    indice_pertinencia: Optional[float] = None  # None = sin datos para medir
    nivel_pertinencia: str
    confianza: str  # 'sin_datos', 'baja', 'media', 'alta' según el tamaño de la muestra
    demanda: List[CurriculumDemandItem] = []
    areas_formacion: List[CurriculumAreaItem] = []
    recomendaciones_decanatura: List[str] = []
    semestres: List[CurriculumSemesterResponse] = []


class PensumSubjectIn(BaseModel):
    codigo: str = Field("", max_length=50)
    nombre: str = Field(..., min_length=2, max_length=255)
    creditos: int = 3  # se acota al guardar: una lectura errónea del PDF no debe bloquear el guardado
    herramientas: List[str] = Field(default_factory=list, max_length=30)


class PensumSemesterIn(BaseModel):
    numero_semestre: int = Field(..., ge=1, le=12)
    asignaturas: List[PensumSubjectIn] = Field(default_factory=list, max_length=40)


class PreviousProgramRequest(BaseModel):
    """Programa que debe haberse cursado antes (ciclo propedéutico). None lo quita."""
    id_programa_previo: Optional[str] = None


class PensumSaveRequest(BaseModel):
    """Malla confirmada por la IES para guardar como pensum oficial del programa."""
    version: Optional[str] = Field(None, max_length=50)
    semestres: List[PensumSemesterIn] = Field(..., min_length=1, max_length=12)


class OutcomeFunnelStep(BaseModel):
    fase: str
    etiqueta: str
    postulaciones: int  # postulaciones que alcanzaron esta fase o una posterior


class OutcomeDiscardReason(BaseModel):
    motivo: str
    postulaciones: int


class ProgramOutcomesReport(BaseModel):
    """Resultados reales de los egresados de un programa en los procesos de selección."""
    id_programa: str
    programa_nombre: str
    egresados_registrados: int
    egresados_postulados: int
    egresados_contratados: int
    total_postulaciones: int
    postulaciones_descartadas: int
    minimo_muestra: int
    muestra_suficiente: bool
    # None mientras no haya muestra suficiente: no se muestran tasas con pocos datos
    tasa_contratacion: Optional[float] = None
    dias_mediana_oferta: Optional[float] = None
    dias_mediana_contratacion: Optional[float] = None
    afinidad_promedio_contratados: Optional[float] = None
    afinidad_promedio_descartados: Optional[float] = None
    embudo: List[OutcomeFunnelStep] = []
    motivos_descarte: List[OutcomeDiscardReason] = []
