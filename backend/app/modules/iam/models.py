"""
Modelos ORM de Usuarios y Autenticación (IAM) mapeados a schema_vincula_completo.sql.
"""

import uuid
from sqlalchemy import Column, String, DateTime, Integer, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, ENUM as PG_ENUM
from app.core.database import Base

# Enums de PostgreSQL existentes en schema_vincula_completo.sql
RolUsuarioEnum = PG_ENUM(
    'egresado',
    'asesor_ies',
    'admin_ies',
    'admin_empresa',
    'reclutador_empresa',
    'superadmin_vincula',
    name='rol_usuario_enum',
    create_type=False
)

EstadoCuentaEnum = PG_ENUM(
    'activo',
    'inactivo',
    'suspendido',
    'pendiente_verificacion',
    name='estado_cuenta_enum',
    create_type=False
)


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    correo_electronico = Column(String(255), unique=True, nullable=False, index=True)
    contrasena_hash = Column(String(255), nullable=False)
    google_sub = Column(String(255), unique=True, nullable=True)
    rol = Column(RolUsuarioEnum, nullable=False, index=True)
    estado = Column(EstadoCuentaEnum, default="activo", nullable=False)
    ultimo_acceso_en = Column(DateTime(timezone=True), nullable=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    actualizado_en = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class PasswordResetCode(Base):
    __tablename__ = "codigos_recuperacion"
    id_usuario = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"), primary_key=True)
    codigo_hash = Column(String(64), nullable=False)
    expira_en = Column(DateTime(timezone=True), nullable=False)
    solicitado_en = Column(DateTime(timezone=True), nullable=False)
    intentos = Column(Integer, nullable=False, default=0)
