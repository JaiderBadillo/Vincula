"""
Estadísticas de colocación de la IES: solo hechos registrados en Vincula.

"Colocado" = egresado de la IES con una postulación en fase `contratado`. Nada se estima ni se rellena:
si no hay datos para una cifra, se devuelve None / lista vacía y la pantalla lo dice.
"""

from collections import Counter, defaultdict
from statistics import mean, median
from typing import Any, Dict, List, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

# Un egresado cuenta en su título más alto (Tecnología -> Ingeniería), igual que en trazabilidad.
_SIN_TITULO_SUPERIOR = """
    NOT EXISTS (
        SELECT 1 FROM academicos_egresado sup
        JOIN programas_academicos ps ON ps.id = sup.id_programa
        WHERE sup.id_egresado = a.id_egresado AND ps.id_programa_previo = a.id_programa
    )
"""

SQL_EGRESADOS = f"""
    SELECT a.id_egresado, p.id, p.nombre, p.nivel_formacion, f.id, f.nombre, a.ano_graduacion
    FROM academicos_egresado a
    JOIN programas_academicos p ON p.id = a.id_programa
    JOIN facultades f ON f.id = p.id_facultad
    WHERE (CAST(:iid AS uuid) IS NULL OR p.id_institucion = CAST(:iid AS uuid))
      AND a.estado_verificacion <> 'rechazado' AND {_SIN_TITULO_SUPERIOR}
"""

SQL_COLOCADOS = f"""
    SELECT po.id_egresado, p.id, a.ano_graduacion, v.salario_minimo, v.salario_maximo, v.salario_es_confidencial,
           v.periodo_salario, v.modalidad::text, v.tipo_contrato, e.id, e.nombre_comercial, e.sector_economico,
           po.postulado_en,
           (SELECT MIN(h.registrado_en) FROM historial_fases_postulacion h
             WHERE h.id_postulacion = po.id AND h.fase_nueva = 'contratado')
    FROM postulaciones po
    JOIN vacantes v ON v.id = po.id_vacante
    JOIN empresas e ON e.id = v.id_empresa
    JOIN academicos_egresado a ON a.id_egresado = po.id_egresado
    JOIN programas_academicos p ON p.id = a.id_programa
    WHERE po.fase_actual = 'contratado'
      AND (CAST(:iid AS uuid) IS NULL OR p.id_institucion = CAST(:iid AS uuid))
      AND a.estado_verificacion <> 'rechazado' AND {_SIN_TITULO_SUPERIOR}
"""

RANGOS_SALARIO = [("Menos de $2M", 0, 2_000_000), ("$2M a $4M", 2_000_000, 4_000_000),
                  ("$4M a $6M", 4_000_000, 6_000_000), ("Más de $6M", 6_000_000, None)]
RANGOS_DIAS = [("Menos de 30 días", 0, 30), ("30 a 90 días", 30, 90), ("90 a 180 días", 90, 180), ("Más de 180 días", 180, None)]


def _salario(c: Dict[str, Any]) -> Optional[float]:
    """Punto medio del rango publicado; None si es confidencial, no es mensual o no se publicó."""
    if c["confidencial"] or (c["periodo"] or "Mensual") != "Mensual":
        return None
    valores = [float(x) for x in (c["salario_min"], c["salario_max"]) if x]
    return sum(valores) / len(valores) if valores else None


def _dias(c: Dict[str, Any]) -> Optional[float]:
    if not c["postulado_en"] or not c["contratado_en"]:
        return None
    return max(0.0, (c["contratado_en"] - c["postulado_en"]).total_seconds() / 86400)


def _reparto(valores: List[Optional[float]], rangos) -> List[Dict[str, Any]]:
    """Cuenta valores por rango; lista vacía si no hay ninguno."""
    datos = [v for v in valores if v is not None]
    if not datos:
        return []
    return [{"etiqueta": nombre,
             "cantidad": (n := sum(1 for v in datos if v >= desde and (hasta is None or v < hasta))),
             "porcentaje": round(100 * n / len(datos), 1)} for nombre, desde, hasta in rangos]


def _conteo(valores: List[str]) -> List[Dict[str, Any]]:
    return [{"etiqueta": k, "cantidad": n, "porcentaje": round(100 * n / len(valores), 1)}
            for k, n in Counter(valores).most_common()]


