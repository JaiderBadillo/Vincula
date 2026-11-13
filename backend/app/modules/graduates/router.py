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
from app.modules.graduates.models import Egresado, AcademicoEgresado, ArchivoHojaVida
from app.core.dependencies import get_current_user, require_role
from app.modules.graduates.schemas import (
    GraduateProfileSchema,
    GraduateProfileUpdate,
    GraduateApplicationResponse,
    ApplicationHistoryItem
)
from app.modules.graduates.services import GraduateService

router = APIRouter(prefix="/egresados", tags=["Egresados - Perfil y Postulaciones"])
PRIVATE_CV_BUCKET = "vincula-hojas-de-vida"


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


@router.patch("/perfil", response_model=GraduateProfileSchema)
async def update_my_profile(
    changes: GraduateProfileUpdate,
    current_user: Dict[str, Any] = Depends(require_role(["egresado"])),
    db: AsyncSession = Depends(get_db),
):
    user_id = uuid.UUID(_get_user_id(current_user))
    graduate = (await db.execute(select(Egresado).where(Egresado.id_usuario == user_id))).scalar_one_or_none()
    if graduate is None:
        raise HTTPException(status_code=404, detail="Perfil de egresado no encontrado.")
    fields = {
        "nombre_completo": "nombre_completo", "correo": "correo_personal",
        "telefono": "telefono", "ciudad": "ciudad_residencia",
        "titular_profesional": "titular_profesional", "biografia": "biografia",
        "url_avatar": "url_avatar", "url_portada": "url_portada",
        "disponible_para_trabajar": "disponible_para_trabajar",
        "visibilidad_disponibilidad": "visibilidad_disponibilidad",
        "aspiracion_salarial_min": "aspiracion_salarial_min",
        "aspiracion_salarial_max": "aspiracion_salarial_max",
        "dispuesto_a_reubicarse": "dispuesto_a_reubicarse",
    }
    for key, value in changes.model_dump(exclude_unset=True).items():
        if key in {"nombre_completo", "telefono", "ciudad"} and not str(value or "").strip():
            raise HTTPException(status_code=422, detail=f"{key} no puede quedar vacío.")
        if key in {"url_avatar", "url_portada"} and value and not value.startswith("https://"):
            raise HTTPException(status_code=422, detail="La imagen debe tener una URL HTTPS válida.")
        setattr(graduate, fields[key], value)
    await db.commit()
    return await GraduateService.get_profile_async(db, str(user_id))


async def _own_graduate(db: AsyncSession, current_user: Dict[str, Any]) -> Egresado:
    graduate = (await db.execute(select(Egresado).where(Egresado.id_usuario == uuid.UUID(_get_user_id(current_user))))).scalar_one_or_none()
    if not graduate:
        raise HTTPException(status_code=404, detail="Perfil de egresado no encontrado.")
    return graduate


@router.post("/perfil/hojas-de-vida", response_model=GraduateProfileSchema)
async def upload_my_cv(
    archivo_pdf: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(require_role(["egresado"])),
    db: AsyncSession = Depends(get_db),
):
    graduate = await _own_graduate(db, current_user)
    current = (await db.execute(select(ArchivoHojaVida).where(ArchivoHojaVida.id_egresado == graduate.id))).scalars().all()
    if len(current) >= 4:
        raise HTTPException(status_code=400, detail="Puedes guardar hasta cuatro hojas de vida.")
    payload = await archivo_pdf.read(5 * 1024 * 1024 + 1)
    if not payload.startswith(b"%PDF-") or len(payload) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Se requiere un PDF real de máximo 5 MB.")
    filename = (archivo_pdf.filename or "hoja-de-vida.pdf").split("/")[-1].split("\\")[-1][:200]
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="El archivo debe tener extensión PDF.")
    path = f"hojas-de-vida/{graduate.id}/{uuid.uuid4()}.pdf"
    stored = await SupabaseStorageService.upload_document_pdf(PRIVATE_CV_BUCKET, payload, path)
    db.add(ArchivoHojaVida(
        id_egresado=graduate.id, nombre_archivo=filename, url_archivo=stored["url"],
        tamano_kb=(len(payload) + 1023) // 1024, es_predeterminado=not current,
    ))
    await db.commit()
    return await GraduateService.get_profile_async(db, _get_user_id(current_user))


@router.delete("/perfil/hojas-de-vida/{cv_id}", response_model=GraduateProfileSchema)
async def delete_my_cv(
    cv_id: uuid.UUID,
    current_user: Dict[str, Any] = Depends(require_role(["egresado"])),
    db: AsyncSession = Depends(get_db),
):
    graduate = await _own_graduate(db, current_user)
    current = (await db.execute(select(ArchivoHojaVida).where(
        ArchivoHojaVida.id == cv_id, ArchivoHojaVida.id_egresado == graduate.id,
    ))).scalar_one_or_none()
    if not current:
        raise HTTPException(status_code=404, detail="Hoja de vida no encontrada.")
    was_primary = current.es_predeterminado
    await db.delete(current)
    if was_primary:
        remaining = (await db.execute(select(ArchivoHojaVida).where(ArchivoHojaVida.id_egresado == graduate.id, ArchivoHojaVida.id != cv_id))).scalars().first()
        if remaining:
            remaining.es_predeterminado = True
    await db.commit()
    return await GraduateService.get_profile_async(db, _get_user_id(current_user))


@router.patch("/perfil/hojas-de-vida/{cv_id}/principal", response_model=GraduateProfileSchema)
async def set_my_primary_cv(
    cv_id: uuid.UUID,
    current_user: Dict[str, Any] = Depends(require_role(["egresado"])),
    db: AsyncSession = Depends(get_db),
):
    graduate = await _own_graduate(db, current_user)
    cvs = (await db.execute(select(ArchivoHojaVida).where(ArchivoHojaVida.id_egresado == graduate.id))).scalars().all()
    if not any(cv.id == cv_id for cv in cvs):
        raise HTTPException(status_code=404, detail="Hoja de vida no encontrada.")
    for cv in cvs:
        cv.es_predeterminado = cv.id == cv_id
    await db.commit()
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
    acad.motivo_rechazo = None
    acad.fecha_verificacion = None
    acad.verificado_por_usuario = None
    await db.commit()

    return {
        "success": True,
        "mensaje": "Diploma cargado con éxito en Supabase Storage",
        "url": storage_res["url"],
        "nombre_archivo": clean_name
    }
