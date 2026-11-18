"""
Vacantes exclusivas de un convenio: solo las ve, y solo se postula a ellas, un egresado de la IES con convenio vigente.

Una sola regla para todos los lugares donde se muestran vacantes (catálogo público, detalle, postulación,
recomendadas y copiloto), para que ninguno la olvide.
"""

import uuid
from typing import Any, Dict, Optional

from sqlalchemy import column, func, or_, select, table, text
from sqlalchemy.ext.asyncio import AsyncSession

_convenios = table("convenios_interinstitucionales", column("id"), column("id_institucion"), column("estado"), column("fecha_vencimiento"))
_academicos = table("academicos_egresado", column("id_egresado"), column("id_institucion"))

# Para SQL escrito a mano: exige un alias `eg` (egresados) y `v` (vacantes) en la consulta.
SQL_VISIBLE_PARA_EG = """(v.id_convenio IS NULL OR v.id_convenio IN (
    SELECT c.id FROM convenios_interinstitucionales c JOIN academicos_egresado a ON a.id_institucion = c.id_institucion
    WHERE a.id_egresado = eg.id AND c.estado = 'activo' AND c.fecha_vencimiento >= CURRENT_DATE))"""


def visible_para(col_convenio, id_egresado: Optional[uuid.UUID]):
    """Condición para filtrar vacantes. Sin egresado (visitante o empresa) solo quedan las abiertas a todos."""
    abiertas = col_convenio.is_(None)
    if id_egresado is None:
        return abiertas
    propios = (
        select(_convenios.c.id)
        .select_from(_convenios.join(_academicos, _academicos.c.id_institucion == _convenios.c.id_institucion))
        .where(_academicos.c.id_egresado == id_egresado, _convenios.c.estado == "activo", _convenios.c.fecha_vencimiento >= func.current_date())
    )
    return or_(abiertas, col_convenio.in_(propios))


async def egresado_id_de(session: AsyncSession, user: Optional[Dict[str, Any]]) -> Optional[uuid.UUID]:
    """Id del egresado de una sesión (None si no hay sesión o no es egresado)."""
    if not user or user.get("rol") != "egresado":
        return None
    try:
        uid = uuid.UUID(str(user.get("sub") or user.get("id")))
    except ValueError:
        return None
    return (await session.execute(text("SELECT id FROM egresados WHERE id_usuario = :u"), {"u": uid})).scalar()


async def puede_ver(session: AsyncSession, id_convenio: Optional[uuid.UUID], id_egresado: Optional[uuid.UUID]) -> bool:
    if id_convenio is None:
        return True
    if id_egresado is None:
        return False
    return bool((await session.execute(text("""
        SELECT 1 FROM convenios_interinstitucionales c JOIN academicos_egresado a ON a.id_institucion = c.id_institucion
        WHERE c.id = :c AND a.id_egresado = :e AND c.estado = 'activo' AND c.fecha_vencimiento >= CURRENT_DATE"""),
        {"c": id_convenio, "e": id_egresado})).first())
