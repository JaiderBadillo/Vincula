"""
Trazabilidad curricular: mide qué tanto cubre la malla de un programa las competencias
que piden las vacantes reales dirigidas a ese programa.

Sin datos sintéticos: si no hay malla o no hay vacantes, el índice es None.

Método (cobertura de la demanda ponderada, en la línea de los índices de alineación
currículo-mercado que cruzan planes de estudio con ofertas de empleo):

    índice = 100 · Σ peso(vacante, competencia) · cobertura(competencia) / Σ peso

    peso       1.0 si la vacante la exige como obligatoria, 0.5 si es deseable
    cobertura  1.0 directa  la malla la enseña (área de una asignatura) o la IES la declaró
               0.5 afín     la malla enseña el área, pero no esa herramienta concreta
               0.0 brecha   no hay asignatura que la respalde

Solo cuentan las vacantes abiertas de empresas aprobadas que marcan el programa como afín
(mismo programa o mismo nombre en otra IES). Las competencias blandas se listan, pero no
entran al índice porque una malla no las declara por asignatura.
"""

import re
import uuid
from datetime import date
from functools import lru_cache
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.skills_taxonomy import (
    KNOWLEDGE_FAMILIES,
    contains_term,
    families_for_text,
    match_subject_to_skills,
    normalize_text,
)
from app.modules.ai_engine.pensum_parser import PensumPDFExtractor
from app.modules.ai_engine.schemas import (
    CurriculumAreaItem,
    CurriculumDemandItem,
    CurriculumPertinenceReport,
    CurriculumSemesterResponse,
    CurriculumSubjectRef,
    CurriculumSubjectResponse,
    PensumSaveRequest,
    PreviousProgramRequest,
)
from app.modules.companies.models import Empresa
from app.modules.institutions.models import ProgramaAcademico
from app.modules.vacancies_ats.models import Vacante

PESO_OBLIGATORIA, PESO_DESEABLE = 1.0, 0.5
COBERTURA = {"directa": 1.0, "afin": 0.5, "brecha": 0.0}
UMBRAL_VACANTE_CUBIERTA = 0.7
SUPERADMIN = ("superadmin_vincula", "superadmin")
ROMANOS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"]


def _key(texto: Optional[str]) -> str:
    """Clave comparable: sin tildes, en minúsculas y con separadores unificados ("HTML/CSS" -> "html css")."""
    return re.sub(r"[^a-z0-9+#.]+", " ", normalize_text(texto or "")).strip(" .")


# Vocabulario de la taxonomía: clave -> (nombre visible, familias que lo contienen)
_VOCAB: Dict[str, Tuple[str, List[str]]] = {}
for _fam_key, _fam in KNOWLEDGE_FAMILIES.items():
    for _term in _fam["canonical_skills"] + _fam["tools"]:
        _VOCAB.setdefault(_key(_term), (_term, []))[1].append(_fam_key)


@lru_cache(maxsize=4096)
def _families_of(term_key: str) -> Tuple[str, ...]:
    """Familias de conocimiento a las que pertenece una competencia demandada."""
    fams: List[str] = []
    for vocab_key, (_, fam_keys) in _VOCAB.items():
        if vocab_key == term_key or (len(term_key) >= 3 and contains_term(term_key, vocab_key)) \
                or (len(vocab_key) >= 3 and contains_term(vocab_key, term_key)):
            fams.extend(f for f in fam_keys if f not in fams)
    fams.extend(f for f in families_for_text(term_key) if f not in fams)
    return tuple(fams)


