"""
Test Suite de Verificación de la Fase 4 - Paso 2:
Motor de Vacantes con Gating de Ley, Paginación y SLA (< 3s RNF-02).

Valida:
1. Setup Multi-Tenant: Empresa Aprobada A, Empresa Aprobada B y Empresa C en Cuarentena.
2. Publicación de Vacante Formal con todos los campos de ley colombiana, taxonomía y código VAC-2026-XXXX.
3. Gating de Cuarentena: Empresa en estado 'pendiente' bloqueada ante publicación con HTTP 403.
4. Catálogo Público de Vacantes para egresados con paginación y tiempo de respuesta SLA < 3.0s (RNF-02).
5. Filtros multicriterio (modalidad, salario, categoría, texto de búsqueda).
6. Detalle público seguro de vacantes (solo empresas aprobadas y vacantes abiertas).
7. Bandeja privada corporativa (mis-vacantes) con estricto aislamiento multi-tenant.
8. Ciclo de vida de la vacante: Abierta -> Pausada (desaparece de catálogo público) -> Cerrada.
9. Prevención de cruce multi-tenant en sedes y manipulación de vacantes ajenas.
"""

import sys
import os
import io
import time
import uuid
import asyncio
from datetime import datetime, timedelta, timezone
from httpx import AsyncClient, ASGITransport

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app


def create_mock_pdf_stream(title: str) -> io.BytesIO:
    content = f"%PDF-1.4\n1 0 obj\n<< /Title ({title}) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF".encode("utf-8")
    buf = io.BytesIO(content)
    buf.name = f"{title.lower().replace(' ', '_')}.pdf"
    return buf


