"""
Notificaciones dentro de la plataforma (campana). Un aviso nunca debe romper la operación que lo origina:
`notificar` usa un savepoint y traga (y registra) cualquier error, p. ej. si la tabla aún no existe.
"""

import logging
import uuid
from typing import Any, Dict, Iterable, List, Optional

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger("vincula.notifications")

MAX_PAGE = 100


def _uuid(value: Any) -> Optional[uuid.UUID]:
    try:
        return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))
    except (ValueError, TypeError):
        return None


async def notificar(session: AsyncSession, usuarios: Iterable[Any], tipo: str, titulo: str, mensaje: str,
                    enlace: Optional[str] = None, commit: bool = False) -> None:
    """Crea el aviso para cada usuario. Con commit=True confirma la transacción (úsalo si el aviso va después del commit del negocio)."""
    ids = {u for u in map(_uuid, usuarios) if u}
    if not ids:
        return
    try:
        async with session.begin_nested():
            for uid in ids:
                await session.execute(
                    text("INSERT INTO notificaciones (id_usuario, tipo, titulo, mensaje, enlace) VALUES (:u, :t, :ti, :m, :e)"),
                    {"u": uid, "t": tipo[:40], "ti": titulo[:160], "m": mensaje, "e": enlace},
                )
        if commit:
            await session.commit()
    except Exception as exc:  # noqa: BLE001  el aviso no debe deshacer lo que ya se guardó
        logger.warning("Notificación no creada: tipo=%s error=%s", tipo, type(exc).__name__)


# ───────────────────────────────────────────────────────────── destinatarios
async def _ids(session: AsyncSession, sql: str, **params) -> List[uuid.UUID]:
    try:
        async with session.begin_nested():  # un error de lectura no debe dejar abortada la transacción del negocio
            return [r[0] for r in (await session.execute(text(sql), params)).fetchall()]
    except Exception as exc:  # noqa: BLE001
        logger.warning("Destinatarios no resueltos: error=%s", type(exc).__name__)
        return []


async def de_egresado(session: AsyncSession, id_egresado: Any) -> List[uuid.UUID]:
    return await _ids(session, "SELECT id_usuario FROM egresados WHERE id = :i", i=_uuid(id_egresado))


async def de_empresa(session: AsyncSession, id_empresa: Any, id_reclutador: Any = None) -> List[uuid.UUID]:
    """Administradores activos de la empresa y, si se indica, el reclutador responsable."""
    return await _ids(session, """
        SELECT r.id_usuario FROM reclutadores_empresa r JOIN usuarios u ON u.id = r.id_usuario
        WHERE r.id_empresa = :e AND u.estado = 'activo' AND (u.rol = 'admin_empresa' OR r.id = :r)""",
        e=_uuid(id_empresa), r=_uuid(id_reclutador))


async def de_empresa_de_vacante(session: AsyncSession, id_vacante: Any) -> List[uuid.UUID]:
    """Administradores activos de la empresa dueña de la vacante y su reclutador responsable."""
    return await _ids(session, """
        SELECT r.id_usuario FROM vacantes v JOIN reclutadores_empresa r ON r.id_empresa = v.id_empresa
        JOIN usuarios u ON u.id = r.id_usuario
        WHERE v.id = :v AND u.estado = 'activo' AND (u.rol = 'admin_empresa' OR r.id = v.id_reclutador_responsable)""",
        v=_uuid(id_vacante))


async def de_institucion(session: AsyncSession, id_institucion: Any) -> List[uuid.UUID]:
    """Asesores y administradores activos de la institución."""
    return await _ids(session, """
        SELECT a.id_usuario FROM asesores_ies a JOIN usuarios u ON u.id = a.id_usuario
        WHERE a.id_institucion = :i AND u.estado = 'activo'""", i=_uuid(id_institucion))


async def superadmins(session: AsyncSession) -> List[uuid.UUID]:
    return await _ids(session, "SELECT id FROM usuarios WHERE rol = 'superadmin_vincula' AND estado = 'activo'")


# ───────────────────────────────────────────────────────────── consulta (siempre del propio usuario)
def _item(row) -> Dict[str, Any]:
    return {"id": str(row[0]), "tipo": row[1], "titulo": row[2], "mensaje": row[3], "enlace": row[4],
            "leida": row[5] is not None, "creada_en": row[6].isoformat()}


async def listar(session: AsyncSession, id_usuario: uuid.UUID, limite: int, solo_no_leidas: bool) -> Dict[str, Any]:
    filtro = "AND leida_en IS NULL" if solo_no_leidas else ""
    rows = (await session.execute(text(f"""
        SELECT id, tipo, titulo, mensaje, enlace, leida_en, creada_en FROM notificaciones
        WHERE id_usuario = :u {filtro} ORDER BY creada_en DESC LIMIT :l"""), {"u": id_usuario, "l": min(max(limite, 1), MAX_PAGE)})).fetchall()
    sin_leer = (await session.execute(text("SELECT count(*) FROM notificaciones WHERE id_usuario = :u AND leida_en IS NULL"),
                                      {"u": id_usuario})).scalar() or 0
    return {"items": [_item(r) for r in rows], "no_leidas": int(sin_leer)}


async def marcar_leida(session: AsyncSession, id_usuario: uuid.UUID, id_notificacion: str) -> Dict[str, Any]:
    nid = _uuid(id_notificacion)
    if not nid:
        raise HTTPException(status_code=404, detail="Notificación no encontrada.")
    res = await session.execute(text("""
        UPDATE notificaciones SET leida_en = COALESCE(leida_en, now()) WHERE id = :i AND id_usuario = :u"""), {"i": nid, "u": id_usuario})
    if not res.rowcount:
        raise HTTPException(status_code=404, detail="Notificación no encontrada.")
    await session.commit()
    return {"ok": True}


async def marcar_todas(session: AsyncSession, id_usuario: uuid.UUID) -> Dict[str, Any]:
    res = await session.execute(text("UPDATE notificaciones SET leida_en = now() WHERE id_usuario = :u AND leida_en IS NULL"),
                                {"u": id_usuario})
    await session.commit()
    return {"actualizadas": res.rowcount}
