"""Convenios IES <-> empresa: propuestas en ambas direcciones. Prefijo /api/v1/convenios."""

from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import require_role
from app.modules.convenios import services as svc

router = APIRouter(prefix="/convenios", tags=["Convenios IES - Empresa"])
TODOS = require_role(list(svc.ROLES_EMPRESA + svc.ROLES_IES))


class PropuestaRequest(BaseModel):
    id_contraparte: str = Field(..., min_length=36, max_length=36)
    tipo: Literal["Pasantía", "Aprendizaje", "Laboral"]
    vacantes_proyectadas: int = Field(1, ge=1, le=500)
    duracion_anos: int = Field(1, ge=1, le=5)
    programas: List[str] = Field(default_factory=list, max_length=20)
    mensaje: Optional[str] = Field(None, max_length=1000)


class RespuestaRequest(BaseModel):
    accion: Literal["aceptar", "rechazar", "retirar"]
    notas: Optional[str] = Field(None, max_length=1000)


@router.get("/mios")
async def mis_convenios(user: Dict[str, Any] = Depends(TODOS), db: AsyncSession = Depends(get_db)):
    """Propuestas (enviadas y recibidas) y convenios de la empresa o institución de quien consulta."""
    lado, entidad = svc.side_of(user)
    return await svc.listar(db, lado, entidad)


@router.get("/contrapartes")
async def buscar_contrapartes(q: Optional[str] = Query(None, max_length=60), user: Dict[str, Any] = Depends(TODOS),
                              db: AsyncSession = Depends(get_db)):
    """Instituciones (si eres empresa) o empresas (si eres IES) aprobadas a las que puedes proponer un convenio."""
    lado, _ = svc.side_of(user)
    return await svc.contrapartes(db, lado, q)


@router.post("/propuestas", status_code=201)
async def proponer(payload: PropuestaRequest, user: Dict[str, Any] = Depends(TODOS), db: AsyncSession = Depends(get_db)):
    lado, entidad = svc.side_of(user)
    programas = [p.strip()[:150] for p in payload.programas if p.strip()]
    return await svc.proponer(db, lado, entidad, payload.id_contraparte, payload.tipo, payload.vacantes_proyectadas,
                              payload.duracion_anos, programas, payload.mensaje)


@router.post("/propuestas/{id_propuesta}/responder")
async def responder(id_propuesta: str, payload: RespuestaRequest, user: Dict[str, Any] = Depends(TODOS), db: AsyncSession = Depends(get_db)):
    lado, entidad = svc.side_of(user)
    return await svc.responder(db, lado, entidad, id_propuesta, payload.accion, payload.notas)


@router.get("/vigentes")
async def convenios_vigentes(user: Dict[str, Any] = Depends(require_role(list(svc.ROLES_EMPRESA) + ["reclutador_empresa"])),
                             db: AsyncSession = Depends(get_db)):
    """Convenios con los que la empresa puede publicar vacantes exclusivas."""
    entidad = str(user.get("id_entidad") or "")
    if not entidad:
        raise HTTPException(status_code=400, detail="Tu cuenta no está vinculada a una empresa.")
    return await svc.convenios_vigentes_de_empresa(db, entidad)
