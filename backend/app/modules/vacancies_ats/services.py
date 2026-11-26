"""
Lógica del Motor de Vacantes Formales y ATS Kanban (Fase 4 Paso 2).
Garantiza:
- Gating de Cuarentena (RNF-01): Cero vacantes abiertas de empresas no aprobadas visibles al público.
- Paginación y Filtrado Multicriterio con SLA < 3.0s (RNF-02).
- Multi-tenancy estricto: Sedes y reclutadores pertenecientes a la empresa.
- Gestión de taxonomía de competencias y programas académicos afines.
- Trazabilidad y compatibilidad hacia atrás con el ATS Kanban.
"""

import logging
import uuid
import time
import re
from datetime import datetime, date, timedelta, timezone
from typing import List, Dict, Any, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func, desc, or_, and_, text

from app.core.config import settings
from app.modules.companies.models import Empresa, SedeEmpresa, ReclutadorEmpresa
from app.modules.institutions.models import ProgramaAcademico
from app.core.skills_taxonomy import normalize_text
from app.modules.graduates.models import Egresado, AcademicoEgresado
from app.integrations.supabase_storage import SupabaseStorageService
from app.integrations.meetings import generate_meeting_link
from app.modules.convenios.services import validar_convenio_de_empresa
from app.modules.convenios.visibility import egresado_id_de, puede_ver, visible_para
from app.modules.vacancies_ats.interview_response import make_response_url
from app.integrations.transactional_notifications import send_vincula_email
from app.integrations.email_service import get_stage_display_info
from app.modules.notifications import services as avisos
from app.modules.vacancies_ats.models import (
    Vacante,
    TaxonomiaCompetencia,
    CompetenciaExigidaVacante,
    ProgramaAfinVacante,
    Postulacion,
    HistorialFasePostulacion,
    NotaReclutadorPostulacion,
    EntrevistaPostulacion,
)
from app.modules.vacancies_ats.schemas import (
    VacanteCreateRequest,
    VacanteUpdateRequest,
    VacanteResponse,
    VacanteEmpresaItemResponse,
    VacanteSedeItemResponse,
    CompetenciaResponse,
    CompetenciaItem,
    PaginatedVacanciesResponse,
    KanbanCandidateItem,
    PostulacionCreateRequest,
    PostulacionResponse,
    KanbanCandidateCardResponse,
    CandidateDiplomaUrlResponse,
    KanbanBoardDetailedResponse,
    MoverFaseRequest,
    NotaReclutadorRequest,
    NotaReclutadorResponse,
    ProgramarEntrevistaRequest,
    EntrevistaResponse,
)


def _slugify(text: str) -> str:
    cleaned = re.sub(r"[^\w\s-]", "", text.strip().lower())
    return re.sub(r"[-\s]+", "_", cleaned)


logger = logging.getLogger(__name__)

ESTADO_ENTREVISTA = {"programada": "Pendiente de confirmar", "confirmada": "Confirmada por el egresado",
                     "reprogramada": "El egresado pide otra fecha", "cancelada": "Cancelada", "realizada": "Realizada"}


