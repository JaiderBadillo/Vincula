"""
Suite de Pruebas Automatizada: Fase 6 - Paso 1 (Motor de IA, Matching Semántico y Vacantes Recomendadas).
Verifica:
1. Autenticación de Super Admin y preparación de empresa homologada.
2. Publicación de vacantes de dominios contrastantes (Desarrollo Web vs Contaduría y Finanzas).
3. Login de Egresado de Sistemas UTS.
4. Evaluación de Afinidad Semántica y Explicable (GET /api/v1/ia/matching/evaluar/{vacante_id}).
   - Alta compatibilidad con vacante afín de software (> 75.0%).
   - Baja compatibilidad y detección de brechas críticas (missing_skills) con vacante no afín.
5. Recomendaciones Personalizadas (GET /api/v1/ia/vacantes-recomendadas).
   - Ordenamiento estricto por match_score descendente.
   - Priorización del perfil tecnológico sobre el contable.
6. Evaluación Directa POST (/api/v1/ia/matching/evaluar-candidato).
7. Validaciones de Seguridad (401 sin token, 404 vacante inexistente).
"""

import sys
import os
import uuid
import asyncio
from httpx import AsyncClient, ASGITransport

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.core.database import AsyncSessionLocal
from app.modules.vacancies_ats.models import Vacante
from app.modules.companies.models import Empresa, SedeEmpresa, ReclutadorEmpresa
from app.modules.graduates.models import Egresado
from sqlalchemy import select