def _index_pensum(semesters: List[Dict[str, Any]]):
    """
    Lo que la malla respalda:
      terms     término enseñado -> asignaturas (nombre de la materia y competencias de su área)
      declared  herramienta declarada por la IES -> asignaturas
      fams      familia de conocimiento -> asignaturas
    """
    terms: Dict[str, List[CurriculumSubjectRef]] = {}
    declared: Dict[str, List[CurriculumSubjectRef]] = {}
    fams: Dict[str, List[CurriculumSubjectRef]] = {}
    for sem in semesters:
        for sub in sem.get("subjects", []):
            ref = CurriculumSubjectRef(codigo=sub["code"], nombre=sub["name"], semestre=sem["semester_number"],
                                       programa=sem.get("program"))
            terms.setdefault(_key(sub["name"]), []).append(ref)
            for fam in families_for_text(sub["name"]):
                fams.setdefault(fam, []).append(ref)
                for skill in KNOWLEDGE_FAMILIES[fam]["canonical_skills"]:
                    terms.setdefault(_key(skill), []).append(ref)
            for tool in sub.get("tools", []):
                if _key(tool):
                    declared.setdefault(_key(tool), []).append(ref)
    return terms, declared, fams


def _coverage(term_key: str, terms, declared, fams) -> Tuple[str, List[CurriculumSubjectRef], Optional[str]]:
    """Devuelve (cobertura, asignaturas que la respaldan, familia usada)."""
    demand_fams = _families_of(term_key)
    refs: List[CurriculumSubjectRef] = []
    for k, r in terms.items():
        if k == term_key or (len(term_key) >= 3 and contains_term(term_key, k)):
            refs.extend(r)
    for k, r in declared.items():
        # una herramienta declarada es específica: "python" respalda "python avanzado"
        if k == term_key or (len(term_key) >= 3 and contains_term(term_key, k)) or (len(k) >= 3 and contains_term(k, term_key)):
            refs.extend(r)
    if refs:
        unique = list({(r.codigo, r.nombre): r for r in refs}.values())
        return "directa", unique[:4], next((f for f in demand_fams if f in fams), demand_fams[0] if demand_fams else None)
    for fam in demand_fams:
        if fam in fams:
            return "afin", fams[fam][:4], fam
    return "brecha", [], demand_fams[0] if demand_fams else None


def _is_for_program(vac: Any, id_programa: Optional[str], prog_key: str) -> bool:
    return any(
        str(pa.id_programa) == id_programa or (pa.programa is not None and _key(pa.programa.nombre) == prog_key)
        for pa in (vac.programas_afines or [])
    )


def _vacancy_demand(vac: Any) -> Dict[str, Tuple[str, str, bool]]:
    """Competencias que exige una vacante: clave -> (nombre, categoría, es obligatoria)."""
    items: Dict[str, Tuple[str, str, bool]] = {}
    for c in vac.competencias or []:
        if c.competencia is not None and _key(c.competencia.nombre):
            items[_key(c.competencia.nombre)] = (
                c.competencia.nombre.strip(), c.competencia.categoria or "tecnica", bool(c.es_obligatoria)
            )
    if items:
        return items
    # Vacante sin competencias estructuradas: se buscan términos de la taxonomía en su texto.
    # shortcut: solo reconoce el vocabulario de KNOWLEDGE_FAMILIES; ampliar la taxonomía si faltan términos.
    requisitos = _key(" . ".join(vac.requisitos or []))
    resto = _key(" . ".join([vac.titulo or "", vac.descripcion or "", *(vac.responsabilidades or [])]))
    for vocab_key, (display, _) in _VOCAB.items():
        if len(vocab_key) < 3:
            continue
        if contains_term(vocab_key, requisitos):
            items[vocab_key] = (display, "tecnica", True)
        elif contains_term(vocab_key, resto):
            items[vocab_key] = (display, "tecnica", False)
    return items


