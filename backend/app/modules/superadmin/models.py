"""
Modelos ORM del Dominio Super Admin (Auditoría de 72H y Registro de Decisiones).
Mapeado exactamente a la tabla 'auditorias_superadmin' de schema_vincula_completo.sql.
"""

import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class AuditoriaSuperadmin(Base):
    __tablename__ = "auditorias_superadmin"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tipo_entidad = Column(String(30), nullable=False)  # 'empresa' o 'institucion'
    id_entidad = Column(UUID(as_uuid=True), nullable=False, index=True)
    id_auditor = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False)
    accion_realizada = Column(String(60), nullable=False)  # 'subsanacion_solicitada', 'aprobacion_oficial', 'rechazo'
    observaciones_correccion = Column(Text, nullable=False)
    registrado_en = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

