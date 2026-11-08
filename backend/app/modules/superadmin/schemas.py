"""
Esquemas Pydantic para Auditoría y Gestión de Super Admin (SLA 72h).
Fase 2 - Paso 1: Inspección, Aprobación, Subsanación y Rechazo de Empresas e IES.
"""

from typing import Optional, List
from pydantic import BaseModel, Field


class CorrectionActionRequest(BaseModel):
    motivo: str = Field(..., min_length=5, description="Motivo formal de subsanación de documentos")
    documentos_requeridos: List[str] = Field(
        default_factory=list,
        description="Tipos de documentos a subsanar (ej: ['camara_comercio', 'rut', 'cedula_rep_legal'])"
    )


class RejectActionRequest(BaseModel):
    motivo_rechazo: str = Field(..., min_length=5, description="Causa formal del rechazo definitivo")


class ApproveActionRequest(BaseModel):
    notas: Optional[str] = Field(None, description="Observaciones opcionales del Super Admin al aprobar")


class DocumentAuditItem(BaseModel):
    id: str
    tipo_documento: str
    nombre_archivo: str
    url_archivo: str
    tamano_kb: int
    estado: str  # 'adjunto', 'aprobado', 'requiere_subsanacion', 'rechazado'
    subido_en: Optional[str] = None
    secure_url: Optional[str] = None


class CompanyAuditItem(BaseModel):
    id: str
    radicado: str
    razon_social: str
    nombre_comercial: Optional[str] = None
    nit: str
    codigo_ciiu: Optional[str] = None
    descripcion_ciiu: Optional[str] = None
    sector_economico: Optional[str] = None
    tamano_empresa: Optional[str] = None
    ciudad: str
    departamento: str
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    correo_contacto: str
    sitio_web: Optional[str] = None
    nombre_representante_legal: Optional[str] = None
    documento_representante_legal: Optional[str] = None
    persona_contacto: Optional[str] = None
    estado: str  # 'pendiente', 'en_subsanacion', 'aprobado', 'rechazado'
    registrado_en: str
    aprobado_en: Optional[str] = None
    sla_horas_restantes: int
    sla_texto: str
    motivo_subsanacion: Optional[str] = None
    documentos: List[DocumentAuditItem] = []


class InstitutionAuditItem(BaseModel):
    id: str
    radicado: str
    nombre_oficial: str
    nombre_corto: Optional[str] = None
    codigo_snies: str
    caracter_academico: Optional[str] = None
    nit: str
    ciudad: str
    departamento: str
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    correo_institucional: str
    sitio_web: Optional[str] = None
    nombre_rector: Optional[str] = None
    documento_rector: Optional[str] = None
    persona_contacto: Optional[str] = None
    estado: str  # 'pendiente', 'en_subsanacion', 'aprobado', 'rechazado'
    registrado_en: str
    aprobado_en: Optional[str] = None
    sla_horas_restantes: int
    sla_texto: str
    motivo_subsanacion: Optional[str] = None
    documentos: List[DocumentAuditItem] = []


class SecureUrlResponse(BaseModel):
    documento_id: str
    tipo_entidad: str  # 'empresa' o 'institucion'
    nombre_archivo: str
    url_original: str
    secure_url: str
    expira_en_segundos: int


class PaginatedCompanyAuditResponse(BaseModel):
    items: List[CompanyAuditItem]
    total: int
    page: int
    limit: int
    total_pages: int


class PaginatedInstitutionAuditResponse(BaseModel):
    items: List[InstitutionAuditItem]
    total: int
    page: int
    limit: int
    total_pages: int

