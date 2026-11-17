"""Esquemas de moderación de vacantes y cuentas."""

from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

Motivo = Literal[
    "fraude_o_estafa",
    "cobro_indebido",
    "discriminacion",
    "informacion_falsa",
    "contenido_inapropiado",
    "otro",
]

MOTIVO_ETIQUETA = {
    "fraude_o_estafa": "Posible fraude o estafa",
    "cobro_indebido": "Cobro indebido al candidato",
    "discriminacion": "Discriminación",
    "informacion_falsa": "Información falsa o engañosa",
    "contenido_inapropiado": "Contenido inapropiado",
    "otro": "Otro",
}


class ReportRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    motivo: Motivo
    detalle: Optional[str] = Field(default=None, max_length=1000)


class ModerationReason(BaseModel):
    """Motivo obligatorio de una acción que restringe una vacante o cuenta (queda en el historial)."""
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    motivo: str = Field(min_length=5, max_length=500)


class ModerationNote(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    nota: Optional[str] = Field(default=None, max_length=500)
