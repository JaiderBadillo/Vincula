"""
Lógica del Motor de Vacantes Formales y ATS Kanban (Fase 4 Paso 2).
Garantiza:
- Gating de Cuarentena (RNF-01): Cero vacantes abiertas de empresas no aprobadas visibles al público.
- Paginación y Filtrado Multicriterio con SLA < 3.0s (RNF-02).
- Multi-tenancy estricto: Sedes y reclutadores pertenecientes a la empresa.
- Gestión de taxonomía de competencias y programas académicos afines.
- Trazabilidad y compatibilidad hacia atrás con el ATS Kanban.
"""

import uuid
import time
import re
from datetime import datetime, date, timezone
from typing import List, Dict, Any, Optional
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func, desc, or_, and_, text

from app.modules.companies.models import Empresa, SedeEmpresa, ReclutadorEmpresa
from app.modules.institutions.models import ProgramaAcademico
from app.core.skills_taxonomy import normalize_text
from app.modules.graduates.models import Egresado, AcademicoEgresado
from app.integrations.n8n_webhooks import N8nWebhookDispatcher
from app.integrations.transactional_notifications import send_vincula_email
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
        nivel_experiencia: Optional[str] = None
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
    async def get_public_vacancy_detail(cls, session: AsyncSession, vacancy_id: str) -> VacanteResponse:
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

        # 6. Crear la entidad Vacante
        nueva_vacante = Vacante(
            id_empresa=val_comp,
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
            requisitos=payload.requisitos or ["Título profesional o estudiante de últimos semestres"],
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

        for c_item in competencias_a_procesar:
            c_name = c_item.nombre.strip()
            slug = _slugify(c_name)
            if not slug:
                continue

            comp_db = (await session.execute(
                select(TaxonomiaCompetencia).where(TaxonomiaCompetencia.etiqueta_normalizada == slug)
            )).scalar_one_or_none()

            if not comp_db:
                comp_db = TaxonomiaCompetencia(
                    nombre=c_name,
                    categoria=c_item.categoria if c_item.categoria in ("tecnica", "blanda") else "tecnica",
                    etiqueta_normalizada=slug
                )
                session.add(comp_db)
                await session.flush()

            # Relacionar competencia a vacante
            session.add(
                CompetenciaExigidaVacante(
                    id_vacante=nueva_vacante.id,
                    id_competencia=comp_db.id,
                    es_obligatoria=c_item.es_obligatoria
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
        """Avisa por correo a la empresa que su vacante quedó publicada; un fallo nunca bloquea la publicación."""
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
        if payload.salario_minimo is not None:
            vacante.salario_minimo = payload.salario_minimo
        if payload.salario_maximo is not None:
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
        if payload.programas_afines_nombres is not None:
            await session.execute(delete(ProgramaAfinVacante).where(ProgramaAfinVacante.id_vacante == vacante.id))
            await cls._link_programs_by_name(session, vacante.id, payload.programas_afines_nombres, set())

        await session.commit()
        await session.refresh(vacante)
        return cls._build_vacante_response(vacante)

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

        # Extraer programa e institución del egresado si existen
        prog_nombre = ""
        inst_nombre = ""
        grad_year = None
        if hasattr(egr, "academicos") and egr.academicos:
            academic_rec = egr.academicos[0]
            if hasattr(academic_rec, "programa") and academic_rec.programa:
                prog_nombre = academic_rec.programa.nombre
            if hasattr(academic_rec, "institucion") and academic_rec.institucion:
                inst_nombre = academic_rec.institucion.nombre_oficial or academic_rec.institucion.nombre_corto
            if academic_rec.ano_graduacion:
                grad_year = str(academic_rec.ano_graduacion)

        # Última nota de reclutador
        latest_note = p.notas[0].texto_nota if (hasattr(p, "notas") and p.notas) else None

        # Próxima entrevista
        interview_info = None
        if hasattr(p, "entrevistas") and p.entrevistas:
            first_ent = p.entrevistas[0]
            interview_info = f"{first_ent.fecha_entrevista.strftime('%Y-%m-%d')} · {first_ent.franja_horaria} ({first_ent.modalidad})"

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

        # 7. Disparar webhook n8n y enviar correos transaccionales (Brevo / fallback n8n)
        await N8nWebhookDispatcher.dispatch_event(
            "postulacion-creada",
            {
                "evento": "postulacion.creada",
                "id_postulacion": str(nueva_postulacion.id),
                "id_vacante": str(vacante.id),
                "vacante_titulo": vacante.titulo,
                "vacante_codigo": vacante.codigo_vacante,
                "empresa_nombre": emp_nombre,
                "egresado_nombre": egresado.nombre_completo,
                "egresado_correo": egresado.correo_personal,
                "fase_actual": "en_revision",
            }
        )
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
        vac_codigo = vac.codigo_vacante if vac else ""

        # Disparar webhook hacia n8n y enviar correo de avance de fase al egresado
        await N8nWebhookDispatcher.dispatch_event(
            "postulacion-cambio-fase",
            {
                "evento": "postulacion.cambio_fase",
                "id_postulacion": str(postulacion.id),
                "candidato_nombre": egr.nombre_completo if egr else "",
                "candidato_correo": egr.correo_personal if egr else "",
                "vacante_titulo": vac_titulo,
                "vacante_codigo": vac_codigo,
                "empresa_nombre": emp_nombre,
                "fase_anterior": fase_anterior,
                "fase_nueva": db_fase,
                "retroalimentacion": postulacion.motivo_descarte if db_fase == "descartados" else retro_txt,
            }
        )
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

        entrevista = EntrevistaPostulacion(
            id_postulacion=postulacion.id,
            id_reclutador=rec.id,
            fecha_entrevista=parsed_date,
            franja_horaria=payload.franja_horaria.strip(),
            modalidad=payload.modalidad.strip(),
            url_reunion=payload.url_reunion.strip() if payload.url_reunion else None,
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
        if fase_ant != postulacion.fase_actual and egr and egr.correo_personal:
            await send_vincula_email("fase_postulacion", egr.correo_personal,
                                     nombre=egr.nombre_completo,
                                     vacante=vac_titulo, empresa=emp_nombre, fase_nueva="entrevista")

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
            creado_en=entrevista.creado_en.isoformat()
        )

