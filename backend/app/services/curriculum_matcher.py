"""
Motor de Comparación y Alineación Curricular (Pensum vs. Vacantes)
Calcula el índice de pertinencia curricular y detecta brechas de habilidades.
Costo de tokens: $0.00.
"""

from typing import List, Dict, Any
from app.core.skills_taxonomy import find_tool_equivalence


class CurriculumMatcher:
    """
    Compara las habilidades ofrecidas en el pensum contra las demandadas por el mercado laboral.
    """

    @classmethod
    def match_curriculum_against_vacancies(
        cls,
        pensum_skills: List[str],
        pensum_tools: List[str],
        vacancies_demand: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        vacancies_demand: lista de dicts con formato:
        [
            {"skill": "PostgreSQL", "vacancies_count": 45, "category": "technical"},
            {"skill": "Docker", "vacancies_count": 38, "category": "tools"},
            ...
        ]
        """
        all_pensum_tokens = set([s.lower().strip() for s in pensum_skills] + [t.lower().strip() for t in pensum_tools])

        exact_matches = []
        equivalent_matches = []
        critical_gaps = []

        total_demand_weight = sum(item.get("vacancies_count", 1) for item in vacancies_demand) or 1
        covered_weight = 0

        for req in vacancies_demand:
            demanded_skill = req.get("skill", "").strip()
            vacancies_count = req.get("vacancies_count", 1)
            demanded_lower = demanded_skill.lower()

            # 1. Match Directo
            if demanded_lower in all_pensum_tokens:
                exact_matches.append({
                    "skill": demanded_skill,
                    "vacancies_count": vacancies_count,
                    "match_type": "exact",
                    "match_label": "Cubierta en Pensum",
                    "score_weight": 1.0,
                })
                covered_weight += vacancies_count
                continue

            # 2. Match por Equivalencia / Familia Tecnológica
            # Ej: Demandan PostgreSQL y el pensum tiene MySQL
            found_equiv = False
            for p_tool in pensum_tools:
                if find_tool_equivalence(p_tool, demanded_skill):
                    equivalent_matches.append({
                        "demanded_skill": demanded_skill,
                        "pensum_equivalent": p_tool,
                        "vacancies_count": vacancies_count,
                        "match_type": "equivalent",
                        "match_label": f"Equivalente a {p_tool} (Familia Relacional / Curva Rápida)",
                        "score_weight": 0.75,
                    })
                    covered_weight += (vacancies_count * 0.75)
                    found_equiv = True
                    break

            if found_equiv:
                continue

            # 3. Brecha Crítica no cubierta
            critical_gaps.append({
                "skill": demanded_skill,
                "vacancies_count": vacancies_count,
                "match_type": "gap",
                "match_label": "No cubierta en el Pensum",
                "score_weight": 0.0,
            })

        # Cálculo del Índice de Cobertura Curricular (%)
        coverage_score = round((covered_weight / total_demand_weight) * 100)
        coverage_score = max(0, min(100, coverage_score))

        # Generar recomendaciones curriculares basadas en datos
        recommendations = cls._generate_recommendations(critical_gaps, equivalent_matches)

        return {
            "coverage_score": coverage_score,
            "status": "high" if coverage_score >= 75 else ("medium" if coverage_score >= 60 else "low"),
            "total_vacancies_analyzed": sum(item.get("vacancies_count", 1) for item in vacancies_demand),
            "exact_matches_count": len(exact_matches),
            "equivalent_matches_count": len(equivalent_matches),
            "critical_gaps_count": len(critical_gaps),
            "exact_matches": sorted(exact_matches, key=lambda x: x["vacancies_count"], reverse=True),
            "equivalent_matches": sorted(equivalent_matches, key=lambda x: x["vacancies_count"], reverse=True),
            "critical_gaps": sorted(critical_gaps, key=lambda x: x["vacancies_count"], reverse=True),
            "recommendations": recommendations,
        }

    @staticmethod
    def _generate_recommendations(critical_gaps: List[Dict[str, Any]], equivalent_matches: List[Dict[str, Any]]) -> List[str]:
        recs = []
        
        # Sugerencia sobre la brecha número 1
        if critical_gaps:
            top_gap = critical_gaps[0]
            recs.append(
                f"Alta prioridad: '{top_gap['skill']}' se solicita en {top_gap['vacancies_count']} ofertas de empleo activas pero no figura en el pensum. Se recomienda abrir un módulo práctico o electiva técnica de profundización."
            )

        if len(critical_gaps) > 1:
            second_gap = critical_gaps[1]
            recs.append(
                f"Brecha emergente: Se detecta demanda recurrente de '{second_gap['skill']}' ({second_gap['vacancies_count']} vacantes). Integrar como micro-credencial institucional de fin de carrera."
            )

        # Sugerencia sobre equivalencias tecnológicas
        if equivalent_matches:
            top_eq = equivalent_matches[0]
            recs.append(
                f"Alineación práctica: La vacante exige '{top_eq['demanded_skill']}' y en el pensum se practica con '{top_eq['pensum_equivalent']}'. Incorporar un taller comparativo de 2 semanas para acelerar la colocación laboral de los egresados."
            )

        return recs
