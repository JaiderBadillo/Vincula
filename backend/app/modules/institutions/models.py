"""
Modelos ORM del Dominio de Instituciones de Educación Superior (IES) mapeados a schema_vincula_completo.sql.
Incluye:
- Institucion y DocumentoInstitucion
- SedeInstitucion
- Facultad
- ProgramaAcademico
- AsesorIES y AsignacionAsesorPrograma
"""

import uuid
from sqlalchemy import Column, String, DateTime, Text, Integer, Boolean, ForeignKey, func, PrimaryKeyConstraint
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


class Institucion(Base):
    __tablename__ = "instituciones"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre_oficial = Column(String(255), nullable=False)
    nombre_corto = Column(String(60), nullable=False)
    codigo_snies = Column(String(30), unique=True, nullable=False, index=True)
    nit = Column(String(30), unique=True, nullable=False)
    caracter_academico = Column(String(100), nullable=False)
    nombre_rector = Column(String(150), nullable=False)
    documento_rector = Column(String(30), nullable=False)
    persona_contacto = Column(String(150), nullable=False)
    direccion = Column(String(255), nullable=False)
    ciudad = Column(String(100), nullable=False)
    departamento = Column(String(100), nullable=False)
    telefono = Column(String(50), nullable=False)
    correo_institucional = Column(String(255), nullable=False)
    sitio_web = Column(String(255), nullable=True)
    url_logo = Column(Text, nullable=True)
    url_portada = Column(Text, nullable=True)
    estado = Column(EstadoValidacionEnum, default="pendiente", nullable=False, index=True)
    registrado_en = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    aprobado_en = Column(DateTime(timezone=True), nullable=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    actualizado_en = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relaciones
    sedes = relationship("SedeInstitucion", back_populates="institucion", cascade="all, delete-orphan")
    facultades = relationship("Facultad", back_populates="institucion", cascade="all, delete-orphan")
    programas = relationship("ProgramaAcademico", back_populates="institucion", cascade="all, delete-orphan")
    asesores = relationship("AsesorIES", back_populates="institucion", cascade="all, delete-orphan")
    documentos = relationship("DocumentoInstitucion", back_populates="institucion", cascade="all, delete-orphan")


class SedeInstitucion(Base):
    __tablename__ = "sedes_institucion"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_institucion = Column(UUID(as_uuid=True), ForeignKey("instituciones.id", ondelete="CASCADE"), nullable=False, index=True)
    nombre = Column(String(150), nullable=False)
    nombre_corto = Column(String(50), nullable=True)
    ciudad = Column(String(100), nullable=False)
    departamento = Column(String(100), nullable=False)
    direccion = Column(String(255), nullable=False)
    telefono = Column(String(50), nullable=True)
    correo = Column(String(255), nullable=True)
    es_sede_principal = Column(Boolean, default=False, nullable=False)
    estado = Column(String(30), default="activa", nullable=False)
    creado_en = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    institucion = relationship("Institucion", back_populates="sedes")
    programas = relationship("ProgramaAcademico", back_populates="sede")


class Facultad(Base):
    __tablename__ = "facultades"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_institucion = Column(UUID(as_uuid=True), ForeignKey("instituciones.id", ondelete="CASCADE"), nullable=False, index=True)
    codigo = Column(String(50), nullable=False)
    sigla = Column(String(30), nullable=True)
    nombre = Column(String(255), nullable=False)
    telefono = Column(String(50), nullable=True)
    oficina = Column(String(100), nullable=True)
    color_distintivo = Column(String(30), nullable=True)
    estado = Column(String(30), default="activa", nullable=False)
    creado_en = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    institucion = relationship("Institucion", back_populates="facultades")
    programas = relationship("ProgramaAcademico", back_populates="facultad")


class ProgramaAcademico(Base):
    __tablename__ = "programas_academicos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_institucion = Column(UUID(as_uuid=True), ForeignKey("instituciones.id", ondelete="CASCADE"), nullable=False, index=True)
    id_facultad = Column(UUID(as_uuid=True), ForeignKey("facultades.id", ondelete="RESTRICT"), nullable=False, index=True)
    id_sede = Column(UUID(as_uuid=True), ForeignKey("sedes_institucion.id", ondelete="RESTRICT"), nullable=False, index=True)
    codigo_interno = Column(String(50), nullable=False)
    codigo_snies = Column(String(30), nullable=False, index=True)
    nombre = Column(String(255), nullable=False)
    nivel_formacion = Column(String(60), nullable=False)  # 'Tecnológico', 'Profesional Universitario', 'Especialización'
    modalidad = Column(String(50), nullable=False)  # 'Presencial', 'Virtual', 'Híbrida'
    duracion_semestres = Column(Integer, nullable=False)
    total_creditos = Column(Integer, nullable=False)
    nombre_director = Column(String(150), nullable=True)
    correo_director = Column(String(255), nullable=True)
    estado_acreditacion = Column(String(100), nullable=True)  # 'Alta Calidad Acreditado', 'Registro Calificado Vigente'
    estado = Column(String(30), default="activo", nullable=False)
    creado_en = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    institucion = relationship("Institucion", back_populates="programas")
    facultad = relationship("Facultad", back_populates="programas")
    sede = relationship("SedeInstitucion", back_populates="programas")
    asesores_asignados = relationship("AsignacionAsesorPrograma", back_populates="programa", cascade="all, delete-orphan")


class AsesorIES(Base):
    __tablename__ = "asesores_ies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_usuario = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"), unique=True, nullable=False)
    id_institucion = Column(UUID(as_uuid=True), ForeignKey("instituciones.id", ondelete="CASCADE"), nullable=False, index=True)
    id_sede = Column(UUID(as_uuid=True), ForeignKey("sedes_institucion.id", ondelete="SET NULL"), nullable=True)
    id_facultad = Column(UUID(as_uuid=True), ForeignKey("facultades.id", ondelete="SET NULL"), nullable=True)
    nombre_completo = Column(String(150), nullable=False)
    correo_institucional = Column(String(255), nullable=False)
    telefono = Column(String(50), nullable=True)
    cargo = Column(String(100), default="Asesor de Enlace y Prácticas")
    sedes_cobertura = Column(String(500), nullable=True)
    estado = Column(String(30), default="activo", nullable=False)
    creado_en = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    institucion = relationship("Institucion", back_populates="asesores")
    programas_asignados = relationship("AsignacionAsesorPrograma", back_populates="asesor", cascade="all, delete-orphan")


