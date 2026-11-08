"""
Esquemas Pydantic para el Portal de Egresados y Postulaciones.
"""

from typing import Optional, List
from pydantic import BaseModel, EmailStr


class ExperienceItem(BaseModel):
    cargo: str
    empresa: str
    fecha_inicio: str
    fecha_fin: Optional[str] = None
    es_actual: bool = False
    descripcion: Optional[str] = None


class GraduateProfileSchema(BaseModel):
    id: str
    nombre_completo: str
    correo: EmailStr
    telefono: Optional[str] = None
    departamento: str
    ciudad: str
    institucion_nombre: str
    carrera: str
    ano_graduacion: str
    titulo_verificado: bool
    sello_digital_activo: bool
    habilidades_tecnicas: List[str]
    experiencias: List[ExperienceItem]
    hoja_de_vida_pdf_url: Optional[str] = None


class TimelineStep(BaseModel):
    step: int
    title: str
    date: str
    done: bool
    current: bool = False


class RecruiterContact(BaseModel):
    name: str
    role: str
    company: str
    email: Optional[str] = None
    phone: Optional[str] = None
    avatar: Optional[str] = None
    status: str = "En línea"


class InterviewDetail(BaseModel):
    id: str
    date: str
    timeRange: str
    modality: str
    meetUrl: Optional[str] = None
    objective: str
    status: str
    isUpcoming: bool = True


class SubmittedDocument(BaseModel):
    fileName: str
    fileSize: str
    uploadedAt: str
    matchScore: int


class GraduateApplicationResponse(BaseModel):
    id: str
    applicationCode: str
    jobId: str
    vacancyTitle: str
    companyName: str
    companyShort: str
    companySlug: Optional[str] = None
    companyLogoBg: str = "bg-[#0f172a] text-white"
    companyCover: Optional[str] = None
    companySector: Optional[str] = None
    partnershipType: Optional[str] = "Convenio Verificado"
    location: str
    workMode: str
    salary: str
    salaryOffered: Optional[str] = None
    contractType: str
    appliedAt: str
    lastUpdateAt: str
    phase: int  # 1: Postulación, 2: Revisión, 3: Entrevista/Técnica, 4: Oferta/Contratado
    stage: str  # 'review', 'preselected', 'evaluation', 'interview', 'offer', 'discarded'
    phaseStatusLabel: str
    phaseFeedback: Optional[str] = None
    estimatedStartDate: Optional[str] = None
    recruiter: Optional[RecruiterContact] = None
    interview: Optional[InterviewDetail] = None
    submittedDocument: Optional[SubmittedDocument] = None
    timeline: List[TimelineStep] = []

    # Campos de compatibilidad hacia atrás
    id_postulacion: Optional[str] = None
    id_vacante: Optional[str] = None
    cargo: Optional[str] = None
    empresa_nombre: Optional[str] = None
    fecha_postulacion: Optional[str] = None
    fase_actual: Optional[str] = None
    coincidencia_ia_porcentaje: Optional[int] = None


class ApplicationHistoryItem(BaseModel):
    id_postulacion: str
    id_vacante: str
    cargo: str
    empresa_nombre: str
    fecha_postulacion: str
    fase_actual: str  # 'postulado', 'cv_visto', 'prueba_tecnica', 'entrevista', 'oferta', 'contratado'
    coincidencia_ia_porcentaje: int

