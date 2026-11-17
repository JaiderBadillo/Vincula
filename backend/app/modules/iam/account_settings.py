"""Configuración de credenciales reales, exportación de datos personales y supresión de cuenta."""
import asyncio
from datetime import datetime, timezone
from typing import Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from pydantic import BaseModel, Field
from sqlalchemy import select, delete, func, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.security import get_password_hash, verify_password
from app.modules.iam.models import Usuario, AccesoAsesorIES
from app.modules.iam.advisor_settings import EmailChange, PasswordChange, GoogleLink, GoogleUnlink
from app.modules.graduates.models import Egresado, AcademicoEgresado, ArchivoHojaVida
from app.modules.companies.models import Empresa, ReclutadorEmpresa, DocumentoEmpresa
from app.modules.institutions.models import Institucion, AsesorIES, DocumentoInstitucion
from app.modules.vacancies_ats.models import Postulacion, Vacante, HistorialFasePostulacion

router = APIRouter(prefix="/cuenta/configuracion", tags=["Configuración de cuenta"])


class AccountDeletionRequest(BaseModel):
    contrasena_actual: str = Field(..., min_length=1)
    confirmacion: str = Field(..., description="Debe escribir ELIMINAR para confirmar la supresión")
    motivo: Optional[str] = Field(None, max_length=500)


async def current_account(claims, db):
    try:
        user_id = uuid.UUID(str(claims.get("sub")))
    except (TypeError, ValueError):
        raise HTTPException(401, "Sesión inválida.") from None
    user = (await db.execute(select(Usuario).where(Usuario.id == user_id))).scalar_one_or_none()
    if not user or user.estado != "activo" or user.rol != claims.get("rol"):
        raise HTTPException(403, "La cuenta no está disponible.")
    return user


def check_password(user, password):
    if not verify_password(password, user.contrasena_hash):
        raise HTTPException(403, "La contraseña actual es incorrecta.")


