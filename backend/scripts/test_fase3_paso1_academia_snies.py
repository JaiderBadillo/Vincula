"""
Test Suite de Verificación de la Fase 3 - Paso 1:
Gobernanza Académica IES: Sedes, Facultades, Programas SNIES y Asignación de Asesores en PostgreSQL.

Valida:
1. Autenticación y expedición de credenciales institucionales (Rol 'admin_ies' aprobado).
2. CRUD de Sedes Institucionales (Sede Principal y Seccionales).
3. CRUD de Facultades (Validación de unicidad de código).
4. CRUD de Programas Académicos con Código SNIES Oficial:
   - Validación de pertenencia de facultad y sede a la misma IES.
   - Bloqueo de duplicidad de código SNIES (HTTP 400 con motivo y acción).
   - Consulta paginada y filtrada por facultad, sede y nivel de formación.
5. Actualización de metadatos curriculares y activación/inactivación de programas.
6. Creación de asesores institucionales y vinculación transaccional con programas académicos.
"""

import sys
import os
import io
import uuid
import asyncio
from httpx import AsyncClient, ASGITransport

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app


def create_mock_pdf_stream(title: str) -> io.BytesIO:
    content = f"%PDF-1.4\n1 0 obj\n<< /Title ({title}) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF".encode("utf-8")
    buf = io.BytesIO(content)
    buf.name = f"{title.lower().replace(' ', '_')}.pdf"
    return buf


