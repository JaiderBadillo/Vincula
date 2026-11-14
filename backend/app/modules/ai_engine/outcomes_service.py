"""
Resultados de egresados por programa: qué pasa realmente con sus postulaciones.

Es la evidencia principal de trazabilidad (hechos del proceso de selección), separada de la
alineación malla-demanda. Solo usa registros reales; por debajo de MIN_MUESTRA postulaciones
se entregan los conteos, pero no tasas ni promedios, porque serían engañosos.
"""

from statistics import median
from typing import Any, Dict, List, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.ai_engine.curriculum_service import CurriculumTraceabilityService
from app.modules.ai_engine.schemas import OutcomeDiscardReason, OutcomeFunnelStep, ProgramOutcomesReport

MIN_MUESTRA = 10

# Orden del embudo. Llegar a una fase implica haber superado las anteriores, aunque se haya saltado alguna.
EMBUDO = [
    ("en_revision", "Postulados"),
    ("preseleccionados", "Preseleccionados"),
    ("prueba_tecnica", "Prueba técnica"),
    ("entrevista", "Entrevista"),
    ("oferta_finalistas", "Oferta"),
    ("contratado", "Contratados"),
]
ORDEN = {fase: i for i, (fase, _) in enumerate(EMBUDO)}


def _dias_hasta(post: Dict[str, Any], fase: str) -> Optional[float]:
    """Días desde la postulación hasta la primera vez que alcanzó `fase` (o una posterior)."""
    fechas = [f for nombre, f in post["fases"].items() if ORDEN.get(nombre, -1) >= ORDEN[fase] and f]
    if not fechas or not post["postulado_en"]:
        return None
    return max(0.0, (min(fechas) - post["postulado_en"]).total_seconds() / 86400)


def calculate_outcomes(programa_nombre: str, id_programa: str, egresados: int,
                       postulaciones: List[Dict[str, Any]]) -> ProgramOutcomesReport:
    """
    postulaciones: [{id_egresado, fase_actual, afinidad, motivo_descarte, postulado_en,
                     fases: {fase: primera fecha en que se registró}}]
    """
    alcanzada = []  # índice de la fase más avanzada que alcanzó cada postulación
    for p in postulaciones:
        vistas = set(p["fases"]) | {p["fase_actual"]}
        alcanzada.append(max((ORDEN[f] for f in vistas if f in ORDEN), default=0))

    embudo = [
        OutcomeFunnelStep(fase=fase, etiqueta=etiqueta, postulaciones=sum(1 for a in alcanzada if a >= i))
        for i, (fase, etiqueta) in enumerate(EMBUDO)
    ]
    contratadas = [p for p, a in zip(postulaciones, alcanzada) if a == ORDEN["contratado"]]
    descartadas = [p for p in postulaciones if p["fase_actual"] == "descartados"]

    motivos: Dict[str, int] = {}
    for p in descartadas:
        motivo = (p["motivo_descarte"] or "").strip() or "Sin motivo registrado"
        motivos[motivo] = motivos.get(motivo, 0) + 1

    postulados = {p["id_egresado"] for p in postulaciones}
    contratados = {p["id_egresado"] for p in contratadas}
    suficiente = len(postulaciones) >= MIN_MUESTRA

    def mediana(fase: str) -> Optional[float]:
        dias = [d for d in (_dias_hasta(p, fase) for p in postulaciones) if d is not None]
        return round(median(dias), 1) if suficiente and dias else None

    def afinidad(grupo: List[Dict[str, Any]]) -> Optional[float]:
        valores = [float(p["afinidad"]) for p in grupo if p["afinidad"] is not None]
        return round(sum(valores) / len(valores), 1) if suficiente and valores else None

    return ProgramOutcomesReport(
        id_programa=id_programa,
        programa_nombre=programa_nombre,
        egresados_registrados=egresados,
        egresados_postulados=len(postulados),
        egresados_contratados=len(contratados),
        total_postulaciones=len(postulaciones),
        postulaciones_descartadas=len(descartadas),
        minimo_muestra=MIN_MUESTRA,
        muestra_suficiente=suficiente,
        tasa_contratacion=round(100 * len(contratados) / len(postulados), 1) if suficiente and postulados else None,
        dias_mediana_oferta=mediana("oferta_finalistas"),
        dias_mediana_contratacion=mediana("contratado"),
        afinidad_promedio_contratados=afinidad(contratadas),
        afinidad_promedio_descartados=afinidad(descartadas),
        embudo=embudo,
        motivos_descarte=[
            OutcomeDiscardReason(motivo=m, postulaciones=n)
            for m, n in sorted(motivos.items(), key=lambda kv: (-kv[1], kv[0]))
        ],
    )


async def program_outcomes_async(session: AsyncSession, id_programa: str,
                                 current_user: Dict[str, Any]) -> ProgramOutcomesReport:
    """Resultados de las postulaciones de los egresados del programa (con control de pertenencia a la IES)."""
    programa = await CurriculumTraceabilityService._get_program(session, id_programa, current_user)
    params = {"pid": programa.id}
    egresados = (await session.execute(
        text("SELECT COUNT(DISTINCT id_egresado) FROM academicos_egresado WHERE id_programa = :pid"), params
    )).scalar() or 0

    # Postulaciones de egresados del programa, a cualquier vacante
    filas = (await session.execute(text("""
        SELECT po.id, po.id_egresado, po.fase_actual::text, po.porcentaje_afinidad, po.motivo_descarte, po.postulado_en
        FROM postulaciones po
        WHERE po.id_egresado IN (SELECT id_egresado FROM academicos_egresado WHERE id_programa = :pid)
    """), params)).fetchall()
    historial = (await session.execute(text("""
        SELECT h.id_postulacion, h.fase_nueva::text, MIN(h.registrado_en)
        FROM historial_fases_postulacion h
        JOIN postulaciones po ON po.id = h.id_postulacion
        WHERE po.id_egresado IN (SELECT id_egresado FROM academicos_egresado WHERE id_programa = :pid)
        GROUP BY h.id_postulacion, h.fase_nueva
    """), params)).fetchall()

    fases: Dict[Any, Dict[str, Any]] = {}
    for post_id, fase, fecha in historial:
        fases.setdefault(post_id, {})[fase] = fecha
    postulaciones = [
        {"id_egresado": egr, "fase_actual": fase, "afinidad": afin, "motivo_descarte": motivo,
         "postulado_en": postulado, "fases": fases.get(post_id, {})}
        for post_id, egr, fase, afin, motivo, postulado in filas
    ]
    return calculate_outcomes(programa.nombre, str(programa.id), egresados, postulaciones)