class CurriculumTraceabilityService:
    """Pertinencia curricular de un programa frente a las vacantes reales dirigidas a él."""

    # ------------------------------------------------------------------ algoritmo (puro)

    @classmethod
    def calculate_pertinence_report(
        cls,
        pensum_data: Dict[str, Any],
        vacantes: List[Any],
        id_programa: Optional[str] = None,
    ) -> CurriculumPertinenceReport:
        prog_name = pensum_data.get("program_name") or "Programa Académico"
        semesters = pensum_data.get("semesters", [])
        total_subjects = sum(len(s.get("subjects", [])) for s in semesters)
        propias = sum(len(s.get("subjects", [])) for s in semesters if not s.get("program"))
        terms, declared, fams = _index_pensum(semesters)

        relevantes = [v for v in vacantes if _is_for_program(v, id_programa, _key(prog_name))]
        demandas = [d for d in (_vacancy_demand(v) for v in relevantes) if d]
        n = len(demandas)

        agg: Dict[str, Dict[str, Any]] = {}
        for d in demandas:
            for k, (nombre, cat, oblig) in d.items():
                a = agg.setdefault(k, {"skill": nombre, "categoria": cat, "vacantes": 0, "obligatoria_en": 0})
                a["vacantes"] += 1
                a["obligatoria_en"] += int(oblig)
        cover = {k: _coverage(k, terms, declared, fams) for k in agg}

        peso_total = peso_cubierto = 0.0
        vacantes_alta = 0
        area_vacantes: Dict[str, int] = {}
        for d in demandas:
            pv = cv = 0.0
            for k, (_, cat, oblig) in d.items():
                if cat == "blanda":
                    continue
                w = PESO_OBLIGATORIA if oblig else PESO_DESEABLE
                pv += w
                cv += w * COBERTURA[cover[k][0]]
            peso_total += pv
            peso_cubierto += cv
            vacantes_alta += int(pv > 0 and cv / pv >= UMBRAL_VACANTE_CUBIERTA)
            for fam in {cover[k][2] for k in d if cover[k][2]}:
                area_vacantes[fam] = area_vacantes.get(fam, 0) + 1

        medible = total_subjects > 0 and peso_total > 0
        indice = round(100 * peso_cubierto / peso_total, 1) if medible else None

        if not total_subjects:
            nivel, confianza = "Sin malla registrada", "sin_datos"
        elif n == 0:
            nivel, confianza = "Sin vacantes dirigidas al programa", "sin_datos"
        elif not medible:
            nivel, confianza = "Las vacantes no exigen competencias técnicas", "sin_datos"
        else:
            nivel = "Pertinencia alta" if indice >= 75 else "Pertinencia media" if indice >= 50 else "Pertinencia baja"
            confianza = "baja" if n < 5 else "media" if n < 20 else "alta"

        demanda: List[CurriculumDemandItem] = []
        for k, a in sorted(agg.items(), key=lambda kv: (-kv[1]["vacantes"], -kv[1]["obligatoria_en"], kv[1]["skill"])):
            cobertura, refs, fam = cover[k]
            pct = round(100 * a["vacantes"] / n, 1)
            criticidad = None
            if cobertura == "brecha" and a["categoria"] != "blanda":
                criticidad = "alta" if pct >= 40 else "media" if pct >= 20 else "baja"
            demanda.append(CurriculumDemandItem(
                **a, porcentaje_vacantes=pct, cobertura=cobertura, asignaturas=refs,
                area=KNOWLEDGE_FAMILIES[fam]["name"] if fam else None, criticidad=criticidad,
            ))

        areas = sorted(
            (CurriculumAreaItem(area=KNOWLEDGE_FAMILIES[f]["name"], asignaturas=len(fams.get(f, [])),
                                vacantes=area_vacantes.get(f, 0)) for f in {**fams, **area_vacantes}),
            key=lambda x: (-x.vacantes, -x.asignaturas, x.area),
        )

        recomendaciones: List[str] = []
        if medible:
            tecnicas = [d for d in demanda if d.categoria != "blanda"]
            for g in [d for d in tecnicas if d.cobertura == "brecha"][:3]:
                recomendaciones.append(
                    f"«{g.skill}» se exige en {g.vacantes} de {n} vacantes dirigidas al programa "
                    f"({g.obligatoria_en} como obligatoria) y ninguna asignatura la respalda."
                )
            for g in [d for d in tecnicas if d.cobertura == "afin"][:2]:
                recomendaciones.append(
                    f"«{g.skill}» se pide en {g.vacantes} vacantes. La malla enseña el área ({g.area}) en "
                    f"{g.asignaturas[0].nombre}, pero no declara esa herramienta: si ya se usa en clase, regístrala en la asignatura."
                )
            if confianza == "baja":
                recomendaciones.append(
                    f"El índice se calcula con {n} vacante{'s' if n != 1 else ''}. Tómalo como indicativo hasta que haya más ofertas."
                )

        semestres_resp: List[CurriculumSemesterResponse] = []
        for s in semesters:
            asignaturas = []
            for sub in s.get("subjects", []):
                tax = match_subject_to_skills(sub["name"])
                asignaturas.append(CurriculumSubjectResponse(
                    id=str(sub.get("id") or sub["code"]), codigo=sub["code"], nombre=sub["name"],
                    creditos=sub.get("credits") or 0, familia=tax["family_name"],
                    skills=tax["skills"] if tax["equivalence_group"] != "general" else [],
                    herramientas=sub.get("tools", []),
                ))
            num = s["semester_number"]
            semestres_resp.append(CurriculumSemesterResponse(
                numero_semestre=num,
                programa_origen=s.get("program"),
                etiqueta=f"Semestre {ROMANOS[num - 1] if 1 <= num <= len(ROMANOS) else num}",
                asignaturas=asignaturas,
            ))

        return CurriculumPertinenceReport(
            programa_nombre=prog_name,
            id_programa=id_programa,
            programa_previo_id=(pensum_data.get("previous") or {}).get("id"),
            programa_previo_nombre=(pensum_data.get("previous") or {}).get("nombre"),
            pensum_registrado=bool(pensum_data.get("registered", propias > 0)),
            pensum_version=pensum_data.get("version"),
            pensum_actualizado_en=pensum_data.get("updated_at"),
            total_semestres=len(semesters),
            total_asignaturas=total_subjects,
            total_vacantes_abiertas=len(vacantes),
            total_vacantes_analizadas=n,
            vacantes_alta_cobertura=vacantes_alta,
            indice_pertinencia=indice,
            nivel_pertinencia=nivel,
            confianza=confianza,
            demanda=demanda,
            areas_formacion=areas,
            recomendaciones_decanatura=recomendaciones,
            semestres=semestres_resp,
        )

    # ------------------------------------------------------------------ acceso a datos

    @classmethod
    async def _get_program(cls, session: AsyncSession, id_programa: str, current_user: Dict[str, Any]) -> ProgramaAcademico:
        not_found = HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"codigo": "PROGRAMA_NO_ENCONTRADO", "mensaje": "No se encontró el programa académico."},
        )
        try:
            prog_uuid = uuid.UUID(str(id_programa))
        except ValueError:
            raise not_found from None
        programa = (await session.execute(
            select(ProgramaAcademico).where(ProgramaAcademico.id == prog_uuid)
        )).scalar_one_or_none()
        es_superadmin = current_user.get("rol") in SUPERADMIN
        if programa is None or (not es_superadmin and str(programa.id_institucion) != str(current_user.get("id_entidad"))):
            raise not_found
        return programa

    @classmethod
    async def _load_subjects(cls, session: AsyncSession, id_programa) -> List[Any]:
        return (await session.execute(
            text("""
                SELECT ap.id, ap.codigo_asignatura, ap.nombre, ap.creditos, ap.numero_semestre, ap.herramientas,
                       pp.codigo_version, pp.extraido_en
                FROM asignaturas_pensum ap
                JOIN pensums_programa pp ON ap.id_pensum = pp.id
                WHERE pp.id_programa = :pid AND pp.es_activo = true
                ORDER BY ap.numero_semestre, ap.nombre
            """),
            {"pid": id_programa},
        )).fetchall()

    @staticmethod
    def _to_semesters(rows: List[Any], program: Optional[str] = None) -> List[Dict[str, Any]]:
        by_sem: Dict[int, List[Dict[str, Any]]] = {}
        for s_id, code, name, credits, sem, tools, _, _ in rows:
            by_sem.setdefault(sem, []).append(
                {"id": str(s_id), "code": code, "name": name, "credits": credits, "tools": list(tools or [])}
            )
        return [{"semester_number": n, "subjects": subs, "program": program} for n, subs in sorted(by_sem.items())]

    @classmethod
    async def _previous_program(cls, session: AsyncSession, id_programa) -> Optional[Dict[str, str]]:
        """Programa previo del ciclo propedéutico (dos niveles como máximo)."""
        row = (await session.execute(
            text("""
                SELECT prev.id, prev.nombre
                FROM programas_academicos p
                JOIN programas_academicos prev ON prev.id = p.id_programa_previo
                WHERE p.id = :pid
            """),
            {"pid": id_programa},
        )).first()
        return {"id": str(row[0]), "nombre": row[1]} if row else None

    @classmethod
    async def _load_pensum(cls, session: AsyncSession, programa: ProgramaAcademico) -> Dict[str, Any]:
        """Malla efectiva: la del programa previo (si es ciclo propedéutico) seguida de la propia."""
        rows = await cls._load_subjects(session, programa.id)
        previous = await cls._previous_program(session, programa.id)
        semesters = cls._to_semesters(rows)
        if previous:
            previos = cls._to_semesters(await cls._load_subjects(session, uuid.UUID(previous["id"])), previous["nombre"])
            semesters = previos + semesters
        return {
            "program_name": programa.nombre,
            "previous": previous,
            "registered": bool(rows),
            "version": rows[0][6] if rows else None,
            "updated_at": rows[0][7].isoformat() if rows and rows[0][7] else None,
            "semesters": semesters,
        }

    @classmethod
    async def _open_vacancies(cls, session: AsyncSession) -> List[Vacante]:
        return list((await session.execute(
            select(Vacante).join(Vacante.empresa).where(Vacante.estado == "abierta", Empresa.estado == "aprobado")
        )).scalars().all())

    # ------------------------------------------------------------------ casos de uso

    @classmethod
    async def analyze_program_by_id_async(
        cls, session: AsyncSession, id_programa: str, current_user: Dict[str, Any]
    ) -> CurriculumPertinenceReport:
        """Informe del programa con la malla guardada y las vacantes abiertas."""
        programa = await cls._get_program(session, id_programa, current_user)
        return cls.calculate_pertinence_report(
            await cls._load_pensum(session, programa), await cls._open_vacancies(session), str(programa.id)
        )

    @classmethod
    async def extract_and_analyze_pdf_async(
        cls,
        session: AsyncSession,
        pdf_bytes: bytes,
        current_user: Dict[str, Any],
        program_hint: str = "",
        id_programa: Optional[str] = None,
    ) -> CurriculumPertinenceReport:
        """Vista previa: extrae la malla del PDF y la mide. No guarda nada; se guarda al confirmar."""
        if not pdf_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"codigo": "PDF_VACIO", "mensaje": "El archivo PDF no contiene datos."},
            )
        programa = await cls._get_program(session, id_programa, current_user) if id_programa else None

        extraction = await run_in_threadpool(PensumPDFExtractor.extract_from_bytes, pdf_bytes, program_hint=program_hint)
        if not extraction.get("success") or not extraction.get("total_subjects"):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"codigo": "EXTRACCION_FALLIDA", "mensaje": "No se pudieron identificar asignaturas o semestres en el PDF proporcionado."},
            )
        pensum_data = {
            "program_name": programa.nombre if programa else (program_hint or extraction.get("program_name")),
            "registered": False,
            "semesters": [
                {"semester_number": s["semester_number"], "subjects": [
                    {"id": sub.get("id"), "code": sub.get("code") or "", "name": sub["name"],
                     "credits": sub.get("credits") or 0, "tools": []}
                    for sub in s.get("subjects", [])
                ]}
                for s in extraction.get("semesters", [])
            ],
        }
        return cls.calculate_pertinence_report(
            pensum_data, await cls._open_vacancies(session), str(programa.id) if programa else None
        )

    @classmethod
    async def save_pensum_async(
        cls, session: AsyncSession, id_programa: str, payload: PensumSaveRequest, current_user: Dict[str, Any]
    ) -> CurriculumPertinenceReport:
        """Reemplaza la malla activa del programa por la confirmada por la IES."""
        programa = await cls._get_program(session, id_programa, current_user)
        if not any(s.asignaturas for s in payload.semestres):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"codigo": "MALLA_VACIA", "mensaje": "La malla debe tener al menos una asignatura."},
            )
        version = (payload.version or "").strip() or f"Pensum {date.today().year}"
        try:
            pensum_id = (await session.execute(
                text("SELECT id FROM pensums_programa WHERE id_programa = :pid AND es_activo = true ORDER BY creado_en DESC LIMIT 1"),
                {"pid": programa.id},
            )).scalar_one_or_none()
            if pensum_id is None:
                pensum_id = uuid.uuid4()
                await session.execute(
                    text("""INSERT INTO pensums_programa (id, id_programa, codigo_version, es_activo, extraido_en)
                            VALUES (:id, :pid, :version, true, NOW())"""),
                    {"id": pensum_id, "pid": programa.id, "version": version},
                )
            else:
                await session.execute(
                    text("UPDATE pensums_programa SET codigo_version = :version, extraido_en = NOW() WHERE id = :id"),
                    {"id": pensum_id, "version": version},
                )
            await session.execute(text("DELETE FROM asignaturas_pensum WHERE id_pensum = :id"), {"id": pensum_id})
            for sem in payload.semestres:
                for i, sub in enumerate(sem.asignaturas, start=1):
                    tools = list(dict.fromkeys(t.strip()[:60] for t in sub.herramientas if t.strip()))
                    await session.execute(
                        text("""INSERT INTO asignaturas_pensum
                                    (id, id_pensum, numero_semestre, codigo_asignatura, nombre, creditos, herramientas)
                                VALUES (:id, :pensum, :sem, :code, :name, :cred, CAST(:tools AS TEXT[]))"""),
                        {
                            "id": uuid.uuid4(), "pensum": pensum_id, "sem": sem.numero_semestre,
                            "code": sub.codigo.strip() or f"MAT-{sem.numero_semestre}{i:02d}",
                            "name": sub.nombre.strip(), "cred": min(max(1, sub.creditos), 40), "tools": tools,
                        },
                    )
            await session.commit()
        except HTTPException:
            raise
        except Exception:
            await session.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={"codigo": "ERROR_GUARDANDO_MALLA", "mensaje": "No se pudo guardar la malla. No se aplicó ningún cambio."},
            ) from None
        return await cls.analyze_program_by_id_async(session, id_programa, current_user)

    @classmethod
    async def set_previous_program_async(
        cls, session: AsyncSession, id_programa: str, payload: PreviousProgramRequest, current_user: Dict[str, Any]
    ) -> CurriculumPertinenceReport:
        """Define (o quita) el programa previo requerido. Solo dos niveles: previo -> programa."""
        programa = await cls._get_program(session, id_programa, current_user)
        previo_id = None
        if payload.id_programa_previo:
            previo = await cls._get_program(session, payload.id_programa_previo, current_user)
            invalido = None
            if previo.id == programa.id:
                invalido = "Un programa no puede ser su propio programa previo."
            elif previo.id_institucion != programa.id_institucion:
                invalido = "El programa previo debe ser de la misma institución."
            elif await cls._previous_program(session, previo.id):
                invalido = "El programa elegido ya depende de otro; solo se admiten dos niveles."
            elif (await session.execute(
                text("SELECT 1 FROM programas_academicos WHERE id_programa_previo = :pid LIMIT 1"), {"pid": programa.id}
            )).first():
                invalido = "Este programa ya es el ciclo previo de otro; solo se admiten dos niveles."
            if invalido:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"codigo": "PROGRAMA_PREVIO_INVALIDO", "mensaje": invalido},
                )
            previo_id = previo.id
        await session.execute(
            text("UPDATE programas_academicos SET id_programa_previo = :previo WHERE id = :pid"),
            {"previo": previo_id, "pid": programa.id},
        )
        await session.commit()
        return await cls.analyze_program_by_id_async(session, id_programa, current_user)
