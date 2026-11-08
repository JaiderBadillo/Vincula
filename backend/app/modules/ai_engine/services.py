"""
Servicio del Motor de Inteligencia Artificial y Matching de Talento (Fase 6).
Calcula afinidad semántica, compatibilidad curricular, brechas de competencias y recomendaciones.
Costo en tokens: $0.00 (Algoritmo determinista + taxonomía de grafos de conocimiento O(N)).
"""

import uuid
from typing import List, Dict, Any, Optional, Tuple, Set
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from app.core.skills_taxonomy import (
    KNOWLEDGE_FAMILIES,
    SUBJECT_KEYWORD_RULES,
    normalize_text,
    find_tool_equivalence,
    match_subject_to_skills
)
from app.modules.vacancies_ats.models import (
    Vacante,
    CompetenciaExigidaVacante,
    ProgramaAfinVacante,
    TaxonomiaCompetencia
)
from app.modules.companies.models import Empresa
from app.modules.graduates.models import (
    Egresado,
    AcademicoEgresado,
    CompetenciaEgresado
)
from app.modules.ai_engine.schemas import (
    CandidateMatchResult,
    RecommendedVacancyItem,
    RecommendedVacanciesResponse
)


class TalentMatcherService:
    """
    Motor híbrido de evaluación de compatibilidad entre egresados y vacantes laborales.
    Combina análisis de pensum curricular verificado, competencias declaradas y requisitos empresariales.
    """

    @classmethod
    def _extract_egresado_skills(cls, egresado: Egresado) -> Tuple[Set[str], List[str], Optional[str], bool]:
        """
        Extrae el universo de habilidades del egresado:
        1. Competencias registradas explícitamente en competencias_egresado.
        2. Competencias inferidas del pensum curricular formal de su carrera (acreditado por la IES).
        Retorna: (set_tokens_normalizados, lista_nombres_legibles, nombre_carrera, tiene_sello_digital)
        """
        raw_skills: Set[str] = set()
        display_skills: List[str] = []
        carrera_nombre: Optional[str] = None
        tiene_sello = False

        # 1. Habilidades explícitas
        if hasattr(egresado, "competencias") and egresado.competencias:
            for c in egresado.competencias:
                if c.competencia:
                    raw_skills.add(normalize_text(c.competencia.nombre))
                    display_skills.append(c.competencia.nombre)
                    if c.competencia.etiqueta_normalizada:
                        raw_skills.add(normalize_text(c.competencia.etiqueta_normalizada))

        # 2. Competencias inferidas de su carrera o título verificado
        if hasattr(egresado, "academicos") and egresado.academicos:
            for ac in egresado.academicos:
                if ac.sello_digital:
                    tiene_sello = True
                prog_name = ac.programa.nombre if (ac.programa and hasattr(ac.programa, "nombre")) else None
                if prog_name:
                    if not carrera_nombre:
                        carrera_nombre = prog_name
                    # Inferir paquete de competencias curriculares de la carrera
                    mapped = match_subject_to_skills(prog_name)
                    for sk in mapped.get("skills", []):
                        raw_skills.add(normalize_text(sk))
                        if sk not in display_skills:
                            display_skills.append(sk)
                    for tl in mapped.get("tools", []):
                        raw_skills.add(normalize_text(tl))
                        if tl not in display_skills:
                            display_skills.append(tl)

        return raw_skills, display_skills, carrera_nombre or "Programa Profesional", tiene_sello

    @classmethod
    def _extract_vacancy_requirements(cls, vacante: Vacante) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], Set[uuid.UUID]]:
        """
        Extrae y categoriza los requisitos y programas afines de la vacante.
        Retorna: (obligatorios, deseables, set_programas_afines_ids)
        """
        obligatorios: List[Dict[str, Any]] = []
        deseables: List[Dict[str, Any]] = []
        programas_afines_ids: Set[uuid.UUID] = set()

        # Desde tabla competencias_exigidas_vacante
        if hasattr(vacante, "competencias") and vacante.competencias:
            for comp_rel in vacante.competencias:
                if comp_rel.competencia:
                    item = {
                        "nombre": comp_rel.competencia.nombre,
                        "normalizado": normalize_text(comp_rel.competencia.nombre),
                        "categoria": str(comp_rel.competencia.categoria) if comp_rel.competencia.categoria else "tecnica"
                    }
                    if comp_rel.es_obligatoria:
                        obligatorios.append(item)
                    else:
                        deseables.append(item)

        # Si no había en la tabla relacional, procesar el array vacante.requisitos (JSON o lista)
        if not obligatorios and vacante.requisitos:
            req_list = vacante.requisitos if isinstance(vacante.requisitos, list) else [str(vacante.requisitos)]
            for r in req_list:
                obligatorios.append({
                    "nombre": str(r).strip(),
                    "normalizado": normalize_text(str(r)),
                    "categoria": "tecnica"
                })

        # Extraer programas afines
        if hasattr(vacante, "programas_afines") and vacante.programas_afines:
            for p in vacante.programas_afines:
                programas_afines_ids.add(p.id_programa)

        return obligatorios, deseables, programas_afines_ids

    @classmethod
    def calculate_match(
        cls,
        egresado: Egresado,
        vacante: Vacante
    ) -> CandidateMatchResult:
        """
        Calcula el puntaje de afinidad y genera el desglose de compatibilidad explicable.
        Ponderación:
        - 50%: Requisitos obligatorios
        - 25%: Competencias deseables y complementarias
        - 25%: Compatibilidad académica del programa e institución
        """
        egr_tokens, egr_display_skills, carrera_nombre, tiene_sello = cls._extract_egresado_skills(egresado)
        obligatorios, deseables, prog_afines_ids = cls._extract_vacancy_requirements(vacante)

        skills_match: List[str] = []
        skills_equivalent: List[str] = []
        missing_skills: List[str] = []

        # ----------------------------------------------------------------------
        # 1. EVALUACIÓN DE OBLIGATORIOS (50%)
        # ----------------------------------------------------------------------
        score_obligatorio = 0.0
        if not obligatorios:
            # Si la vacante no especificó requisitos obligatorios, otorga el puntaje base
            score_obligatorio = 50.0
        else:
            weight_per_req = 50.0 / len(obligatorios)
            for req in obligatorios:
                req_norm = req["normalizado"]
                req_name = req["nombre"]

                # Match directo
                if any(req_norm in token or token in req_norm for token in egr_tokens):
                    score_obligatorio += weight_per_req
                    if req_name not in skills_match:
                        skills_match.append(req_name)
                    continue

                # Match por equivalencia tecnológica
                found_equiv = False
                for token in egr_tokens:
                    if find_tool_equivalence(req_norm, token):
                        score_obligatorio += weight_per_req * 0.75
                        equiv_label = f"{req_name} (compatible con {token.title()})"
                        if equiv_label not in skills_equivalent:
                            skills_equivalent.append(equiv_label)
                        if req_name not in skills_match:
                            skills_match.append(req_name)
                        found_equiv = True
                        break

                if not found_equiv:
                    if req_name not in missing_skills:
                        missing_skills.append(req_name)

        # ----------------------------------------------------------------------
        # 2. EVALUACIÓN DE DESEABLES (25%)
        # ----------------------------------------------------------------------
        score_deseable = 0.0
        if not deseables:
            # Si no hay deseables formales, evaluar contra descripción y responsabilidades
            text_desc = normalize_text(f"{vacante.titulo} {vacante.descripcion or ''}")
            matched_context = [s for s in egr_display_skills if normalize_text(s) in text_desc]
            if matched_context:
                score_deseable = min(25.0, len(matched_context) * 6.25)
            else:
                score_deseable = 18.0  # Base estándar
        else:
            weight_per_des = 25.0 / len(deseables)
            for des in deseables:
                des_norm = des["normalizado"]
                des_name = des["nombre"]
                if any(des_norm in token or token in des_norm for token in egr_tokens):
                    score_deseable += weight_per_des
                    if des_name not in skills_match:
                        skills_match.append(des_name)
                else:
                    for token in egr_tokens:
                        if find_tool_equivalence(des_norm, token):
                            score_deseable += weight_per_des * 0.75
                            break

        # ----------------------------------------------------------------------
        # 3. AFINIDAD ACADÉMICA (25%)
        # ----------------------------------------------------------------------
        score_academico = 0.0
        afinidad_academica = False

        egresado_prog_ids: Set[uuid.UUID] = set()
        if hasattr(egresado, "academicos") and egresado.academicos:
            for ac in egresado.academicos:
                if ac.id_programa:
                    egresado_prog_ids.add(ac.id_programa)

        # 3.1 Coincidencia de programa formal
        if prog_afines_ids and egresado_prog_ids.intersection(prog_afines_ids):
            score_academico = 25.0
            afinidad_academica = True
        else:
            # 3.2 Coincidencia semántica por nombre de carrera y categoría de vacante
            clean_carrera = normalize_text(carrera_nombre)
            clean_vac_cat = normalize_text(f"{vacante.categoria or ''} {vacante.titulo}")

            # Detección por familias
            palabras_clave_area = [
                ("sistemas", ["sistemas", "software", "tecnolog", "programacion", "desarrollo", "computac", "datos"]),
                ("contad", ["contab", "financ", "tribut", "tributaria", "auditor"]),
                ("admin", ["administrac", "gestion", "gerencia", "comercial", "negocios"]),
                ("logist", ["logistic", "suministro", "operaciones", "almacen"]),
                ("electr", ["electron", "automatiz", "control", "instrumentac"]),
                ("ambient", ["ambient", "sst", "sostenib", "hseq"])
            ]

            es_afin_por_texto = False
            for raiz, sinonimos in palabras_clave_area:
                if any(s in clean_carrera for s in sinonimos) and any(s in clean_vac_cat for s in sinonimos):
                    es_afin_por_texto = True
                    break

            if es_afin_por_texto:
                score_academico = 22.0
                afinidad_academica = True
            else:
                score_academico = 15.0

        # Bonus por Sello Digital IES (+3 puntos hasta máx 25 en factor académico)
        if tiene_sello:
            score_academico = min(25.0, score_academico + 3.0)

        # ----------------------------------------------------------------------
        # 4. CONSOLIDACIÓN Y EXPLICABILIDAD
        # ----------------------------------------------------------------------
        raw_final = score_obligatorio + score_deseable + score_academico
        final_score = round(min(100.0, max(15.0, raw_final)), 1)
        porcentaje_int = int(round(final_score))

        if final_score >= 85.0:
            nivel = "alta"
            badge = f"{porcentaje_int}% Match"
            motivo = f"Alta compatibilidad con {carrera_nombre}. Cumple con las competencias críticas solicitadas por la empresa."
        elif final_score >= 70.0:
            nivel = "media_alta"
            badge = f"{porcentaje_int}% Afinidad"
            motivo = f"Afinidad sólida con tu formación en {carrera_nombre}. Se recomienda complementar con {missing_skills[0] if missing_skills else 'herramientas afines'}."
        elif final_score >= 50.0:
            nivel = "moderada"
            badge = f"{porcentaje_int}% Potencial"
            motivo = f"Compatibilidad formativa base. Hay habilidades técnicas específicas por desarrollar."
        else:
            nivel = "baja"
            badge = f"{porcentaje_int}% Perfil Distinto"
            motivo = "Baja coincidencia directa con los requisitos actuales de la convocatoria."

        return CandidateMatchResult(
            match_score=final_score,
            porcentaje_afinidad=porcentaje_int,
            nivel_afinidad=nivel,
            etiqueta_badge=badge,
            skills_match=skills_match,
            missing_skills=missing_skills,
            skills_equivalent=skills_equivalent,
            afinidad_academica=afinidad_academica,
            motivo_recomendacion=motivo
        )

    @classmethod
    async def evaluate_egresado_vacante_async(
        cls,
        session: AsyncSession,
        user_id: str,
        vacante_id: str,
        target_egresado_id: Optional[str] = None
    ) -> CandidateMatchResult:
        """
        Consulta en PostgreSQL y calcula la afinidad para un egresado frente a una vacante.
        """
        try:
            vac_uuid = uuid.UUID(str(vacante_id))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"codigo": "UUID_INVALIDO", "mensaje": "ID de vacante inválido."}
            )

        # Resolver egresado (soporta tanto ID de egresado como ID de usuario)
        if target_egresado_id:
            try:
                egr_uuid = uuid.UUID(str(target_egresado_id))
                egresado = (await session.execute(
                    select(Egresado).where((Egresado.id == egr_uuid) | (Egresado.id_usuario == egr_uuid))
                )).scalar_one_or_none()
            except ValueError:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"codigo": "UUID_INVALIDO", "mensaje": "ID de egresado inválido."})
        else:
            try:
                user_uuid = uuid.UUID(str(user_id))
                egresado = (await session.execute(
                    select(Egresado).where((Egresado.id_usuario == user_uuid) | (Egresado.id == user_uuid))
                )).scalar_one_or_none()
            except ValueError:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"codigo": "UUID_INVALIDO", "mensaje": "ID de usuario inválido."})

        if not egresado:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"codigo": "EGRESADO_NO_ENCONTRADO", "mensaje": "Perfil de egresado no encontrado."}
            )

        vacante = (await session.execute(
            select(Vacante).where(Vacante.id == vac_uuid)
        )).scalar_one_or_none()

        if not vacante:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"codigo": "VACANTE_NO_ENCONTRADA", "mensaje": "Vacante no encontrada."}
            )

        return cls.calculate_match(egresado, vacante)

    @classmethod
    async def get_recommended_vacancies_async(
        cls,
        session: AsyncSession,
        user_id: str,
        limit: int = 20
    ) -> RecommendedVacanciesResponse:
        """
        Retorna el catálogo público de vacantes abiertas ordenadas por el algoritmo de afinidad IA
        para el egresado autenticado.
        """
        try:
            user_uuid = uuid.UUID(str(user_id))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"codigo": "UUID_INVALIDO", "mensaje": "Identificador de usuario inválido."}
            )

        egresado = (await session.execute(
            select(Egresado).where((Egresado.id_usuario == user_uuid) | (Egresado.id == user_uuid))
        )).scalar_one_or_none()

        if not egresado:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"codigo": "EGRESADO_NO_ENCONTRADO", "mensaje": "Perfil de egresado no encontrado."}
            )

        # Consultar vacantes abiertas de empresas aprobadas
        vacantes = (await session.execute(
            select(Vacante)
            .join(Vacante.empresa)
            .where(
                Vacante.estado == "abierta",
                Empresa.estado == "aprobado"
            )
            .order_by(Vacante.publicado_en.desc())
        )).scalars().all()

        # Evaluar cada vacante con el algoritmo de afinidad
        evaluated_items: List[RecommendedVacancyItem] = []
        carrera_principal = "Egresado"
        if egresado.academicos and len(egresado.academicos) > 0:
            carrera_principal = egresado.academicos[0].programa.nombre if egresado.academicos[0].programa else "Profesional"

        for vac in vacantes:
            match_res = cls.calculate_match(egresado, vac)

            # Formateo de salario
            if vac.salario_es_confidencial:
                salario_str = "Salario a convenir (Confidencial)"
            elif vac.salario_minimo and vac.salario_maximo:
                salario_str = f"${float(vac.salario_minimo):,.0f} - ${float(vac.salario_maximo):,.0f} COP"
            elif vac.salario_minimo:
                salario_str = f"Desde ${float(vac.salario_minimo):,.0f} COP"
            else:
                salario_str = "A convenir según experiencia"

            sede_loc = f"{vac.sede.ciudad}, {vac.sede.departamento}" if vac.sede else "Bucaramanga, Santander"
            ciudad = vac.sede.ciudad if vac.sede else "Bucaramanga"
            departamento = vac.sede.departamento if vac.sede else "Santander"

            item = RecommendedVacancyItem(
                id=str(vac.id),
                codigo_vacante=vac.codigo_vacante,
                titulo=vac.titulo,
                empresa_nombre=vac.empresa.nombre_comercial or vac.empresa.razon_social if vac.empresa else "Empresa",
                empresa_logo=vac.empresa.url_logo if vac.empresa else None,
                empresa_verificada=True,
                departamento=departamento,
                ciudad=ciudad,
                modalidad=vac.modalidad or "Presencial",
                salario_minimo=float(vac.salario_minimo) if vac.salario_minimo else None,
                salario_maximo=float(vac.salario_maximo) if vac.salario_maximo else None,
                salario_es_confidencial=vac.salario_es_confidencial,
                salario_formateado=salario_str,
                tipo_contrato=vac.tipo_contrato or "Término Indefinido",
                nivel_experiencia=vac.nivel_experiencia or "Junior",
                categoria=vac.categoria or "General",
                requisitos=vac.requisitos if isinstance(vac.requisitos, list) else ([str(vac.requisitos)] if vac.requisitos else []),
                fecha_publicacion=vac.publicado_en.strftime("%Y-%m-%d") if vac.publicado_en else "2026-01-01",
                match_score=match_res.match_score,
                porcentaje_afinidad=match_res.porcentaje_afinidad,
                nivel_afinidad=match_res.nivel_afinidad,
                etiqueta_badge=match_res.etiqueta_badge,
                skills_match=match_res.skills_match,
                missing_skills=match_res.missing_skills,
                motivo_recomendacion=match_res.motivo_recomendacion
            )
            evaluated_items.append(item)

        # Ordenar por match_score descendente (las mejores coincidencias primero)
        evaluated_items.sort(key=lambda x: x.match_score, reverse=True)
        top_items = evaluated_items[:limit]

        return RecommendedVacanciesResponse(
            total_evaluadas=len(evaluated_items),
            total_recomendadas=len(top_items),
            egresado_nombre=egresado.nombre_completo,
            carrera_principal=carrera_principal,
            vacantes=top_items
        )

