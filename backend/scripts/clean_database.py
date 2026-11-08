"""
Script de Depuración y Limpieza Total del Dataset en Supabase PostgreSQL.
Conserva ÚNICAMENTE:
1. Cuenta de Administrador de Vincula (admin@vincula.com.co / superadmin_vincula)
2. Cuenta e Institución de las Unidades Tecnológicas de Santander - UTS (ies@uts.edu.co / admin_ies)
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import AsyncSessionLocal
from sqlalchemy import text

UTS_INSTITUTION_ID = "1a058424-c259-4aaa-9829-4fb4587f5fc0"
UTS_USER_ID = "b5f80fc8-a082-4e12-b3ee-53f24000169e"
VINCULA_ADMIN_USER_ID = "3d8ba519-2f81-458f-b422-58d0b20e45d6"

async def clean_database():
    print("=" * 80)
    print("INICIANDO LIMPIEZA DE DATASET EN POSTGRESQL (SUPABASE)")
    print("=" * 80)

    async with AsyncSessionLocal() as session:
        # 1. Limpieza de Vacantes, Postulaciones y Selección
        print("1. Limpiando postulaciones, vacantes y procesos de selección...")
        await session.execute(text("DELETE FROM notas_reclutador_postulacion;"))
        await session.execute(text("DELETE FROM entrevistas_postulacion;"))
        await session.execute(text("DELETE FROM historial_fases_postulacion;"))
        await session.execute(text("DELETE FROM postulaciones;"))
        await session.execute(text("DELETE FROM competencias_exigidas_vacante;"))
        await session.execute(text("DELETE FROM programas_afines_vacante;"))
        await session.execute(text("DELETE FROM vacantes;"))

        # 2. Limpieza de Empresas y Reclutadores
        print("2. Limpiando empresas, sedes, áreas y reclutadores...")
        await session.execute(text("DELETE FROM asignacion_reclutadores_sedes;"))
        await session.execute(text("DELETE FROM areas_sede_empresa;"))
        await session.execute(text("DELETE FROM sedes_empresa;"))
        await session.execute(text("DELETE FROM documentos_empresa;"))
        await session.execute(text("DELETE FROM bitacora_actividad_empresa;"))
        await session.execute(text("DELETE FROM interacciones_seguimiento_empresa;"))
        await session.execute(text("DELETE FROM convenios_interinstitucionales;"))
        await session.execute(text("DELETE FROM solicitudes_convenio_ies;"))
        await session.execute(text("DELETE FROM favoritos_banco_talento;"))
        await session.execute(text("DELETE FROM invitaciones_banco_talento;"))
        await session.execute(text("DELETE FROM reclutadores_empresa;"))
        await session.execute(text("DELETE FROM empresas;"))

        # 3. Limpieza de Egresados
        print("3. Limpiando egresados y registros laborales de prueba...")
        await session.execute(text("DELETE FROM competencias_egresado;"))
        await session.execute(text("DELETE FROM academicos_egresado;"))
        await session.execute(text("DELETE FROM experiencias_laborales_egresado;"))
        await session.execute(text("DELETE FROM registros_laborales_egresado;"))
        await session.execute(text("DELETE FROM idiomas_egresado;"))
        await session.execute(text("DELETE FROM enlaces_egresado;"))
        await session.execute(text("DELETE FROM archivos_hoja_vida;"))
        await session.execute(text("DELETE FROM egresados;"))

        # 4. Limpieza de Instituciones (conservando únicamente UTS)
        print("4. Limpiando instituciones que no sean UTS...")
        await session.execute(text(f"""
            DELETE FROM asignacion_asesores_programas 
            WHERE id_asesor IN (
                SELECT id FROM asesores_ies WHERE id_institucion != '{UTS_INSTITUTION_ID}'
            );
        """))
        await session.execute(text(f"""
            DELETE FROM competencias_asignatura 
            WHERE id_asignatura IN (
                SELECT ap.id FROM asignaturas_pensum ap
                JOIN pensums_programa pp ON ap.id_pensum = pp.id
                JOIN programas_academicos pa ON pp.id_programa = pa.id
                WHERE pa.id_institucion != '{UTS_INSTITUTION_ID}'
            );
        """))
        await session.execute(text(f"""
            DELETE FROM asignaturas_pensum 
            WHERE id_pensum IN (
                SELECT pp.id FROM pensums_programa pp
                JOIN programas_academicos pa ON pp.id_programa = pa.id
                WHERE pa.id_institucion != '{UTS_INSTITUTION_ID}'
            );
        """))
        await session.execute(text(f"""
            DELETE FROM pensums_programa 
            WHERE id_programa IN (
                SELECT id FROM programas_academicos WHERE id_institucion != '{UTS_INSTITUTION_ID}'
            );
        """))
        await session.execute(text(f"""
            DELETE FROM programas_academicos WHERE id_institucion != '{UTS_INSTITUTION_ID}';
        """))
        await session.execute(text(f"""
            DELETE FROM facultades WHERE id_institucion != '{UTS_INSTITUTION_ID}';
        """))
        await session.execute(text(f"""
            DELETE FROM sedes_institucion WHERE id_institucion != '{UTS_INSTITUTION_ID}';
        """))
        await session.execute(text(f"""
            DELETE FROM documentos_institucion WHERE id_institucion != '{UTS_INSTITUTION_ID}';
        """))
        await session.execute(text(f"""
            DELETE FROM asesores_ies WHERE id_institucion != '{UTS_INSTITUTION_ID}';
        """))
        await session.execute(text(f"""
            DELETE FROM asesores_ies 
            WHERE id_institucion = '{UTS_INSTITUTION_ID}' 
            AND id_usuario != '{UTS_USER_ID}';
        """))
        await session.execute(text(f"""
            DELETE FROM instituciones WHERE id != '{UTS_INSTITUTION_ID}';
        """))

        # 5. Limpieza de Auditorías y Usuarios
        print("5. Limpiando auditorias y usuarios no autorizados...")
        await session.execute(text("DELETE FROM auditorias_superadmin;"))
        await session.execute(text(f"""
            DELETE FROM usuarios 
            WHERE id NOT IN ('{VINCULA_ADMIN_USER_ID}', '{UTS_USER_ID}');
        """))

        # 6. Estructura Académica Base de UTS (Sede, Facultad y Programas)
        print("6. Asegurando sede principal, facultad y programas de UTS...")
        
        # Sede Principal UTS
        sede_res = await session.execute(text(f"""
            SELECT id FROM sedes_institucion 
            WHERE id_institucion = '{UTS_INSTITUTION_ID}' AND es_sede_principal = TRUE
            LIMIT 1;
        """))
        sede_id = sede_res.scalar()
        if not sede_id:
            sede_ins = await session.execute(text(f"""
                INSERT INTO sedes_institucion (
                    id, id_institucion, nombre, nombre_corto, ciudad, departamento, 
                    direccion, telefono, correo, es_sede_principal
                ) VALUES (
                    gen_random_uuid(), '{UTS_INSTITUTION_ID}', 
                    'Campus Principal Ciudadela Real de Minas', 'BGA-RealMinas', 
                    'Bucaramanga', 'Santander', 'Calle de los Estudiantes # 9-82', 
                    '(607) 6917700', 'ies@uts.edu.co', TRUE
                ) RETURNING id;
            """))
            sede_id = sede_ins.scalar()

        # Facultad de Ingeniería
        fac_res = await session.execute(text(f"""
            SELECT id FROM facultades 
            WHERE id_institucion = '{UTS_INSTITUTION_ID}'
            LIMIT 1;
        """))
        fac_id = fac_res.scalar()
        if not fac_id:
            fac_ins = await session.execute(text(f"""
                INSERT INTO facultades (
                    id, id_institucion, codigo, sigla, nombre, oficina, color_distintivo
                ) VALUES (
                    gen_random_uuid(), '{UTS_INSTITUTION_ID}', 
                    'FAC-ING-01', 'FCNI', 'Facultad de Ciencias Naturales e Ingenierías', 
                    'Edificio A - Piso 3', '#007A33'
                ) RETURNING id;
            """))
            fac_id = fac_ins.scalar()

        # Programas de UTS
        uts_programs = [
            ("Tecnología en Desarrollo de Sistemas Informáticos", "Tecnológico", "Presencial", 6, 108, "TDSI-01", "102938"),
            ("Ingeniería de Sistemas", "Profesional Universitario", "Presencial", 10, 168, "INGSIS-01", "54821"),
            ("Tecnología en Electricidad Industrial", "Tecnológico", "Presencial", 6, 106, "TEI-01", "28271"),
            ("Tecnología en Gestión Empresarial", "Tecnológico", "Presencial", 6, 105, "TGE-01", "10429"),
            ("Contaduría Pública", "Profesional Universitario", "Presencial", 10, 164, "CONT-01", "90812"),
            ("Tecnología en Recursos Ambientales", "Tecnológico", "Presencial", 6, 104, "TRA-01", "38192"),
        ]
        for name, nivel, mod, sem, cred, cod_int, snies in uts_programs:
            check_p = await session.execute(text(f"""
                SELECT id FROM programas_academicos 
                WHERE id_institucion = '{UTS_INSTITUTION_ID}' AND nombre = :name
            """), {"name": name})
            if not check_p.scalar():
                await session.execute(text(f"""
                    INSERT INTO programas_academicos (
                        id, id_institucion, id_facultad, id_sede, codigo_interno, 
                        codigo_snies, nombre, nivel_formacion, modalidad, 
                        duracion_semestres, total_creditos, estado
                    ) VALUES (
                        gen_random_uuid(), '{UTS_INSTITUTION_ID}', '{fac_id}', '{sede_id}', 
                        :cod_int, :snies, :name, :nivel, :mod, 
                        :sem, :cred, 'activo'
                    );
                """), {
                    "cod_int": cod_int,
                    "snies": snies,
                    "name": name,
                    "nivel": nivel,
                    "mod": mod,
                    "sem": sem,
                    "cred": cred
                })

        await session.commit()
        print("\n" + "=" * 80)
        print(" ¡LIMPIEZA DE BASE DE DATOS COMPLETADA EXITOSAMENTE!")
        print("=" * 80)

        # Verificación y conteo final
        tables_to_check = [
            "usuarios", "instituciones", "sedes_institucion", "facultades", 
            "programas_academicos", "asesores_ies", "empresas", "reclutadores_empresa", 
            "egresados", "vacantes", "postulaciones", "documentos_empresa", "documentos_institucion"
        ]
        print("\nResumen final de registros en Supabase PostgreSQL:")
        for t in tables_to_check:
            c = (await session.execute(text(f"SELECT count(*) FROM {t}"))).scalar()
            print(f"  • {t}: {c}")

        users = (await session.execute(text("SELECT correo_electronico, rol::text, estado FROM usuarios"))).fetchall()
        print("\nCuentas autorizadas conservadas:")
        for u in users:
            print(f"  ✓ {u[0]} | Rol: {u[1]} | Estado: {u[2]}")

if __name__ == "__main__":
    asyncio.run(clean_database())