class VacancyATSService:

    # =========================================================================
    # HELPERS DE HIDRATACIÓN
    # =========================================================================

    @classmethod
    def _build_vacante_response(cls, vacante: Vacante) -> VacanteResponse:
        """Transforma una entidad ORM Vacante a su DTO Pydantic VacanteResponse."""
        emp = vacante.empresa
        sede = vacante.sede

        emp_response = VacanteEmpresaItemResponse(
            id=str(emp.id) if emp else str(vacante.id_empresa),
            razon_social=emp.razon_social if emp else "Empresa Registrada",
            nombre_comercial=emp.nombre_comercial if emp else "Empresa Confidencial",
            sector_economico=emp.sector_economico if emp else "General",
            ciudad=emp.ciudad if emp else "Colombia",
            url_logo=emp.url_logo if emp else None,
            empresa_verificada=(emp.estado == "aprobado") if emp else False
        )

        sede_response = VacanteSedeItemResponse(
            id=str(sede.id) if sede else str(vacante.id_sede),
            nombre=sede.nombre if sede else "",
            ciudad=sede.ciudad if sede else "",
            departamento=sede.departamento if sede else ""
        )

        competencias_resp: List[CompetenciaResponse] = []
        if vacante.competencias:
            for c in vacante.competencias:
                if c.competencia:
                    competencias_resp.append(
                        CompetenciaResponse(
                            id=str(c.competencia.id),
                            nombre=c.competencia.nombre,
                            categoria=c.competencia.categoria,
                            es_obligatoria=c.es_obligatoria
                        )
                    )

        programas_ids = [str(p.id_programa) for p in vacante.programas_afines] if vacante.programas_afines else []
        programas_nombres = list(dict.fromkeys(p.programa.nombre for p in (vacante.programas_afines or []) if p.programa))

        # Ubicación y compatibilidad hacia atrás
        ubicacion = f"{sede.ciudad}, {sede.departamento}" if sede else "Colombia"
        rango_min = int(vacante.salario_minimo) if vacante.salario_minimo is not None else None
        rango_max = int(vacante.salario_maximo) if vacante.salario_maximo is not None else None
        habilidades = [c.nombre for c in competencias_resp]

        return VacanteResponse(
            id=str(vacante.id),
            id_empresa=str(vacante.id_empresa),
            id_sede=str(vacante.id_sede),
            id_reclutador_responsable=str(vacante.id_reclutador_responsable),
            codigo_vacante=vacante.codigo_vacante,
            titulo=vacante.titulo,
            categoria=vacante.categoria,
            modalidad=vacante.modalidad,
            tipo_contrato=vacante.tipo_contrato,
            nivel_experiencia=vacante.nivel_experiencia,
            salario_minimo=float(vacante.salario_minimo) if vacante.salario_minimo is not None else None,
            salario_maximo=float(vacante.salario_maximo) if vacante.salario_maximo is not None else None,
            salario_es_confidencial=vacante.salario_es_confidencial,
            periodo_salario=vacante.periodo_salario,
            jornada_laboral=vacante.jornada_laboral,
            cupos_disponibles=vacante.cupos_disponibles,
            total_postulantes=vacante.total_postulantes,
            descripcion=vacante.descripcion,
            responsabilidades=vacante.responsabilidades or [],
            requisitos=vacante.requisitos or [],
            beneficios=vacante.beneficios or [],
            idiomas_requeridos=vacante.idiomas_requeridos or [],
            estado=vacante.estado,
            publicado_en=vacante.publicado_en.isoformat() if vacante.publicado_en else "",
            fecha_cierre=vacante.fecha_cierre.isoformat() if vacante.fecha_cierre else "",
            creado_en=vacante.creado_en.isoformat() if vacante.creado_en else "",
            empresa=emp_response,
            sede=sede_response,
            competencias=competencias_resp,
            programas_afines_ids=programas_ids,
            programas_afines_nombres=programas_nombres,
            id_convenio=str(vacante.id_convenio) if vacante.id_convenio else None,
            empresa_nombre=emp_response.nombre_comercial,
            empresa_logo=emp_response.url_logo,
            empresa_verificada=emp_response.empresa_verificada,
            ubicacion=ubicacion,
            rango_salarial_min=rango_min,
            rango_salarial_max=rango_max,
            habilidades_requeridas=habilidades,
            total_postulados=vacante.total_postulantes
        )

    @classmethod
    async def generate_codigo_vacante(cls, session: AsyncSession) -> str:
        """Genera un código único secuencial/aleatorio para la vacante."""
        current_year = datetime.now(timezone.utc).year
        for _ in range(10):
            suffix = uuid.uuid4().hex[:6].upper()
            codigo = f"VAC-{current_year}-{suffix}"
            exists = (await session.execute(
                select(Vacante.id).where(Vacante.codigo_vacante == codigo)
            )).scalar_one_or_none()
            if not exists:
                return codigo
        return f"VAC-{current_year}-{uuid.uuid4().hex[:8].upper()}"

    # =========================================================================
    # 1. CATÁLOGO PÚBLICO DE VACANTES (SLA < 3s, GATING DE LEY)
    # =========================================================================

    @classmethod
    async def list_public_vacancies(
        cls,
        session: AsyncSession,
        page: int = 1,
        limit: int = 10,
        modalidad: Optional[str] = None,
        categoria: Optional[str] = None,
        departamento: Optional[str] = None,
        ciudad: Optional[str] = None,
        q: Optional[str] = None,
        salario_min: Optional[float] = None,
        nivel_experiencia: Optional[str] = None,
        viewer: Optional[Dict[str, Any]] = None,
    ) -> PaginatedVacanciesResponse:
        """
        Catálogo público oficial para egresados universitarios:
        - GATING ESTRICTO: Solo vacantes de empresas con estado == 'aprobado'.
        - Solo vacantes con estado == 'abierta'.
        - RNF-02: Garantía de respuesta < 3.0 segundos.
        """
        t0 = time.perf_counter()
        page = max(1, page)
        limit = min(50, max(1, limit))
        offset = (page - 1) * limit

        # Condiciones base innegociables de seguridad
        conditions = [
            Empresa.estado == "aprobado",
            Vacante.estado == "abierta",
            visible_para(Vacante.id_convenio, await egresado_id_de(session, viewer)),  # las exclusivas, solo para su IES
        ]

        if modalidad:
            conditions.append(Vacante.modalidad == modalidad)
        if categoria:
            conditions.append(Vacante.categoria.ilike(f"%{categoria.strip()}%"))
        if nivel_experiencia:
            conditions.append(Vacante.nivel_experiencia.ilike(f"%{nivel_experiencia.strip()}%"))
        if salario_min is not None:
            conditions.append(
                or_(
                    Vacante.salario_maximo >= salario_min,
                    Vacante.salario_minimo >= salario_min,
                    Vacante.salario_es_confidencial.is_(True)
                )
            )
        if departamento:
            conditions.append(SedeEmpresa.departamento.ilike(f"%{departamento.strip()}%"))
        if ciudad:
            conditions.append(SedeEmpresa.ciudad.ilike(f"%{ciudad.strip()}%"))
        if q:
            term = f"%{q.strip()}%"
            conditions.append(
                or_(
                    Vacante.titulo.ilike(term),
                    Vacante.descripcion.ilike(term),
                    Empresa.nombre_comercial.ilike(term),
                    Empresa.razon_social.ilike(term)
                )
            )

        # 1. Conteo total optimizado
        count_stmt = (
            select(func.count(Vacante.id))
            .join(Empresa, Vacante.id_empresa == Empresa.id)
            .join(SedeEmpresa, Vacante.id_sede == SedeEmpresa.id)
            .where(and_(*conditions))
        )
        total = (await session.execute(count_stmt)).scalar() or 0

        # 2. Consulta paginada ordenada por frescura
        query_stmt = (
            select(Vacante)
            .join(Empresa, Vacante.id_empresa == Empresa.id)
            .join(SedeEmpresa, Vacante.id_sede == SedeEmpresa.id)
            .where(and_(*conditions))
            .order_by(desc(Vacante.publicado_en))
            .offset(offset)
            .limit(limit)
        )
        vacantes = (await session.execute(query_stmt)).scalars().all()

        items = [cls._build_vacante_response(v) for v in vacantes]
        elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)
        total_pages = (total + limit - 1) // limit if total > 0 else 1

        return PaginatedVacanciesResponse(
            items=items,
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages,
            tiempo_respuesta_ms=elapsed_ms
        )

    @classmethod
    async def get_public_vacancy_detail(cls, session: AsyncSession, vacancy_id: str, viewer: Optional[Dict[str, Any]] = None) -> VacanteResponse:
        """
        Detalle de una vacante pública para egresados con verificación de seguridad.
        """
        try:
            v_uuid = uuid.UUID(str(vacancy_id))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"codigo": "ID_VACANTE_INVALIDO", "mensaje": "El identificador no es un UUID válido."}
            )

        stmt = (
            select(Vacante)
            .join(Empresa, Vacante.id_empresa == Empresa.id)
            .where(Vacante.id == v_uuid)
        )
        vacante = (await session.execute(stmt)).scalar_one_or_none()

        if vacante and vacante.id_convenio and not await puede_ver(session, vacante.id_convenio, await egresado_id_de(session, viewer)):
            vacante = None  # exclusiva de otra IES: para este usuario no existe
        if not vacante or vacante.empresa.estado != "aprobado" or vacante.estado != "abierta":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "codigo": "VACANTE_NO_DISPONIBLE",
                    "mensaje": "La vacante solicitada no existe, ha sido cerrada o la empresa aún no cuenta con aval oficial."
                }
            )

        return cls._build_vacante_response(vacante)

    # =========================================================================
    # 2. GESTIÓN DE VACANTES CORPORATIVAS (EMPRESA & RECLUTADORES)
    # =========================================================================

    @classmethod
    async def list_company_vacancies(
        cls,
        session: AsyncSession,
        company_id: str,
        page: int = 1,
        limit: int = 10,
        estado: Optional[str] = None,
        sede_id: Optional[str] = None,
        q: Optional[str] = None
    ) -> PaginatedVacanciesResponse:
        """
        Lista todas las vacantes de la empresa autenticada (abiertas, borradores, pausadas, cerradas).
        Aislamiento multi-tenant por ID de empresa.
        """
        t0 = time.perf_counter()
        try:
            val_comp = uuid.UUID(str(company_id))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"codigo": "ID_EMPRESA_INVALIDO", "mensaje": "ID de empresa inválido."}
            )

        page = max(1, page)
        limit = min(50, max(1, limit))
        offset = (page - 1) * limit

        conditions = [Vacante.id_empresa == val_comp]
        if estado:
            conditions.append(Vacante.estado == estado.strip().lower())
        if sede_id:
            try:
                conditions.append(Vacante.id_sede == uuid.UUID(str(sede_id)))
            except ValueError:
                pass
        if q:
            term = f"%{q.strip()}%"
            conditions.append(or_(Vacante.titulo.ilike(term), Vacante.codigo_vacante.ilike(term)))

        count_stmt = select(func.count(Vacante.id)).where(and_(*conditions))
        total = (await session.execute(count_stmt)).scalar() or 0

        query_stmt = (
            select(Vacante)
            .where(and_(*conditions))
            .order_by(desc(Vacante.creado_en))
            .offset(offset)
            .limit(limit)
        )
        vacantes = (await session.execute(query_stmt)).scalars().all()
        items = [cls._build_vacante_response(v) for v in vacantes]

        elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)
        total_pages = (total + limit - 1) // limit if total > 0 else 1

        return PaginatedVacanciesResponse(
            items=items,
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages,
            tiempo_respuesta_ms=elapsed_ms
        )

    @classmethod
    async def create_vacancy(
        cls,
        session: AsyncSession,
        company_id: str,
        company_status: str,
        payload: VacanteCreateRequest,
        user_id: Optional[str] = None,
        user_role: Optional[str] = None
    ) -> VacanteResponse:
        """
        Publica una nueva vacante corporativa:
        - Valida multi-tenancy de la sede y el reclutador asignado.
        - Gating estricto: Si la empresa no está aprobada, la vacante queda forzada en 'borrador'.
        - Registra taxonomía de competencias y programas afines.
        """
        try:
            val_comp = uuid.UUID(str(company_id))
            val_sede = uuid.UUID(str(payload.id_sede))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"codigo": "IDENTIFICADORES_INVALIDOS", "mensaje": "Uno o más identificadores no son UUID válidos."}
            )

        # 1. Validar que la sede pertenezca a la empresa
        sede = (await session.execute(
            select(SedeEmpresa).where(SedeEmpresa.id == val_sede, SedeEmpresa.id_empresa == val_comp)
        )).scalar_one_or_none()
        if not sede:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"codigo": "SEDE_NO_AUTORIZADA", "mensaje": "La sede indicada no pertenece a tu empresa."}
            )

        # 2. Resolver Reclutador Responsable
        rec_uuid: Optional[uuid.UUID] = None
        if payload.id_reclutador_responsable:
            try:
                cand_rec = uuid.UUID(str(payload.id_reclutador_responsable))
                rec_check = (await session.execute(
                    select(ReclutadorEmpresa).where(ReclutadorEmpresa.id == cand_rec, ReclutadorEmpresa.id_empresa == val_comp)
                )).scalar_one_or_none()
                if rec_check:
                    rec_uuid = rec_check.id
            except ValueError:
                pass

        if not rec_uuid and user_id:
            try:
                cand_u = uuid.UUID(str(user_id))
                rec_user = (await session.execute(
                    select(ReclutadorEmpresa).where(ReclutadorEmpresa.id_usuario == cand_u, ReclutadorEmpresa.id_empresa == val_comp)
                )).scalar_one_or_none()
                if rec_user:
                    rec_uuid = rec_user.id
            except ValueError:
                pass

        if not rec_uuid:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"codigo": "RECLUTADOR_REQUERIDO", "mensaje": "Asigna un reclutador registrado antes de crear la vacante."}
            )

        # 3. Gating de Cuarentena (Opción 2)
        estado_solicitado = (payload.estado or "abierta").strip().lower()
        if company_status != "aprobado":
            # Forzar a 'borrador' si la empresa no está aprobada
            estado_final = "borrador"
        else:
            estado_final = estado_solicitado if estado_solicitado in ("abierta", "borrador", "pausada", "cerrada") else "abierta"

        # 4. Parsear fecha de cierre
        try:
            parsed_fecha_cierre = datetime.strptime(payload.fecha_cierre, "%Y-%m-%d").date()
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"codigo": "FECHA_CIERRE_INVALIDA", "mensaje": "La fecha de cierre debe tener formato YYYY-MM-DD."}
            )

        # 5. Generar código único de vacante
        codigo_vacante = await cls.generate_codigo_vacante(session)
        id_convenio = await validar_convenio_de_empresa(session, val_comp, payload.id_convenio) if payload.id_convenio else None

        # 6. Crear la entidad Vacante
        nueva_vacante = Vacante(
            id_empresa=val_comp,
            id_convenio=id_convenio,
            id_sede=val_sede,
            id_reclutador_responsable=rec_uuid,
            codigo_vacante=codigo_vacante,
            titulo=payload.titulo.strip(),
            categoria=payload.categoria.strip(),
            modalidad=payload.modalidad.strip(),
            tipo_contrato=payload.tipo_contrato.strip(),
            nivel_experiencia=payload.nivel_experiencia.strip(),
            salario_minimo=payload.salario_minimo,
            salario_maximo=payload.salario_maximo,
            salario_es_confidencial=payload.salario_es_confidencial,
            periodo_salario=payload.periodo_salario.strip() if payload.periodo_salario else "Mensual",
            jornada_laboral=payload.jornada_laboral.strip(),
            cupos_disponibles=payload.cupos_disponibles,
            total_postulantes=0,
            descripcion=payload.descripcion.strip(),
            responsabilidades=payload.responsabilidades or [],
            requisitos=payload.requisitos or [],
            beneficios=payload.beneficios or [],
            idiomas_requeridos=payload.idiomas_requeridos or [],
            estado=estado_final,
            fecha_cierre=parsed_fecha_cierre
        )
        session.add(nueva_vacante)
        await session.flush()

        # 7. Taxonomía de Competencias Exigidas
        competencias_a_procesar: List[CompetenciaItem] = []
        if payload.competencias:
            competencias_a_procesar.extend(payload.competencias)
        if payload.habilidades_requeridas:
            for hab in payload.habilidades_requeridas:
                if not any(c.nombre.lower() == hab.lower() for c in competencias_a_procesar):
                    competencias_a_procesar.append(CompetenciaItem(nombre=hab, categoria="tecnica", es_obligatoria=True))

        for id_competencia, es_obligatoria in await cls._resolve_competencias(session, competencias_a_procesar):
            session.add(
                CompetenciaExigidaVacante(
                    id_vacante=nueva_vacante.id,
                    id_competencia=id_competencia,
                    es_obligatoria=es_obligatoria
                )
            )

        # 8. Programas Académicos Afines
        programas_vinculados: set = set()
        if payload.programas_afines_ids:
            for prog_str in payload.programas_afines_ids:
                try:
                    prog_uuid = uuid.UUID(str(prog_str))
                    prog_check = (await session.execute(
                        select(ProgramaAcademico).where(ProgramaAcademico.id == prog_uuid)
                    )).scalar_one_or_none()
                    if prog_check and prog_uuid not in programas_vinculados:
                        programas_vinculados.add(prog_uuid)
                        session.add(
                            ProgramaAfinVacante(
                                id_vacante=nueva_vacante.id,
                                id_programa=prog_uuid
                            )
                        )
                except ValueError:
                    continue
        await cls._link_programs_by_name(session, nueva_vacante.id, payload.programas_afines_nombres, programas_vinculados)

        await session.commit()
        await session.refresh(nueva_vacante)

        if estado_final == "abierta":
            await cls._notify_vacancy_published(session, val_comp, nueva_vacante)

        return await cls.get_company_vacancy_detail(session, company_id, str(nueva_vacante.id))

    @classmethod
    async def _notify_vacancy_published(cls, session: AsyncSession, id_empresa, vacante) -> None:
        """Avisa en la plataforma y por correo a la empresa que su vacante quedó publicada; un fallo nunca bloquea la publicación."""
        await avisos.notificar(
            session, await avisos.de_empresa(session, id_empresa, vacante.id_reclutador_responsable), "vacante_publicada",
            "Vacante publicada", f"«{vacante.titulo}» ya está abierta para recibir postulaciones.",
            "/empresa/reclutador/vacantes", commit=True)
        try:
            emp = (await session.execute(select(Empresa).where(Empresa.id == id_empresa))).scalar_one_or_none()
            if emp and emp.correo_contacto:
                await send_vincula_email(
                    "vacante_publicada", emp.correo_contacto,
                    nombre=emp.persona_contacto, empresa=emp.razon_social or emp.nombre_comercial,
                    vacante=vacante.titulo, codigo=vacante.codigo_vacante,
                )
        except Exception as exc:
            print(f"[AVISO CORREO VACANTE] {exc}")

    @classmethod
    async def _notify_application_created(
        cls, session: AsyncSession, empresa, vacante, egresado, fallback_email: Optional[str] = None
    ) -> None:
        """Envía confirmación al egresado y aviso al reclutador/empresa por Brevo (sin bloquear el registro)."""
        emp_nombre = (empresa.nombre_comercial or empresa.razon_social) if empresa else ""
        await avisos.notificar(session, [egresado.id_usuario], "postulacion_enviada", "Postulación enviada",
                               f"Te postulaste a «{vacante.titulo}» en {emp_nombre}.", "/dashboard/postulaciones", commit=True)
        await avisos.notificar(
            session, await avisos.de_empresa(session, vacante.id_empresa, vacante.id_reclutador_responsable), "nueva_postulacion",
            "Nueva postulación", f"{egresado.nombre_completo} se postuló a «{vacante.titulo}».",
            "/empresa/reclutador/candidatos", commit=True)
        try:
            grad_email = egresado.correo_personal or fallback_email
            if grad_email:
                await send_vincula_email(
                    "postulacion_creada", grad_email,
                    nombre=egresado.nombre_completo, empresa=emp_nombre,
                    vacante=vacante.titulo, codigo=vacante.codigo_vacante,
                )
            rec = None
            if vacante.id_reclutador_responsable:
                rec = (await session.execute(
                    select(ReclutadorEmpresa).where(ReclutadorEmpresa.id == vacante.id_reclutador_responsable)
                )).scalar_one_or_none()
            company_email = (rec.correo_corporativo if rec and rec.correo_corporativo else None) or (empresa.correo_contacto if empresa else None)
            company_contact = (rec.nombre_completo if rec and rec.nombre_completo else None) or (empresa.persona_contacto if empresa else None)
            if company_email:
                await send_vincula_email(
                    "nueva_postulacion_empresa", company_email,
                    nombre=company_contact, empresa=emp_nombre,
                    vacante=vacante.titulo, codigo=vacante.codigo_vacante,
                    candidato=egresado.nombre_completo,
                )
        except Exception as exc:
            print(f"[AVISO CORREO POSTULACION] {exc}")

    @classmethod
    async def get_company_vacancy_detail(cls, session: AsyncSession, company_id: str, vacancy_id: str) -> VacanteResponse:
        """Obtiene el detalle completo de una vacante para la empresa propietaria."""
        try:
            val_comp = uuid.UUID(str(company_id))
            val_vac = uuid.UUID(str(vacancy_id))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"codigo": "IDENTIFICADORES_INVALIDOS", "mensaje": "Identificadores no válidos."}
            )

        stmt = select(Vacante).where(Vacante.id == val_vac, Vacante.id_empresa == val_comp)
        vacante = (await session.execute(stmt)).scalar_one_or_none()
        if not vacante:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"codigo": "VACANTE_NO_ENCONTRADA", "mensaje": "La vacante no existe o pertenece a otra empresa."}
            )

        return cls._build_vacante_response(vacante)

    @staticmethod
    async def _owned_id(session: AsyncSession, model, raw_id, company_uuid, codigo: str, mensaje: str):
        """Id de una sede o reclutador, solo si pertenece a la empresa."""
        try:
            buscado = uuid.UUID(str(raw_id))
        except ValueError:
            buscado = None
        encontrado = None
        if buscado:
            encontrado = (await session.execute(
                select(model.id).where(model.id == buscado, model.id_empresa == company_uuid)
            )).scalar_one_or_none()
        if not encontrado:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                                detail={"codigo": codigo, "mensaje": mensaje})
        return encontrado

    @classmethod
    async def _resolve_competencias(cls, session: AsyncSession, items) -> List[Tuple[Any, bool]]:
        """Devuelve (id de la competencia, es obligatoria), creando en la taxonomía las que no existan."""
        resueltas: Dict[Any, bool] = {}
        for item in items:
            nombre = item.nombre.strip()
            slug = _slugify(nombre)
            if not slug:
                continue
            competencia = (await session.execute(
                select(TaxonomiaCompetencia).where(TaxonomiaCompetencia.etiqueta_normalizada == slug)
            )).scalar_one_or_none()
            if not competencia:
                competencia = TaxonomiaCompetencia(
                    nombre=nombre,
                    categoria=item.categoria if item.categoria in ("tecnica", "blanda") else "tecnica",
                    etiqueta_normalizada=slug
                )
                session.add(competencia)
                await session.flush()
            resueltas.setdefault(competencia.id, item.es_obligatoria)
        return list(resueltas.items())

    @classmethod
    async def _link_programs_by_name(cls, session: AsyncSession, vacante_id, nombres, ya_vinculados: set) -> None:
        """Vincula la vacante a los programas registrados (de cualquier IES) cuyo nombre coincide."""
        claves = {normalize_text(n) for n in (nombres or []) if n and n.strip()}
        if not claves:
            return
        # shortcut: recorre todos los programas; filtrar en SQL si el catálogo crece a miles
        for prog_id, nombre in (await session.execute(select(ProgramaAcademico.id, ProgramaAcademico.nombre))).all():
            if normalize_text(nombre) in claves and prog_id not in ya_vinculados:
                ya_vinculados.add(prog_id)
                session.add(ProgramaAfinVacante(id_vacante=vacante_id, id_programa=prog_id))

    @classmethod
    async def update_vacancy(
        cls,
        session: AsyncSession,
        company_id: str,
        vacancy_id: str,
        payload: VacanteUpdateRequest
    ) -> VacanteResponse:
        """Actualiza los datos de una vacante garantizando multi-tenancy."""
        val_comp = uuid.UUID(str(company_id))
        val_vac = uuid.UUID(str(vacancy_id))

        stmt = select(Vacante).where(Vacante.id == val_vac, Vacante.id_empresa == val_comp)
        vacante = (await session.execute(stmt)).scalar_one_or_none()
        if not vacante:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"codigo": "VACANTE_NO_ENCONTRADA", "mensaje": "Vacante no encontrada."}
            )

        if payload.titulo is not None:
            vacante.titulo = payload.titulo.strip()
        if payload.categoria is not None:
            vacante.categoria = payload.categoria.strip()
        if payload.modalidad is not None:
            vacante.modalidad = payload.modalidad.strip()
        if payload.tipo_contrato is not None:
            vacante.tipo_contrato = payload.tipo_contrato.strip()
        if payload.nivel_experiencia is not None:
            vacante.nivel_experiencia = payload.nivel_experiencia.strip()
        # null explícito = quitar el salario ("A convenir")
        if "salario_minimo" in payload.model_fields_set:
            vacante.salario_minimo = payload.salario_minimo
        if "salario_maximo" in payload.model_fields_set:
            vacante.salario_maximo = payload.salario_maximo
        if payload.salario_es_confidencial is not None:
            vacante.salario_es_confidencial = payload.salario_es_confidencial
        if payload.periodo_salario is not None:
            vacante.periodo_salario = payload.periodo_salario.strip()
        if payload.jornada_laboral is not None:
            vacante.jornada_laboral = payload.jornada_laboral.strip()
        if payload.cupos_disponibles is not None:
            vacante.cupos_disponibles = payload.cupos_disponibles
        if payload.descripcion is not None:
            vacante.descripcion = payload.descripcion.strip()
        if payload.responsabilidades is not None:
            vacante.responsabilidades = payload.responsabilidades
        if payload.requisitos is not None:
            vacante.requisitos = payload.requisitos
        if payload.beneficios is not None:
            vacante.beneficios = payload.beneficios
        if payload.idiomas_requeridos is not None:
            vacante.idiomas_requeridos = payload.idiomas_requeridos
        if payload.fecha_cierre is not None:
            vacante.fecha_cierre = datetime.strptime(payload.fecha_cierre, "%Y-%m-%d").date()
        if payload.id_sede is not None:
            vacante.id_sede = await cls._owned_id(session, SedeEmpresa, payload.id_sede, val_comp,
                                                  "SEDE_NO_AUTORIZADA", "La sede indicada no pertenece a tu empresa.")
        if "id_reclutador_responsable" in payload.model_fields_set:
            vacante.id_reclutador_responsable = await cls._owned_id(
                session, ReclutadorEmpresa, payload.id_reclutador_responsable, val_comp,
                "RECLUTADOR_REQUERIDO", "La vacante necesita un reclutador responsable de tu empresa.")
        if payload.competencias is not None:
            actuales = {c.id_competencia: c for c in vacante.competencias}
            vacante.competencias = [
                actuales.get(id_competencia) or CompetenciaExigidaVacante(id_competencia=id_competencia, es_obligatoria=obligatoria)
                for id_competencia, obligatoria in await cls._resolve_competencias(session, payload.competencias)
            ]
        if "id_convenio" in payload.model_fields_set:
            if payload.id_convenio is None:
                vacante.id_convenio = None  # volver a abrirla a todos los egresados
            elif str(vacante.id_convenio) != str(payload.id_convenio):
                if (vacante.total_postulantes or 0) > 0:
                    raise HTTPException(status_code=409, detail={"codigo": "VACANTE_CON_POSTULANTES",
                                        "mensaje": "La vacante ya tiene postulantes: no se puede volver exclusiva de un convenio."})
                vacante.id_convenio = await validar_convenio_de_empresa(session, val_comp, payload.id_convenio)
        if payload.programas_afines_nombres is not None:
            await session.execute(delete(ProgramaAfinVacante).where(ProgramaAfinVacante.id_vacante == vacante.id))
            await cls._link_programs_by_name(session, vacante.id, payload.programas_afines_nombres, set())

        await session.commit()
        session.expunge_all()  # releer sede, responsable y competencias ya guardados
        return await cls.get_company_vacancy_detail(session, company_id, vacancy_id)

    @classmethod
    async def update_vacancy_status(
        cls,
        session: AsyncSession,
        company_id: str,
        company_status: str,
        vacancy_id: str,
        nuevo_estado: str
    ) -> VacanteResponse:
        """
        Cambia el estado de la vacante ('abierta', 'pausada', 'cerrada', 'borrador').
        Gating estricto: Bloquea paso a 'abierta' si la empresa no está aprobada.
        """
        val_comp = uuid.UUID(str(company_id))
        val_vac = uuid.UUID(str(vacancy_id))

        stmt = select(Vacante).where(Vacante.id == val_vac, Vacante.id_empresa == val_comp)
        vacante = (await session.execute(stmt)).scalar_one_or_none()
        if not vacante:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"codigo": "VACANTE_NO_ENCONTRADA", "mensaje": "Vacante no encontrada."}
            )

        if vacante.estado == "inhabilitada":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"codigo": "VACANTE_INHABILITADA",
                        "mensaje": "El equipo de Vincula inhabilitó esta vacante. Contacta a soporte para revisarla."}
            )

        estado_clean = nuevo_estado.strip().lower()
        if estado_clean not in ("abierta", "pausada", "cerrada", "borrador"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"codigo": "ESTADO_INVALIDO", "mensaje": "Estado inválido. Opciones: abierta, pausada, cerrada, borrador."}
            )

        # Regla de Oro de Seguridad
        if estado_clean == "abierta" and company_status != "aprobado":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "codigo": "EMPRESA_EN_CUARENTENA",
                    "mensaje": "No puedes publicar vacantes abiertas mientras tu empresa se encuentre en proceso de auditoría o subsanación."
                }
            )

        estado_anterior = vacante.estado
        vacante.estado = estado_clean
        if estado_clean == "abierta":
            vacante.publicado_en = datetime.now(timezone.utc)

        await session.commit()
        await session.refresh(vacante)
        if estado_clean == "abierta" and estado_anterior != "abierta":
            await cls._notify_vacancy_published(session, val_comp, vacante)
        return cls._build_vacante_response(vacante)

    # =========================================================================
    # 3. FASE 5: POSTULACIONES Y ATS KANBAN (6 FASES)
    # =========================================================================

    STAGE_DB_TO_UI = {
        "en_revision": "review",
        "preseleccionados": "preselected",
        "prueba_tecnica": "evaluation",
        "entrevista": "interview",
        "oferta_finalistas": "offer",
        "contratado": "hired",
        "descartados": "discarded"
    }

    STAGE_UI_TO_DB = {
        "review": "en_revision",
        "preselected": "preseleccionados",
        "evaluation": "prueba_tecnica",
        "interview": "entrevista",
        "offer": "oferta_finalistas",
        "hired": "contratado",
        "contratado": "contratado",
        "discarded": "descartados",
        "en_revision": "en_revision",
        "preseleccionados": "preseleccionados",
        "prueba_tecnica": "prueba_tecnica",
        "entrevista": "entrevista",
        "oferta_finalistas": "oferta_finalistas",
        "descartados": "descartados"
    }

    @classmethod
    def _build_candidate_card(cls, p: Postulacion) -> KanbanCandidateCardResponse:
        egr = p.egresado
        vac = p.vacante
        stage_ui = cls.STAGE_DB_TO_UI.get(str(p.fase_actual), "review")

        # Extraer programa, institución y estado del diploma del egresado si existen
        prog_nombre = ""
        inst_nombre = ""
        grad_year = None
        degree_verified = False
        degree_status = None
        degree_level = None
        has_diploma_pdf = False
        diploma_file_name = None
        acta_number = None
        book_folio = None
        degree_date = None
        digital_seal = None
        academic_id = None
        if hasattr(egr, "academicos") and egr.academicos:
            academic_rec = next(
                (
                    a for a in egr.academicos
                    if getattr(a, "diploma_cargado_por_egresado", False) and getattr(a, "url_diploma_pdf", None)
                ),
                egr.academicos[0]
            )
            if hasattr(academic_rec, "programa") and academic_rec.programa:
                prog_nombre = academic_rec.programa.nombre
            if hasattr(academic_rec, "institucion") and academic_rec.institucion:
                inst_nombre = academic_rec.institucion.nombre_oficial or academic_rec.institucion.nombre_corto
            if getattr(academic_rec, "ano_graduacion", None):
                grad_year = str(academic_rec.ano_graduacion)
            degree_status = getattr(academic_rec, "estado_verificacion", None)
            degree_verified = bool(
                getattr(academic_rec, "validado_por_ies", False) or degree_status == "aprobado"
            )
            degree_level = getattr(academic_rec, "nivel_formacion", None)
            raw_diploma_url = (getattr(academic_rec, "url_diploma_pdf", None) or "").strip()
            has_diploma_pdf = bool(
                getattr(academic_rec, "diploma_cargado_por_egresado", False)
                and raw_diploma_url
                and not raw_diploma_url.startswith(("/storage/mock/", "/storage/local-mock/", "/mock/"))
            )
            if has_diploma_pdf:
                diploma_file_name = raw_diploma_url.split("/")[-1].split("?")[0] or "diploma.pdf"
            acta_number = getattr(academic_rec, "numero_acta_grado", None)
            book_folio = getattr(academic_rec, "numero_libro_folio", None)
            raw_degree_date = getattr(academic_rec, "fecha_grado", None)
            degree_date = (
                raw_degree_date.isoformat()
                if hasattr(raw_degree_date, "isoformat")
                else (str(raw_degree_date) if raw_degree_date else None)
            )
            digital_seal = getattr(academic_rec, "sello_digital", None)
            if getattr(academic_rec, "id", None):
                academic_id = str(academic_rec.id)

        # Última nota de reclutador
        latest_note = p.notas[0].texto_nota if (hasattr(p, "notas") and p.notas) else None

        # Próxima entrevista
        interview_info = None
        if hasattr(p, "entrevistas") and p.entrevistas:
            first_ent = p.entrevistas[0]
            interview_info = f"{first_ent.fecha_entrevista.strftime('%Y-%m-%d')} · {first_ent.franja_horaria} ({first_ent.modalidad})"
            if first_ent.url_reunion:
                interview_info += f" — {first_ent.url_reunion}"
            interview_info += f" · {ESTADO_ENTREVISTA.get(first_ent.estado, first_ent.estado)}"

        # Habilidades requeridas de la vacante para el match visual
        skills_match = []
        if hasattr(vac, "competencias") and vac.competencias:
            skills_match = [c.competencia.nombre for c in vac.competencias if hasattr(c, "competencia") and c.competencia][:5]

        return KanbanCandidateCardResponse(
            id=str(p.id),
            candidateName=egr.nombre_completo,
            email=egr.correo_personal,
            phone=egr.telefono or "",
            city=egr.ciudad_residencia or "",
            avatar=egr.url_avatar,
            program=prog_nombre,
            institution=inst_nombre,
            graduationYear=grad_year,
            vacancyId=str(p.id_vacante),
            vacancyTitle=vac.titulo if vac else "",
            vacancyCode=vac.codigo_vacante if vac else "",
            siteId=str(vac.id_sede) if vac else "",
            stage=stage_ui,
            matchPercentage=int(float(p.porcentaje_afinidad)) if p.porcentaje_afinidad else None,
            appliedAt=p.postulado_en.isoformat() if p.postulado_en else "",
            skillsMatch=skills_match,
            missingSkills=[],
            experienceSummary=egr.titular_profesional or None,
            educationSummary=f"{prog_nombre} ({inst_nombre})" if prog_nombre and inst_nombre else (prog_nombre or inst_nombre or None),
            recruiterNotes=latest_note,
            rejectionReason=p.motivo_descarte,
            interviewDate=interview_info,
            degreeVerified=degree_verified,
            degreeVerificationStatus=degree_status,
            degreeLevel=degree_level,
            hasDiplomaPdf=has_diploma_pdf,
            diplomaFileName=diploma_file_name,
            actaNumber=acta_number,
            bookFolio=book_folio,
            degreeDate=degree_date,
            digitalSeal=digital_seal,
            academicId=academic_id,
        )

    @classmethod
    async def postular_egresado(
        cls,
        session: AsyncSession,
        user_id: str,
        id_vacante: str,
        id_hoja_vida: Optional[str] = None,
        payload: Optional[PostulacionCreateRequest] = None,
        current_user: Optional[Dict[str, Any]] = None,
    ) -> PostulacionResponse:
        """
        Registra la postulación en 1 clic de un egresado a una vacante pública abierta.
        Garantiza:
        - Vacante existente y en estado 'abierta'.
        - Empresa en estado 'aprobado'.
        - Prevención estricta de postulaciones duplicadas (uq_postulacion_vacante_egresado).
        - Incremento atómico del contador total_postulantes.
        - Bitácora inicial en historial_fases_postulacion.
        - Envío de correo de confirmación indicando Fase 1 (En Revisión Inicial).
        """
        egresado = None
        user_uuid = None
        try:
            user_uuid = uuid.UUID(str(user_id))
            egresado = (await session.execute(
                select(Egresado).where(Egresado.id_usuario == user_uuid)
            )).scalar_one_or_none()
        except ValueError:
            pass

        vacante = None
        vac_uuid = None
        try:
            vac_uuid = uuid.UUID(str(id_vacante))
            vacante = (await session.execute(
                select(Vacante).where(Vacante.id == vac_uuid)
            )).scalar_one_or_none()
        except ValueError:
            pass

        if not vac_uuid or not user_uuid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"codigo": "UUID_INVALIDO", "mensaje": "Identificador UUID con formato inválido."}
            )

        if not egresado:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"codigo": "EGRESADO_NO_ENCONTRADO", "mensaje": "No se encontró el perfil de egresado para esta cuenta de usuario."}
            )

        if not vacante:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"codigo": "VACANTE_NO_ENCONTRADA", "mensaje": "La vacante solicitada no existe."}
            )

        if vacante.id_convenio and not await puede_ver(session, vacante.id_convenio, egresado.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"codigo": "VACANTE_EXCLUSIVA", "mensaje": "Esta vacante es exclusiva para egresados de una institución con convenio."}
            )

        # Gating RNF-01: La vacante debe estar abierta
        if vacante.estado != "abierta":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"codigo": "VACANTE_NO_DISPONIBLE", "mensaje": "Esta vacante no se encuentra abierta para postulaciones."}
            )

        # Gating RNF-01: La empresa debe estar aprobada
        empresa = (await session.execute(
            select(Empresa).where(Empresa.id == vacante.id_empresa)
        )).scalar_one_or_none()

        if not empresa or empresa.estado != "aprobado":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"codigo": "EMPRESA_NO_APROBADA", "mensaje": "No puedes postularte a ofertas de empresas no homologadas o en cuarentena."}
            )

        # 3. Prevenir postulación duplicada (uq_postulacion_vacante_egresado)
        postulacion_existente = (await session.execute(
            select(Postulacion).where(
                Postulacion.id_vacante == vac_uuid,
                Postulacion.id_egresado == egresado.id
            )
        )).scalar_one_or_none()

        if postulacion_existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"codigo": "POSTULACION_DUPLICADA", "mensaje": "Ya te has postulado previamente a esta vacante laboral."}
            )

        # 4. Crear la postulación
        nueva_postulacion = Postulacion(
            id_vacante=vac_uuid,
            id_egresado=egresado.id,
            id_hoja_vida=uuid.UUID(str(id_hoja_vida)) if id_hoja_vida else None,
            fase_actual="en_revision",
            porcentaje_afinidad=0,
        )
        session.add(nueva_postulacion)
        await session.flush()

        # 5. Registrar en bitácora de auditoría
        historial = HistorialFasePostulacion(
            id_postulacion=nueva_postulacion.id,
            fase_anterior=None,
            fase_nueva="en_revision",
            cambiado_por_usuario=user_uuid,
            comentario="Postulación registrada en 1 clic por el egresado"
        )
        session.add(historial)

        # 6. Incrementar total_postulantes de la vacante
        vacante.total_postulantes = (vacante.total_postulantes or 0) + 1

        await session.commit()
        await session.refresh(nueva_postulacion)

        emp_nombre = empresa.nombre_comercial or empresa.razon_social

        # 7. Enviar correos transaccionales vía Brevo
        await cls._notify_application_created(
            session, empresa, vacante, egresado,
            fallback_email=current_user.get("correo") if current_user else None,
        )

        return PostulacionResponse(
            id=str(nueva_postulacion.id),
            id_vacante=str(nueva_postulacion.id_vacante),
            id_egresado=str(nueva_postulacion.id_egresado),
            id_hoja_vida=str(nueva_postulacion.id_hoja_vida) if nueva_postulacion.id_hoja_vida else None,
            fase_actual=nueva_postulacion.fase_actual,
            porcentaje_afinidad=float(nueva_postulacion.porcentaje_afinidad) if nueva_postulacion.porcentaje_afinidad else None,
            retroalimentacion_reclutador=nueva_postulacion.retroalimentacion_reclutador,
            motivo_descarte=nueva_postulacion.motivo_descarte,
            descartado_en=nueva_postulacion.descartado_en.isoformat() if nueva_postulacion.descartado_en else None,
            postulado_en=nueva_postulacion.postulado_en.isoformat(),
            actualizado_en=nueva_postulacion.actualizado_en.isoformat(),
            vacante_titulo=vacante.titulo,
            vacante_codigo=vacante.codigo_vacante,
            empresa_nombre=emp_nombre,
            egresado_nombre=egresado.nombre_completo,
            egresado_correo=egresado.correo_personal,
            egresado_telefono=egresado.telefono
        )

    @classmethod
    async def get_kanban_board_async(
        cls,
        session: AsyncSession,
        user_id: str,
        user_role: str,
        id_vacante: str,
        company_id: Optional[str] = None
    ) -> KanbanBoardDetailedResponse:
        """
        Retorna el tablero Kanban completo con las 6 columnas del embudo ATS hidratadas.
        """
        try:
            vac_uuid = uuid.UUID(str(id_vacante))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"codigo": "UUID_INVALIDO", "mensaje": "Identificador UUID inválido."}
            )

        vacante = (await session.execute(
            select(Vacante).where(Vacante.id == vac_uuid)
        )).scalar_one_or_none()

        if not vacante:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"codigo": "VACANTE_NO_ENCONTRADA", "mensaje": "La vacante no existe."}
            )

        # Control de acceso multi-tenancy
        if user_role not in ("superadmin_vincula", "superadmin"):
            if company_id and str(vacante.id_empresa) != str(company_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={"codigo": "ACCESO_DENEGADO", "mensaje": "No tienes permisos para ver el embudo ATS de esta vacante."}
                )

        # Consultar todas las postulaciones vinculadas
        postulaciones = (await session.execute(
            select(Postulacion)
            .where(Postulacion.id_vacante == vac_uuid)
            .order_by(Postulacion.postulado_en.desc())
        )).scalars().all()

        columnas: Dict[str, List[KanbanCandidateCardResponse]] = {
            "review": [],
            "preselected": [],
            "evaluation": [],
            "interview": [],
            "offer": [],
            "hired": [],
            "discarded": []
        }

        for p in postulaciones:
            card = cls._build_candidate_card(p)
            st = card.stage
            if st in columnas:
                columnas[st].append(card)
            else:
                columnas["review"].append(card)

        total_cand = len(postulaciones)
        hero_stats = [
            {"value": str(total_cand), "label": "Postulantes"},
            {"value": str(len(columnas["review"])), "label": "Por Revisar"},
            {"value": str(len(columnas["interview"])), "label": "En Entrevista"},
            {"value": str(len(columnas["offer"])), "label": "Finalistas"},
            {"value": str(len(columnas["hired"])), "label": "Contratados"},
        ]

        emp_nombre = (vacante.empresa.nombre_comercial or vacante.empresa.razon_social) if vacante.empresa else ""
        sede_nombre = vacante.sede.nombre if vacante.sede else ""

        return KanbanBoardDetailedResponse(
            id_vacante=str(vacante.id),
            titulo_vacante=vacante.titulo,
            codigo_vacante=vacante.codigo_vacante,
            empresa_nombre=emp_nombre,
            sede_nombre=sede_nombre,
            total_candidatos=total_cand,
            hero_stats=hero_stats,
            columnas=columnas
        )

    @classmethod
    async def _registrar_vinculacion_laboral(cls, session: AsyncSession, postulacion: Postulacion) -> None:
        """Crea el registro laboral del egresado contratado (uno por postulación) para el seguimiento de la IES."""
        vac, egr = postulacion.vacante, postulacion.egresado
        academicos = list(egr.academicos or []) if egr else []
        if not vac or not academicos:
            return  # sin registro académico no hay programa al cual atribuir la contratación
        afines = {pa.id_programa for pa in (vac.programas_afines or [])}
        academico = next((a for a in academicos if a.id_programa in afines), academicos[0])
        empresa = (vac.empresa.nombre_comercial or vac.empresa.razon_social) if vac.empresa else "Empresa"
        rango = None
        if not vac.salario_es_confidencial and vac.salario_minimo and vac.salario_maximo:
            rango = f"{int(vac.salario_minimo):,} - {int(vac.salario_maximo):,}".replace(",", ".")
        await session.execute(
            text("""
                INSERT INTO registros_laborales_egresado
                    (id_academico, empresa_contratante, cargo_desempenado, tipo_contrato, modalidad_trabajo,
                     rango_salarial, fecha_vinculacion, id_postulacion)
                VALUES (:academico, :empresa, :cargo, :contrato, :modalidad, :rango, CURRENT_DATE, :postulacion)
                ON CONFLICT (id_postulacion) DO NOTHING
            """),
            {
                "academico": academico.id, "empresa": empresa[:150], "cargo": vac.titulo[:150],
                "contrato": vac.tipo_contrato[:60], "modalidad": str(vac.modalidad)[:50],
                "rango": rango, "postulacion": postulacion.id,
            },
        )

    @classmethod
    async def mover_fase_candidato(
        cls,
        session: AsyncSession,
        user_id: str,
        user_role: str,
        id_postulacion: str,
        payload: MoverFaseRequest,
        company_id: Optional[str] = None
    ) -> KanbanCandidateCardResponse:
        """
        Mueve un candidato de fase en el embudo ATS (drag-and-drop).
        Registra la transición en historial_fases_postulacion, maneja descartes y envía correo al candidato.
        """
        raw_fase = (payload.fase_nueva or payload.nueva_fase or "").strip().lower()
        db_fase = cls.STAGE_UI_TO_DB.get(raw_fase)
        if not db_fase:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "codigo": "FASE_INVALIDA",
                    "mensaje": f"La fase '{raw_fase}' no es válida. Opciones: review/en_revision, preselected/preseleccionados, evaluation/prueba_tecnica, interview/entrevista, offer/oferta_finalistas, hired/contratado, discarded/descartados."
                }
            )

        motivo_descarte = (payload.motivo_descarte or "").strip()
        if db_fase == "descartados" and not motivo_descarte:
            # Sin motivo no se puede analizar por qué no avanzan los egresados de un programa
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"codigo": "MOTIVO_DESCARTE_REQUERIDO", "mensaje": "Indica el motivo del descarte."}
            )

        postulacion = None
        post_uuid = None
        user_uuid = None
        try:
            user_uuid = uuid.UUID(str(user_id))
        except ValueError:
            pass

        try:
            post_uuid = uuid.UUID(str(id_postulacion))
            postulacion = (await session.execute(
                select(Postulacion).where(Postulacion.id == post_uuid)
            )).scalar_one_or_none()
        except ValueError:
            pass

        retro_txt = (payload.retroalimentacion or payload.notas_fase or payload.comentario or "").strip() or None

        if not postulacion:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"codigo": "POSTULACION_NO_ENCONTRADA", "mensaje": "La postulación no existe."}
            )

        # Validación multi-tenancy
        if user_role not in ("superadmin_vincula", "superadmin"):
            if company_id and str(postulacion.vacante.id_empresa) != str(company_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={"codigo": "ACCESO_DENEGADO", "mensaje": "No tienes permisos para modificar candidatos de esta vacante."}
                )

        fase_anterior = postulacion.fase_actual

        if fase_anterior == db_fase:
            return cls._build_candidate_card(postulacion)

        # Si se mueve a descartados, registrar motivo y timestamp
        if db_fase == "descartados":
            postulacion.motivo_descarte = motivo_descarte
            postulacion.descartado_en = datetime.now(timezone.utc)
        elif fase_anterior == "descartados":
            # Si se reactiva, limpiar el descarte
            postulacion.motivo_descarte = None
            postulacion.descartado_en = None

        if retro_txt:
            postulacion.retroalimentacion_reclutador = retro_txt

        postulacion.fase_actual = db_fase

        if db_fase == "contratado":
            await cls._registrar_vinculacion_laboral(session, postulacion)
        elif fase_anterior == "contratado":
            # La contratación se revirtió: el registro laboral que generó deja de ser cierto
            await session.execute(
                text("DELETE FROM registros_laborales_egresado WHERE id_postulacion = :pid"), {"pid": postulacion.id}
            )

        # Registrar en auditoría
        comentario_log = payload.comentario or payload.notas_fase or f"Transición de '{fase_anterior}' hacia '{db_fase}'"
        if user_uuid:
            historial = HistorialFasePostulacion(
                id_postulacion=postulacion.id,
                fase_anterior=fase_anterior,
                fase_nueva=db_fase,
                cambiado_por_usuario=user_uuid,
                comentario=comentario_log
            )
            session.add(historial)

        await session.commit()
        await session.refresh(postulacion)

        egr = postulacion.egresado
        vac = postulacion.vacante
        emp_nombre = (vac.empresa.nombre_comercial or vac.empresa.razon_social) if (vac and vac.empresa) else ""
        vac_titulo = vac.titulo if vac else ""

        if egr:
            await avisos.notificar(
                session, [egr.id_usuario], "fase_postulacion", "Actualización de tu postulación",
                f"{vac_titulo} · {emp_nombre}: ahora está en «{get_stage_display_info(db_fase)['label']}».",
                "/dashboard/postulaciones", commit=True)

        # Enviar correo de avance de fase al egresado vía Brevo
        if egr and egr.correo_personal:
            await send_vincula_email("fase_postulacion", egr.correo_personal,
                                     nombre=egr.nombre_completo,
                                     vacante=vac_titulo, empresa=emp_nombre, fase_nueva=db_fase)

        return cls._build_candidate_card(postulacion)

    @classmethod
    async def agregar_nota_candidato(
        cls,
        session: AsyncSession,
        user_id: str,
        id_postulacion: str,
        payload: NotaReclutadorRequest,
        company_id: str,
    ) -> NotaReclutadorResponse:
        """Agrega una nota privada de reclutador a la postulación."""
        try:
            post_uuid = uuid.UUID(str(id_postulacion))
            user_uuid = uuid.UUID(str(user_id))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"codigo": "UUID_INVALIDO", "mensaje": "UUID inválido."}
            )

        postulacion = (await session.execute(
            select(Postulacion).where(Postulacion.id == post_uuid)
        )).scalar_one_or_none()

        if not postulacion:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"codigo": "POSTULACION_NO_ENCONTRADA", "mensaje": "Postulación no encontrada."}
            )

        if not company_id or str(postulacion.vacante.id_empresa) != str(company_id):
            raise HTTPException(status_code=403, detail="Esta postulación no pertenece a tu empresa.")

        # Resolver reclutador
        rec = (await session.execute(
            select(ReclutadorEmpresa).where(ReclutadorEmpresa.id_usuario == user_uuid)
        )).scalar_one_or_none()

        if not rec:
            rec = (await session.execute(
                select(ReclutadorEmpresa).where(ReclutadorEmpresa.id == postulacion.vacante.id_reclutador_responsable)
            )).scalar_one_or_none()

        if not rec:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"codigo": "RECLUTADOR_NO_ENCONTRADO", "mensaje": "No hay un reclutador registrado para asignar la nota."}
            )

        nota_txt = (payload.texto_nota or payload.nota or "").strip()
        nueva_nota = NotaReclutadorPostulacion(
            id_postulacion=postulacion.id,
            id_reclutador=rec.id,
            texto_nota=nota_txt
        )
        session.add(nueva_nota)
        await session.commit()
        await session.refresh(nueva_nota)

        return NotaReclutadorResponse(
            id=str(nueva_nota.id),
            id_postulacion=str(nueva_nota.id_postulacion),
            id_reclutador=str(nueva_nota.id_reclutador),
            nombre_reclutador=rec.nombre_completo,
            texto_nota=nueva_nota.texto_nota,
            creado_en=nueva_nota.creado_en.isoformat()
        )

    @classmethod
    async def programar_entrevista_candidato(
        cls,
        session: AsyncSession,
        user_id: str,
        id_postulacion: str,
        payload: ProgramarEntrevistaRequest,
        company_id: str,
    ) -> EntrevistaResponse:
        """Programa una entrevista y mueve automáticamente al candidato a la fase 'entrevista'."""
        interview_summary = (
            f"{payload.fecha_entrevista} · {payload.franja_horaria} ({payload.modalidad})"
            + (f" — Enlace/Lugar: {payload.url_reunion}" if payload.url_reunion else "")
        )

        postulacion = None
        post_uuid = None
        user_uuid = None
        try:
            user_uuid = uuid.UUID(str(user_id))
            parsed_date = datetime.strptime(payload.fecha_entrevista, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=422, detail="Fecha de entrevista inválida.")
        hoy = datetime.now(timezone(timedelta(hours=-5))).date()  # Colombia: UTC-5 todo el año
        if parsed_date < hoy:
            raise HTTPException(
                status_code=422,
                detail={"codigo": "FECHA_PASADA", "mensaje": "La fecha de la entrevista ya pasó."}
            )

        try:
            post_uuid = uuid.UUID(str(id_postulacion))
            postulacion = (await session.execute(
                select(Postulacion).where(Postulacion.id == post_uuid)
            )).scalar_one_or_none()
        except ValueError:
            pass

        if not postulacion:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"codigo": "POSTULACION_NO_ENCONTRADA", "mensaje": "Postulación no encontrada."}
            )

        if not company_id or str(postulacion.vacante.id_empresa) != str(company_id):
            raise HTTPException(status_code=403, detail="Esta postulación no pertenece a tu empresa.")

        rec = (await session.execute(
            select(ReclutadorEmpresa).where(ReclutadorEmpresa.id_usuario == user_uuid)
        )).scalar_one_or_none()

        if not rec:
            rec = (await session.execute(
                select(ReclutadorEmpresa).where(ReclutadorEmpresa.id == postulacion.vacante.id_reclutador_responsable)
            )).scalar_one_or_none()

        if not rec:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"codigo": "RECLUTADOR_NO_ENCONTRADO", "mensaje": "No se encontró reclutador responsable para la entrevista."}
            )

        # Virtual sin enlace propio: se genera una sala; presencial: url_reunion guarda el lugar
        enlace = payload.url_reunion or (generate_meeting_link() if payload.modalidad == "Virtual" else None)
        entrevista = EntrevistaPostulacion(
            id_postulacion=postulacion.id,
            id_reclutador=rec.id,
            fecha_entrevista=parsed_date,
            franja_horaria=payload.franja_horaria.strip(),
            modalidad=payload.modalidad.strip(),
            url_reunion=enlace,
            objetivo=payload.objetivo.strip(),
            estado="programada"
        )
        session.add(entrevista)

        fase_ant = postulacion.fase_actual
        # Mover a fase 'entrevista' si aún no lo estaba
        if postulacion.fase_actual in ("en_revision", "preseleccionados", "prueba_tecnica"):
            postulacion.fase_actual = "entrevista"
            if user_uuid:
                historial = HistorialFasePostulacion(
                    id_postulacion=postulacion.id,
                    fase_anterior=fase_ant,
                    fase_nueva="entrevista",
                    cambiado_por_usuario=user_uuid,
                    comentario=f"Entrevista programada para el {payload.fecha_entrevista} ({payload.franja_horaria})"
                )
                session.add(historial)

        await session.commit()
        await session.refresh(entrevista)

        egr = postulacion.egresado
        vac = postulacion.vacante
        emp_nombre = (vac.empresa.nombre_comercial or vac.empresa.razon_social) if (vac and vac.empresa) else ""
        vac_titulo = vac.titulo if vac else ""
        if egr:
            await avisos.notificar(
                session, [egr.id_usuario], "entrevista_programada", "Te citaron a una entrevista",
                f"{emp_nombre} te cita para «{vac_titulo}» el {entrevista.fecha_entrevista.isoformat()} a las "
                f"{entrevista.franja_horaria} ({entrevista.modalidad}).", "/dashboard/postulaciones", commit=True)
        # Un solo correo, con lo que el egresado necesita: cuándo, cómo y dónde (sustituye al aviso genérico de fase)
        correo_enviado = False
        if egr and egr.correo_personal:
            try:
                correo_enviado = await send_vincula_email(
                    "entrevista_programada", egr.correo_personal, nombre=egr.nombre_completo,
                    vacante=vac_titulo, empresa=emp_nombre, fecha=entrevista.fecha_entrevista.isoformat(),
                    franja=entrevista.franja_horaria, modalidad=entrevista.modalidad, enlace=entrevista.url_reunion,
                    objetivo=entrevista.objetivo, reclutador=rec.nombre_completo,
                    responder_url=make_response_url(entrevista.id))
            except Exception as exc:  # noqa: BLE001  la cita ya quedó registrada
                logger.warning("Correo de entrevista no enviado: tipo=%s", type(exc).__name__)

        return EntrevistaResponse(
            id=str(entrevista.id),
            id_postulacion=str(entrevista.id_postulacion),
            id_reclutador=str(entrevista.id_reclutador),
            nombre_reclutador=rec.nombre_completo,
            fecha_entrevista=entrevista.fecha_entrevista.isoformat(),
            franja_horaria=entrevista.franja_horaria,
            modalidad=entrevista.modalidad,
            url_reunion=entrevista.url_reunion,
            objetivo=entrevista.objetivo,
            estado=entrevista.estado,
            creado_en=entrevista.creado_en.isoformat(),
            correo_enviado=bool(correo_enviado),
        )

    @classmethod
    async def get_candidate_diploma_url_async(
        cls,
        session: AsyncSession,
        id_postulacion: str,
        user_role: str,
        company_id: Optional[str] = None,
        expires_in: int = 3600,
    ) -> CandidateDiplomaUrlResponse:
        """
        Genera una URL firmada temporal de Supabase Storage para que el reclutador o administrador
        de la empresa pueda visualizar el diploma/título en PDF del candidato postulado,
        incluso cuando el título ya se encuentra verificado por la institución.
        """
        try:
            post_uuid = uuid.UUID(str(id_postulacion))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"codigo": "UUID_INVALIDO", "mensaje": "Identificador de postulación inválido."}
            )

        postulacion = (await session.execute(
            select(Postulacion).where(Postulacion.id == post_uuid)
        )).scalar_one_or_none()

        if not postulacion:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"codigo": "POSTULACION_NO_ENCONTRADA", "mensaje": "La postulación no existe."}
            )

        if user_role not in ("superadmin_vincula", "superadmin"):
            if not company_id or not postulacion.vacante or str(postulacion.vacante.id_empresa) != str(company_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={"codigo": "ACCESO_DENEGADO", "mensaje": "No tienes permisos para ver el diploma de un candidato de otra empresa."}
                )

        egr = postulacion.egresado
        academic_rec = None
        if egr and hasattr(egr, "academicos") and egr.academicos:
            academic_rec = next(
                (
                    a for a in egr.academicos
                    if getattr(a, "diploma_cargado_por_egresado", False) and getattr(a, "url_diploma_pdf", None)
                ),
                egr.academicos[0]
            )

        if not academic_rec and postulacion.id_egresado:
            academic_rec = (await session.execute(
                select(AcademicoEgresado)
                .where(AcademicoEgresado.id_egresado == postulacion.id_egresado)
                .order_by(AcademicoEgresado.creado_en.desc())
            )).scalars().first()

        if not academic_rec:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"codigo": "DIPLOMA_NO_ENCONTRADO", "mensaje": "El candidato no tiene un registro académico asociado."}
            )

        bucket = settings.SUPABASE_STORAGE_BUCKET_DIPLOMAS
        raw_url = (academic_rec.url_diploma_pdf or "").strip() if getattr(academic_rec, "diploma_cargado_por_egresado", False) else ""

        if not raw_url or raw_url.startswith(("/storage/mock/", "/storage/local-mock/", "/mock/")):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "codigo": "DIPLOMA_SIN_ARCHIVO",
                    "mensaje": "El egresado aún no ha cargado el archivo PDF de su título o diploma en la plataforma."
                }
            )

        nombre_archivo = raw_url.split("/")[-1].split("?")[0] or "diploma.pdf"

        if f"/object/public/{bucket}/" in raw_url:
            path_in_bucket = raw_url.split(f"/object/public/{bucket}/")[-1]
        elif f"/object/sign/{bucket}/" in raw_url:
            path_in_bucket = raw_url.split(f"/object/sign/{bucket}/")[-1].split("?")[0]
        elif f"/{bucket}/" in raw_url:
            path_in_bucket = raw_url.split(f"/{bucket}/")[-1].split("?")[0]
        elif raw_url.startswith("http") and settings.SUPABASE_URL and not raw_url.startswith(settings.SUPABASE_URL):
            raise HTTPException(status_code=404, detail="El diploma no está almacenado en el repositorio documental autorizado.")
        else:
            path_in_bucket = raw_url.lstrip("/")

        signed_url = await SupabaseStorageService.create_signed_url(
            bucket_name=bucket,
            file_path=path_in_bucket,
            expires_in=expires_in,
        )

        raw_degree_date = getattr(academic_rec, "fecha_grado", None)
        degree_date = (
            raw_degree_date.isoformat()
            if hasattr(raw_degree_date, "isoformat")
            else (str(raw_degree_date) if raw_degree_date else None)
        )
        degree_status = getattr(academic_rec, "estado_verificacion", None)
        degree_verified = bool(
            getattr(academic_rec, "validado_por_ies", False) or degree_status == "aprobado"
        )

        return CandidateDiplomaUrlResponse(
            id_postulacion=str(postulacion.id),
            id_academico=str(academic_rec.id),
            nombre_archivo=nombre_archivo,
            url_segura=signed_url,
            expira_en_segundos=expires_in,
            titulo_verificado=degree_verified,
            estado_verificacion=degree_status,
            numero_acta_grado=getattr(academic_rec, "numero_acta_grado", None),
            numero_libro_folio=getattr(academic_rec, "numero_libro_folio", None),
            fecha_grado=degree_date,
            sello_digital=getattr(academic_rec, "sello_digital", None),
        )