async def run_fase6_paso1_tests():
    print("\n================================================================================")
    print(" 🚀 EJECUTANDO PRUEBAS FASE 6 - PASO 1: MOTOR IA & MATCHING DE TALENTO")
    print("================================================================================")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # ----------------------------------------------------------------------
        # SETUP 1: Autenticar Super Admin y aprobar empresa
        # ----------------------------------------------------------------------
        print("\n[TEST 1] Setup: Autenticando Super Admin y preparando empresa homologada...")
        admin_login = await client.post(
            "/api/v1/auth/login",
            json={"correo": "admin@vincula.com.co", "password": "Admin123*"}
        )
        assert admin_login.status_code == 200, f"Error login Super Admin: {admin_login.text}"
        admin_token = admin_login.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        print("  ✓ Super Admin autenticado.")

        # Registrar empresa
        suffix = uuid.uuid4().hex[:6]
        emp_email = f"rrhh.{suffix}@globalmatch.co"
        reg_emp = await client.post(
            "/api/v1/auth/registro-empresa-form",
            data={
                "razon_social": f"Global Match Tech SAS {suffix}",
                "nombre_comercial": f"GlobalMatch {suffix}",
                "nit": f"901{suffix}-8",
                "codigo_ciiu": "6201",
                "descripcion_ciiu": "Desarrollo de software y analítica",
                "correo": emp_email,
                "password": "EmpresaSegura2026*",
                "persona_contacto": "Sonia Reclutadora",
                "correo_contacto": emp_email,
                "telefono": "3128889900",
                "sector_economico": "Software y Tecnología",
                "tamano_empresa": "Mediana",
                "departamento": "Santander",
                "ciudad": "Bucaramanga",
                "direccion": "Zona Franca Santander",
                "nombre_representante_legal": "Sonia Reclutadora",
                "documento_representante_legal": f"63{suffix}"
            }
        )
        assert reg_emp.status_code in (200, 201), f"Error registro empresa: {reg_emp.text}"
        emp_id = reg_emp.json().get("id_empresa") or reg_emp.json().get("id")

        # Aprobar empresa
        aprob = await client.post(
            f"/api/v1/admin/empresas/{emp_id}/aprobar",
            json={"observaciones": "Empresa validada para tests de Fase 6 IA"},
            headers=admin_headers
        )
        assert aprob.status_code == 200, f"Error aprobación: {aprob.text}"
        print(f"  ✓ Empresa homologada: {emp_email} (ID: {emp_id})")

        # Login de la empresa
        emp_login = await client.post(
            "/api/v1/auth/login",
            json={"correo": emp_email, "password": "EmpresaSegura2026*"}
        )
        assert emp_login.status_code == 200
        emp_token = emp_login.json()["access_token"]
        emp_headers = {"Authorization": f"Bearer {emp_token}"}

        # Crear Sede
        sede_res = await client.post(
            "/api/v1/empresas/sedes",
            headers=emp_headers,
            json={
                "nombre": "Sede Principal Zona Franca",
                "departamento": "Santander",
                "ciudad": "Bucaramanga",
                "direccion": "Km 4 Vía Floridablanca",
                "telefono": "6076881122",
                "correo": f"sede.{suffix}@globalmatch.co",
                "es_principal": True
            }
        )
        assert sede_res.status_code == 201
        sede_id = sede_res.json()["id"]

        # ----------------------------------------------------------------------
        # SETUP 2: Publicar Vacante de Software (Vacante A) y Vacante Contable (Vacante B)
        # ----------------------------------------------------------------------
        print("\n[TEST 2] Publicando 2 vacantes de dominios contrastantes (Software vs Finanzas)...")

        # Vacante A: Tecnología / Software
        res_vac_tech = await client.post(
            "/api/v1/vacantes",
            headers=emp_headers,
            json={
                "id_sede": sede_id,
                "titulo": f"Desarrollador Full Stack React y Python {suffix}",
                "categoria": "Tecnología",
                "modalidad": "Híbrido",
                "tipo_contrato": "Término Indefinido",
                "nivel_experiencia": "Junior",
                "salario_minimo": 4000000.0,
                "salario_maximo": 5200000.0,
                "descripcion": "Desarrollo de módulos reactivos en React con APIs en FastAPI y PostgreSQL.",
                "responsabilidades": ["Construir endpoints REST", "Diseñar vistas interactivas en React"],
                "requisitos": ["React", "JavaScript", "Python", "SQL", "Git"],
                "beneficios": ["Seguro de salud", "Día libre de cumpleaños"],
                "fecha_cierre": "2026-12-31",
                "estado": "abierta"
            }
        )
        assert res_vac_tech.status_code == 201, f"Error creando vacante Tech: {res_vac_tech.text}"
        vac_tech_id = res_vac_tech.json()["id"]
        print(f"  ✓ Vacante Tech publicada: {res_vac_tech.json()['titulo']} (ID: {vac_tech_id})")

        # Vacante B: Contaduría / Impuestos
        res_vac_acc = await client.post(
            "/api/v1/vacantes",
            headers=emp_headers,
            json={
                "id_sede": sede_id,
                "titulo": f"Contador Público y Auditor Tributario {suffix}",
                "categoria": "Contabilidad y Finanzas",
                "modalidad": "Presencial",
                "tipo_contrato": "Término Indefinido",
                "nivel_experiencia": "Senior",
                "salario_minimo": 4500000.0,
                "salario_maximo": 6000000.0,
                "descripcion": "Auditoría de estados financieros NIIF, liquidación de retenciones en la fuente y medios magnéticos.",
                "responsabilidades": ["Auditoría fiscal", "Declaraciones tributarias DIAN"],
                "requisitos": ["Siigo", "Normas NIIF", "Declaración Tributaria", "Revisoría Fiscal", "SAP FI/CO"],
                "beneficios": ["Bono de alimentación"],
                "fecha_cierre": "2026-12-31",
                "estado": "abierta"
            }
        )
        assert res_vac_acc.status_code == 201, f"Error creando vacante Contable: {res_vac_acc.text}"
        vac_acc_id = res_vac_acc.json()["id"]
        print(f"  ✓ Vacante Contable publicada: {res_vac_acc.json()['titulo']} (ID: {vac_acc_id})")

        # ----------------------------------------------------------------------
        # TEST 3: Login de Egresado (Tecnología en Sistemas UTS)
        # ----------------------------------------------------------------------
        print("\n[TEST 3] Autenticando Egresado de Sistemas...")
        grad_login = await client.post(
            "/api/v1/auth/login",
            json={"correo": "egresado@correo.uts.edu.co", "password": "Egresado123*"}
        )
        assert grad_login.status_code == 200, f"Error login egresado: {grad_login.text}"
        grad_token = grad_login.json()["access_token"]
        grad_headers = {"Authorization": f"Bearer {grad_token}"}
        print("  ✓ Egresado autenticado.")

        # ----------------------------------------------------------------------
        # TEST 4: Evaluación de Afinidad frente a Vacante Afín (Tech)
        # ----------------------------------------------------------------------
        print("\n[TEST 4] Evaluando afinidad IA frente a la Vacante de Tecnología...")
        res_eval_tech = await client.get(
            f"/api/v1/ia/matching/evaluar/{vac_tech_id}",
            headers=grad_headers
        )
        assert res_eval_tech.status_code == 200, f"Error evaluando vacante tech: {res_eval_tech.text}"
        eval_tech = res_eval_tech.json()

        print(f"  ✓ Score Afinidad Tech: {eval_tech['match_score']}% ({eval_tech['nivel_afinidad']})")
        print(f"  ✓ Badge UI: {eval_tech['etiqueta_badge']}")
        print(f"  ✓ Skills coincidentes ({len(eval_tech['skills_match'])}): {eval_tech['skills_match']}")
        print(f"  ✓ Afinidad académica: {eval_tech['afinidad_academica']}")
        print(f"  ✓ Explicación IA: {eval_tech['motivo_recomendacion']}")

        assert eval_tech["match_score"] >= 75.0, f"Se esperaba compatibilidad >= 75%, se obtuvo {eval_tech['match_score']}%"
        assert eval_tech["nivel_afinidad"] in ("alta", "media_alta"), f"Nivel inesperado: {eval_tech['nivel_afinidad']}"
        assert eval_tech["afinidad_academica"] is True, "Debe detectar afinidad académica con la carrera de Sistemas"
        assert len(eval_tech["skills_match"]) >= 2, "Debe identificar al menos 2 habilidades coincidentes"

        # ----------------------------------------------------------------------
        # TEST 5: Evaluación de Afinidad frente a Vacante No Afín (Contable)
        # ----------------------------------------------------------------------
        print("\n[TEST 5] Evaluando afinidad IA frente a la Vacante de Contabilidad...")
        res_eval_acc = await client.get(
            f"/api/v1/ia/matching/evaluar/{vac_acc_id}",
            headers=grad_headers
        )
        assert res_eval_acc.status_code == 200, f"Error evaluando vacante contable: {res_eval_acc.text}"
        eval_acc = res_eval_acc.json()

        print(f"  ✓ Score Afinidad Contable: {eval_acc['match_score']}% ({eval_acc['nivel_afinidad']})")
        print(f"  ✓ Missing skills detectadas ({len(eval_acc['missing_skills'])}): {eval_acc['missing_skills']}")

        assert eval_acc["match_score"] < eval_tech["match_score"], "La vacante contable DEBE tener menor puntaje que la tech"
        assert len(eval_acc["missing_skills"]) >= 2, "Debe detectar brechas en requisitos contables no cubiertos"
        print("  ✓ Diferenciación semántica verificada: El algoritmo discrimina con precisión entre dominios profesionales.")

        # ----------------------------------------------------------------------
        # TEST 6: Catálogo de Vacantes Recomendadas (GET /api/v1/ia/vacantes-recomendadas)
        # ----------------------------------------------------------------------
        print("\n[TEST 6] Consultando catálogo de vacantes recomendadas por IA...")
        res_recom = await client.get("/api/v1/ia/vacantes-recomendadas?limit=50", headers=grad_headers)
        assert res_recom.status_code == 200, f"Error en recomendaciones: {res_recom.text}"
        recom_data = res_recom.json()

        print(f"  ✓ Total evaluadas: {recom_data['total_evaluadas']}")
        print(f"  ✓ Carrera principal detectada: {recom_data['carrera_principal']}")
        print(f"  ✓ Vacantes recomendadas retornadas: {len(recom_data['vacantes'])}")

        assert recom_data["total_recomendadas"] >= 2, "Debe retornar al menos las vacantes creadas"
        rec_list = recom_data["vacantes"]

        # Verificar ordenamiento descendente por match_score
        scores = [v["match_score"] for v in rec_list]
        assert scores == sorted(scores, reverse=True), f"Las vacantes deben estar ordenadas desc: {scores}"
        print(f"  ✓ Ordenamiento verificado por afinidad: {scores[:4]}")

        # La vacante Tech debe estar posicionada por encima de la vacante Contable
        tech_idx = next((i for i, v in enumerate(rec_list) if v["id"] == vac_tech_id), None)
        acc_idx = next((i for i, v in enumerate(rec_list) if v["id"] == vac_acc_id), None)
        assert tech_idx is not None and acc_idx is not None, "Ambas vacantes deben estar en las recomendaciones"
        assert tech_idx < acc_idx, f"La vacante Tech (pos {tech_idx}) debe estar antes de la Contable (pos {acc_idx})"
        print(f"  ✓ Priorización de talento verificada: Vacante Tech en posición #{tech_idx + 1}, Contable en #{acc_idx + 1}.")

        # ----------------------------------------------------------------------
        # TEST 7: Evaluación directa vía POST (/api/v1/ia/matching/evaluar-candidato)
        # ----------------------------------------------------------------------
        print("\n[TEST 7] Evaluando compatibilidad vía POST con payload formal...")
        post_eval = await client.post(
            "/api/v1/ia/matching/evaluar-candidato",
            json={"vacante_id": vac_tech_id},
            headers=grad_headers
        )
        assert post_eval.status_code == 200, f"Error en POST evaluar: {post_eval.text}"
        post_eval_data = post_eval.json()
        assert post_eval_data["match_score"] == eval_tech["match_score"]
        print(f"  ✓ Endpoint POST validado con coincidencia idéntica: {post_eval_data['porcentaje_afinidad']}%")

        # ----------------------------------------------------------------------
        # TEST 8: Validaciones de Seguridad y Casos Borde (401, 404)
        # ----------------------------------------------------------------------
        print("\n[TEST 8] Validaciones de seguridad y manejo de errores...")
        # Sin token
        unauth = await client.get(f"/api/v1/ia/matching/evaluar/{vac_tech_id}")
        assert unauth.status_code == 401, f"Sin token debe retornar 401, retornó {unauth.status_code}"

        # Vacante inexistente
        fake_id = str(uuid.uuid4())
        not_found = await client.get(f"/api/v1/ia/matching/evaluar/{fake_id}", headers=grad_headers)
        assert not_found.status_code == 404, f"ID inexistente debe retornar 404, retornó {not_found.status_code}"
        print("  ✓ Todas las restricciones de seguridad (401, 404) verificadas.")

    print("\n================================================================================")
    print(" 🎉 TODAS LAS PRUEBAS DE LA FASE 6 - PASO 1 HAN SIDO COMPLETADAS (100% VERDE)")
    print("================================================================================\n")


if __name__ == "__main__":
    asyncio.run(run_fase6_paso1_tests())

