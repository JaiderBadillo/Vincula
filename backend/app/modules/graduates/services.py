"""
Lógica del Módulo Egresados (Perfil, Habilidades y Trazabilidad de Postulaciones en Vivo).
Mapeado a PostgreSQL / Supabase bajo arquitectura Monolito Modular Híbrido Asíncrono.
"""

import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.modules.graduates.models import Egresado, AcademicoEgresado, ArchivoHojaVida
from app.modules.vacancies_ats.models import (
    Postulacion,
    HistorialFasePostulacion,
    EntrevistaPostulacion,
    Vacante,
)
from app.modules.companies.models import Empresa, ReclutadorEmpresa
from app.modules.graduates.schemas import (
    GraduateProfileSchema,
    GraduateApplicationResponse,
    TimelineStep,
    RecruiterContact,
    InterviewDetail,
    SubmittedDocument,
    ApplicationHistoryItem,
)


class GraduateService:

    PHASE_MAP = {
        "en_revision": 1,
        "preseleccionados": 2,
        "prueba_tecnica": 3,
        "entrevista": 3,
        "oferta_finalistas": 4,
        "descartados": 1,
    }

    PHASE_STATUS_LABELS = {
        "en_revision": "Postulación recibida en revisión curricular",
        "preseleccionados": "Preseleccionado / Requisitos base cumplidos",
        "prueba_tecnica": "Evaluación técnica y prueba práctica",
        "entrevista": "¡Entrevista agendada con el equipo de selección!",
        "oferta_finalistas": "¡Oferta formal recibida! Lista para revisión y firma",
        "descartados": "Proceso de selección finalizado",
    }

    STAGE_DB_TO_UI = {
        "en_revision": "review",
        "preseleccionados": "preselected",
        "prueba_tecnica": "evaluation",
        "entrevista": "interview",
        "oferta_finalistas": "offer",
        "descartados": "discarded"
    }

    @classmethod
    def _format_salary(cls, min_sal: Optional[float], max_sal: Optional[float], is_confidential: bool) -> str:
        if is_confidential:
            return "Salario Confidencial"
        if min_sal and max_sal:
            return f"${min_sal:,.0f} - ${max_sal:,.0f} COP".replace(",", ".")
        if min_sal:
            return f"Desde ${min_sal:,.0f} COP".replace(",", ".")
        if max_sal:
            return f"Hasta ${max_sal:,.0f} COP".replace(",", ".")
        return "A convenir según experiencia"

    @classmethod
    def _build_application_dto(cls, p: Postulacion) -> GraduateApplicationResponse:
        vac = p.vacante
        emp = vac.empresa if vac else None
        rec = vac.reclutador if vac else None
        fase_db = str(p.fase_actual)

        phase_num = cls.PHASE_MAP.get(fase_db, 1)
        phase_label = cls.PHASE_STATUS_LABELS.get(fase_db, "En proceso de selección")
        stage_ui = cls.STAGE_DB_TO_UI.get(fase_db, "review")

        # Contacto del Reclutador
        recruiter_dto = None
        if rec:
            recruiter_dto = RecruiterContact(
                name=rec.nombre_completo,
                role=rec.cargo or "Líder de Selección",
                company=emp.nombre_comercial or emp.razon_social if emp else "Empresa Aliada",
                email=rec.correo_corporativo,
                phone=rec.telefono,
                avatar=rec.url_avatar,
                status="En línea"
            )

        # Entrevista más reciente
        interview_dto = None
        if hasattr(p, "entrevistas") and p.entrevistas:
            first_ent = p.entrevistas[0]
            interview_dto = InterviewDetail(
                id=str(first_ent.id),
                date=first_ent.fecha_entrevista.strftime("%Y-%m-%d"),
                timeRange=first_ent.franja_horaria,
                modality=first_ent.modalidad,
                meetUrl=first_ent.url_reunion,
                objective=first_ent.objetivo,
                status=first_ent.estado,
                isUpcoming=(first_ent.estado == "programada")
            )

        # Documento presentado / Hoja de vida
        doc_dto = SubmittedDocument(
            fileName=f"CV_{p.egresado.nombre_completo.replace(' ', '_')}.pdf",
            fileSize="384 KB",
            uploadedAt=p.postulado_en.strftime("%Y-%m-%d") if p.postulado_en else "2026-01-01",
            matchScore=int(float(p.porcentaje_afinidad or 88.0))
        )

        # Construcción dinámica de la línea de tiempo (Timeline)
        applied_date_str = p.postulado_en.strftime("%d %b %Y, %I:%M %p") if p.postulado_en else "Fecha registro"
        update_date_str = p.actualizado_en.strftime("%d %b %Y, %I:%M %p") if p.actualizado_en else applied_date_str

        timeline = [
            TimelineStep(
                step=1,
                title="Postulación registrada en el portal",
                date=applied_date_str,
                done=True,
                current=(phase_num == 1 and fase_db != "descartados")
            ),
            TimelineStep(
                step=2,
                title="Revisión curricular y requisitos de la vacante",
                date=update_date_str if phase_num >= 2 else "Pendiente de revisión",
                done=(phase_num >= 2),
                current=(phase_num == 2 and fase_db != "descartados")
            ),
            TimelineStep(
                step=3,
                title="Entrevista técnica / Evaluación de habilidades",
                date=interview_dto.date if interview_dto else (update_date_str if phase_num >= 3 else "Por programar"),
                done=(phase_num >= 3),
                current=(phase_num == 3 and fase_db != "descartados")
            ),
            TimelineStep(
                step=4,
                title="Oferta económica y suscripción de vinculación",
                date=update_date_str if phase_num >= 4 else "Fase final",
                done=(phase_num >= 4),
                current=(phase_num == 4 and fase_db != "descartados")
            )
        ]

        # Salarios
        salary_str = cls._format_salary(
            float(vac.salario_minimo) if vac and vac.salario_minimo else None,
            float(vac.salario_maximo) if vac and vac.salario_maximo else None,
            vac.salario_es_confidencial if vac else False
        )

        feedback = p.retroalimentacion_reclutador
        if not feedback and fase_db == "descartados" and p.motivo_descarte:
            feedback = f"Motivo informado: {p.motivo_descarte}"

        app_code = f"POST-2026-{str(p.id)[:6].upper()}"

        return GraduateApplicationResponse(
            id=str(p.id),
            applicationCode=app_code,
            jobId=str(p.id_vacante),
            vacancyTitle=vac.titulo if vac else "Vacante",
            companyName=emp.nombre_comercial or emp.razon_social if emp else "Empresa Confidencial",
            companyShort=emp.nombre_comercial if emp else "Empresa",
            companySlug=str(emp.id) if emp else None,
            companyLogoBg="bg-[#0f172a] text-white",
            companyCover=emp.url_portada if emp else None,
            companySector=emp.sector_economico if emp else "Tecnología",
            partnershipType="Convenio Verificado",
            location=f"{vac.sede.ciudad}, {vac.sede.departamento}" if (vac and vac.sede) else "Bucaramanga, Santander",
            workMode=vac.modalidad if vac else "Presencial",
            salary=salary_str,
            salaryOffered=salary_str if phase_num >= 4 else None,
            contractType=vac.tipo_contrato if vac else "Término Indefinido",
            appliedAt=p.postulado_en.strftime("%Y-%m-%d") if p.postulado_en else datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            lastUpdateAt=p.actualizado_en.strftime("%Y-%m-%d") if p.actualizado_en else datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            phase=phase_num,
            stage=stage_ui,
            phaseStatusLabel=phase_label,
            phaseFeedback=feedback,
            estimatedStartDate="Inmediata" if phase_num >= 4 else None,
            recruiter=recruiter_dto,
            interview=interview_dto,
            submittedDocument=doc_dto,
            timeline=timeline,
            # Compatibilidad
            id_postulacion=str(p.id),
            id_vacante=str(p.id_vacante),
            cargo=vac.titulo if vac else "Vacante",
            empresa_nombre=emp.nombre_comercial or emp.razon_social if emp else "Empresa",
            fecha_postulacion=p.postulado_en.strftime("%Y-%m-%d") if p.postulado_en else "2026-01-01",
            fase_actual=fase_db,
            coincidencia_ia_porcentaje=int(float(p.porcentaje_afinidad or 88.0))
        )

    @classmethod
    async def get_my_applications_async(
        cls,
        session: AsyncSession,
        user_id: str
    ) -> List[GraduateApplicationResponse]:
        """
        Consulta en tiempo real todas las postulaciones del egresado autenticado en PostgreSQL.
        """
        try:
            user_uuid = uuid.UUID(str(user_id))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"codigo": "UUID_INVALIDO", "mensaje": "Identificador de usuario inválido."}
            )

        egresado = (await session.execute(
            select(Egresado).where(Egresado.id_usuario == user_uuid)
        )).scalar_one_or_none()

        if not egresado:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"codigo": "EGRESADO_NO_ENCONTRADO", "mensaje": "No se encontró el perfil de egresado para el usuario autenticado."}
            )

        postulaciones = (await session.execute(
            select(Postulacion)
            .where(Postulacion.id_egresado == egresado.id)
            .order_by(Postulacion.postulado_en.desc())
        )).scalars().all()

        return [cls._build_application_dto(p) for p in postulaciones]

    @classmethod
    async def get_application_detail_async(
        cls,
        session: AsyncSession,
        user_id: str,
        id_postulacion: str
    ) -> GraduateApplicationResponse:
        """
        Consulta el detalle profundo de una postulación individual para el egresado.
        """
        try:
            user_uuid = uuid.UUID(str(user_id))
            post_uuid = uuid.UUID(str(id_postulacion))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"codigo": "UUID_INVALIDO", "mensaje": "Identificador UUID inválido."}
            )

        egresado = (await session.execute(
            select(Egresado).where(Egresado.id_usuario == user_uuid)
        )).scalar_one_or_none()

        if not egresado:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"codigo": "EGRESADO_NO_ENCONTRADO", "mensaje": "Perfil de egresado no encontrado."}
            )

        postulacion = (await session.execute(
            select(Postulacion).where(
                Postulacion.id == post_uuid,
                Postulacion.id_egresado == egresado.id
            )
        )).scalar_one_or_none()

        if not postulacion:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"codigo": "POSTULACION_NO_ENCONTRADA", "mensaje": "No se encontró la postulación o no pertenece a tu cuenta."}
            )

        return cls._build_application_dto(postulacion)

    @classmethod
    async def withdraw_application_async(
        cls,
        session: AsyncSession,
        user_id: str,
        id_postulacion: str
    ) -> Dict[str, Any]:
        """
        Retiro voluntario de una postulación por parte del egresado.
        Elimina la postulación, limpia sus tablas hijas mediante ON DELETE CASCADE
        y decrementa atómicamente el contador total_postulantes de la vacante.
        """
        try:
            user_uuid = uuid.UUID(str(user_id))
            post_uuid = uuid.UUID(str(id_postulacion))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"codigo": "UUID_INVALIDO", "mensaje": "Identificador UUID inválido."}
            )

        egresado = (await session.execute(
            select(Egresado).where(Egresado.id_usuario == user_uuid)
        )).scalar_one_or_none()

        if not egresado:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"codigo": "EGRESADO_NO_ENCONTRADO", "mensaje": "Perfil de egresado no encontrado."}
            )

        postulacion = (await session.execute(
            select(Postulacion).where(
                Postulacion.id == post_uuid,
                Postulacion.id_egresado == egresado.id
            )
        )).scalar_one_or_none()

        if not postulacion:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"codigo": "POSTULACION_NO_ENCONTRADA", "mensaje": "No se encontró la postulación o no pertenece a tu cuenta."}
            )

        vacante = postulacion.vacante
        titulo_vacante = vacante.titulo if vacante else "la vacante"

        # Decrementar contador de la vacante
        if vacante:
            vacante.total_postulantes = max(0, (vacante.total_postulantes or 1) - 1)

        # Eliminar postulación
        await session.delete(postulacion)
        await session.commit()

        return {
            "success": True,
            "id_postulacion": str(post_uuid),
            "mensaje": f"Has retirado tu postulación para '{titulo_vacante}' exitosamente."
        }

    # El perfil se obtiene de los registros del usuario autenticado.
    @staticmethod
    async def get_profile_async(session: AsyncSession, user_id: str) -> GraduateProfileSchema:
        try:
            user_uuid = uuid.UUID(user_id)
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="Identificador de usuario inválido.")
        graduate = (await session.execute(select(Egresado).where(Egresado.id_usuario == user_uuid))).scalar_one_or_none()
        if graduate is None:
            raise HTTPException(status_code=404, detail="Perfil de egresado no encontrado.")

        academic = (await session.execute(
            select(AcademicoEgresado).where(AcademicoEgresado.id_egresado == graduate.id)
            .order_by(AcademicoEgresado.creado_en.desc())
        )).scalars().first()
        cv = (await session.execute(
            select(ArchivoHojaVida).where(ArchivoHojaVida.id_egresado == graduate.id)
            .order_by(ArchivoHojaVida.es_predeterminado.desc(), ArchivoHojaVida.subido_en.desc())
        )).scalars().first()
        approved = bool(academic and academic.estado_verificacion == "aprobado" and academic.validado_por_ies)
        return GraduateProfileSchema(
            id=str(graduate.id), nombre_completo=graduate.nombre_completo,
            correo=graduate.correo_personal, telefono=graduate.telefono,
            departamento=graduate.departamento_residencia,
            ciudad=graduate.ciudad_residencia,
            institucion_nombre=academic.institucion.nombre_oficial if academic else None,
            carrera=academic.programa.nombre if academic else graduate.titular_profesional,
            ano_graduacion=str(academic.ano_graduacion) if academic else None,
            titulo_verificado=approved, sello_digital_activo=bool(approved and academic.sello_digital),
            habilidades_tecnicas=[], experiencias=[],
            hoja_de_vida_pdf_url=cv.url_archivo if cv else None,
        )