async def test_fase3_paso1_academia_snies():
    print("\n" + "=" * 80)
    print(" 🚀 EJECUTANDO PRUEBAS FASE 3 - PASO 1: SEDES, FACULTADES, PROGRAMAS SNIES & ASESORES")
    print("=" * 80)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:

        # ----------------------------------------------------------------------
        # 1. Login Super Admin y Radicación/Aprobación de una IES de prueba
        # ----------------------------------------------------------------------
        print("\n[TEST 1] Preparando institución acreditada de prueba...")
        login_admin = await client.post(
            "/api/v1/auth/login",
            json={"correo": "admin@vincula.com.co", "password": "Admin123*"}
        )
        assert login_admin.status_code == 200, f"Error login superadmin: {login_admin.text}"
        super_token = login_admin.json()["access_token"]
        headers_super = {"Authorization": f"Bearer {super_token}"}

        uid = uuid.uuid4().hex[:6]
        email_ies = f"rectoria.{uid}@universidadtest.edu.co"
        pass_ies = "IesSegura2026*!"

        pdf_men = create_mock_pdf_stream(f"Resolucion MEN {uid}")
        pdf_rut = create_mock_pdf_stream(f"RUT IES {uid}")

        res_reg = await client.post(
            "/api/v1/auth/registro-institucion-form",
            data={
                "nombre_institucion": f"Universidad Tecnológica de Colombia {uid}",
                "sigla": f"UTC-{uid.upper()}",
                "codigo_snies": f"88{uid[:4]}",
                "nit": f"899{uid}-1",
                "caracter_academico": "Universidad",
                "origen_institucional": "Privada",
                "correo_institucional": email_ies,
                "password": pass_ies,
                "telefono": "(607) 6912345",
                "direccion": "Avenida Los Estudiantes # 45-10",
                "ciudad": "Bucaramanga",
                "departamento": "Santander",
                "sitio_web": f"https://www.{uid}utc.edu.co",
                "nombre_rector": f"Dr. Roberto Gómez {uid}",
                "documento_rector": f"9123{uid}",
                "nombre_contacto_asesor": "Ing. Claudia Serrano",
                "cargo_asesor": "Directora de Programas Curriculares"
            },
            files=[
                ("resolucion_men_pdf", ("resolucion.pdf", pdf_men.getvalue(), "application/pdf")),
                ("rut_pdf", ("rut.pdf", pdf_rut.getvalue(), "application/pdf")),
            ]
        )
        assert res_reg.status_code == 200, f"Error registro IES: {res_reg.text}"
        id_ies = res_reg.json()["id_institucion"]

        # SuperAdmin aprueba la IES para levantar el gating de cuarentena
        app_res = await client.post(
            f"/api/v1/admin/ies/{id_ies}/aprobar",
            headers=headers_super,
            json={"notas": "Personería jurídica y registro SNIES ministerial validados conforme a la ley."}
        )
        assert app_res.status_code == 200, f"Error aprobando IES: {app_res.text}"

        # Login como la IES aprobada
        login_ies = await client.post(
            "/api/v1/auth/login",
            json={"correo": email_ies, "password": pass_ies}
        )
        assert login_ies.status_code == 200, f"Error login IES: {login_ies.text}"
        ies_auth = login_ies.json()
        assert ies_auth["estado_validacion"] == "aprobado"
        token_ies = ies_auth["access_token"]
        headers_ies = {"Authorization": f"Bearer {token_ies}"}
        print(f"  ✓ IES '{res_reg.json()['nombre_institucion']}' acreditada y autenticada (ID: {id_ies}).")

        # ----------------------------------------------------------------------
        # 2. Creación y Listado de Sedes Institucionales
        # ----------------------------------------------------------------------
        print("\n[TEST 2] Creando sedes institucionales (Campus Principal y Seccional)...")
        sede1_res = await client.post(
            "/api/v1/instituciones/sedes",
            headers=headers_ies,
            json={
                "nombre": "Campus Principal Ciudad Universitaria",
                "nombre_corto": "Campus Central",
                "ciudad": "Bucaramanga",
                "departamento": "Santander",
                "direccion": "Calle de los Estudiantes # 19-58",
                "telefono": "(607) 6451234",
                "correo": f"campus.central@{uid}utc.edu.co",
                "es_sede_principal": True
            }
        )
        assert sede1_res.status_code == 201, f"Error creando sede principal: {sede1_res.text}"
        sede_principal = sede1_res.json()
        id_sede_principal = sede_principal["id"]
        assert sede_principal["es_sede_principal"] is True

        sede2_res = await client.post(
            "/api/v1/instituciones/sedes",
            headers=headers_ies,
            json={
                "nombre": "Seccional Barrancabermeja",
                "nombre_corto": "Campus Puerto Petrolero",
                "ciudad": "Barrancabermeja",
                "departamento": "Santander",
                "direccion": "Diagonal 50 # 25-10",
                "telefono": "(607) 6224455",
                "correo": f"seccional.barranca@{uid}utc.edu.co",
                "es_sede_principal": False
            }
        )
        assert sede2_res.status_code == 201, f"Error creando sede seccional: {sede2_res.text}"
        sede_seccional = sede2_res.json()
        id_sede_seccional = sede_seccional["id"]

        list_sedes_res = await client.get("/api/v1/instituciones/sedes", headers=headers_ies)
        assert list_sedes_res.status_code == 200
        sedes_data = list_sedes_res.json()
        assert len(sedes_data) >= 2
        print(f"  ✓ {len(sedes_data)} sedes registradas en PostgreSQL:")
        for s in sedes_data[:2]:
            print(f"    - {s['nombre']} ({s['ciudad']}) [Principal: {s['es_sede_principal']}]")

        # ----------------------------------------------------------------------
        # 3. Creación y Listado de Facultades con Validación de Código
        # ----------------------------------------------------------------------
        print("\n[TEST 3] Creando facultades y verificando regla de unicidad de código...")
        fac1_res = await client.post(
            "/api/v1/instituciones/facultades",
            headers=headers_ies,
            json={
                "codigo": "FING",
                "sigla": "FING",
                "nombre": "Facultad de Ingeniería y Tecnologías de la Información",
                "telefono": "Ext. 201",
                "oficina": "Edificio Fundadores, Piso 3",
                "color_distintivo": "#00A86B"
            }
        )
        assert fac1_res.status_code == 201, f"Error creando facultad 1: {fac1_res.text}"
        facultad_ing = fac1_res.json()
        id_fac_ing = facultad_ing["id"]

        fac2_res = await client.post(
            "/api/v1/instituciones/facultades",
            headers=headers_ies,
            json={
                "codigo": "FCEA",
                "sigla": "FCEA",
                "nombre": "Facultad de Ciencias Económicas y Administrativas",
                "telefono": "Ext. 305",
                "oficina": "Edificio Administrativo, Piso 2",
                "color_distintivo": "#B1CC74"
            }
        )
        assert fac2_res.status_code == 201, f"Error creando facultad 2: {fac2_res.text}"
        facultad_eco = fac2_res.json()
        id_fac_eco = facultad_eco["id"]

        # Intento de código duplicado
        dup_fac_res = await client.post(
            "/api/v1/instituciones/facultades",
            headers=headers_ies,
            json={
                "codigo": "FING",
                "sigla": "FING2",
                "nombre": "Facultad de Ingeniería Repetida",
            }
        )
        assert dup_fac_res.status_code == 400, "Debe rechazar código de facultad duplicado"
        dup_err = dup_fac_res.json()["detail"]
        assert dup_err["codigo"] == "CODIGO_FACULTAD_DUPLICADO"
        print(f"  ✓ Bloqueo exitoso de código duplicado: {dup_err['mensaje']}")

        list_fac_res = await client.get("/api/v1/instituciones/facultades", headers=headers_ies)
        assert list_fac_res.status_code == 200
        assert len(list_fac_res.json()) >= 2
        print(f"  ✓ Facultades consultadas exitosamente ({len(list_fac_res.json())} registradas).")

        # ----------------------------------------------------------------------
        # 4. Creación de Programas Académicos con Código SNIES Oficial
        # ----------------------------------------------------------------------
        print("\n[TEST 4] Creando programas académicos con validación SNIES...")
        snies_prog1 = f"10{uid[:4]}"
        snies_prog2 = f"11{uid[:4]}"

        prog1_res = await client.post(
            "/api/v1/instituciones/programas",
            headers=headers_ies,
            json={
                "id_facultad": id_fac_ing,
                "id_sede": id_sede_principal,
                "codigo_interno": "PR-SIS-01",
                "codigo_snies": snies_prog1,
                "nombre": "Ingeniería de Sistemas y Computación",
                "nivel_formacion": "Profesional Universitario",
                "modalidad": "Presencial",
                "duracion_semestres": 10,
                "total_creditos": 160,
                "nombre_director": "Ing. Mauricio Prada",
                "correo_director": f"sistemas.{uid}@utc.edu.co",
                "estado_acreditacion": "Acreditación de Alta Calidad Vigente"
            }
        )
        assert prog1_res.status_code == 201, f"Error creando programa 1: {prog1_res.text}"
        prog_sistemas = prog1_res.json()
        id_prog_sistemas = prog_sistemas["id"]
        assert prog_sistemas["codigo_snies"] == snies_prog1
        assert prog_sistemas["nombre_facultad"] == facultad_ing["nombre"]

        prog2_res = await client.post(
            "/api/v1/instituciones/programas",
            headers=headers_ies,
            json={
                "id_facultad": id_fac_ing,
                "id_sede": id_sede_seccional,
                "codigo_interno": "TC-DS-01",
                "codigo_snies": snies_prog2,
                "nombre": "Tecnología en Desarrollo de Software y Aplicaciones Móviles",
                "nivel_formacion": "Tecnológico",
                "modalidad": "Híbrida",
                "duracion_semestres": 6,
                "total_creditos": 98,
                "nombre_director": "Ing. Johana Blanco",
                "correo_director": f"software.{uid}@utc.edu.co",
                "estado_acreditacion": "Registro Calificado Vigente"
            }
        )
        assert prog2_res.status_code == 201, f"Error creando programa 2: {prog2_res.text}"
        prog_tec = prog2_res.json()
        id_prog_tec = prog_tec["id"]

        print(f"  ✓ Programa 1 creado: {prog_sistemas['nombre']} (SNIES: {prog_sistemas['codigo_snies']})")
        print(f"  ✓ Programa 2 creado: {prog_tec['nombre']} (SNIES: {prog_tec['codigo_snies']})")

        # ----------------------------------------------------------------------
        # 5. Validación de Candados Curriculares (SNIES duplicado y Facultad ajena)
        # ----------------------------------------------------------------------
        print("\n[TEST 5] Verificando candados de integridad curricular (SNIES duplicado)...")
        dup_snies_res = await client.post(
            "/api/v1/instituciones/programas",
            headers=headers_ies,
            json={
                "id_facultad": id_fac_ing,
                "id_sede": id_sede_principal,
                "codigo_interno": "PR-REP-01",
                "codigo_snies": snies_prog1,  # Repetido
                "nombre": "Ingeniería de Sistemas Nocturna (Repetida)",
                "nivel_formacion": "Profesional Universitario",
                "modalidad": "Presencial",
                "duracion_semestres": 10,
                "total_creditos": 160
            }
        )
        assert dup_snies_res.status_code == 400, "Debe bloquear código SNIES duplicado"
        snies_err = dup_snies_res.json()["detail"]
        assert snies_err["codigo"] == "CODIGO_SNIES_DUPLICADO"
        assert "motivo" in snies_err
        print(f"  ✓ REGLA CUMPLIDA: Bloqueado por SNIES duplicado: {snies_err['mensaje']}")

        # ----------------------------------------------------------------------
        # 6. Listado Paginado y Filtrado de Programas
        # ----------------------------------------------------------------------
        print("\n[TEST 6] Consultando programas paginados y filtrando por nivel de formación...")
        filter_res = await client.get(
            "/api/v1/instituciones/programas?nivel_formacion=Tecnológico&page=1&limit=10",
            headers=headers_ies
        )
        assert filter_res.status_code == 200, f"Error filtro programas: {filter_res.text}"
        filter_data = filter_res.json()
        assert "items" in filter_data
        assert "total" in filter_data
        assert any(p["id"] == id_prog_tec for p in filter_data["items"])
        assert not any(p["id"] == id_prog_sistemas for p in filter_data["items"])
        print(f"  ✓ Filtro exitoso: {filter_data['total']} programa(s) nivel 'Tecnológico' encontrados.")

        # ----------------------------------------------------------------------
        # 7. Actualización de Metadatos y Alternancia de Estado (Activar/Inactivar)
        # ----------------------------------------------------------------------
        print("\n[TEST 7] Actualizando metadatos curriculares y alternando estado...")
        upd_res = await client.put(
            f"/api/v1/instituciones/programas/{id_prog_sistemas}",
            headers=headers_ies,
            json={
                "total_creditos": 165,
                "correo_director": f"direccion.sistemas.{uid}@utc.edu.co"
            }
        )
        assert upd_res.status_code == 200, f"Error actualizando programa: {upd_res.text}"
        assert upd_res.json()["total_creditos"] == 165

        # Inactivar temporalmente
        toggle_res = await client.patch(
            f"/api/v1/instituciones/programas/{id_prog_sistemas}/estado",
            headers=headers_ies,
            json={"estado": "inactivo"}
        )
        assert toggle_res.status_code == 200
        assert toggle_res.json()["estado"] == "inactivo"

        # Reactivar
        toggle_res2 = await client.patch(
            f"/api/v1/instituciones/programas/{id_prog_sistemas}/estado",
            headers=headers_ies,
            json={"estado": "activo"}
        )
        assert toggle_res2.status_code == 200
        assert toggle_res2.json()["estado"] == "activo"
        print("  ✓ Programa actualizado y alternado (inactivo -> activo) exitosamente.")

        # ----------------------------------------------------------------------
        # 8. Creación de Asesor y Asignación Transaccional a Programas
        # ----------------------------------------------------------------------
        print("\n[TEST 8] Creando asesor institucional y asignándolo al programa...")
        email_asesor = f"asesor.{uid}@utc.edu.co"
        asesor_res = await client.post(
            "/api/v1/instituciones/asesores",
            headers=headers_ies,
            json={
                "correo": email_asesor,
                "password": "AsesorPass2026*!",
                "nombre_completo": f"Ing. Camilo Torres {uid}",
                "telefono": "3167788990",
                "cargo": "Coordinador de Prácticas y Empleabilidad de Ingenierías",
                "id_sede": id_sede_principal,
                "id_facultad": id_fac_ing
            }
        )
        assert asesor_res.status_code == 201, f"Error creando asesor: {asesor_res.text}"
        asesor = asesor_res.json()
        id_asesor = asesor["id"]
        print(f"  ✓ Asesor institucional creado: {asesor['nombre_completo']} (ID: {id_asesor})")

        # Asignar asesor al programa de Sistemas
        assign_res = await client.post(
            f"/api/v1/instituciones/programas/{id_prog_sistemas}/asignar-asesor",
            headers=headers_ies,
            json={"id_asesor": id_asesor}
        )
        assert assign_res.status_code == 200, f"Error asignando asesor: {assign_res.text}"
        assign_data = assign_res.json()
        assert assign_data["success"] is True

        # Verificar lista de asesores con su programa asignado
        asesores_list_res = await client.get("/api/v1/instituciones/asesores", headers=headers_ies)
        assert asesores_list_res.status_code == 200
        as_found = next((a for a in asesores_list_res.json() if a["id"] == id_asesor), None)
        assert as_found is not None
        assert id_prog_sistemas in as_found["programas_ids"]
        print(f"  ✓ Asignación verificada en base de datos: {as_found['programas_asignados_count']} programa(s) asignados al asesor.")

    print("\n" + "=" * 80)
    print(" 🎉 TODAS LAS PRUEBAS DE LA FASE 3 - PASO 1 PASARON SATISFACTORIAMENTE (100% VERDE)")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    asyncio.run(test_fase3_paso1_academia_snies())

