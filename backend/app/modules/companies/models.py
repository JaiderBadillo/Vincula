"""
Modelos ORM del Dominio de Empresas, Sedes y Reclutadores vinculados a schema_vincula_completo.sql.
Incluye:
- Empresa y DocumentoEmpresa
- SedeEmpresa
- AreaSedeEmpresa
- ReclutadorEmpresa y AsignacionReclutadorSede
"""

import uuid
from sqlalchemy import Column, String, Boolean, DateTime, Text, Integer, ForeignKey, func, PrimaryKeyConstraint
from sqlalchemy.dialects.postgresql import UUID, ENUM as PG_ENUM
from sqlalchemy.orm import relationship
from app.core.database import Base

EstadoValidacionEnum = PG_ENUM(
    'pendiente',
    'en_subsanacion',
    'aprobado',
    'rechazado',
    name='estado_validacion_enum',
    create_type=False
)


class Empresa(Base):
    __tablename__ = "empresas"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    razon_social = Column(String(255), nullable=False)
    nombre_comercial = Column(String(255), nullable=False)
    nit = Column(String(30), unique=True, nullable=False, index=True)
    codigo_ciiu = Column(String(10), nullable=False)
    descripcion_ciiu = Column(Text, nullable=False)
    sector_economico = Column(String(100), nullable=False)
    tamano_empresa = Column(String(50), nullable=False)
    departamento = Column(String(100), nullable=False)
    ciudad = Column(String(100), nullable=False)
    direccion = Column(String(255), nullable=False)
    telefono = Column(String(50), nullable=False)
    correo_contacto = Column(String(255), nullable=False)
    sitio_web = Column(String(255), nullable=True)
    nombre_representante_legal = Column(String(150), nullable=False)
    documento_representante_legal = Column(String(30), nullable=False)
    persona_contacto = Column(String(150), nullable=False)
    url_logo = Column(Text, nullable=True)
    url_portada = Column(Text, nullable=True)
    descripcion_corporativa = Column(Text, nullable=True)
    dominio_es_corporativo = Column(Boolean, default=True, nullable=False)
    estado = Column(EstadoValidacionEnum, default="pendiente", nullable=False, index=True)
    registrado_en = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    aprobado_en = Column(DateTime(timezone=True), nullable=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    actualizado_en = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relaciones
    sedes = relationship("SedeEmpresa", back_populates="empresa", cascade="all, delete-orphan")
    reclutadores = relationship("ReclutadorEmpresa", back_populates="empresa", cascade="all, delete-orphan")
    documentos = relationship("DocumentoEmpresa", back_populates="empresa", cascade="all, delete-orphan")


class SedeEmpresa(Base):
    __tablename__ = "sedes_empresa"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_empresa = Column(UUID(as_uuid=True), ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False, index=True)
    nombre = Column(String(150), nullable=False)
    nombre_corto = Column(String(50), nullable=True)
    departamento = Column(String(100), nullable=False)
    ciudad = Column(String(100), nullable=False, index=True)
    direccion = Column(String(255), nullable=False)
    telefono = Column(String(50), nullable=True)
    correo = Column(String(255), nullable=True)
    nombre_responsable = Column(String(150), nullable=True)
    es_sede_principal = Column(Boolean, default=False, nullable=False)
    estado = Column(String(30), default="activa", nullable=False)
    creado_en = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    empresa = relationship("Empresa", back_populates="sedes")
    areas = relationship("AreaSedeEmpresa", back_populates="sede", cascade="all, delete-orphan")
    reclutadores_asignados = relationship("AsignacionReclutadorSede", back_populates="sede", cascade="all, delete-orphan")


class AreaSedeEmpresa(Base):
    __tablename__ = "areas_sede_empresa"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_sede = Column(UUID(as_uuid=True), ForeignKey("sedes_empresa.id", ondelete="CASCADE"), nullable=False, index=True)
    nombre_area = Column(String(100), nullable=False)
    personal_asignado = Column(Integer, default=0, nullable=False)

    sede = relationship("SedeEmpresa", back_populates="areas")


class ReclutadorEmpresa(Base):
    __tablename__ = "reclutadores_empresa"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_usuario = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"), unique=True, nullable=False)
    id_empresa = Column(UUID(as_uuid=True), ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False, index=True)
    nombre_completo = Column(String(150), nullable=False)
    correo_corporativo = Column(String(255), nullable=False)
    telefono = Column(String(50), nullable=True)
    cargo = Column(String(100), default="Especialista de Atracción de Talento")
    url_avatar = Column(Text, nullable=True)
    estado = Column(String(30), default="active", nullable=False)  # 'active', 'invited', 'suspended'
    ultimo_acceso_en = Column(DateTime(timezone=True), nullable=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    empresa = relationship("Empresa", back_populates="reclutadores")
    usuario = relationship("Usuario", foreign_keys=[id_usuario])
    sedes_asignadas = relationship("AsignacionReclutadorSede", back_populates="reclutador", cascade="all, delete-orphan")


class AsignacionReclutadorSede(Base):
    __tablename__ = "asignacion_reclutadores_sedes"

    id_reclutador = Column(UUID(as_uuid=True), ForeignKey("reclutadores_empresa.id", ondelete="CASCADE"), nullable=False)
    id_sede = Column(UUID(as_uuid=True), ForeignKey("sedes_empresa.id", ondelete="CASCADE"), nullable=False)

    __table_args__ = (
        PrimaryKeyConstraint("id_reclutador", "id_sede"),
    )

    reclutador = relationship("ReclutadorEmpresa", back_populates="sedes_asignadas")
    sede = relationship("SedeEmpresa", back_populates="reclutadores_asignados")


class DocumentoEmpresa(Base):
    __tablename__ = "documentos_empresa"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_empresa = Column(UUID(as_uuid=True), ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False, index=True)
    tipo_documento = Column(String(60), nullable=False)  # 'camara_comercio', 'rut', etc.
    nombre_archivo = Column(String(255), nullable=False)
    url_archivo = Column(Text, nullable=False)
    tamano_kb = Column(Integer, nullable=False)
    subido_en = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    estado = Column(String(30), default="adjunto", nullable=False)

    empresa = relationship("Empresa", back_populates="documentos")
