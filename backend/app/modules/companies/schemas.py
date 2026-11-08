"""
Esquemas Pydantic para Gestión Empresarial, Sedes Multi-Campus, Reclutadores y Subsanación.
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, EmailStr


class SubsanarDocumentoRequest(BaseModel):
    tipo_documento: str  # 'camara_comercio', 'rut', etc.
    nombre_archivo: str
    archivo_base64_o_url: Optional[str] = None
    observaciones: Optional[str] = None


class QuarantineStatusResponse(BaseModel):
    id_empresa: str
    radicado: str
    razon_social: str
    estado: str  # 'pendiente', 'en_subsanacion', 'aprobado', 'rechazado'
    tiempo_sla_horas: int = 72
    motivo_subsanacion: Optional[str] = None
    es_operativa: bool
    documentos_radicados: List[dict]
    puede_subsanar: bool


# ----------------------------------------------------------------------
# 1. SEDES CORPORATIVAS (CAMPUS Y SUCURSALES)
# ----------------------------------------------------------------------

class SedeEmpresaCreateRequest(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=150, description="Nombre oficial de la sede (ej: 'Sede Principal Caribe')")
    nombre_corto: Optional[str] = Field(None, max_length=50, description="Sigla o nombre corto (ej: 'Campus Norte')")
    departamento: str = Field(..., max_length=100)
    ciudad: str = Field(..., max_length=100)
    direccion: str = Field(..., max_length=255)
    telefono: Optional[str] = Field(None, max_length=50)
    correo: Optional[str] = Field(None, max_length=255)
    nombre_responsable: Optional[str] = Field(None, max_length=150)
    es_sede_principal: bool = Field(False, description="Marca si es la sede principal o corporativa")


class SedeEmpresaUpdateRequest(BaseModel):
    nombre: Optional[str] = Field(None, min_length=2, max_length=150)
    nombre_corto: Optional[str] = Field(None, max_length=50)
    departamento: Optional[str] = Field(None, max_length=100)
    ciudad: Optional[str] = Field(None, max_length=100)
    direccion: Optional[str] = Field(None, max_length=255)
    telefono: Optional[str] = Field(None, max_length=50)
    correo: Optional[str] = Field(None, max_length=255)
    nombre_responsable: Optional[str] = Field(None, max_length=150)
    es_sede_principal: Optional[bool] = None
    estado: Optional[str] = Field(None, description="'activa' o 'inactiva'")


class SedeEmpresaResponse(BaseModel):
    id: str
    id_empresa: str
    nombre: str
    nombre_corto: Optional[str] = None
    departamento: str
    ciudad: str
    direccion: str
    telefono: Optional[str] = None
    correo: Optional[str] = None
    nombre_responsable: Optional[str] = None
    es_sede_principal: bool
    estado: str
    total_areas: int = 0
    total_reclutadores: int = 0
    creado_en: str


# ----------------------------------------------------------------------
# 2. ÁREAS DEPARTAMENTALES DE SEDE
# ----------------------------------------------------------------------

class AreaSedeCreateRequest(BaseModel):
    nombre_area: str = Field(..., min_length=2, max_length=100, description="Ej: 'Tecnología e Información', 'Recursos Humanos'")
    personal_asignado: int = Field(0, ge=0, description="Cantidad estimada de colaboradores")


class AreaSedeResponse(BaseModel):
    id: str
    id_sede: str
    nombre_area: str
    personal_asignado: int


# ----------------------------------------------------------------------
# 3. EQUIPO DE RECLUTADORES DE TALENTO
# ----------------------------------------------------------------------

class ReclutadorCreateRequest(BaseModel):
    nombre_completo: str = Field(..., min_length=3, max_length=150)
    correo_corporativo: EmailStr
    password: str = Field(..., min_length=8, description="Contraseña provisional de acceso")
    telefono: Optional[str] = Field(None, max_length=50)
    cargo: Optional[str] = Field("Especialista de Atracción de Talento", max_length=100)
    sedes_asignadas_ids: Optional[List[str]] = Field(default_factory=list, description="Lista de UUIDs de sedes")


class ReclutadorUpdateRequest(BaseModel):
    nombre_completo: Optional[str] = Field(None, min_length=3, max_length=150)
    telefono: Optional[str] = Field(None, max_length=50)
    cargo: Optional[str] = Field(None, max_length=100)
    estado: Optional[str] = Field(None, description="'active', 'suspended' o 'inactive'")


class ReclutadorStatusUpdateRequest(BaseModel):
    estado: str = Field(..., description="'active', 'suspended' o 'inactive'")


class ReclutadorSedeItem(BaseModel):
    id: str
    nombre: str
    ciudad: str


class ReclutadorItemResponse(BaseModel):
    id: str
    id_usuario: str
    id_empresa: str
    nombre_completo: str
    correo_corporativo: str
    telefono: Optional[str] = None
    cargo: str
    url_avatar: Optional[str] = None
    estado: str
    ultimo_acceso_en: Optional[str] = None
    sedes_asignadas: List[ReclutadorSedeItem] = Field(default_factory=list)
    creado_en: str


class AsignarSedesRequest(BaseModel):
    sedes_ids: List[str] = Field(..., min_length=1, description="Lista de UUIDs de sedes a asignar")


class AsignacionSedesResponse(BaseModel):
    success: bool = True
    mensaje: str
    id_reclutador: str
    total_sedes_asignadas: int
    sedes_asignadas_ids: List[str]


# Compatibilidad hacia atrás
SiteSchema = SedeEmpresaResponse
RecruiterSchema = ReclutadorItemResponse