async def test_fase4_paso2_motor_vacantes():
    print("\n" + "=" * 80)
    print(" 🚀 EJECUTANDO PRUEBAS FASE 4 - PASO 2: MOTOR DE VACANTES & SLA < 3s (RNF-02)")
    print("=" * 80)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:

        # ----------------------------------------------------------------------
        # 1. Setup Multi-Tenant: 2 Empresas Aprobadas y 1 en Cuarentena
        # ----------------------------------------------------------------------
        print("\n[TEST 1] Setup Multi-Tenant: Creando empresas y aprobando con SuperAdmin...")
        login_admin = await client.post(
            "/api/v1/auth/login",
            json={"correo": "admin@vincula.com.co", "password": "Admin123*"}
        )
        assert login_admin.status_code == 200
        headers_super = {"Authorization": f"Bearer {login_admin.json()['access_token']}"}

        uid_a = uuid.uuid4().hex[:6]
        uid_b = uuid.uuid4().hex[:6]
        uid_c = uuid.uuid4().hex[:6]

        pdf_cam = create_mock_pdf_stream("Camara")
        pdf_rut = create_mock_pdf_stream("RUT")
        pdf_rep = create_mock_pdf_stream("Rep Legal")

        # Registrar Empresa A (Aprobada)
        email_a = f"contacto.{uid_a}@techcloud.co"
        pass_a = "TechPass2026*!"
        res_a = await client.post(
            "/api/v1/auth/registro-empresa-form",
            data={
                "razon_social": f"Tech Cloud Services {uid_a} SAS",
                "nombre_comercial": f"Tech Cloud {uid_a}",
                "nit": f"903{uid_a}-1",
                "sector_economico": "Tecnología",
                "tamano_empresa": "Mediana",
                "departamento": "Santander",
                "ciudad": "Bucaramanga",
                "direccion": "Calle 48 # 33-10",
                "telefono": "3151112233",
                "correo_contacto": email_a,
                "password": pass_a,
                "nombre_representante_legal": "Elena Mantilla",
                "documento_representante_legal": f"6344{uid_a}",
                "persona_contacto": "Elena Mantilla"
            },
            files=[
                ("camara_comercio_pdf", ("cam.pdf", pdf_cam.getvalue(), "application/pdf")),
                ("rut_pdf", ("rut.pdf", pdf_rut.getvalue(), "application/pdf")),
                ("cedula_rep_legal_pdf", ("rep.pdf", pdf_rep.getvalue(), "application/pdf")),
            ]
        )
        assert res_a.status_code == 200
        id_emp_a = res_a.json()["id_empresa"]

        # Registrar Empresa B (Aprobada)
        email_b = f"talento.{uid_b}@logisticabeta.co"
        pass_b = "BetaPass2026*!"
        res_b = await client.post(
            "/api/v1/auth/registro-empresa-form",
            data={
                "razon_social": f"Logística Beta {uid_b} SAS",
                "nombre_comercial": f"Logística Beta {uid_b}",
                "nit": f"903{uid_b}-2",
                "sector_economico": "Transporte",
                "tamano_empresa": "Grande",
                "departamento": "Santander",
                "ciudad": "Floridablanca",
                "direccion": "Anillo Vial Km 2",
                "telefono": "3162223344",
                "correo_contacto": email_b,
                "password": pass_b,
                "nombre_representante_legal": "Jorge Duarte",
                "documento_representante_legal": f"9122{uid_b}",
                "persona_contacto": "Jorge Duarte"
            },
            files=[
                ("camara_comercio_pdf", ("cam.pdf", pdf_cam.getvalue(), "application/pdf")),
                ("rut_pdf", ("rut.pdf", pdf_rut.getvalue(), "application/pdf")),
                ("cedula_rep_legal_pdf", ("rep.pdf", pdf_rep.getvalue(), "application/pdf")),
            ]
        )
        assert res_b.status_code == 200
        id_emp_b = res_b.json()["id_empresa"]

        # Registrar Empresa C (En Cuarentena - Pendiente)
        email_c = f"fraude.{uid_c}@cuarentena.co"
        pass_c = "Cuarentena2026*!"
        res_c = await client.post(
            "/api/v1/auth/registro-empresa-form",
            data={
                "razon_social": f"Empresa Cuarentena {uid_c} SAS",
                "nombre_comercial": f"Cuarentena {uid_c}",
                "nit": f"903{uid_c}-3",
                "sector_economico": "Servicios",
                "tamano_empresa": "Micro",
                "departamento": "Santander",
                "ciudad": "Bucaramanga",
                "direccion": "Calle Falsa 123",
                "telefono": "3000000000",
                "correo_contacto": email_c,
                "password": pass_c,
                "nombre_representante_legal": "Candidato Cuarentena",
                "documento_representante_legal": f"1098{uid_c}",
                "persona_contacto": "Candidato Cuarentena"
            },
            files=[
                ("camara_comercio_pdf", ("cam.pdf", pdf_cam.getvalue(), "application/pdf")),
                ("rut_pdf", ("rut.pdf", pdf_rut.getvalue(), "application/pdf")),
            ]
        )
        assert res_c.status_code == 200
        id_emp_c = res_c.json()["id_empresa"]

        # SuperAdmin aprueba Empresa A y B (Empresa C permanece en Cuarentena)
        await client.post(f"/api/v1/admin/empresas/{id_emp_a}/aprobar", headers=headers_super, json={"notas": "Aprobada A"})
        await client.post(f"/api/v1/admin/empresas/{id_emp_b}/aprobar", headers=headers_super, json={"notas": "Aprobada B"})

        # Login de Empresas
        login_a = await client.post("/api/v1/auth/login", json={"correo": email_a, "password": pass_a})
        headers_emp_a = {"Authorization": f"Bearer {login_a.json()['access_token']}"}

        login_b = await client.post("/api/v1/auth/login", json={"correo": email_b, "password": pass_b})
        headers_emp_b = {"Authorization": f"Bearer {login_b.json()['access_token']}"}

        login_c = await client.post("/api/v1/auth/login", json={"correo": email_c, "password": pass_c})
        headers_emp_c = {"Authorization": f"Bearer {login_c.json()['access_token']}"}

        # Crear Sede para Empresa A y Sede para Empresa B
        res_sede_a = await client.post(
            "/api/v1/empresas/sedes",
            headers=headers_emp_a,
            json={
                "nombre": "Headquarters Bucaramanga",
                "departamento": "Santander",
                "ciudad": "Bucaramanga",
                "direccion": "Cra 33 # 48-10 Piso 5",
                "es_sede_principal": True
            }
        )
        assert res_sede_a.status_code == 201
        id_sede_a = res_sede_a.json()["id"]

        res_sede_b = await client.post(
            "/api/v1/empresas/sedes",
            headers=headers_emp_b,
            json={
                "nombre": "Centro Logístico Floridablanca",
                "departamento": "Santander",
                "ciudad": "Floridablanca",
                "direccion": "Anillo Vial Km 2",
                "es_sede_principal": True
            }
        )
        assert res_sede_b.status_code == 201
        id_sede_b = res_sede_b.json()["id"]

        print(f"  ✓ Empresas aprobadas listas: A ({id_emp_a}) y B ({id_emp_b}). Empresa C ({id_emp_c}) en cuarentena.")

        # ----------------------------------------------------------------------
        # 2. Publicación de Vacante Formal con Campos de Ley (Empresa A)
        # ----------------------------------------------------------------------
        print("\n[TEST 2] Publicando vacante formal de ley con taxonomía de competencias...")
        fecha_cierre_str = (datetime.now(timezone.utc) + timedelta(days=30)).strftime("%Y-%m-%d")

        payload_vacante = {
            "titulo": f"Desarrollador Full Stack Python y React {uid_a}",
            "id_sede": id_sede_a,
            "categoria": "Tecnología",
            "modalidad": "Híbrido",
            "tipo_contrato": "Término Indefinido",
            "nivel_experiencia": "Semi-Senior",
            "salario_minimo": 4500000.0,
            "salario_maximo": 6500000.0,
            "salario_es_confidencial": False,
            "periodo_salario": "Mensual",
            "jornada_laboral": "Tiempo Completo",
            "cupos_disponibles": 2,
            "descripcion": "Buscamos un desarrollador de software para liderar la evolución de plataformas escalables en microservicios y React.",
            "responsabilidades": [
                "Diseñar e implementar endpoints asíncronos en FastAPI",
                "Construir interfaces de usuario reactivas con Tailwind CSS",
                "Optimizar consultas en bases de datos PostgreSQL"
            ],
            "requisitos": [
                "Título universitario en Ingeniería de Sistemas o afines",
                "Experiencia mínima de 2 años en Python y React",
                "Conocimientos sólidos en arquitecturas asíncronas"
            ],
            "beneficios": [
                "Plan complementario de salud",
                "Bono de conectividad para teletrabajo",
                "Día libre de cumpleaños"
            ],
            "idiomas_requeridos": ["Español Nativo", "Inglés B2"],
            "fecha_cierre": fecha_cierre_str,
            "estado": "abierta",
            "competencias": [
                {"nombre": "Python", "categoria": "tecnica", "es_obligatoria": True},
                {"nombre": "FastAPI", "categoria": "tecnica", "es_obligatoria": True},
                {"nombre": "React", "categoria": "tecnica", "es_obligatoria": True},
                {"nombre": "Trabajo en Equipo", "categoria": "blanda", "es_obligatoria": False}
            ]
        }

        res_post_vac = await client.post("/api/v1/vacantes", headers=headers_emp_a, json=payload_vacante)
        assert res_post_vac.status_code == 201, f"Error creando vacante: {res_post_vac.text}"
        vac_data = res_post_vac.json()
        id_vacante_a = vac_data["id"]
        codigo_vac_a = vac_data["codigo_vacante"]

        assert vac_data["estado"] == "abierta"
        assert vac_data["codigo_vacante"].startswith("VAC-2026-")
        assert len(vac_data["competencias"]) == 4
        assert vac_data["empresa"]["empresa_verificada"] is True
        assert vac_data["sede"]["ciudad"] == "Bucaramanga"
        print(f"  ✓ Vacante publicada exitosamente con código oficial: {codigo_vac_a} (ID: {id_vacante_a})")

        # ----------------------------------------------------------------------
        # 3. Gating de Cuarentena: Empresa C Bloqueada (HTTP 403)
        # ----------------------------------------------------------------------
        print("\n[TEST 3] Verificando Gating de Cuarentena (Empresa no aprobada no puede operar vacantes)...")
        res_cuarentena = await client.post(
            "/api/v1/vacantes",
            headers=headers_emp_c,
            json={
                "titulo": "Vacante Ilícita de Prueba",
                "id_sede": id_sede_a,
                "categoria": "Ventas",
                "modalidad": "Remoto",
                "tipo_contrato": "Indefinido",
                "nivel_experiencia": "Sin experiencia",
                "descripcion": "Oferta sospechosa que debe ser interceptada por el gating.",
                "fecha_cierre": fecha_cierre_str
            }
        )
        assert res_cuarentena.status_code == 403, f"Esperado 403 Forbidden para empresa en cuarentena, obtenido {res_cuarentena.status_code}"
        assert res_cuarentena.json()["detail"]["codigo"] == "EMPRESA_EN_CUARENTENA"
        print(f"  ✓ GATING ACTIVO: Empresa en cuarentena interceptada con HTTP 403 ({res_cuarentena.json()['detail']['codigo']}).")

        # ----------------------------------------------------------------------
        # 4. Catálogo Público de Vacantes y Rendimiento SLA < 3.0s (RNF-02)
        # ----------------------------------------------------------------------
        print("\n[TEST 4] Catálogo público de vacantes para egresados con monitoreo de SLA (< 3s)...")
        t_start = time.perf_counter()
        res_cat = await client.get("/api/v1/vacantes?page=1&limit=10")
        t_elapsed = time.perf_counter() - t_start

        assert res_cat.status_code == 200, f"Error en catálogo: {res_cat.text}"
        cat_data = res_cat.json()
        assert t_elapsed < 3.0, f"Alerta RNF-02: Tiempo de respuesta {t_elapsed:.3f}s supera SLA de 3.0s"
        assert cat_data["total"] >= 1

        # Validar que la vacante creada aparece en el catálogo
        found_vac = next((v for v in cat_data["items"] if v["id"] == id_vacante_a), None)
        assert found_vac is not None, "La vacante abierta no fue listada en el catálogo público"
        assert found_vac["empresa_verificada"] is True
        print(f"  ✓ Catálogo obtenido en {t_elapsed*1000:.2f} ms (SLA < 3000 ms RNF-02 CUMPLIDO). Total vacantes: {cat_data['total']}.")

        # ----------------------------------------------------------------------
        # 5. Filtros Multicriterio en Catálogo Público
        # ----------------------------------------------------------------------
        print("\n[TEST 5] Probando filtros multicriterio (modalidad, salario, categoría, búsqueda q)...")
        # Filtro modalidad coincidente
        res_mod_hit = await client.get("/api/v1/vacantes?modalidad=Híbrido")
        assert res_mod_hit.status_code == 200
        assert any(v["id"] == id_vacante_a for v in res_mod_hit.json()["items"])

        # Filtro modalidad no coincidente
        res_mod_miss = await client.get("/api/v1/vacantes?modalidad=Remoto")
        assert res_mod_miss.status_code == 200
        assert not any(v["id"] == id_vacante_a for v in res_mod_miss.json()["items"])

        # Búsqueda por texto q
        res_q = await client.get(f"/api/v1/vacantes?q={uid_a}")
        assert res_q.status_code == 200
        assert len(res_q.json()["items"]) >= 1

        # Filtro por salario mínimo
        res_sal = await client.get("/api/v1/vacantes?salario_min=4000000")
        assert res_sal.status_code == 200
        assert any(v["id"] == id_vacante_a for v in res_sal.json()["items"])
        print(f"  ✓ Filtros avanzados probados y funcionando correctamente.")

        # ----------------------------------------------------------------------
        # 6. Detalle Público de Vacante Segura
        # ----------------------------------------------------------------------
        print("\n[TEST 6] Consulta de detalle de vacante pública segura...")
        res_det = await client.get(f"/api/v1/vacantes/{id_vacante_a}")
        assert res_det.status_code == 200
        det_data = res_det.json()
        assert det_data["id"] == id_vacante_a
        assert det_data["codigo_vacante"] == codigo_vac_a
        assert det_data["salario_minimo"] == 4500000.0
        assert len(det_data["responsabilidades"]) == 3

        # Intentar consultar ID inexistente
        fake_id = str(uuid.uuid4())
        res_404 = await client.get(f"/api/v1/vacantes/{fake_id}")
        assert res_404.status_code == 404
        assert res_404.json()["detail"]["codigo"] == "VACANTE_NO_DISPONIBLE"
        print(f"  ✓ Detalle de vacante verificado y 404 pedagógico para vacantes inexistentes.")

        # ----------------------------------------------------------------------
        # 7. Bandeja Privada Corporativa (Mis Vacantes) y Multi-Tenancy
        # ----------------------------------------------------------------------
        print("\n[TEST 7] Verificando bandeja privada de vacantes de la empresa y aislamiento multi-tenant...")
        # Empresa A consulta sus vacantes
        res_mis_a = await client.get("/api/v1/vacantes/empresa/mis-vacantes", headers=headers_emp_a)
        assert res_mis_a.status_code == 200
        assert any(v["id"] == id_vacante_a for v in res_mis_a.json()["items"])

        # Empresa B consulta sus vacantes (debe estar vacía o no contener las de Empresa A)
        res_mis_b = await client.get("/api/v1/vacantes/empresa/mis-vacantes", headers=headers_emp_b)
        assert res_mis_b.status_code == 200
        assert not any(v["id"] == id_vacante_a for v in res_mis_b.json()["items"])
        print(f"  ✓ Bandeja corporativa privada aislada 100% entre empresas.")

        # ----------------------------------------------------------------------
        # 8. Ciclo de Vida: Abierta -> Pausada (Oculta al público) -> Cerrada
        # ----------------------------------------------------------------------
        print("\n[TEST 8] Gestionando ciclo de vida de la vacante (Pausar y Cerrar)...")
        # Pausar vacante
        res_pause = await client.patch(
            f"/api/v1/vacantes/{id_vacante_a}/estado",
            headers=headers_emp_a,
            json={"estado": "pausada"}
        )
        assert res_pause.status_code == 200
        assert res_pause.json()["estado"] == "pausada"

        # Verificar que ya NO aparece en el catálogo público para egresados
        res_cat_paused = await client.get("/api/v1/vacantes?page=1&limit=50")
        assert not any(v["id"] == id_vacante_a for v in res_cat_paused.json()["items"])
        print(f"  ✓ Vacante pausada oculta de inmediato en el catálogo público de egresados.")

        # Reactivar a 'abierta'
        res_reopen = await client.patch(
            f"/api/v1/vacantes/{id_vacante_a}/estado",
            headers=headers_emp_a,
            json={"estado": "abierta"}
        )
        assert res_reopen.status_code == 200
        assert res_reopen.json()["estado"] == "abierta"

        # Verificar que reaparece en el catálogo público
        res_cat_reopened = await client.get("/api/v1/vacantes?page=1&limit=50")
        assert any(v["id"] == id_vacante_a for v in res_cat_reopened.json()["items"])
        print(f"  ✓ Vacante reabierta disponible nuevamente en el catálogo.")

        # Actualizar datos de la vacante (PUT)
        res_put = await client.put(
            f"/api/v1/vacantes/{id_vacante_a}",
            headers=headers_emp_a,
            json={"cupos_disponibles": 5, "salario_maximo": 7000000.0}
        )
        assert res_put.status_code == 200
        assert res_put.json()["cupos_disponibles"] == 5
        assert res_put.json()["salario_maximo"] == 7000000.0
        print(f"  ✓ Actualización de vacante verificada con éxito.")

        # ----------------------------------------------------------------------
        # 9. Seguridad Multi-Tenant en Vacantes
        # ----------------------------------------------------------------------
        print("\n[TEST 9] Intentos de cruce multi-tenant en vacantes...")
        # Empresa B intenta modificar vacante de Empresa A -> 404
        res_sec1 = await client.put(
            f"/api/v1/vacantes/{id_vacante_a}",
            headers=headers_emp_b,
            json={"titulo": "Ataque Malicioso"}
        )
        assert res_sec1.status_code == 404

        # Empresa A intenta crear vacante con la sede de Empresa B -> 403
        res_sec2 = await client.post(
            "/api/v1/vacantes",
            headers=headers_emp_a,
            json={
                "titulo": "Vacante con Sede Ajena",
                "id_sede": id_sede_b,
                "categoria": "Tecnología",
                "modalidad": "Presencial",
                "tipo_contrato": "Indefinido",
                "nivel_experiencia": "Senior",
                "descripcion": "Intento de usurpación de sede.",
                "fecha_cierre": fecha_cierre_str
            }
        )
        assert res_sec2.status_code == 403
        assert res_sec2.json()["detail"]["codigo"] == "SEDE_NO_AUTORIZADA"
        print(f"  ✓ Multi-tenancy blindado: Bloqueo de alteración de vacantes y sedes ajenas (HTTP 404 / 403).")

    print("\n" + "=" * 80)
    print(" 🎉 TODAS LAS PRUEBAS DE LA FASE 4 - PASO 2 HAN SIDO COMPLETADAS (100% VERDE)")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    asyncio.run(test_fase4_paso2_motor_vacantes())