@router.get("")
async def get_settings(claims=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = await current_account(claims, db)
    return {"correo": user.correo_electronico, "rol": user.rol, "nombre": claims.get("nombre") or user.correo_electronico,
            "google_vinculado": bool(user.google_sub), "ultimo_acceso": user.ultimo_acceso_en,
            "ultimo_cambio": user.actualizado_en}


@router.put("/correo")
async def change_email(payload: EmailChange, claims=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = await current_account(claims, db)
    check_password(user, payload.contrasena_actual)
    email = str(payload.correo).strip().lower()
    if user.google_sub and email != user.correo_electronico:
        raise HTTPException(409, "Desvincula Google antes de cambiar el correo de acceso.")
    existing = (await db.execute(select(Usuario.id).where(func.lower(Usuario.correo_electronico) == email,
                                                       Usuario.id != user.id))).first()
    if existing:
        raise HTTPException(409, "Este correo ya pertenece a otra cuenta.")
    user.correo_electronico = email
    await db.commit()
    return {"correo": email, "mensaje": "Correo actualizado. Úsalo en tu próximo inicio de sesión."}


@router.put("/contrasena")
async def change_password(payload: PasswordChange, claims=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = await current_account(claims, db)
    check_password(user, payload.contrasena_actual)
    if verify_password(payload.nueva_contrasena, user.contrasena_hash):
        raise HTTPException(400, "La nueva contraseña debe ser diferente de la actual.")
    user.contrasena_hash = get_password_hash(payload.nueva_contrasena)
    await db.commit()
    return {"mensaje": "Contraseña actualizada correctamente."}


@router.post("/google")
async def link_google(payload: GoogleLink, claims=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = await current_account(claims, db)
    check_password(user, payload.contrasena_actual)
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(503, "Google no está configurado.")
    try:
        info = await asyncio.to_thread(id_token.verify_oauth2_token, payload.credential,
                                       google_requests.Request(), settings.GOOGLE_CLIENT_ID)
    except Exception:
        raise HTTPException(400, "No se pudo verificar la cuenta de Google.") from None
    if not info.get("email_verified") or info.get("email", "").lower() != user.correo_electronico.lower() or not info.get("sub"):
        raise HTTPException(400, "Usa una cuenta de Google verificada con el mismo correo de Víncula.")
    owner = (await db.execute(select(Usuario.id).where(Usuario.google_sub == info["sub"], Usuario.id != user.id))).first()
    if owner:
        raise HTTPException(409, "Esta cuenta de Google ya está vinculada a otro usuario.")
    user.google_sub = info["sub"]
    await db.commit()
    return {"google_vinculado": True, "mensaje": "Google vinculado a tu cuenta."}


@router.delete("/google")
async def unlink_google(payload: GoogleUnlink, claims=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = await current_account(claims, db)
    check_password(user, payload.contrasena_actual)
    user.google_sub = None
    await db.commit()
    return {"google_vinculado": False, "mensaje": "Google desvinculado. Puedes seguir entrando con contraseña."}


@router.get("/mis-datos")
async def get_my_personal_data(claims=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """
    Retorna el inventario transparente de los datos que Vincula almacena sobre el usuario autenticado
    y la finalidad de tratamiento de cada categoría (Ley 1581 de 2012 - Habeas Data), permitiendo
    seleccionar qué categorías descargar.
    """
    user = await current_account(claims, db)
    rol = str(user.rol)

    cuenta_datos = {
        "id_usuario": str(user.id),
        "correo_electronico": user.correo_electronico,
        "rol": rol,
        "estado_cuenta": str(user.estado),
        "google_vinculado": bool(user.google_sub),
        "ultimo_acceso_en": user.ultimo_acceso_en.isoformat() if user.ultimo_acceso_en else None,
        "creado_en": user.creado_en.isoformat() if user.creado_en else None,
    }

    perfil_datos = {}
    documentos_datos = []
    actividad_datos = []

    if rol == "egresado":
        egr = (await db.execute(select(Egresado).where(Egresado.id_usuario == user.id))).scalar_one_or_none()
        if egr:
            perfil_datos = {
                "nombre_completo": egr.nombre_completo,
                "tipo_documento": egr.tipo_documento,
                "numero_documento": egr.numero_documento,
                "ciudad_residencia": egr.ciudad_residencia,
                "departamento_residencia": egr.departamento_residencia,
                "telefono": egr.telefono,
                "correo_personal": egr.correo_personal,
                "titular_profesional": egr.titular_profesional,
                "biografia": egr.biografia,
                "disponible_para_trabajar": egr.disponible_para_trabajar,
                "visibilidad_disponibilidad": egr.visibilidad_disponibilidad,
                "dispuesto_a_reubicarse": egr.dispuesto_a_reubicarse,
                "estado_verificacion_perfil": egr.estado,
                "perfil_adicional": egr.perfil_adicional or {},
            }
            for acad in (egr.academicos or []):
                documentos_datos.append({
                    "tipo": "Expediente y Título Académico",
                    "programa": acad.programa.nombre if getattr(acad, "programa", None) else None,
                    "institucion": acad.institucion.nombre_oficial if getattr(acad, "institucion", None) else None,
                    "nivel_formacion": acad.nivel_formacion,
                    "ano_graduacion": acad.ano_graduacion,
                    "estado_verificacion": acad.estado_verificacion,
                    "validado_por_ies": acad.validado_por_ies,
                    "numero_acta_grado": acad.numero_acta_grado,
                    "numero_libro_folio": acad.numero_libro_folio,
                    "sello_digital": acad.sello_digital,
                    "diploma_adjunto": bool(acad.diploma_cargado_por_egresado and acad.url_diploma_pdf),
                })
            for cv in (egr.hojas_vida or []):
                documentos_datos.append({
                    "tipo": "Hoja de Vida PDF",
                    "nombre_archivo": cv.nombre_archivo,
                    "tamano_kb": cv.tamano_kb,
                    "es_predeterminado": cv.es_predeterminado,
                    "subido_en": cv.subido_en.isoformat() if cv.subido_en else None,
                })
            posts = (await db.execute(
                select(Postulacion).where(Postulacion.id_egresado == egr.id).order_by(Postulacion.postulado_en.desc())
            )).scalars().all()
            for p in posts:
                actividad_datos.append({
                    "tipo": "Postulación a Vacante",
                    "vacante": p.vacante.titulo if getattr(p, "vacante", None) else None,
                    "codigo_vacante": p.vacante.codigo_vacante if getattr(p, "vacante", None) else None,
                    "fase_actual": str(p.fase_actual),
                    "porcentaje_afinidad": float(p.porcentaje_afinidad) if p.porcentaje_afinidad is not None else None,
                    "postulado_en": p.postulado_en.isoformat() if p.postulado_en else None,
                })

    elif rol in ("asesor_ies", "admin_ies"):
        row = (await db.execute(
            select(AsesorIES, Institucion)
            .join(Institucion, AsesorIES.id_institucion == Institucion.id)
            .where(AsesorIES.id_usuario == user.id)
        )).first()
        if row:
            asesor, ies = row
            perfil_datos = {
                "nombre_completo": asesor.nombre_completo,
                "cargo": asesor.cargo,
                "correo_institucional": asesor.correo_institucional,
                "telefono": asesor.telefono,
                "institucion_oficial": ies.nombre_oficial,
                "institucion_sigla": ies.nombre_corto,
                "codigo_snies": ies.codigo_snies,
                "nit_institucion": ies.nit,
                "estado_institucion": str(ies.estado),
            }
            docs_ies = (await db.execute(
                select(DocumentoInstitucion).where(DocumentoInstitucion.id_institucion == ies.id)
            )).scalars().all()
            for d in docs_ies:
                documentos_datos.append({
                    "tipo": d.tipo_documento,
                    "nombre_archivo": d.nombre_archivo,
                    "estado": d.estado,
                    "subido_en": d.subido_en.isoformat() if d.subido_en else None,
                })
        accesos = (await db.execute(
            select(AccesoAsesorIES)
            .where(AccesoAsesorIES.id_usuario == user.id)
            .order_by(AccesoAsesorIES.fecha.desc())
            .limit(20)
        )).scalars().all()
        for acc in accesos:
            actividad_datos.append({
                "tipo": "Inicio de sesión registrado",
                "fecha": acc.fecha.isoformat() if acc.fecha else None,
                "metodo": acc.metodo,
                "navegador": acc.navegador,
                "direccion_ip": acc.direccion_ip,
            })

    elif rol in ("admin_empresa", "reclutador_empresa"):
        row = (await db.execute(
            select(ReclutadorEmpresa, Empresa)
            .join(Empresa, ReclutadorEmpresa.id_empresa == Empresa.id)
            .where(ReclutadorEmpresa.id_usuario == user.id)
        )).first()
        if row:
            rec, emp = row
            perfil_datos = {
                "nombre_completo": rec.nombre_completo,
                "cargo": rec.cargo,
                "correo_corporativo": rec.correo_corporativo,
                "telefono": rec.telefono,
                "empresa_razon_social": emp.razon_social,
                "empresa_nombre_comercial": emp.nombre_comercial,
                "nit_empresa": emp.nit,
                "sector_economico": emp.sector_economico,
                "estado_empresa": str(emp.estado),
            }
            docs_emp = (await db.execute(
                select(DocumentoEmpresa).where(DocumentoEmpresa.id_empresa == emp.id)
            )).scalars().all()
            for d in docs_emp:
                documentos_datos.append({
                    "tipo": d.tipo_documento,
                    "nombre_archivo": d.nombre_archivo,
                    "estado": d.estado,
                    "subido_en": d.subido_en.isoformat() if d.subido_en else None,
                })
            vacs = (await db.execute(
                select(Vacante).where(Vacante.id_reclutador_responsable == rec.id).order_by(Vacante.creado_en.desc()).limit(25)
            )).scalars().all()
            for v in vacs:
                actividad_datos.append({
                    "tipo": "Vacante gestionada",
                    "codigo_vacante": v.codigo_vacante,
                    "titulo": v.titulo,
                    "estado": str(v.estado),
                    "total_postulantes": v.total_postulantes,
                })
    else:
        perfil_datos = {
            "nombre": claims.get("nombre") or "Super Administrador Vincula",
            "rol": rol,
            "alcance": "Auditoría y administración general de la plataforma Vincula",
        }

    return {
        "generado_en": datetime.now(timezone.utc).isoformat(),
        "titular": {
            "correo": user.correo_electronico,
            "rol": rol,
            "nombre": perfil_datos.get("nombre_completo") or perfil_datos.get("nombre") or claims.get("nombre") or user.correo_electronico,
        },
        "tratamiento_resumen": [
            {
                "id": "cuenta",
                "titulo": "Cuenta y credenciales de acceso",
                "que_tenemos": "Tu correo de inicio de sesión, rol asignado, estado de cuenta, fecha de último acceso y vínculo con Google OAuth 2.0 (tu contraseña se guarda únicamente como hash criptográfico bcrypt irreversible).",
                "que_hacemos": "Autenticar tu identidad de forma segura, proteger el acceso a tu sesión y enviarte códigos de recuperación o alertas de seguridad.",
                "datos": cuenta_datos,
            },
            {
                "id": "perfil",
                "titulo": "Perfil e información de rol",
                "que_tenemos": "Tus datos de identificación, contacto, ubicación, biografía, preferencias de empleabilidad o vínculo con tu institución/empresa.",
                "que_hacemos": "Conectar tu perfil con las funciones de tu rol (postulación a vacantes, gestión curricular IES o reclutamiento corporativo) sin comercializar ni ceder tus datos a terceros ajenos al ecosistema.",
                "datos": perfil_datos,
            },
            {
                "id": "documentos",
                "titulo": "Expediente académico, documentos y soportes",
                "que_tenemos": "Registros de grado, actas, Sello Digital SHA-256, hojas de vida en PDF o soportes jurídicos cargados en tu cuenta.",
                "que_hacemos": "Permitir la validación oficial de títulos por parte de la IES y presentar tus soportes verificados en los procesos de selección a los que te postules.",
                "datos": documentos_datos,
            },
            {
                "id": "actividad",
                "titulo": "Postulaciones, vacantes y actividad en plataforma",
                "que_tenemos": "Historial de postulaciones en el embudo ATS, afinidad con vacantes, convocatorias gestionadas o registros de acceso.",
                "que_hacemos": "Brindarte trazabilidad en tiempo real sobre tus procesos de selección, calcular recomendaciones de carrera con IA y generar métricas agregadas de empleabilidad institucional.",
                "datos": actividad_datos,
            },
        ],
    }


@router.delete("/eliminar-cuenta")
@router.post("/eliminar-cuenta")
async def delete_my_account(
    payload: AccountDeletionRequest,
    claims=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Ejecuta la solicitud de supresión de datos personales y eliminación definitiva de la cuenta
    del usuario autenticado tras verificar su contraseña actual y palabra de confirmación.
    """
    user = await current_account(claims, db)
    check_password(user, payload.contrasena_actual)

    if payload.confirmacion.strip().upper() != "ELIMINAR":
        raise HTTPException(400, "Escribe la palabra ELIMINAR para confirmar la supresión definitiva de tu cuenta.")

    if str(user.rol) == "superadmin_vincula":
        raise HTTPException(400, "La cuenta de Superadministrador principal de la plataforma no puede eliminarse.")

    # Limpiar referencias con ON DELETE RESTRICT antes de eliminar el usuario en cascada
    await db.execute(
        delete(HistorialFasePostulacion).where(HistorialFasePostulacion.cambiado_por_usuario == user.id)
    )
    try:
        await db.execute(
            text("DELETE FROM auditorias_superadmin WHERE id_auditor = :uid"),
            {"uid": user.id},
        )
        await db.execute(
            text("DELETE FROM bitacora_actividad_empresa WHERE id_usuario = :uid"),
            {"uid": user.id},
        )
    except Exception:
        pass

    # Si es reclutador/admin_empresa y tiene vacantes con ON DELETE RESTRICT sobre reclutadores_empresa
    rec = (await db.execute(select(ReclutadorEmpresa).where(ReclutadorEmpresa.id_usuario == user.id))).scalar_one_or_none()
    if rec:
        await db.execute(delete(Vacante).where(Vacante.id_reclutador_responsable == rec.id))

    # Si es egresado, decrementar contadores de vacantes donde tenía postulaciones activas
    egr = (await db.execute(select(Egresado).where(Egresado.id_usuario == user.id))).scalar_one_or_none()
    if egr:
        posts = (await db.execute(select(Postulacion).where(Postulacion.id_egresado == egr.id))).scalars().all()
        for p in posts:
            if getattr(p, "vacante", None):
                p.vacante.total_postulantes = max(0, (p.vacante.total_postulantes or 1) - 1)

    await db.delete(user)
    await db.commit()

    return {
        "eliminado": True,
        "mensaje": "Tu cuenta y tus datos personales han sido suprimidos exitosamente de Vincula.",
    }
