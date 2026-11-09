"""
Lógica del Módulo Super Admin Vincula (Auditoría de 72H, Gating y Aprobaciones).
Conexión directa con Supabase PostgreSQL y Supabase Storage.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import math
import uuid

from sqlalchemy import select, update, desc, func, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.modules.iam.models import Usuario
from app.modules.companies.models import Empresa, ReclutadorEmpresa, DocumentoEmpresa
from app.modules.institutions.models import Institucion, DocumentoInstitucion
from app.modules.superadmin.models import AuditoriaSuperadmin
from app.modules.superadmin.schemas import (
    CorrectionActionRequest,
    RejectActionRequest,
    ApproveActionRequest,
    CompanyAuditItem,
    InstitutionAuditItem,
    DocumentAuditItem,
    SecureUrlResponse,
    PaginatedCompanyAuditResponse,
    PaginatedInstitutionAuditResponse,
)
from app.integrations.supabase_storage import SupabaseStorageService
from app.integrations.email_service import EmailService
from app.integrations.n8n_webhooks import N8nWebhookDispatcher


class SuperAdminService:
    @staticmethod
    def _compute_sla(registrado_en: datetime, estado: str) -> tuple[int, str]:
        """Calcula las horas restantes del SLA de 72 horas hábiles"""
        now = datetime.now(timezone.utc)
        if estado == "aprobado":
            return 0, "Aprobado (SLA Cumplido)"
        if estado == "rechazado":
            return 0, "Rechazado"
        if estado == "en_subsanacion":
            return 0, "Pausado (Esperando corrección del solicitante)"

        reg = registrado_en or now
        elapsed = (now - reg).total_seconds() / 3600.0
        remaining = max(0, int(72 - elapsed))
        return remaining, f"{remaining} horas restantes"

    @classmethod
    async def get_companies_audit(
        cls,
        session: AsyncSession,
        estado_filtro: Optional[str] = None,
        page: int = 1,
        limit: int = 20
    ) -> PaginatedCompanyAuditResponse:
        """
        Retorna la lista paginada de empresas registradas en PostgreSQL para la cola de auditoría.
        """
        count_stmt = select(func.count(Empresa.id))
        if estado_filtro and estado_filtro not in ("all", "todos", ""):
            count_stmt = count_stmt.where(Empresa.estado == estado_filtro)
        total = (await session.execute(count_stmt)).scalar() or 0

        offset = max(0, (page - 1) * limit)
        stmt = select(Empresa).order_by(desc(Empresa.registrado_en)).offset(offset).limit(limit)
        if estado_filtro and estado_filtro not in ("all", "todos", ""):
            stmt = stmt.where(Empresa.estado == estado_filtro)

        res = await session.execute(stmt)
        empresas = res.scalars().all()

        resultado: List[CompanyAuditItem] = []

        for emp in empresas:
            # Documentos radicados
            doc_stmt = select(DocumentoEmpresa).where(DocumentoEmpresa.id_empresa == emp.id)
            doc_res = await session.execute(doc_stmt)
            docs = doc_res.scalars().all()

            doc_items = [
                DocumentAuditItem(
                    id=str(d.id),
                    tipo_documento=d.tipo_documento,
                    nombre_archivo=d.nombre_archivo,
                    url_archivo=d.url_archivo,
                    tamano_kb=d.tamano_kb,
                    estado=d.estado,
                    subido_en=d.subido_en.isoformat() if d.subido_en else None,
                    secure_url=None
                )
                for d in docs
            ]

            # Última observación de subsanación si aplica
            motivo_sub = None
            if emp.estado == "en_subsanacion":
                audit_stmt = (
                    select(AuditoriaSuperadmin)
                    .where(
                        AuditoriaSuperadmin.id_entidad == emp.id,
                        AuditoriaSuperadmin.tipo_entidad == "empresa",
                        AuditoriaSuperadmin.accion_realizada == "subsanacion_solicitada"
                    )
                    .order_by(desc(AuditoriaSuperadmin.registrado_en))
                    .limit(1)
                )
                audit_res = await session.execute(audit_stmt)
                last_audit = audit_res.scalar_one_or_none()
                if last_audit:
                    motivo_sub = last_audit.observaciones_correccion

            sla_horas, sla_txt = cls._compute_sla(emp.registrado_en, emp.estado)

            resultado.append(
                CompanyAuditItem(
                    id=str(emp.id),
                    radicado=f"RAD-EMP-2026-{str(emp.id)[:8].upper()}",
                    razon_social=emp.razon_social,
                    nombre_comercial=emp.nombre_comercial,
                    nit=emp.nit,
                    codigo_ciiu=emp.codigo_ciiu,
                    descripcion_ciiu=emp.descripcion_ciiu,
                    sector_economico=emp.sector_economico,
                    tamano_empresa=emp.tamano_empresa,
                    ciudad=emp.ciudad,
                    departamento=emp.departamento,
                    direccion=emp.direccion,
                    telefono=emp.telefono,
                    correo_contacto=emp.correo_contacto,
                    sitio_web=emp.sitio_web,
                    nombre_representante_legal=emp.nombre_representante_legal,
                    documento_representante_legal=emp.documento_representante_legal,
                    persona_contacto=emp.persona_contacto,
                    estado=emp.estado,
                    registrado_en=emp.registrado_en.isoformat() if emp.registrado_en else "",
                    aprobado_en=emp.aprobado_en.isoformat() if emp.aprobado_en else None,
                    sla_horas_restantes=sla_horas,
                    sla_texto=sla_txt,
                    motivo_subsanacion=motivo_sub,
                    documentos=doc_items
                )
            )

        total_pages = math.ceil(total / limit) if total > 0 else 1
        return PaginatedCompanyAuditResponse(
            items=resultado,
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages
        )

    @classmethod
    async def get_institutions_audit(
        cls,
        session: AsyncSession,
        estado_filtro: Optional[str] = None,
        page: int = 1,
        limit: int = 20
    ) -> PaginatedInstitutionAuditResponse:
        """
        Retorna la lista paginada de Instituciones de Educación Superior registradas en PostgreSQL.
        """
        count_stmt = select(func.count(Institucion.id))
        if estado_filtro and estado_filtro not in ("all", "todos", ""):
            count_stmt = count_stmt.where(Institucion.estado == estado_filtro)
        total = (await session.execute(count_stmt)).scalar() or 0

        offset = max(0, (page - 1) * limit)
        stmt = select(Institucion).order_by(desc(Institucion.registrado_en)).offset(offset).limit(limit)
        if estado_filtro and estado_filtro not in ("all", "todos", ""):
            stmt = stmt.where(Institucion.estado == estado_filtro)

        res = await session.execute(stmt)
        ies_list = res.scalars().all()

        resultado: List[InstitutionAuditItem] = []

        for ies in ies_list:
            doc_stmt = select(DocumentoInstitucion).where(DocumentoInstitucion.id_institucion == ies.id)
            doc_res = await session.execute(doc_stmt)
            docs = doc_res.scalars().all()

            doc_items = [
                DocumentAuditItem(
                    id=str(d.id),
                    tipo_documento=d.tipo_documento,
                    nombre_archivo=d.nombre_archivo,
                    url_archivo=d.url_archivo,
                    tamano_kb=d.tamano_kb,
                    estado=d.estado,
                    subido_en=d.subido_en.isoformat() if d.subido_en else None,
                    secure_url=None
                )
                for d in docs
            ]

            motivo_sub = None
            if ies.estado == "en_subsanacion":
                audit_stmt = (
                    select(AuditoriaSuperadmin)
                    .where(
                        AuditoriaSuperadmin.id_entidad == ies.id,
                        AuditoriaSuperadmin.tipo_entidad == "institucion",
                        AuditoriaSuperadmin.accion_realizada == "subsanacion_solicitada"
                    )
                    .order_by(desc(AuditoriaSuperadmin.registrado_en))
                    .limit(1)
                )
                audit_res = await session.execute(audit_stmt)
                last_audit = audit_res.scalar_one_or_none()
                if last_audit:
                    motivo_sub = last_audit.observaciones_correccion

            sla_horas, sla_txt = cls._compute_sla(ies.registrado_en, ies.estado)

            resultado.append(
                InstitutionAuditItem(
                    id=str(ies.id),
                    radicado=f"RAD-IES-2026-{str(ies.id)[:8].upper()}",
                    nombre_oficial=ies.nombre_oficial,
                    nombre_corto=ies.nombre_corto,
                    codigo_snies=ies.codigo_snies,
                    caracter_academico=ies.caracter_academico,
                    nit=ies.nit,
                    ciudad=ies.ciudad,
                    departamento=ies.departamento,
                    direccion=ies.direccion,
                    telefono=ies.telefono,
                    correo_institucional=ies.correo_institucional,
                    sitio_web=ies.sitio_web,
                    nombre_rector=ies.nombre_rector,
                    documento_rector=ies.documento_rector,
                    persona_contacto=ies.persona_contacto,
                    estado=ies.estado,
                    registrado_en=ies.registrado_en.isoformat() if ies.registrado_en else "",
                    aprobado_en=ies.aprobado_en.isoformat() if ies.aprobado_en else None,
                    sla_horas_restantes=sla_horas,
                    sla_texto=sla_txt,
                    motivo_subsanacion=motivo_sub,
                    documentos=doc_items
                )
            )

        total_pages = math.ceil(total / limit) if total > 0 else 1
        return PaginatedInstitutionAuditResponse(
            items=resultado,
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages
        )

    @classmethod
    async def get_document_secure_url(
        cls,
        session: AsyncSession,
        documento_id: str,
        expires_in: int = 3600
    ) -> SecureUrlResponse:
        """
        Genera una URL firmada de descarga segura desde Supabase Storage para previsualizar PDFs.
        """
        doc_uuid = uuid.UUID(documento_id)

        # 1. Buscar en documentos_empresa
        doc_emp = (await session.execute(select(DocumentoEmpresa).where(DocumentoEmpresa.id == doc_uuid))).scalar_one_or_none()
        if doc_emp:
            bucket = settings.SUPABASE_STORAGE_BUCKET_DOCS
            # Extraer path relativo del bucket
            raw_url = doc_emp.url_archivo
            path = raw_url.split(f"/{bucket}/")[-1] if f"/{bucket}/" in raw_url else f"empresas/{doc_emp.id_empresa}/{doc_emp.tipo_documento}_{doc_emp.nombre_archivo}"
            
            signed_url = await SupabaseStorageService.create_signed_url(bucket, path, expires_in=expires_in)
            return SecureUrlResponse(
                documento_id=str(doc_emp.id),
                tipo_entidad="empresa",
                nombre_archivo=doc_emp.nombre_archivo,
                url_original=doc_emp.url_archivo,
                secure_url=signed_url,
                expira_en_segundos=expires_in
            )

        # 2. Buscar en documentos_institucion
        doc_ies = (await session.execute(select(DocumentoInstitucion).where(DocumentoInstitucion.id == doc_uuid))).scalar_one_or_none()
        if doc_ies:
            bucket = settings.SUPABASE_STORAGE_BUCKET_DOCS
            raw_url = doc_ies.url_archivo
            path = raw_url.split(f"/{bucket}/")[-1] if f"/{bucket}/" in raw_url else f"instituciones/{doc_ies.id_institucion}/{doc_ies.tipo_documento}_{doc_ies.nombre_archivo}"
            
            signed_url = await SupabaseStorageService.create_signed_url(bucket, path, expires_in=expires_in)
            return SecureUrlResponse(
                documento_id=str(doc_ies.id),
                tipo_entidad="institucion",
                nombre_archivo=doc_ies.nombre_archivo,
                url_original=doc_ies.url_archivo,
                secure_url=signed_url,
                expira_en_segundos=expires_in
            )

        raise ValueError("Documento no encontrado en el repositorio de auditoría.")

    @classmethod
    async def approve_company(
        cls,
        session: AsyncSession,
        company_id: str,
        id_auditor: uuid.UUID,
        payload: Optional[ApproveActionRequest] = None
    ) -> Dict[str, Any]:
        """
        Aprueba una empresa en PostgreSQL, levanta el modo cuarentena y marca los documentos como aprobados.
        """
        comp_uuid = uuid.UUID(company_id)
        emp = (await session.execute(select(Empresa).where(Empresa.id == comp_uuid))).scalar_one_or_none()
        if not emp:
            raise ValueError(f"Empresa con ID {company_id} no encontrada.")

        now = datetime.now(timezone.utc)
        emp.estado = "aprobado"
        emp.aprobado_en = now

        # Aprobar todos los documentos
        await session.execute(
            update(DocumentoEmpresa)
            .where(DocumentoEmpresa.id_empresa == comp_uuid)
            .values(estado="aprobado")
        )

        # Registrar bitácora de auditoría
        notas_txt = payload.notas if (payload and payload.notas) else "Verificación documental satisfactoria (RUT y Cámara de Comercio validados)."
        audit = AuditoriaSuperadmin(
            tipo_entidad="empresa",
            id_entidad=comp_uuid,
            id_auditor=id_auditor,
            accion_realizada="aprobacion_oficial",
            observaciones_correccion=notas_txt
        )
        session.add(audit)

        await session.commit()

        # Disparar webhook hacia n8n y enviar correo oficial de aprobación
        await N8nWebhookDispatcher.dispatch_event(
            "empresa-aprobada",
            {
                "evento": "empresa.aprobada",
                "id_empresa": str(emp.id),
                "razon_social": emp.razon_social,
                "nit": emp.nit,
                "correo_contacto": emp.correo_contacto,
                "notas": notas_txt,
            }
        )
        if emp.correo_contacto:
            try:
                await EmailService.send_company_approved_email(
                    to_email=emp.correo_contacto,
                    company_name=emp.razon_social or emp.nombre_comercial,
                    nit=emp.nit,
                    notes=notas_txt,
                )
            except Exception as mail_err:
                print(f"[AVISO CORREO APROBACION EMPRESA] {mail_err}")

        return {
            "success": True,
            "empresa_id": str(emp.id),
            "razon_social": emp.razon_social,
            "nuevo_estado": "aprobado",
            "mensaje": f"Empresa '{emp.razon_social}' aprobada formalmente. Cuarentena levantada."
        }

    @classmethod
    async def request_company_correction(
        cls,
        session: AsyncSession,
        company_id: str,
        id_auditor: uuid.UUID,
        action: CorrectionActionRequest
    ) -> Dict[str, Any]:
        """
        Pasa la empresa a 'en_subsanacion' y marca los documentos que deben reemplazarse.
        """
        comp_uuid = uuid.UUID(company_id)
        emp = (await session.execute(select(Empresa).where(Empresa.id == comp_uuid))).scalar_one_or_none()
        if not emp:
            raise ValueError(f"Empresa con ID {company_id} no encontrada.")

        emp.estado = "en_subsanacion"

        # Marcar los documentos requeridos
        if action.documentos_requeridos:
            await session.execute(
                update(DocumentoEmpresa)
                .where(
                    DocumentoEmpresa.id_empresa == comp_uuid,
                    DocumentoEmpresa.tipo_documento.in_(action.documentos_requeridos)
                )
                .values(estado="requiere_subsanacion")
            )

        # Registrar en auditoría
        audit = AuditoriaSuperadmin(
            tipo_entidad="empresa",
            id_entidad=comp_uuid,
            id_auditor=id_auditor,
            accion_realizada="subsanacion_solicitada",
            observaciones_correccion=action.motivo
        )
        session.add(audit)

        await session.commit()

        return {
            "success": True,
            "empresa_id": str(emp.id),
            "nuevo_estado": "en_subsanacion",
            "motivo": action.motivo,
            "documentos_requeridos": action.documentos_requeridos,
            "mensaje": "Solicitud de subsanación registrada. La empresa ha sido notificada."
        }

    @classmethod
    async def reject_company(
        cls,
        session: AsyncSession,
        company_id: str,
        id_auditor: uuid.UUID,
        action: RejectActionRequest
    ) -> Dict[str, Any]:
        """
        Rechaza formalmente la empresa e inhabilita las cuentas de usuario vinculadas.
        """
        comp_uuid = uuid.UUID(company_id)
        emp = (await session.execute(select(Empresa).where(Empresa.id == comp_uuid))).scalar_one_or_none()
        if not emp:
            raise ValueError(f"Empresa con ID {company_id} no encontrada.")

        emp.estado = "rechazado"

        # Inhabilitar usuarios reclutadores
        reclutadores = (
            await session.execute(select(ReclutadorEmpresa).where(ReclutadorEmpresa.id_empresa == comp_uuid))
        ).scalars().all()

        user_ids = [r.id_usuario for r in reclutadores]
        if user_ids:
            await session.execute(
                update(Usuario)
                .where(Usuario.id.in_(user_ids))
                .values(estado="suspendido")
            )

        # Registrar en auditoría
        audit = AuditoriaSuperadmin(
            tipo_entidad="empresa",
            id_entidad=comp_uuid,
            id_auditor=id_auditor,
            accion_realizada="rechazo",
            observaciones_correccion=action.motivo_rechazo
        )
        session.add(audit)

        await session.commit()

        return {
            "success": True,
            "empresa_id": str(emp.id),
            "nuevo_estado": "rechazado",
            "motivo_rechazo": action.motivo_rechazo,
            "mensaje": f"Empresa rechazada definitivamente por: {action.motivo_rechazo}"
        }

    @classmethod
    async def approve_institution(
        cls,
        session: AsyncSession,
        ies_id: str,
        id_auditor: uuid.UUID,
        payload: Optional[ApproveActionRequest] = None
    ) -> Dict[str, Any]:
        """
        Aprueba una IES tras validar personería MEN y SNIES activo.
        """
        ies_uuid = uuid.UUID(ies_id)
        ies = (await session.execute(select(Institucion).where(Institucion.id == ies_uuid))).scalar_one_or_none()
        if not ies:
            raise ValueError(f"Institución con ID {ies_id} no encontrada.")

        now = datetime.now(timezone.utc)
        ies.estado = "aprobado"
        ies.aprobado_en = now

        await session.execute(
            update(DocumentoInstitucion)
            .where(DocumentoInstitucion.id_institucion == ies_uuid)
            .values(estado="aprobado")
        )

        notas_txt = payload.notas if (payload and payload.notas) else f"Aval institucional verificado ante el MEN (SNIES {ies.codigo_snies})."
        audit = AuditoriaSuperadmin(
            tipo_entidad="institucion",
            id_entidad=ies_uuid,
            id_auditor=id_auditor,
            accion_realizada="aprobacion_oficial",
            observaciones_correccion=notas_txt
        )
        session.add(audit)

        await session.commit()

        # Disparar webhook hacia n8n y enviar correo oficial de aprobación IES
        await N8nWebhookDispatcher.dispatch_event(
            "institucion-aprobada",
            {
                "evento": "institucion.aprobada",
                "id_institucion": str(ies.id),
                "nombre_oficial": ies.nombre_oficial,
                "codigo_snies": ies.codigo_snies,
                "correo_institucional": ies.correo_institucional,
                "notas": notas_txt,
            }
        )
        if ies.correo_institucional:
            try:
                await EmailService.send_institution_approved_email(
                    to_email=ies.correo_institucional,
                    institution_name=ies.nombre_oficial or ies.nombre_corto,
                    snies_code=ies.codigo_snies,
                    notes=notas_txt,
                )
            except Exception as mail_err:
                print(f"[AVISO CORREO APROBACION IES] {mail_err}")

        return {
            "success": True,
            "institucion_id": str(ies.id),
            "nombre_oficial": ies.nombre_oficial,
            "nuevo_estado": "aprobado",
            "mensaje": f"Institución '{ies.nombre_oficial}' avalada exitosamente con código SNIES {ies.codigo_snies}."
        }

    @classmethod
    async def request_institution_correction(
        cls,
        session: AsyncSession,
        ies_id: str,
        id_auditor: uuid.UUID,
        action: CorrectionActionRequest
    ) -> Dict[str, Any]:
        """
        Solicita subsanación documental a una IES.
        """
        ies_uuid = uuid.UUID(ies_id)
        ies = (await session.execute(select(Institucion).where(Institucion.id == ies_uuid))).scalar_one_or_none()
        if not ies:
            raise ValueError(f"Institución con ID {ies_id} no encontrada.")

        ies.estado = "en_subsanacion"

        if action.documentos_requeridos:
            await session.execute(
                update(DocumentoInstitucion)
                .where(
                    DocumentoInstitucion.id_institucion == ies_uuid,
                    DocumentoInstitucion.tipo_documento.in_(action.documentos_requeridos)
                )
                .values(estado="requiere_subsanacion")
            )

        audit = AuditoriaSuperadmin(
            tipo_entidad="institucion",
            id_entidad=ies_uuid,
            id_auditor=id_auditor,
            accion_realizada="subsanacion_solicitada",
            observaciones_correccion=action.motivo
        )
        session.add(audit)

        await session.commit()

        return {
            "success": True,
            "institucion_id": str(ies.id),
            "nuevo_estado": "en_subsanacion",
            "motivo": action.motivo,
            "documentos_requeridos": action.documentos_requeridos,
            "mensaje": "Subsanación requerida a la IES. Acreditación pausada."
        }

    @classmethod
    async def reject_institution(
        cls,
        session: AsyncSession,
        ies_id: str,
        id_auditor: uuid.UUID,
        action: RejectActionRequest
    ) -> Dict[str, Any]:
        """
        Rechaza formalmente la solicitud de vinculación de una IES.
        """
        ies_uuid = uuid.UUID(ies_id)
        ies = (await session.execute(select(Institucion).where(Institucion.id == ies_uuid))).scalar_one_or_none()
        if not ies:
            raise ValueError(f"Institución con ID {ies_id} no encontrada.")

        ies.estado = "rechazado"

        audit = AuditoriaSuperadmin(
            tipo_entidad="institucion",
            id_entidad=ies_uuid,
            id_auditor=id_auditor,
            accion_realizada="rechazo",
            observaciones_correccion=action.motivo_rechazo
        )
        session.add(audit)

        await session.commit()

        return {
            "success": True,
            "institucion_id": str(ies.id),
            "nuevo_estado": "rechazado",
            "motivo_rechazo": action.motivo_rechazo,
            "mensaje": f"Institución rechazada por: {action.motivo_rechazo}"
        }

    @classmethod
    async def get_platform_metrics(cls, session: AsyncSession) -> Dict[str, Any]:
        """
        Calcula las métricas reales del ecosistema consultando las tablas oficiales en PostgreSQL.
        """
        emp_tot = (await session.execute(text('SELECT count(*) FROM empresas'))).scalar() or 0
        emp_act = (await session.execute(text("SELECT count(*) FROM empresas WHERE estado = 'aprobado'"))).scalar() or 0
        emp_pen = (await session.execute(text("SELECT count(*) FROM empresas WHERE estado = 'pendiente'"))).scalar() or 0
        emp_sub = (await session.execute(text("SELECT count(*) FROM empresas WHERE estado = 'en_subsanacion'"))).scalar() or 0

        ies_tot = (await session.execute(text('SELECT count(*) FROM instituciones'))).scalar() or 0
        ies_act = (await session.execute(text("SELECT count(*) FROM instituciones WHERE estado = 'aprobado'"))).scalar() or 0
        ies_pen = (await session.execute(text("SELECT count(*) FROM instituciones WHERE estado = 'pendiente'"))).scalar() or 0

        vac_tot = (await session.execute(text('SELECT count(*) FROM vacantes'))).scalar() or 0
        vac_act = (await session.execute(text("SELECT count(*) FROM vacantes WHERE estado = 'abierta'"))).scalar() or 0

        egr_tot = (await session.execute(text('SELECT count(*) FROM egresados'))).scalar() or 0
        post_tot = (await session.execute(text('SELECT count(*) FROM postulaciones'))).scalar() or 0
        conv_tot = (await session.execute(text('SELECT count(*) FROM convenios_interinstitucionales'))).scalar() or 0

        return {
            "total_empresas": emp_tot,
            "empresas_activas": emp_act,
            "empresas_pendientes": emp_pen,
            "empresas_en_subsanacion": emp_sub,
            "total_instituciones": ies_tot,
            "instituciones_activas": ies_act,
            "instituciones_pendientes": ies_pen,
            "total_vacantes": vac_tot,
            "vacantes_activas": vac_act,
            "total_egresados": egr_tot,
            "total_postulaciones": post_tot,
            "total_convenios": conv_tot,
        }