class AsignacionAsesorPrograma(Base):
    __tablename__ = "asignacion_asesores_programas"

    id_asesor = Column(UUID(as_uuid=True), ForeignKey("asesores_ies.id", ondelete="CASCADE"), nullable=False)
    id_programa = Column(UUID(as_uuid=True), ForeignKey("programas_academicos.id", ondelete="CASCADE"), nullable=False)

    __table_args__ = (
        PrimaryKeyConstraint("id_asesor", "id_programa"),
    )

    asesor = relationship("AsesorIES", back_populates="programas_asignados")
    programa = relationship("ProgramaAcademico", back_populates="asesores_asignados")


class DocumentoInstitucion(Base):
    __tablename__ = "documentos_institucion"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_institucion = Column(UUID(as_uuid=True), ForeignKey("instituciones.id", ondelete="CASCADE"), nullable=False, index=True)
    tipo_documento = Column(String(60), nullable=False)  # 'personeria_juridica', 'resolucion_men', 'rut'
    nombre_archivo = Column(String(255), nullable=False)
    url_archivo = Column(Text, nullable=False)
    tamano_kb = Column(Integer, nullable=False)
    subido_en = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    estado = Column(String(30), default="adjunto", nullable=False)

    institucion = relationship("Institucion", back_populates="documentos")
