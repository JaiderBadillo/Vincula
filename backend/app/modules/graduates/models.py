"""
Modelos ORM del Dominio de Egresados, Registros Académicos y Diplomas mapeados a schema_vincula_completo.sql.
Incluye:
- Egresado (Perfil personal, datos de contacto y estado general)
- AcademicoEgresado (Títulos universitarios, diplomas en Storage, sello digital y actas de grado)
"""

import uuid
from sqlalchemy import Column, String, Boolean, DateTime, Date, Text, Numeric, Integer, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class Egresado(Base):
    __tablename__ = "egresados"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_usuario = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"), unique=True, nullable=False)
    tipo_documento = Column(String(10), default="CC", nullable=False)
    numero_documento = Column(String(30), unique=True, nullable=False)
    codigo_estudiantil = Column(String(50), nullable=True)
    nombre_completo = Column(String(150), nullable=False)
    fecha_nacimiento = Column(Date, nullable=True)
    ciudad_residencia = Column(String(100), nullable=False)
    departamento_residencia = Column(String(100), nullable=True)
    telefono = Column(String(50), nullable=False)
    correo_personal = Column(String(255), nullable=False)
    url_avatar = Column(Text, nullable=True)
    url_portada = Column(Text, nullable=True)
    titular_profesional = Column(String(255), nullable=True)
    biografia = Column(Text, nullable=True)
    disponible_para_trabajar = Column(Boolean, default=True, nullable=False)
    visibilidad_disponibilidad = Column(String(50), default="todos_los_reclutadores", nullable=False)
    tipo_disponibilidad = Column(String(50), default="inmediata", nullable=True)
    aspiracion_salarial_min = Column(Numeric(12, 2), nullable=True)
    aspiracion_salarial_max = Column(Numeric(12, 2), nullable=True)
    dispuesto_a_reubicarse = Column(Boolean, default=False, nullable=False)
    porcentaje_completitud_perfil = Column(Integer, default=0, nullable=False)
    estado = Column(String(30), default="pendiente", nullable=False)
    creado_en = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    actualizado_en = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relaciones
    usuario = relationship("Usuario", foreign_keys=[id_usuario])
    academicos = relationship("AcademicoEgresado", back_populates="egresado", cascade="all, delete-orphan", lazy="selectin")
    hojas_vida = relationship("ArchivoHojaVida", back_populates="egresado", cascade="all, delete-orphan", lazy="selectin")
    competencias = relationship("CompetenciaEgresado", back_populates="egresado", cascade="all, delete-orphan", lazy="selectin")


class ArchivoHojaVida(Base):
    __tablename__ = "archivos_hoja_vida"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_egresado = Column(UUID(as_uuid=True), ForeignKey("egresados.id", ondelete="CASCADE"), nullable=False, index=True)
    nombre_archivo = Column(String(255), nullable=False)
    url_archivo = Column(Text, nullable=False)
    tamano_kb = Column(Integer, nullable=False)
    es_predeterminado = Column(Boolean, default=False, nullable=False)
    subido_en = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    egresado = relationship("Egresado", back_populates="hojas_vida")


class AcademicoEgresado(Base):
    __tablename__ = "academicos_egresado"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_egresado = Column(UUID(as_uuid=True), ForeignKey("egresados.id", ondelete="CASCADE"), nullable=False, index=True)
    id_institucion = Column(UUID(as_uuid=True), ForeignKey("instituciones.id", ondelete="RESTRICT"), nullable=False, index=True)
    id_programa = Column(UUID(as_uuid=True), ForeignKey("programas_academicos.id", ondelete="RESTRICT"), nullable=False, index=True)
    id_sede = Column(UUID(as_uuid=True), ForeignKey("sedes_institucion.id", ondelete="SET NULL"), nullable=True)
    nivel_formacion = Column(String(60), nullable=False)
    ano_graduacion = Column(Integer, nullable=False)
    periodo_graduacion = Column(String(20), nullable=True)
    promedio_ponderado = Column(Numeric(3, 2), nullable=True)
    proyecto_grado = Column(Text, nullable=True)
    estado_academico = Column(String(50), default="recien-egresado", nullable=False)
    estado_laboral = Column(String(50), default="buscando", nullable=False)
    validado_por_ies = Column(Boolean, default=False, nullable=False)
    url_diploma_pdf = Column(Text, nullable=True)
    diploma_cargado_por_egresado = Column(Boolean, default=False, nullable=False)
    estado_verificacion = Column(String(30), default="pendiente", nullable=False, index=True)  # 'pendiente', 'aprobado', 'rechazado'
    numero_acta_grado = Column(String(60), nullable=True)
    numero_libro_folio = Column(String(60), nullable=True)
    fecha_grado = Column(Date, nullable=True)
    fecha_verificacion = Column(DateTime(timezone=True), nullable=True)
    verificado_por_usuario = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    motivo_rechazo = Column(Text, nullable=True)
    sello_digital = Column(String(128), nullable=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relaciones
    egresado = relationship("Egresado", back_populates="academicos")
    institucion = relationship("Institucion", foreign_keys=[id_institucion], lazy="selectin")
    programa = relationship("ProgramaAcademico", foreign_keys=[id_programa], lazy="selectin")
    sede = relationship("SedeInstitucion", foreign_keys=[id_sede], lazy="selectin")
    verificador = relationship("Usuario", foreign_keys=[verificado_por_usuario], lazy="selectin")


class CompetenciaEgresado(Base):
    __tablename__ = "competencias_egresado"

    id_egresado = Column(UUID(as_uuid=True), ForeignKey("egresados.id", ondelete="CASCADE"), primary_key=True)
    id_competencia = Column(UUID(as_uuid=True), ForeignKey("taxonomia_competencias.id", ondelete="CASCADE"), primary_key=True)
    nivel_dominio = Column(Integer, default=3, nullable=True)
    validada_por_pensum = Column(Boolean, default=False, nullable=False)

    egresado = relationship("Egresado", back_populates="competencias")
    competencia = relationship("TaxonomiaCompetencia", lazy="joined")

