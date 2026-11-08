"""
Esquemas Pydantic para IES, Estructura Curricular (Sedes, Facultades, Programas SNIES)
y Asignación de Asesores Institucionales.
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


# ----------------------------------------------------------------------
# 1. Sedes Institucionales
# ----------------------------------------------------------------------

class SedeCreateRequest(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=150, description="Nombre oficial de la sede (ej: 'Sede Principal Bucaramanga')")
    nombre_corto: Optional[str] = Field(None, max_length=50, description="Sigla o nombre corto (ej: 'Campus Central')")
    ciudad: str = Field(..., max_length=100)
    departamento: str = Field(..., max_length=100)
    direccion: str = Field(..., max_length=255)
    telefono: Optional[str] = Field(None, max_length=50)
    correo: Optional[str] = Field(None, max_length=255)
    es_sede_principal: bool = Field(False, description="Indica si es la sede rectoral principal")


class SedeResponse(BaseModel):
    id: str
    id_institucion: str
    nombre: str
    nombre_corto: Optional[str] = None
    ciudad: str
    departamento: str
    direccion: str
    telefono: Optional[str] = None
    correo: Optional[str] = None
    es_sede_principal: bool
    estado: str
    creado_en: str


# ----------------------------------------------------------------------
# 2. Facultades
# ----------------------------------------------------------------------

class FacultadCreateRequest(BaseModel):
    codigo: str = Field(..., min_length=1, max_length=50, description="Código interno de la facultad (ej: 'FCNEI')")
    sigla: Optional[str] = Field(None, max_length=30)
    nombre: str = Field(..., min_length=2, max_length=255, description="Nombre de la facultad (ej: 'Facultad de Ciencias Naturales e Ingenierías')")
    telefono: Optional[str] = Field(None, max_length=50)
    oficina: Optional[str] = Field(None, max_length=100)
    color_distintivo: Optional[str] = Field(None, max_length=30, description="Color distintivo HEX o Tailwind (ej: '#00A86B')")


class FacultadResponse(BaseModel):
    id: str
    id_institucion: str
    codigo: str
    sigla: Optional[str] = None
    nombre: str
    telefono: Optional[str] = None
    oficina: Optional[str] = None
    color_distintivo: Optional[str] = None
    estado: str
    creado_en: str


# ----------------------------------------------------------------------
# 3. Programas Académicos (SNIES)
# ----------------------------------------------------------------------

class ProgramaCreateRequest(BaseModel):
    id_facultad: str = Field(..., description="UUID de la facultad a la que pertenece")
    id_sede: str = Field(..., description="UUID de la sede donde se imparte")
    codigo_interno: str = Field(..., min_length=1, max_length=50, description="Código interno institucional (ej: 'PR-SIS-01')")
    codigo_snies: str = Field(..., min_length=3, max_length=30, description="Código oficial del SNIES ante el Ministerio de Educación (ej: '103241')")
    nombre: str = Field(..., min_length=2, max_length=255, description="Nombre oficial del programa (ej: 'Ingeniería de Sistemas')")
    nivel_formacion: str = Field(..., description="'Técnico Laboral', 'Tecnológico', 'Profesional Universitario', 'Especialización', 'Maestría'")
    modalidad: str = Field(..., description="'Presencial', 'Virtual', 'Híbrida', 'A Distancia'")
    duracion_semestres: int = Field(..., ge=1, le=14, description="Número de semestres académicos")
    total_creditos: int = Field(..., ge=10, le=350, description="Total de créditos académicos del pensum")
    nombre_director: Optional[str] = Field(None, max_length=150)
    correo_director: Optional[str] = Field(None, max_length=255)
    estado_acreditacion: Optional[str] = Field(None, max_length=100, description="'Alta Calidad Acreditado', 'Registro Calificado Vigente'")


class ProgramaUpdateRequest(BaseModel):
    nombre: Optional[str] = Field(None, min_length=2, max_length=255)
    codigo_interno: Optional[str] = Field(None, max_length=50)
    duracion_semestres: Optional[int] = Field(None, ge=1, le=14)
    total_creditos: Optional[int] = Field(None, ge=10, le=350)
    modalidad: Optional[str] = None
    nombre_director: Optional[str] = None
    correo_director: Optional[str] = None
    estado_acreditacion: Optional[str] = None
    estado: Optional[str] = None  # 'activo', 'inactivo'


class ProgramaStatusUpdateRequest(BaseModel):
    estado: str = Field(..., description="'activo' o 'inactivo'")


class ProgramaItemResponse(BaseModel):
    id: str
    id_institucion: str
    id_facultad: str
    nombre_facultad: Optional[str] = None
    id_sede: str
    nombre_sede: Optional[str] = None
    codigo_interno: str
    codigo_snies: str
    nombre: str
    nivel_formacion: str
    modalidad: str
    duracion_semestres: int
    total_creditos: int
    nombre_director: Optional[str] = None
    correo_director: Optional[str] = None
    estado_acreditacion: Optional[str] = None
    estado: str
    total_asesores: int = 0
    creado_en: str


class PaginatedProgramsResponse(BaseModel):
    items: List[ProgramaItemResponse]
    total: int
    page: int
    limit: int
    total_pages: int


# Compatibilidad con schemas previos de frontend
class ProgramSchema(BaseModel):
    id: str
    nombre_programa: str
    codigo_snies: str
    nivel_formacion: str
    facultad: str
    activo: bool = True


# ----------------------------------------------------------------------
# 4. Asesores y Asignaciones
# ----------------------------------------------------------------------

class AsesorCreateRequest(BaseModel):
    correo: str = Field(..., description="Correo del asesor para su cuenta de acceso")
    password: str = Field(..., min_length=8, description="Contraseña de acceso inicial")
    nombre_completo: str = Field(..., min_length=3, max_length=150)
    telefono: Optional[str] = Field(None, max_length=50)
    cargo: Optional[str] = Field("Asesor de Enlace y Prácticas", max_length=100)
    id_sede: Optional[str] = None
    id_facultad: Optional[str] = None


class AsesorItemResponse(BaseModel):
    id: str
    id_usuario: str
    nombre_completo: str
    correo_institucional: str
    telefono: Optional[str] = None
    cargo: str
    estado: str
    programas_asignados_count: int = 0
    programas_ids: List[str] = []
    creado_en: str


class AsignarAsesorRequest(BaseModel):
    id_asesor: str = Field(..., description="UUID del asesor a vincular con el programa")


class AsignacionResponse(BaseModel):
    success: bool
    mensaje: str
    id_asesor: str
    id_programa: str


# ----------------------------------------------------------------------
# 5. Validación de Diplomas y Subsanación (Fase 2 / Fase 3 Paso 2)
# ----------------------------------------------------------------------

class SubsanarDocumentoIESRequest(BaseModel):
    tipo_documento: str
    nombre_archivo: str
    archivo_base64_o_url: Optional[str] = None
    observaciones: Optional[str] = None


class GraduatePendingValidationItem(BaseModel):
    id_academico: str = Field(..., description="UUID del registro académico en academicos_egresado")
    id_egresado: str = Field(..., description="UUID del egresado")
    id_institucion: str
    id_programa: str
    nombre_completo: str
    tipo_documento: str
    numero_documento: str
    codigo_estudiantil: Optional[str] = None
    carrera: str = Field(..., description="Nombre del programa académico")
    nombre_programa: Optional[str] = None
    codigo_snies: Optional[str] = None
    nivel_formacion: str
    ano_graduacion: int
    periodo_graduacion: Optional[str] = None
    promedio_ponderado: Optional[float] = None
    nombre_archivo_diploma: Optional[str] = None
    url_diploma_pdf: Optional[str] = None
    estado_verificacion: str = Field("pendiente", description="'pendiente', 'aprobado', 'rechazado'")
    estado_validacion: Optional[str] = None  # Compatibilidad frontend
    validado_por_ies: bool = False
    numero_acta_grado: Optional[str] = None
    numero_libro_folio: Optional[str] = None
    fecha_grado: Optional[str] = None
    fecha_verificacion: Optional[str] = None
    sello_digital: Optional[str] = None
    motivo_rechazo: Optional[str] = None
    creado_en: str


# Alias para consistencia
GraduateValidationItem = GraduatePendingValidationItem


class PaginatedGraduateValidationResponse(BaseModel):
    items: List[GraduatePendingValidationItem]
    total: int
    page: int
    limit: int
    total_pages: int
    resumen_estados: Dict[str, int] = Field(default_factory=dict)


class ValidateDiplomaRequest(BaseModel):
    numero_acta_grado: Optional[str] = Field(None, min_length=2, max_length=60, description="Número oficial de acta de grado institucional")
    numero_libro_folio: Optional[str] = Field(None, max_length=60, description="Libro y folio de registro de diplomas (ej: 'Libro 48, Folio 112')")
    fecha_grado: Optional[str] = Field(None, description="Fecha oficial de grado (YYYY-MM-DD)")
    observaciones: Optional[str] = Field(None, description="Observaciones o notas del auditor académico")
    # Compatibilidad hacia atrás:
    aprobado: Optional[bool] = True
    numero_acta_o_registro: Optional[str] = None


# Alias para compatibilidad
ValidateGraduateRequest = ValidateDiplomaRequest


class SelloDigitalResponse(BaseModel):
    success: bool = True
    mensaje: str
    id_academico: str
    id_egresado: str
    estado_verificacion: str = "aprobado"
    numero_acta_grado: str
    numero_libro_folio: Optional[str] = None
    fecha_grado: Optional[str] = None
    sello_digital: str = Field(..., description="Hash criptográfico SHA-256 de autenticidad institucional")
    fecha_emision_sello: str
    verificado_por: str
    institucion_emisora: str
    programa_academico: str
    codigo_snies: str


class RejectDiplomaRequest(BaseModel):
    motivo_rechazo: str = Field(..., min_length=4, description="Motivo justificado por el cual se rechaza u observa el diploma")
    observaciones: Optional[str] = None


class RejectDiplomaResponse(BaseModel):
    success: bool = True
    mensaje: str
    id_academico: str
    id_egresado: str
    estado_verificacion: str = "rechazado"
    motivo_rechazo: str
    fecha_rechazo: str


class DiplomaSecureUrlResponse(BaseModel):
    id_academico: str
    nombre_archivo: str
    url_segura: str
    expira_en_segundos: int = 3600
