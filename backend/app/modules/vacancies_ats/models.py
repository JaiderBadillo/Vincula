"""
Modelos ORM del Dominio de Vacantes y Pipeline ATS vinculados a schema_vincula_completo.sql.
Incluye:
- Vacante (tabla 'vacantes')
- TaxonomiaCompetencia (tabla 'taxonomia_competencias')
- CompetenciaExigidaVacante (tabla 'competencias_exigidas_vacante')
- ProgramaAfinVacante (tabla 'programas_afines_vacante')
"""

import uuid
from datetime import date
from sqlalchemy import (
    Column,
    String,
    Boolean,
    Integer,
    Numeric,
    Text,
    ForeignKey,
    DateTime,
    Date as SQLDate,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY as PG_ARRAY, ENUM as PG_ENUM
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.modules.graduates.models import ArchivoHojaVida

# Enums mapeados al esquema PostgreSQL
ModalidadTrabajoEnum = PG_ENUM(
    'Presencial',
    'Remoto',
    'Híbrido',
    name='modalidad_trabajo_enum',
    create_type=False
)

EstadoVacanteEnum = PG_ENUM(
    'borrador',
    'abierta',
    'pausada',
    'cerrada',
    name='estado_vacante_enum',
    create_type=False
)

CategoriaCompetenciaEnum = PG_ENUM(
    'tecnica',
    'blanda',
    name='categoria_competencia_enum',
    create_type=False
)

FasePostulacionEnum = PG_ENUM(
    'en_revision',
    'preseleccionados',
    'prueba_tecnica',
    'entrevista',
    'oferta_finalistas',
    'descartados',
    name='fase_postulacion_enum',
    create_type=False
)

EstadoEntrevistaEnum = PG_ENUM(
    'programada',
    'confirmada',
    'realizada',
    'cancelada',
    'reprogramada',
    name='estado_entrevista_enum',
    create_type=False
)


class TaxonomiaCompetencia(Base):
    __tablename__ = "taxonomia_competencias"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre = Column(String(120), unique=True, nullable=False, index=True)
    categoria = Column(CategoriaCompetenciaEnum, nullable=False, default="tecnica", index=True)
    etiqueta_normalizada = Column(String(120), unique=True, nullable=False, index=True)


class CompetenciaExigidaVacante(Base):
    __tablename__ = "competencias_exigidas_vacante"

    id_vacante = Column(UUID(as_uuid=True), ForeignKey("vacantes.id", ondelete="CASCADE"), primary_key=True)
    id_competencia = Column(UUID(as_uuid=True), ForeignKey("taxonomia_competencias.id", ondelete="CASCADE"), primary_key=True)
    es_obligatoria = Column(Boolean, default=True, nullable=False)

    competencia = relationship("TaxonomiaCompetencia", lazy="joined")


class ProgramaAfinVacante(Base):
    __tablename__ = "programas_afines_vacante"

    id_vacante = Column(UUID(as_uuid=True), ForeignKey("vacantes.id", ondelete="CASCADE"), primary_key=True)
    id_programa = Column(UUID(as_uuid=True), ForeignKey("programas_academicos.id", ondelete="CASCADE"), primary_key=True)

    programa = relationship("app.modules.institutions.models.ProgramaAcademico", lazy="joined")


class Vacante(Base):
    __tablename__ = "vacantes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_empresa = Column(UUID(as_uuid=True), ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False, index=True)
    id_sede = Column(UUID(as_uuid=True), ForeignKey("sedes_empresa.id", ondelete="RESTRICT"), nullable=False, index=True)
    id_reclutador_responsable = Column(UUID(as_uuid=True), ForeignKey("reclutadores_empresa.id", ondelete="RESTRICT"), nullable=False, index=True)
    codigo_vacante = Column(String(50), unique=True, nullable=False, index=True)
    titulo = Column(String(255), nullable=False)
    categoria = Column(String(100), nullable=False, index=True)
    modalidad = Column(ModalidadTrabajoEnum, nullable=False, index=True)
    tipo_contrato = Column(String(100), nullable=False)
    nivel_experiencia = Column(String(60), nullable=False)
    salario_minimo = Column(Numeric(12, 2), nullable=True)
    salario_maximo = Column(Numeric(12, 2), nullable=True)
    salario_es_confidencial = Column(Boolean, default=False, nullable=False)
    periodo_salario = Column(String(20), default="Mensual", nullable=False)
    jornada_laboral = Column(String(100), nullable=False)
    idiomas_requeridos = Column(PG_ARRAY(String), nullable=True)
    cupos_disponibles = Column(Integer, default=1, nullable=False)
    total_postulantes = Column(Integer, default=0, nullable=False)
    descripcion = Column(Text, nullable=False)
    responsabilidades = Column(PG_ARRAY(String), nullable=False)
    requisitos = Column(PG_ARRAY(String), nullable=False)
    beneficios = Column(PG_ARRAY(String), nullable=True)
    estado = Column(EstadoVacanteEnum, default="abierta", nullable=False, index=True)
    publicado_en = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    fecha_cierre = Column(SQLDate, nullable=False)
    creado_en = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    actualizado_en = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relaciones ORM
    empresa = relationship("app.modules.companies.models.Empresa", lazy="selectin")
    sede = relationship("app.modules.companies.models.SedeEmpresa", lazy="selectin")
    reclutador = relationship("app.modules.companies.models.ReclutadorEmpresa", lazy="selectin")
    competencias = relationship("CompetenciaExigidaVacante", cascade="all, delete-orphan", lazy="selectin")
    programas_afines = relationship("ProgramaAfinVacante", cascade="all, delete-orphan", lazy="selectin")
    postulaciones = relationship("Postulacion", back_populates="vacante", cascade="all, delete-orphan", lazy="selectin")


class Postulacion(Base):
    __tablename__ = "postulaciones"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_vacante = Column(UUID(as_uuid=True), ForeignKey("vacantes.id", ondelete="CASCADE"), nullable=False, index=True)
    id_egresado = Column(UUID(as_uuid=True), ForeignKey("egresados.id", ondelete="CASCADE"), nullable=False, index=True)
    id_hoja_vida = Column(UUID(as_uuid=True), ForeignKey("archivos_hoja_vida.id", ondelete="SET NULL"), nullable=True)
    fase_actual = Column(FasePostulacionEnum, default="en_revision", nullable=False, index=True)
    porcentaje_afinidad = Column(Numeric(5, 2), default=0.00, nullable=False)
    retroalimentacion_reclutador = Column(Text, nullable=True)
    motivo_descarte = Column(String(255), nullable=True)
    descartado_en = Column(DateTime(timezone=True), nullable=True)
    postulado_en = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    actualizado_en = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("id_vacante", "id_egresado", name="uq_postulacion_vacante_egresado"),
    )

    # Relaciones ORM
    vacante = relationship("Vacante", back_populates="postulaciones", lazy="selectin")
    egresado = relationship("app.modules.graduates.models.Egresado", lazy="selectin")
    historial = relationship("HistorialFasePostulacion", back_populates="postulacion", cascade="all, delete-orphan", order_by="HistorialFasePostulacion.registrado_en.asc()", lazy="selectin")
    notas = relationship("NotaReclutadorPostulacion", back_populates="postulacion", cascade="all, delete-orphan", order_by="NotaReclutadorPostulacion.creado_en.desc()", lazy="selectin")
    entrevistas = relationship("EntrevistaPostulacion", back_populates="postulacion", cascade="all, delete-orphan", order_by="EntrevistaPostulacion.fecha_entrevista.asc()", lazy="selectin")