def _resumen(egresados: set, colocados: List[Dict[str, Any]]) -> Dict[str, Any]:
    contratados = {c["id_egresado"] for c in colocados} & egresados
    salarios = [s for s in map(_salario, colocados) if s is not None]
    dias = [d for d in map(_dias, colocados) if d is not None]
    return {
        "egresados": len(egresados), "colocados": len(contratados),
        "tasa": round(100 * len(contratados) / len(egresados), 1) if egresados else None,
        "salario_promedio": round(mean(salarios)) if salarios else None, "salario_muestra": len(salarios),
        "dias_mediana": round(median(dias), 1) if dias else None, "dias_muestra": len(dias),
    }


def calculate_placement(egresados: List[Dict[str, Any]], colocados: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    egresados: [{id_egresado, id_programa, programa, nivel, id_facultad, facultad, ano}]
    colocados: [{id_egresado, id_programa, ano, salario_min, salario_max, confidencial, periodo, modalidad,
                 contrato, id_empresa, empresa, sector, postulado_en, contratado_en}]  (una por contratación)
    """
    def agrupar(clave: str, filas):
        grupos = defaultdict(list)
        for f in filas:
            grupos[f[clave]].append(f)
        return grupos

    por_prog_e, por_prog_c = agrupar("id_programa", egresados), agrupar("id_programa", colocados)
    programas = []
    for pid, filas in por_prog_e.items():
        programas.append({"id": pid, "nombre": filas[0]["programa"], "nivel": filas[0]["nivel"], "facultad": filas[0]["facultad"],
                          **_resumen({f["id_egresado"] for f in filas}, por_prog_c.get(pid, []))})

    fac_prog = defaultdict(set)
    for f in egresados:
        fac_prog[f["id_facultad"]].add(f["id_programa"])
    facultades = []
    for fid, filas in agrupar("id_facultad", egresados).items():
        pids = fac_prog[fid]
        facultades.append({"id": fid, "nombre": filas[0]["facultad"], "programas": len(pids),
                           **_resumen({f["id_egresado"] for f in filas}, [c for c in colocados if c["id_programa"] in pids])})

    cohortes = []
    por_ano_c = agrupar("ano", colocados)
    for ano, filas in sorted(agrupar("ano", egresados).items()):
        cohortes.append({"ano": ano, **_resumen({f["id_egresado"] for f in filas}, por_ano_c.get(ano, []))})

    empresas = defaultdict(lambda: {"contratados": set()})
    for c in colocados:
        e = empresas[c["id_empresa"]]
        e.update(id=c["id_empresa"], nombre=c["empresa"], sector=c["sector"])
        e["contratados"].add(c["id_egresado"])

    return {
        "resumen": _resumen({f["id_egresado"] for f in egresados}, colocados),
        "facultades": sorted(facultades, key=lambda x: x["nombre"]),
        "programas": sorted(programas, key=lambda x: (-(x["tasa"] or 0), x["nombre"])),
        "tiempos": _reparto([_dias(c) for c in colocados], RANGOS_DIAS),
        "salarios": _reparto([_salario(c) for c in colocados], RANGOS_SALARIO),
        "contratos": _conteo([c["contrato"] for c in colocados]),
        "modalidades": _conteo([c["modalidad"] for c in colocados]),
        "empresas": sorted(({**e, "contratados": len(e["contratados"])} for e in empresas.values()),
                           key=lambda e: (-e["contratados"], e["nombre"]))[:9],
        "cohortes": cohortes,
    }


async def placement_stats_async(session: AsyncSession, id_institucion: Optional[str]) -> Dict[str, Any]:
    """id_institucion None = toda la plataforma (solo superadmin)."""
    params = {"iid": id_institucion}
    egresados = [dict(zip(("id_egresado", "id_programa", "programa", "nivel", "id_facultad", "facultad", "ano"),
                          (str(r[0]), str(r[1]), r[2], r[3], str(r[4]), r[5], r[6])))
                 for r in (await session.execute(text(SQL_EGRESADOS), params)).fetchall()]
    colocados = [dict(zip(("id_egresado", "id_programa", "ano", "salario_min", "salario_max", "confidencial", "periodo",
                           "modalidad", "contrato", "id_empresa", "empresa", "sector", "postulado_en", "contratado_en"),
                          (str(r[0]), str(r[1]), *r[2:9], str(r[9]), *r[10:])))
                 for r in (await session.execute(text(SQL_COLOCADOS), params)).fetchall()]
    return calculate_placement(egresados, colocados)
