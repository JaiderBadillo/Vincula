"""
Router de Egresados - Perfil y Mis Postulaciones.
Endpoints oficiales bajo prefijo /api/v1/egresados
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from typing import Dict, Any, List
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.config import settings
from app.integrations.supabase_storage import SupabaseStorageService
from app.modules.graduates.models import Egresado, AcademicoEgresado
from app.core.dependencies import get_current_user, require_role
from app.modules.graduates.schemas import (
    GraduateProfileSchema,
    GraduateApplicationResponse,
    ApplicationHistoryItem
)
from app.modules.graduates.services import GraduateService

router = APIRouter(prefix="/egresados", tags=["Egresados - Perfil y Postulaciones"])


def _get_user_id(current_user: Dict[str, Any]) -> str:
    """Extrae el UUID del usuario autenticado desde los claims del JWT ('sub' o 'user_id')."""
    uid = current_user.get("sub") or current_user.get("user_id") or current_user.get("id")
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"codigo": "TOKEN_INVALIDO", "mensaje": "Token no contiene identificador de usuario válido."}
        )
    return str(uid)


@router.get("/perfil", response_model=GraduateProfileSchema)
async def get_my_profile(
    current_user: Dict[str, Any] = Depends(require_role(["egresado"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Retorna el perfil integral del egresado autenticado.
    """
    return await GraduateService.get_profile_async(db, _get_user_id(current_user))


@router.get("/mis-postulaciones", response_model=List[GraduateApplicationResponse])
async def get_my_applications(
    current_user: Dict[str, Any] = Depends(require_role(["egresado"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Retorna el historial en vivo de postulaciones del egresado autenticado desde PostgreSQL
    con el pipeline ATS Kanban, timeline de fases, estado de entrevista y datos de la vacante.
    """
    user_id = _get_user_id(current_user)
    return await GraduateService.get_my_applications_async(db, user_id)


@router.get("/mis-postulaciones/{id_postulacion}", response_model=GraduateApplicationResponse)
async def get_application_detail(
    id_postulacion: str,
    current_user: Dict[str, Any] = Depends(require_role(["egresado"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Retorna el detalle completo y estado en tiempo real de una postulación individual del egresado.
    """
    user_id = _get_user_id(current_user)
    return await GraduateService.get_application_detail_async(db, user_id, id_postulacion)


@router.delete("/mis-postulaciones/{id_postulacion}/retirar")
async def withdraw_application(
    id_postulacion: str,
    current_user: Dict[str, Any] = Depends(require_role(["egresado"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Permite al egresado retirar voluntariamente su postulación.
    Limpia en cascada el historial de fases y notas, y decrementa el contador de la vacante.
    """
    user_id = _get_user_id(current_user)
    return await GraduateService.withdraw_application_async(db, user_id, id_postulacion)


@router.post("/documentos/diploma")
async def upload_graduate_diploma(
    archivo_pdf: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(require_role(["egresado"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Permite al egresado autenticado subir o actualizar su archivo de diploma/acta de grado en PDF a Supabase Storage.
    """
    user_id = _get_user_id(current_user)
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Identificador de usuario inválido.")

    # Buscar registro de egresado
    res = await db.execute(select(Egresado).where(Egresado.id_usuario == user_uuid))
    egresado = res.scalar_one_or_none()
    if not egresado:
        raise HTTPException(status_code=404, detail="Perfil de egresado no encontrado.")

    res_acad = await db.execute(
        select(AcademicoEgresado)
        .where(AcademicoEgresado.id_egresado == egresado.id)
        .order_by(AcademicoEgresado.creado_en.desc())
    )
    acad = res_acad.scalars().first()
    if not acad:
        raise HTTPException(status_code=404, detail="No hay un registro académico al cual adjuntar el diploma.")
    if acad.estado_verificacion == "aprobado":
        raise HTTPException(status_code=409, detail="Un diploma ya verificado no puede reemplazarse sin una nueva revisión.")

    file_bytes = await archivo_pdf.read()
    if not file_bytes or len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="El archivo adjunto está vacío.")

    clean_name = "".join(c for c in (archivo_pdf.filename or "diploma.pdf") if c.isalnum() or c in (".", "_", "-")).strip() or "diploma.pdf"
    if not clean_name.lower().endswith(".pdf"):
        clean_name += ".pdf"

    dest_path = f"diplomas/{egresado.id}/{uuid.uuid4()}/{clean_name}"
    storage_res = await SupabaseStorageService.upload_document_pdf(
        bucket_name=settings.SUPABASE_STORAGE_BUCKET_DIPLOMAS,
        file_bytes=file_bytes,
        destination_path=dest_path
    )

    acad.url_diploma_pdf = storage_res["url"]
    acad.diploma_cargado_por_egresado = True
    acad.estado_verificacion = "pendiente"
    await db.commit()

    return {
        "success": True,
        "mensaje": "Diploma cargado con éxito en Supabase Storage",
        "url": storage_res["url"],
        "nombre_archivo": clean_name
    }
