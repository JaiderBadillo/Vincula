"""
Script de Inicialización de Cuentas Demo en PostgreSQL (Supabase).
Puebla los 6 roles esenciales del sistema para pruebas y verificación de la Fase 1.
"""

import sys
import os
import asyncio

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.core.security import get_password_hash
from app.modules.iam.models import Usuario
from app.modules.companies.models import Empresa, ReclutadorEmpresa
from app.modules.institutions.models import Institucion, AsesorIES
from app.modules.graduates.models import Egresado


async def seed():
    print("================================================================================")
    print(" POBLANDO CUENTAS BASE MULTIRROL EN POSTGRESQL (SUPABASE)")
    print("================================================================================")

    async with AsyncSessionLocal() as session:
        # 1. Super Admin Vincula
        admin_email = "admin@vincula.com.co"
        stmt = select(Usuario).where(Usuario.correo_electronico == admin_email)
        res = await session.execute(stmt)
        admin_user = res.scalar_one_or_none()

        if not admin_user:
            admin_user = Usuario(
                correo_electronico=admin_email,
                contrasena_hash=get_password_hash("Admin123*"),
                rol="superadmin_vincula",
                estado="activo"
            )
            session.add(admin_user)
            await session.flush()
            print(f"✅ Usuario SuperAdmin creado: {admin_email}")
        else:
            print(f"ℹ️ Usuario SuperAdmin ya existe: {admin_email}")

        # 2. Empresa Aprobada (Tech Innovations SAS)
        emp_approved_email = "empresa@techinnovations.co"
        stmt = select(Usuario).where(Usuario.correo_electronico == emp_approved_email)
        res = await session.execute(stmt)
        emp_user = res.scalar_one_or_none()

        if not emp_user:
            # Crear la empresa
            empresa_aprobada = Empresa(
                razon_social="Tech Innovations SAS",
                nombre_comercial="Tech Innovations",
                nit="901234567-8",
                codigo_ciiu="6201",
                descripcion_ciiu="Desarrollo de software y consultoría tecnológica",
                sector_economico="Tecnología e Informática",
                tamano_empresa="51 a 200",
                departamento="Santander",
                ciudad="Bucaramanga",
                direccion="Calle 35 # 24-18, Oficina 502",
                telefono="(607) 6428900",
                correo_contacto=emp_approved_email,
                sitio_web="https://techinnovations.co",
                nombre_representante_legal="Carlos Andrés Rueda",
                documento_representante_legal="91234567",
                persona_contacto="Carlos Andrés Rueda",
                estado="aprobado"
            )
            session.add(empresa_aprobada)
            await session.flush()

            emp_user = Usuario(
                correo_electronico=emp_approved_email,
                contrasena_hash=get_password_hash("Empresa123*"),
                rol="admin_empresa",
                estado="activo"
            )
            session.add(emp_user)
            await session.flush()

            rec = ReclutadorEmpresa(
                id_usuario=emp_user.id,
                id_empresa=empresa_aprobada.id,
                nombre_completo="Carlos Andrés Rueda",
                correo_corporativo=emp_approved_email,
                cargo="Administrador de Empresa"
            )
            session.add(rec)
            print(f"✅ Empresa Aprobada y Reclutador creados: {emp_approved_email}")
        else:
            print(f"ℹ️ Usuario Empresa Aprobada ya existe: {emp_approved_email}")

        # 3. Empresa en MODO CUARENTENA (Startup en Espera SAS)
        emp_quarantine_email = "empresa.nueva@startup.co"
        stmt = select(Usuario).where(Usuario.correo_electronico == emp_quarantine_email)
        res = await session.execute(stmt)
        emp_q_user = res.scalar_one_or_none()

        if not emp_q_user:
            empresa_cuarentena = Empresa(
                razon_social="Startup en Espera SAS",
                nombre_comercial="Startup Espera",
                nit="901999888-1",
                codigo_ciiu="6202",
                descripcion_ciiu="Consultoría informática y desarrollo cloud",
                sector_economico="Tecnología",
                tamano_empresa="1 a 10",
                departamento="Santander",
                ciudad="Floridablanca",
                direccion="Km 7 Autopista Floridablanca",
                telefono="(607) 6789999",
                correo_contacto=emp_quarantine_email,
                sitio_web="https://startup-espera.co",
                nombre_representante_legal="Mauricio Gómez",
                documento_representante_legal="1098765432",
                persona_contacto="Mauricio Gómez",
                estado="pendiente"  # CUARENTENA
            )
            session.add(empresa_cuarentena)
            await session.flush()

            emp_q_user = Usuario(
                correo_electronico=emp_quarantine_email,
                contrasena_hash=get_password_hash("Empresa123*"),
                rol="admin_empresa",
                estado="activo"
            )
            session.add(emp_q_user)
            await session.flush()

            rec_q = ReclutadorEmpresa(
                id_usuario=emp_q_user.id,
                id_empresa=empresa_cuarentena.id,
                nombre_completo="Mauricio Gómez",
                correo_corporativo=emp_quarantine_email,
                cargo="Líder de Contratación"
            )
            session.add(rec_q)
            print(f"✅ Empresa en Cuarentena creada: {emp_quarantine_email}")
        else:
            print(f"ℹ️ Usuario Empresa en Cuarentena ya existe: {emp_quarantine_email}")

        # 4. IES Aprobada (Unidades Tecnológicas de Santander - UTS)
        ies_email = "ies@uts.edu.co"
        stmt = select(Usuario).where(Usuario.correo_electronico == ies_email)
        res = await session.execute(stmt)
        ies_user = res.scalar_one_or_none()

        if not ies_user:
            institucion_uts = Institucion(
                nombre_oficial="Unidades Tecnológicas de Santander",
                nombre_corto="UTS",
                codigo_snies="2827",
                nit="890200832-6",
                caracter_academico="Institución Tecnológica",
                nombre_rector="Omar Lengerke Pérez",
                documento_rector="91523456",
                persona_contacto="Coordinación de Egresados UTS",
                direccion="Calle de los Estudiantes # 9-82, Ciudadela Real de Minas",
                ciudad="Bucaramanga",
                departamento="Santander",
                telefono="(607) 6917700",
                correo_institucional=ies_email,
                sitio_web="https://www.uts.edu.co",
                estado="aprobado"
            )
            session.add(institucion_uts)
            await session.flush()

            ies_user = Usuario(
                correo_electronico=ies_email,
                contrasena_hash=get_password_hash("IesAdmin123*"),
                rol="admin_ies",
                estado="activo"
            )
            session.add(ies_user)
            await session.flush()

            asesor_uts = AsesorIES(
                id_usuario=ies_user.id,
                id_institucion=institucion_uts.id,
                nombre_completo="Coordinación de Egresados UTS",
                correo_institucional=ies_email,
                cargo="Director de Egresados y Empleabilidad"
            )
            session.add(asesor_uts)
            print(f"✅ Institución UTS y Asesor creados: {ies_email}")
        else:
            print(f"ℹ️ Usuario Institución UTS ya existe: {ies_email}")

        # 5. Egresado (Jaider Niño)
        egresado_email = "egresado@correo.uts.edu.co"
        stmt = select(Usuario).where(Usuario.correo_electronico == egresado_email)
        res = await session.execute(stmt)
        egresado_user = res.scalar_one_or_none()

        if not egresado_user:
            egresado_user = Usuario(
                correo_electronico=egresado_email,
                contrasena_hash=get_password_hash("Egresado123*"),
                rol="egresado",
                estado="activo"
            )
            session.add(egresado_user)
            await session.flush()

            egresado = Egresado(
                id_usuario=egresado_user.id,
                nombre_completo="Jaider Niño",
                tipo_documento="CC",
                numero_documento="1098765432",
                correo_personal=egresado_email,
                telefono="3187654321",
                ciudad_residencia="Bucaramanga",
                departamento_residencia="Santander",
                titular_profesional="Ingeniero de Sistemas y Telecomunicaciones",
                disponible_para_trabajar=True
            )
            session.add(egresado)
            print(f"✅ Egresado creado: {egresado_email}")
        else:
            print(f"ℹ️ Usuario Egresado ya existe: {egresado_email}")

        await session.commit()
        print("\n🎉 ¡Cuentas sembradas y confirmadas en PostgreSQL (Supabase) con éxito!")


if __name__ == "__main__":
    asyncio.run(seed())

