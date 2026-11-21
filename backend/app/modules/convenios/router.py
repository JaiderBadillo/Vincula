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
    modalidad: Optional[Literal["presencial", "hibrido", "remoto"]] = None
    remuneracion: Optional[Literal["a_convenir", "remunerada", "con_auxilio", "sin_remuneracion"]] = None
    compromisos: List[Literal["prioridad_egresados", "charlas_empleabilidad", "ferias_visitas", "seguimiento_conjunto"]] = Field(default_factory=list, max_length=4)
    responsable_nombre: Optional[str] = Field(None, max_length=150)
    responsable_contacto: Optional[str] = Field(None, max_length=200)


class RespuestaRequest(BaseModel):
    accion: Literal["aceptar", "rechazar", "retirar"]
    notas: Optional[str] = Field(None, max_length=1000)


@router.get("/mios")
async def mis_convenios(user: Dict[str, Any] = Depends(TODOS), db: AsyncSession = Depends(get_db)):
    """Propuestas (enviadas y recibidas) y convenios de la empresa o institución de quien consulta."""
    lado, entidad = svc.side_of(user)
    return await svc.listar(db, lado, entidad)


@router.get("/contrapartes")
async def buscar_contrapartes(
    q: Optional[str] = Query(None, max_length=60), ciudad: Optional[str] = Query(None, max_length=100),
    sector: Optional[str] = Query(None, max_length=100), programa: Optional[str] = Query(None, max_length=80),
    con_vacantes: bool = Query(False), user: Dict[str, Any] = Depends(TODOS), db: AsyncSession = Depends(get_db),
):
    """Instituciones (si eres empresa) o empresas (si eres IES) aprobadas a las que puedes proponer un convenio, con filtros."""
    lado, entidad = svc.side_of(user)
    return await svc.contrapartes(db, lado, q, ciudad=ciudad, sector=sector, programa=programa, con_vacantes=con_vacantes, entidad=entidad)


@router.get("/contrapartes/filtros")
async def filtros_contrapartes(user: Dict[str, Any] = Depends(TODOS), db: AsyncSession = Depends(get_db)):
    """Ciudades (y sectores) disponibles para filtrar la búsqueda."""
    lado, _ = svc.side_of(user)
    return await svc.filtros_contrapartes(db, lado)


@router.post("/propuestas", status_code=201)
async def proponer(payload: PropuestaRequest, user: Dict[str, Any] = Depends(TODOS), db: AsyncSession = Depends(get_db)):
    lado, entidad = svc.side_of(user)
    programas = [p.strip()[:150] for p in payload.programas if p.strip()]
    detalle = payload.model_dump(include={"modalidad", "remuneracion", "compromisos", "responsable_nombre", "responsable_contacto"})
    return await svc.proponer(db, lado, entidad, payload.id_contraparte, payload.tipo, payload.vacantes_proyectadas,
                              payload.duracion_anos, programas, payload.mensaje, detalle)


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
