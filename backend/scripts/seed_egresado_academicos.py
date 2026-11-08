import asyncio
import sys
import os
import uuid

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import AsyncSessionLocal
from app.modules.iam.models import Usuario
from app.modules.graduates.models import Egresado, AcademicoEgresado, CompetenciaEgresado
from app.modules.institutions.models import Institucion, ProgramaAcademico
from app.modules.vacancies_ats.models import TaxonomiaCompetencia
from sqlalchemy import select

async def seed_egresado():
    async with AsyncSessionLocal() as session:
        u = (await session.execute(
            select(Usuario).where(Usuario.correo_electronico == "egresado@correo.uts.edu.co")
        )).scalar_one_or_none()
        if not u:
            print("Usuario no encontrado")
            return

        eg = (await session.execute(
            select(Egresado).where(Egresado.id_usuario == u.id)
        )).scalar_one_or_none()
        if not eg:
            print("Egresado no encontrado")
            return

        print(f"Configurando egresado: {eg.nombre_completo} (ID: {eg.id})")

        # Buscar IES UTS y Programa de Sistemas
        prog = (await session.execute(
            select(ProgramaAcademico).where(ProgramaAcademico.nombre.ilike("%Software%"))
        )).scalars().first()

        if not prog:
            prog = (await session.execute(
                select(ProgramaAcademico)
            )).scalars().first()

        ies_id = prog.id_institucion

        # 1. Crear Academico si no existe
        if not eg.academicos:
            acad = AcademicoEgresado(
                id_egresado=eg.id,
                id_institucion=ies_id,
                id_programa=prog.id,
                id_sede=prog.id_sede,
                nivel_formacion="Tecnológico",
                ano_graduacion=2025,
                periodo_graduacion="2025-II",
                promedio_ponderado=4.65,
                estado_academico="graduado",
                estado_laboral="buscando",
                validado_por_ies=True,
                estado_verificacion="aprobado",
                sello_digital="UTS-DIGITAL-VERIFIED-SEAL-2025",
                numero_acta_grado="ACTA-2025-0894",
                numero_libro_folio="LIB-14-FOL-89"
            )
            session.add(acad)
            print(f"  ✓ Registro académico agregado: {prog.nombre} en IES {ies_id}")

        # 2. Agregar competencias del egresado si no las tiene
        comps = (await session.execute(
            select(TaxonomiaCompetencia).where(
                TaxonomiaCompetencia.nombre.in_(["Python", "React", "SQL", "FastAPI"])
            )
        )).scalars().all()

        existing_comp_ids = {c.id_competencia for c in eg.competencias}
        for c in comps:
            if c.id not in existing_comp_ids:
                ce = CompetenciaEgresado(
                    id_egresado=eg.id,
                    id_competencia=c.id,
                    nivel_dominio=4,
                    validada_por_pensum=True
                )
                session.add(ce)
                print(f"  ✓ Competencia agregada: {c.nombre}")

        await session.commit()
        print("🎉 Egresado inicializado con éxito.")

if __name__ == "__main__":
    asyncio.run(seed_egresado())

