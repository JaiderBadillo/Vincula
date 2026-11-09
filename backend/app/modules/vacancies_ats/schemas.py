"""
Esquemas Pydantic para el Motor de Vacantes Formales y ATS Kanban (Fase 4 Paso 2).
Soporta:
- Creación, actualización y filtrado de vacantes de ley
- Paginación de alto rendimiento con SLA < 3s (RNF-02)
- Multi-tenancy corporativo, sedes y reclutadores
- Compatibilidad hacia atrás con endpoints previos
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class CompetenciaItem(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=120)
    categoria: Optional[str] = Field("tecnica", description="'tecnica' o 'blanda'")
    es_obligatoria: bool = Field(True, description="True si es requisito excluyente, False si es deseable")


class CompetenciaResponse(BaseModel):
    id: str
    nombre: str
    categoria: str
    es_obligatoria: bool


class VacanteSedeItemResponse(BaseModel):
    id: str
    nombre: str
    ciudad: str
    departamento: str


class VacanteEmpresaItemResponse(BaseModel):
    id: str
    razon_social: str
    nombre_comercial: str
    sector_economico: str
    ciudad: str
    url_logo: Optional[str] = None
    empresa_verificada: bool = True


class VacanteCreateRequest(BaseModel):
    titulo: str = Field(..., min_length=5, max_length=255)
    id_sede: str = Field(..., description="UUID de la sede corporativa")
    id_reclutador_responsable: Optional[str] = Field(None, description="UUID del reclutador (opcional, por defecto el usuario activo)")
    categoria: str = Field("Tecnología", min_length=2, max_length=100)
    modalidad: str = Field("Presencial", description="'Presencial', 'Remoto' o 'Híbrido'")
    tipo_contrato: str = Field("Término Indefinido", min_length=2, max_length=100)
    nivel_experiencia: str = Field("Junior", min_length=2, max_length=60)
    salario_minimo: Optional[float] = Field(None, ge=0)
    salario_maximo: Optional[float] = Field(None, ge=0)
    salario_es_confidencial: bool = False
    periodo_salario: str = "Mensual"
    jornada_laboral: str = Field("Tiempo Completo", min_length=2, max_length=100)
    cupos_disponibles: int = Field(1, ge=1)
    descripcion: str = Field(..., min_length=15)
    responsabilidades: List[str] = Field(default_factory=list)
    requisitos: List[str] = Field(default_factory=list)
    beneficios: Optional[List[str]] = Field(default_factory=list)
    idiomas_requeridos: Optional[List[str]] = Field(default_factory=list)
    fecha_cierre: str = Field(..., description="Fecha de cierre en formato YYYY-MM-DD")
    estado: Optional[str] = Field("abierta", description="'abierta' o 'borrador'")
    competencias: Optional[List[CompetenciaItem]] = Field(default_factory=list)
    habilidades_requeridas: Optional[List[str]] = Field(default_factory=list)  # compatibilidad
    programas_afines_ids: Optional[List[str]] = Field(default_factory=list)
    publicar_inmediatamente: Optional[bool] = True  # compatibilidad


class VacanteUpdateRequest(BaseModel):
    titulo: Optional[str] = Field(None, min_length=5, max_length=255)
    id_sede: Optional[str] = None
    id_reclutador_responsable: Optional[str] = None
    categoria: Optional[str] = None
    modalidad: Optional[str] = None
    tipo_contrato: Optional[str] = None
    nivel_experiencia: Optional[str] = None
    salario_minimo: Optional[float] = None
    salario_maximo: Optional[float] = None
    salario_es_confidencial: Optional[bool] = None
    periodo_salario: Optional[str] = None
    jornada_laboral: Optional[str] = None
    cupos_disponibles: Optional[int] = Field(None, ge=1)
    descripcion: Optional[str] = None
    responsabilidades: Optional[List[str]] = None
    requisitos: Optional[List[str]] = None
    beneficios: Optional[List[str]] = None
    idiomas_requeridos: Optional[List[str]] = None
    fecha_cierre: Optional[str] = None
    estado: Optional[str] = None
    competencias: Optional[List[CompetenciaItem]] = None
    programas_afines_ids: Optional[List[str]] = None


class VacanteStatusUpdateRequest(BaseModel):
    estado: str = Field(..., description="'abierta', 'pausada', 'cerrada', 'borrador'")


class VacanteResponse(BaseModel):
    id: str
    id_empresa: str
    id_sede: str
    id_reclutador_responsable: str
    codigo_vacante: str
    titulo: str
    categoria: str
    modalidad: str
    tipo_contrato: str
    nivel_experiencia: str
    salario_minimo: Optional[float] = None
    salario_maximo: Optional[float] = None
    salario_es_confidencial: bool
    periodo_salario: str
    jornada_laboral: str
    cupos_disponibles: int
    total_postulantes: int
    descripcion: str
    responsabilidades: List[str]
    requisitos: List[str]
    beneficios: List[str]
    idiomas_requeridos: List[str]
    estado: str
    publicado_en: str
    fecha_cierre: str
    creado_en: str
    empresa: VacanteEmpresaItemResponse
    sede: VacanteSedeItemResponse
    competencias: List[CompetenciaResponse] = Field(default_factory=list)
    programas_afines_ids: List[str] = Field(default_factory=list)

    # Campos de compatibilidad directa con Frontend React
    empresa_nombre: str
    empresa_logo: Optional[str] = None
    empresa_verificada: bool = True
    ubicacion: str
    rango_salarial_min: Optional[int] = None
    rango_salarial_max: Optional[int] = None
    habilidades_requeridas: List[str] = Field(default_factory=list)
    total_postulados: int = 0


class PaginatedVacanciesResponse(BaseModel):
    items: List[VacanteResponse]
    total: int
    page: int
    limit: int
    total_pages: int
    tiempo_respuesta_ms: float


# ATS Kanban (Fase 5 - Pipeline de Selección de 6 Fases)

class PostulacionCreateRequest(BaseModel):
    id_hoja_vida: Optional[str] = None
    vacante_titulo: Optional[str] = None
    vacante_codigo: Optional[str] = None
    empresa_nombre: Optional[str] = None
    modalidad: Optional[str] = None
    ubicacion: Optional[str] = None
    correo_egresado: Optional[str] = None
    nombre_egresado: Optional[str] = None
    carta_presentacion: Optional[str] = None
    salario_esperado: Optional[Any] = None
    disponibilidad_inmediata: Optional[bool] = True
    respuestas_formulario: Optional[Dict[str, Any]] = None


class PostulacionResponse(BaseModel):
    id: str
    id_vacante: str
    id_egresado: str
    id_hoja_vida: Optional[str] = None
    fase_actual: str
    porcentaje_afinidad: float
    retroalimentacion_reclutador: Optional[str] = None
    motivo_descarte: Optional[str] = None
    descartado_en: Optional[str] = None
    postulado_en: str
    actualizado_en: str
    vacante_titulo: str
    vacante_codigo: str
    empresa_nombre: str
    egresado_nombre: str
    egresado_correo: Optional[str] = None
    egresado_telefono: Optional[str] = None


class KanbanCandidateCardResponse(BaseModel):
    id: str
    candidateName: str
    email: str
    phone: str
    city: str
    avatar: Optional[str] = None
    program: str
    institution: str
    graduationYear: Optional[str] = None
    vacancyId: str
    vacancyTitle: str
    vacancyCode: str
    siteId: str
    stage: str  # 'review' | 'preselected' | 'evaluation' | 'interview' | 'offer' | 'discarded'
    matchPercentage: int
    appliedAt: str
    skillsMatch: List[str] = Field(default_factory=list)
    missingSkills: List[str] = Field(default_factory=list)
    experienceSummary: Optional[str] = None
    educationSummary: Optional[str] = None
    recruiterNotes: Optional[str] = None
    rejectionReason: Optional[str] = None
    interviewDate: Optional[str] = None


class KanbanBoardDetailedResponse(BaseModel):
    id_vacante: str
    titulo_vacante: str
    codigo_vacante: str
    empresa_nombre: str
    sede_nombre: str
    total_candidatos: int
    hero_stats: List[Dict[str, str]] = Field(default_factory=list)
    columnas: Dict[str, List[KanbanCandidateCardResponse]] = Field(default_factory=dict)


class MoverFaseRequest(BaseModel):
    fase_nueva: Optional[str] = Field(
        None,
        description="'en_revision', 'preseleccionados', 'prueba_tecnica', 'entrevista', 'oferta_finalistas', 'descartados' o sus alias 'review', 'preselected', 'evaluation', 'interview', 'offer', 'discarded'"
    )
    nueva_fase: Optional[str] = None
    fase_anterior: Optional[str] = None
    comentario: Optional[str] = Field(None, description="Bitácora de auditoría del movimiento")
    notas_fase: Optional[str] = None
    motivo_descarte: Optional[str] = Field(None, description="Obligatorio si la fase nueva es 'descartados' o 'discarded'")
    retroalimentacion: Optional[str] = Field(None, description="Retroalimentación opcional para el candidato")
    correo_candidato: Optional[str] = None
    nombre_candidato: Optional[str] = None
    vacante_titulo: Optional[str] = None
    vacante_codigo: Optional[str] = None
    empresa_nombre: Optional[str] = None


class NotaReclutadorRequest(BaseModel):
    texto_nota: Optional[str] = Field(None, description="Nota privada del reclutador para el candidato")
    nota: Optional[str] = None
    calificacion: Optional[Any] = None


class NotaReclutadorResponse(BaseModel):
    id: str
    id_postulacion: str
    id_reclutador: str
    nombre_reclutador: str
    texto_nota: str
    creado_en: str


class ProgramarEntrevistaRequest(BaseModel):
    fecha_entrevista: str = Field(..., description="Fecha en formato YYYY-MM-DD")
    franja_horaria: str = Field(..., description="Ej: '10:00 AM - 11:00 AM'")
    modalidad: str = Field("Virtual", description="'Virtual' o 'Presencial'")
    url_reunion: Optional[str] = Field(None, description="Enlace a Meet, Teams o dirección física")
    objetivo: str = Field("Entrevista de selección", description="Objetivo de la entrevista (técnica, cultural, etc.)")
    correo_candidato: Optional[str] = None
    nombre_candidato: Optional[str] = None
    vacante_titulo: Optional[str] = None
    empresa_nombre: Optional[str] = None


class EntrevistaResponse(BaseModel):
    id: str
    id_postulacion: str
    id_reclutador: str
    nombre_reclutador: str
    fecha_entrevista: str
    franja_horaria: str
    modalidad: str
    url_reunion: Optional[str] = None
    objetivo: str
    estado: str
    creado_en: str


# ATS Kanban (Fases posteriores)
class MoveCandidatePhaseRequest(BaseModel):
    nueva_fase: str = Field(
        ...,
        description="Fase destino: 'postulado' | 'cv_visto' | 'prueba_tecnica' | 'entrevista' | 'oferta' | 'contratado' | 'descartado'"
    )
    nota_reclutador: Optional[str] = None


class KanbanCandidateItem(BaseModel):
    id_postulacion: str
    id_egresado: str
    nombre_candidato: str
    carrera: str
    universidad: str
    titulo_verificado: bool
    sello_digital: bool
    match_porcentaje: int
    fase_actual: str
    fecha_postulacion: str


class KanbanBoardResponse(BaseModel):
    id_vacante: str
    titulo_vacante: str
    columnas: Dict[str, List[KanbanCandidateItem]]


# Alias de compatibilidad
VacancySchema = VacanteResponse
CreateVacancyRequest = VacanteCreateRequest
