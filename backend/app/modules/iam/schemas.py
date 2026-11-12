"""
Esquemas Pydantic para Autenticación, Registro Multirrol y Usuarios (IAM).
"""

from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    correo: EmailStr
    password: str = Field(..., min_length=6)


class GoogleAuthRequest(BaseModel):
    credential: Optional[str] = Field(None, description="Token JWT de identidad emitido por Google Identity Services")
    access_token: Optional[str] = Field(None, description="Access Token OAuth 2.0 emitido por Google")



class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    nombre: str
    correo: EmailStr
    rol: str
    estado_validacion: str  # 'pendiente', 'en_subsanacion', 'aprobado', 'rechazado'
    id_entidad: Optional[str] = None  # id_empresa o id_institucion o id_egresado


class RegisterGraduateRequest(BaseModel):
    tipo_documento: str = "CC"
    numero_documento: str
    nombre_completo: str
    correo: EmailStr
    password: Optional[str] = Field(default="Egresado123*", min_length=6)
    telefono: Optional[str] = None
    departamento: str
    ciudad: str
    id_institucion: Optional[str] = None
    carrera: str
    nivel_educativo: Optional[str] = "Profesional Universitario"
    ano_graduacion: str
    autoriza_datos: bool = True


class DocumentBase64Item(BaseModel):
    tipo_documento: str  # 'camara_comercio', 'rut', 'cedula_rep_legal', 'carta_autorizacion', 'resolucion_men', 'snies_cert'
    nombre_archivo: str
    contenido_base64: str  # Contenido codificado en base64


class RegisterCompanyRequest(BaseModel):
    razon_social: str
    nombre_comercial: str
    nit: str
    codigo_ciiu: Optional[str] = "6201"
    descripcion_ciiu: Optional[str] = "Actividades de tecnología y servicios empresariales"
    sector_economico: str
    tamano_empresa: str
    departamento: str
    ciudad: str
    direccion: str
    telefono: str
    correo_contacto: EmailStr
    password: Optional[str] = Field(default="Empresa123*", min_length=6)
    sitio_web: Optional[str] = None
    nombre_representante_legal: str
    documento_representante_legal: str
    persona_contacto: str
    documentos: Optional[List[DocumentBase64Item]] = None


class RegisterInstitutionRequest(BaseModel):
    nombre_institucion: str
    sigla: Optional[str] = None
    codigo_snies: str  # Aval del Ministerio de Educación Nacional
    caracter_academico: Optional[str] = "Institución Universitaria"
    origen_institucional: Optional[str] = "Oficial / Pública"
    nit: str
    departamento: str
    ciudad: str
    direccion: str
    sitio_web: Optional[str] = None
    correo_institucional: EmailStr
    password: Optional[str] = Field(default="IesAdmin123*", min_length=6)
    telefono: str
    nombre_rector: str
    documento_rector: Optional[str] = "No suministrado"
    nombre_contacto_asesor: str
    cargo_asesor: Optional[str] = "Coordinador de Egresados y Empleabilidad"
    documentos: Optional[List[DocumentBase64Item]] = None


class UserMeResponse(BaseModel):
    id: str
    nombre: str
    correo: EmailStr
    rol: str
    estado_validacion: str
    motivo_subsanacion: Optional[str] = None
    id_entidad: Optional[str] = None
    es_cuenta_aprobada: bool