class HistorialFasePostulacion(Base):
    __tablename__ = "historial_fases_postulacion"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_postulacion = Column(UUID(as_uuid=True), ForeignKey("postulaciones.id", ondelete="CASCADE"), nullable=False, index=True)
    fase_anterior = Column(FasePostulacionEnum, nullable=True)
    fase_nueva = Column(FasePostulacionEnum, nullable=False)
    cambiado_por_usuario = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False)
    comentario = Column(Text, nullable=True)
    registrado_en = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    postulacion = relationship("Postulacion", back_populates="historial")
    usuario = relationship("app.modules.iam.models.Usuario", lazy="selectin")


class NotaReclutadorPostulacion(Base):
    __tablename__ = "notas_reclutador_postulacion"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_postulacion = Column(UUID(as_uuid=True), ForeignKey("postulaciones.id", ondelete="CASCADE"), nullable=False, index=True)
    id_reclutador = Column(UUID(as_uuid=True), ForeignKey("reclutadores_empresa.id", ondelete="CASCADE"), nullable=False, index=True)
    texto_nota = Column(Text, nullable=False)
    creado_en = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    postulacion = relationship("Postulacion", back_populates="notas")
    reclutador = relationship("app.modules.companies.models.ReclutadorEmpresa", lazy="selectin")


class EntrevistaPostulacion(Base):
    __tablename__ = "entrevistas_postulacion"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_postulacion = Column(UUID(as_uuid=True), ForeignKey("postulaciones.id", ondelete="CASCADE"), nullable=False, index=True)
    id_reclutador = Column(UUID(as_uuid=True), ForeignKey("reclutadores_empresa.id", ondelete="CASCADE"), nullable=False, index=True)
    fecha_entrevista = Column(SQLDate, nullable=False, index=True)
    franja_horaria = Column(String(50), nullable=False)
    modalidad = Column(String(50), nullable=False)
    url_reunion = Column(Text, nullable=True)
    objetivo = Column(Text, nullable=False)
    estado = Column(EstadoEntrevistaEnum, default="programada", nullable=False)
    creado_en = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    postulacion = relationship("Postulacion", back_populates="entrevistas")
    reclutador = relationship("app.modules.companies.models.ReclutadorEmpresa", lazy="selectin")

