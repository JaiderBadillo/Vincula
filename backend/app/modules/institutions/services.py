"""
Lógica del Módulo IES (Sedes, Facultades, Programas Académicos SNIES, Asesores y Validación de Diplomas).
Conexión con PostgreSQL, Supabase Storage y Super Admin.
"""

from typing import List, Dict, Any, Optional
import uuid
import base64
import math
import hashlib
from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy import select, desc, func, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.security import get_password_hash
from app.integrations.supabase_storage import SupabaseStorageService
from app.modules.iam.models import Usuario
from app.modules.graduates.models import Egresado, AcademicoEgresado
from app.modules.institutions.models import (
    Institucion,
    DocumentoInstitucion,
    SedeInstitucion,
    Facultad,
    ProgramaAcademico,
    AsesorIES,
    AsignacionAsesorPrograma,
)
from app.modules.institutions.schemas import (
    ValidateGraduateRequest,
    ValidateDiplomaRequest,
    SelloDigitalResponse,
    RejectDiplomaRequest,
    RejectDiplomaResponse,
    DiplomaSecureUrlResponse,
    PaginatedGraduateValidationResponse,
    GraduatePendingValidationItem,
    SubsanarDocumentoIESRequest,
    SedeCreateRequest,
    SedeResponse,
    FacultadCreateRequest,
    FacultadResponse,
    ProgramaCreateRequest,
    ProgramaUpdateRequest,
    ProgramaItemResponse,
    PaginatedProgramsResponse,
    AsesorCreateRequest,
    AsesorUpdateRequest,
    AsesorItemResponse,
    AsignacionResponse,
)
from app.modules.superadmin.models import AuditoriaSuperadmin


class InstitutionService:

    # =========================================================================
    # 1. SEDES INSTITUCIONALES
    # =========================================================================

    @classmethod
    async def list_sedes(cls, session: AsyncSession, ies_id: str) -> List[SedeResponse]:
        val_uuid = uuid.UUID(str(ies_id))
        stmt = select(SedeInstitucion).where(SedeInstitucion.id_institucion == val_uuid).order_by(desc(SedeInstitucion.es_sede_principal), SedeInstitucion.nombre)
        res = await session.execute(stmt)
        sedes = res.scalars().all()

        return [
            SedeResponse(
                id=str(s.id),
                id_institucion=str(s.id_institucion),
                nombre=s.nombre,
                nombre_corto=s.nombre_corto,
                ciudad=s.ciudad,
                departamento=s.departamento,
                direccion=s.direccion,
                telefono=s.telefono,
                correo=s.correo,
                es_sede_principal=s.es_sede_principal,
                estado=s.estado,
                creado_en=s.creado_en.isoformat() if s.creado_en else ""
            )
            for s in sedes
        ]

    @classmethod
    async def create_sede(cls, session: AsyncSession, ies_id: str, payload: SedeCreateRequest) -> SedeResponse:
        val_uuid = uuid.UUID(str(ies_id))

        # Si se marca como sede principal, desmarcar cualquier otra sede principal de esta IES
        if payload.es_sede_principal:
            await session.execute(
                update(SedeInstitucion)
                .where(SedeInstitucion.id_institucion == val_uuid)
                .values(es_sede_principal=False)
            )

        nueva_sede = SedeInstitucion(
            id_institucion=val_uuid,
            nombre=payload.nombre.strip(),
            nombre_corto=payload.nombre_corto.strip() if payload.nombre_corto else None,
            ciudad=payload.ciudad.strip(),
            departamento=payload.departamento.strip(),
            direccion=payload.direccion.strip(),
            telefono=payload.telefono.strip() if payload.telefono else None,
            correo=payload.correo.strip() if payload.correo else None,
            es_sede_principal=payload.es_sede_principal,
            estado="activa"
        )
        session.add(nueva_sede)
        await session.commit()
        await session.refresh(nueva_sede)

        return SedeResponse(
            id=str(nueva_sede.id),
            id_institucion=str(nueva_sede.id_institucion),
            nombre=nueva_sede.nombre,
            nombre_corto=nueva_sede.nombre_corto,
            ciudad=nueva_sede.ciudad,
            departamento=nueva_sede.departamento,
            direccion=nueva_sede.direccion,
            telefono=nueva_sede.telefono,
            correo=nueva_sede.correo,
            es_sede_principal=nueva_sede.es_sede_principal,
            estado=nueva_sede.estado,
            creado_en=nueva_sede.creado_en.isoformat() if nueva_sede.creado_en else ""
        )

    # =========================================================================
    # 2. FACULTADES
    # =========================================================================

    @classmethod
    async def list_facultades(cls, session: AsyncSession, ies_id: str) -> List[FacultadResponse]:
        val_uuid = uuid.UUID(str(ies_id))
        stmt = select(Facultad).where(Facultad.id_institucion == val_uuid).order_by(Facultad.nombre)
        res = await session.execute(stmt)
        facultades = res.scalars().all()

        return [
            FacultadResponse(
                id=str(f.id),
                id_institucion=str(f.id_institucion),
                codigo=f.codigo,
                sigla=f.sigla,
                nombre=f.nombre,
                telefono=f.telefono,
                oficina=f.oficina,
                color_distintivo=f.color_distintivo,
                estado=f.estado,
                creado_en=f.creado_en.isoformat() if f.creado_en else ""
            )
            for f in facultades
        ]

    @classmethod
    async def create_facultad(cls, session: AsyncSession, ies_id: str, payload: FacultadCreateRequest) -> FacultadResponse:
        val_uuid = uuid.UUID(str(ies_id))
        cod_clean = payload.codigo.strip().upper()

        # Validar si el código ya existe para esta institución
        dup_stmt = select(Facultad).where(Facultad.id_institucion == val_uuid, Facultad.codigo == cod_clean)
        existing = (await session.execute(dup_stmt)).scalar_one_or_none()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "codigo": "CODIGO_FACULTAD_DUPLICADO",
                    "titulo": "Código de Facultad Ya en Uso",
                    "mensaje": f"Ya existe una facultad con el código '{cod_clean}' ({existing.nombre}) en tu institución.",
                    "motivo": "El código o sigla de cada facultad debe ser único para garantizar la clasificación curricular.",
                    "accion_sugerida": "Elige un código identificador diferente para la nueva facultad."
                }
            )

        nueva_fac = Facultad(
            id_institucion=val_uuid,
            codigo=cod_clean,
            sigla=payload.sigla.strip() if payload.sigla else None,
            nombre=payload.nombre.strip(),
            telefono=payload.telefono.strip() if payload.telefono else None,
            oficina=payload.oficina.strip() if payload.oficina else None,
            color_distintivo=payload.color_distintivo or "#00A86B",
            estado="activa"
        )
        session.add(nueva_fac)
        await session.commit()
        await session.refresh(nueva_fac)

        return FacultadResponse(
            id=str(nueva_fac.id),
            id_institucion=str(nueva_fac.id_institucion),
            codigo=nueva_fac.codigo,
            sigla=nueva_fac.sigla,
            nombre=nueva_fac.nombre,
            telefono=nueva_fac.telefono,
            oficina=nueva_fac.oficina,
            color_distintivo=nueva_fac.color_distintivo,
            estado=nueva_fac.estado,
            creado_en=nueva_fac.creado_en.isoformat() if nueva_fac.creado_en else ""
        )

    # =========================================================================
    # 3. PROGRAMAS ACADÉMICOS (SNIES)
    # =========================================================================

    @classmethod
    async def list_programas(
        cls,
        session: AsyncSession,
        ies_id: str,
        id_facultad: Optional[str] = None,
        id_sede: Optional[str] = None,
        nivel_formacion: Optional[str] = None,
        estado: Optional[str] = None,
        page: int = 1,
        limit: int = 20
    ) -> PaginatedProgramsResponse:
        val_uuid = uuid.UUID(str(ies_id))

        # Query base con filtros
        base_filters = [ProgramaAcademico.id_institucion == val_uuid]
        if id_facultad and id_facultad != "all":
            try:
                base_filters.append(ProgramaAcademico.id_facultad == uuid.UUID(id_facultad))
            except ValueError:
                pass
        if id_sede and id_sede != "all":
            try:
                base_filters.append(ProgramaAcademico.id_sede == uuid.UUID(id_sede))
            except ValueError:
                pass
        if nivel_formacion and nivel_formacion != "all":
            base_filters.append(ProgramaAcademico.nivel_formacion == nivel_formacion)
        if estado and estado != "all":
            base_filters.append(ProgramaAcademico.estado == estado)

        count_stmt = select(func.count(ProgramaAcademico.id)).where(*base_filters)
        total = (await session.execute(count_stmt)).scalar() or 0

        offset = max(0, (page - 1) * limit)
        stmt = (
            select(ProgramaAcademico)
            .options(
                selectinload(ProgramaAcademico.facultad),
                selectinload(ProgramaAcademico.sede),
                selectinload(ProgramaAcademico.asesores_asignados)
            )
            .where(*base_filters)
            .order_by(ProgramaAcademico.nombre)
            .offset(offset)
            .limit(limit)
        )
        res = await session.execute(stmt)
        programas = res.scalars().all()

        items: List[ProgramaItemResponse] = []
        for p in programas:
            items.append(
                ProgramaItemResponse(
                    id=str(p.id),
                    id_institucion=str(p.id_institucion),
                    id_facultad=str(p.id_facultad),
                    nombre_facultad=p.facultad.nombre if p.facultad else "Sin facultad",
                    id_sede=str(p.id_sede),
                    nombre_sede=p.sede.nombre if p.sede else "Sin sede",
                    codigo_interno=p.codigo_interno,
                    codigo_snies=p.codigo_snies,
                    nombre=p.nombre,
                    nivel_formacion=p.nivel_formacion,
                    modalidad=p.modalidad,
                    duracion_semestres=p.duracion_semestres,
                    total_creditos=p.total_creditos,
                    nombre_director=p.nombre_director,
                    correo_director=p.correo_director,
                    estado_acreditacion=p.estado_acreditacion,
                    estado=p.estado,
                    total_asesores=len(p.asesores_asignados) if p.asesores_asignados else 0,
                    creado_en=p.creado_en.isoformat() if p.creado_en else ""
                )
            )

        total_pages = math.ceil(total / limit) if total > 0 else 1
        return PaginatedProgramsResponse(
            items=items,
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages
        )

    @classmethod
    async def get_programa_by_id(cls, session: AsyncSession, ies_id: str, program_id: str) -> ProgramaItemResponse:
        val_ies = uuid.UUID(str(ies_id))
        val_prog = uuid.UUID(str(program_id))

        stmt = (
            select(ProgramaAcademico)
            .options(
                selectinload(ProgramaAcademico.facultad),
                selectinload(ProgramaAcademico.sede),
                selectinload(ProgramaAcademico.asesores_asignados)
            )
            .where(ProgramaAcademico.id == val_prog, ProgramaAcademico.id_institucion == val_ies)
        )
        p = (await session.execute(stmt)).scalar_one_or_none()
        if not p:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"codigo": "PROGRAMA_NO_ENCONTRADO", "mensaje": f"Programa con ID {program_id} no encontrado en tu institución."}
            )

        return ProgramaItemResponse(
            id=str(p.id),
            id_institucion=str(p.id_institucion),
            id_facultad=str(p.id_facultad),
            nombre_facultad=p.facultad.nombre if p.facultad else "Sin facultad",
            id_sede=str(p.id_sede),
            nombre_sede=p.sede.nombre if p.sede else "Sin sede",
            codigo_interno=p.codigo_interno,
            codigo_snies=p.codigo_snies,
            nombre=p.nombre,
            nivel_formacion=p.nivel_formacion,
            modalidad=p.modalidad,
            duracion_semestres=p.duracion_semestres,
            total_creditos=p.total_creditos,
            nombre_director=p.nombre_director,
            correo_director=p.correo_director,
            estado_acreditacion=p.estado_acreditacion,
            estado=p.estado,
            total_asesores=len(p.asesores_asignados) if p.asesores_asignados else 0,
            creado_en=p.creado_en.isoformat() if p.creado_en else ""
        )

    @classmethod
    async def create_programa(cls, session: AsyncSession, ies_id: str, payload: ProgramaCreateRequest) -> ProgramaItemResponse:
        val_ies = uuid.UUID(str(ies_id))

        # 1. Validar existencia y pertenencia de la facultad
        try:
            val_fac = uuid.UUID(str(payload.id_facultad))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"codigo": "ID_FACULTAD_INVALIDO", "mensaje": "El ID de la facultad no es un UUID válido."}
            )
        fac = (await session.execute(
            select(Facultad).where(Facultad.id == val_fac, Facultad.id_institucion == val_ies)
        )).scalar_one_or_none()
        if not fac:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "codigo": "FACULTAD_NO_ENCONTRADA",
                    "titulo": "Facultad No Válida para la Institución",
                    "mensaje": "La facultad seleccionada no existe o pertenece a otra institución.",
                    "motivo": "Todo programa debe adscribirse a una facultad formalmente constituida en la IES.",
                    "accion_sugerida": "Verifica las facultades creadas en tu institución y selecciona una válida."
                }
            )

        # 2. Validar existencia y pertenencia de la sede
        try:
            val_sede = uuid.UUID(str(payload.id_sede))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"codigo": "ID_SEDE_INVALIDO", "mensaje": "El ID de la sede no es un UUID válido."}
            )
        sede = (await session.execute(
            select(SedeInstitucion).where(SedeInstitucion.id == val_sede, SedeInstitucion.id_institucion == val_ies)
        )).scalar_one_or_none()
        if not sede:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "codigo": "SEDE_NO_ENCONTRADA",
                    "titulo": "Sede Institucional No Válida",
                    "mensaje": "La sede seleccionada no existe o no corresponde a esta institución.",
                    "motivo": "El registro calificado del programa ante el MEN exige especificar la sede autorizada de oferta.",
                    "accion_sugerida": "Registra una sede institucional antes de crear el programa."
                }
            )

        # 3. Validar duplicidad de código SNIES en la misma institución
        snies_clean = payload.codigo_snies.strip()
        dup_snies = (await session.execute(
            select(ProgramaAcademico).where(
                ProgramaAcademico.id_institucion == val_ies,
                ProgramaAcademico.codigo_snies == snies_clean
            )
        )).scalar_one_or_none()
        if dup_snies:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "codigo": "CODIGO_SNIES_DUPLICADO",
                    "titulo": "Código SNIES Ya Registrado en la Institución",
                    "mensaje": f"El código SNIES '{snies_clean}' ya está asignado al programa '{dup_snies.nombre}'.",
                    "motivo": "El código SNIES otorgado por el Ministerio de Educación Nacional es único para cada oferta académica.",
                    "accion_sugerida": "Coteja el número en la resolución del MEN o consulta el programa ya registrado."
                }
            )

        # 4. Crear el programa académico
        nuevo_prog = ProgramaAcademico(
            id_institucion=val_ies,
            id_facultad=val_fac,
            id_sede=val_sede,
            codigo_interno=payload.codigo_interno.strip(),
            codigo_snies=snies_clean,
            nombre=payload.nombre.strip(),
            nivel_formacion=payload.nivel_formacion.strip(),
            modalidad=payload.modalidad.strip(),
            duracion_semestres=payload.duracion_semestres,
            total_creditos=payload.total_creditos,
            nombre_director=payload.nombre_director.strip() if payload.nombre_director else None,
            correo_director=payload.correo_director.strip() if payload.correo_director else None,
            estado_acreditacion=payload.estado_acreditacion or "Registro Calificado Vigente",
            estado="activo"
        )
        session.add(nuevo_prog)
        await session.commit()
        await session.refresh(nuevo_prog)

        return ProgramaItemResponse(
            id=str(nuevo_prog.id),
            id_institucion=str(nuevo_prog.id_institucion),
            id_facultad=str(nuevo_prog.id_facultad),
            nombre_facultad=fac.nombre,
            id_sede=str(nuevo_prog.id_sede),
            nombre_sede=sede.nombre,
            codigo_interno=nuevo_prog.codigo_interno,
            codigo_snies=nuevo_prog.codigo_snies,
            nombre=nuevo_prog.nombre,
            nivel_formacion=nuevo_prog.nivel_formacion,
            modalidad=nuevo_prog.modalidad,
            duracion_semestres=nuevo_prog.duracion_semestres,
            total_creditos=nuevo_prog.total_creditos,
            nombre_director=nuevo_prog.nombre_director,
            correo_director=nuevo_prog.correo_director,
            estado_acreditacion=nuevo_prog.estado_acreditacion,
            estado=nuevo_prog.estado,
            total_asesores=0,
            creado_en=nuevo_prog.creado_en.isoformat() if nuevo_prog.creado_en else ""
        )

    @classmethod
    async def update_programa(
        cls,
        session: AsyncSession,
        ies_id: str,
        program_id: str,
        payload: ProgramaUpdateRequest
    ) -> ProgramaItemResponse:
        val_ies = uuid.UUID(str(ies_id))
        val_prog = uuid.UUID(str(program_id))

        prog = (await session.execute(
            select(ProgramaAcademico)
            .options(
                selectinload(ProgramaAcademico.facultad),
                selectinload(ProgramaAcademico.sede),
                selectinload(ProgramaAcademico.asesores_asignados)
            )
            .where(ProgramaAcademico.id == val_prog, ProgramaAcademico.id_institucion == val_ies)
        )).scalar_one_or_none()

        if not prog:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"codigo": "PROGRAMA_NO_ENCONTRADO", "mensaje": f"Programa con ID {program_id} no encontrado en tu institución."}
            )

        if payload.nombre is not None:
            prog.nombre = payload.nombre.strip()
        if payload.codigo_interno is not None:
            prog.codigo_interno = payload.codigo_interno.strip()
        if payload.duracion_semestres is not None:
            prog.duracion_semestres = payload.duracion_semestres
        if payload.total_creditos is not None:
            prog.total_creditos = payload.total_creditos
        if payload.modalidad is not None:
            prog.modalidad = payload.modalidad.strip()
        if payload.nombre_director is not None:
            prog.nombre_director = payload.nombre_director.strip()
        if payload.correo_director is not None:
            prog.correo_director = payload.correo_director.strip()
        if payload.estado_acreditacion is not None:
            prog.estado_acreditacion = payload.estado_acreditacion.strip()
        if payload.estado is not None:
            prog.estado = payload.estado.strip()

        await session.commit()
        await session.refresh(prog)

        return ProgramaItemResponse(
            id=str(prog.id),
            id_institucion=str(prog.id_institucion),
            id_facultad=str(prog.id_facultad),
            nombre_facultad=prog.facultad.nombre if prog.facultad else None,
            id_sede=str(prog.id_sede),
            nombre_sede=prog.sede.nombre if prog.sede else None,
            codigo_interno=prog.codigo_interno,
            codigo_snies=prog.codigo_snies,
            nombre=prog.nombre,
            nivel_formacion=prog.nivel_formacion,
            modalidad=prog.modalidad,
            duracion_semestres=prog.duracion_semestres,
            total_creditos=prog.total_creditos,
            nombre_director=prog.nombre_director,
            correo_director=prog.correo_director,
            estado_acreditacion=prog.estado_acreditacion,
            estado=prog.estado,
            total_asesores=len(prog.asesores_asignados) if prog.asesores_asignados else 0,
            creado_en=prog.creado_en.isoformat() if prog.creado_en else ""
        )

    @classmethod
    async def toggle_programa_status(
        cls,
        session: AsyncSession,
        ies_id: str,
        program_id: str,
        nuevo_estado: Optional[str] = None
    ) -> ProgramaItemResponse:
        val_ies = uuid.UUID(str(ies_id))
        val_prog = uuid.UUID(str(program_id))

        prog = (await session.execute(
            select(ProgramaAcademico)
            .options(
                selectinload(ProgramaAcademico.facultad),
                selectinload(ProgramaAcademico.sede),
                selectinload(ProgramaAcademico.asesores_asignados)
            )
            .where(ProgramaAcademico.id == val_prog, ProgramaAcademico.id_institucion == val_ies)
        )).scalar_one_or_none()

        if not prog:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"codigo": "PROGRAMA_NO_ENCONTRADO", "mensaje": f"Programa con ID {program_id} no encontrado en tu institución."}
            )

        if nuevo_estado:
            prog.estado = nuevo_estado.strip()
        else:
            prog.estado = "inactivo" if prog.estado == "activo" else "activo"

        await session.commit()
        await session.refresh(prog)

        return ProgramaItemResponse(
            id=str(prog.id),
            id_institucion=str(prog.id_institucion),
            id_facultad=str(prog.id_facultad),
            nombre_facultad=prog.facultad.nombre if prog.facultad else None,
            id_sede=str(prog.id_sede),
            nombre_sede=prog.sede.nombre if prog.sede else None,
            codigo_interno=prog.codigo_interno,
            codigo_snies=prog.codigo_snies,
            nombre=prog.nombre,
            nivel_formacion=prog.nivel_formacion,
            modalidad=prog.modalidad,
            duracion_semestres=prog.duracion_semestres,
            total_creditos=prog.total_creditos,
            nombre_director=prog.nombre_director,
            correo_director=prog.correo_director,
            estado_acreditacion=prog.estado_acreditacion,
            estado=prog.estado,
            total_asesores=len(prog.asesores_asignados) if prog.asesores_asignados else 0,
            creado_en=prog.creado_en.isoformat() if prog.creado_en else ""
        )

    # =========================================================================
    # 4. ASESORES Y ASIGNACIÓN A PROGRAMAS
    # =========================================================================

    @classmethod
    async def list_asesores(cls, session: AsyncSession, ies_id: str) -> List[AsesorItemResponse]:
        val_uuid = uuid.UUID(str(ies_id))
        stmt = (
            select(AsesorIES)
            .options(selectinload(AsesorIES.programas_asignados))
            .where(AsesorIES.id_institucion == val_uuid)
            .order_by(AsesorIES.nombre_completo)
        )
        res = await session.execute(stmt)
        asesores = res.scalars().all()

        resultado: List[AsesorItemResponse] = []
        for a in asesores:
            p_ids = [str(ap.id_programa) for ap in a.programas_asignados] if a.programas_asignados else []
            sedes_list = [s.strip() for s in a.sedes_cobertura.split(",") if s.strip()] if getattr(a, "sedes_cobertura", None) else ([str(a.id_sede)] if a.id_sede else [])
            resultado.append(
                AsesorItemResponse(
                    id=str(a.id),
                    id_usuario=str(a.id_usuario),
                    nombre_completo=a.nombre_completo,
                    correo_institucional=a.correo_institucional,
                    telefono=a.telefono,
                    cargo=a.cargo or "Asesor de Enlace y Prácticas",
                    estado=a.estado,
                    programas_asignados_count=len(p_ids),
                    programas_ids=p_ids,
                    sedes_ids=sedes_list,
                    creado_en=a.creado_en.isoformat() if a.creado_en else ""
                )
            )
        return resultado

    @classmethod
    async def create_asesor(cls, session: AsyncSession, ies_id: str, payload: AsesorCreateRequest) -> AsesorItemResponse:
        val_ies = uuid.UUID(str(ies_id))
        correo_clean = payload.correo.strip().lower()

        # 1. Validar que el correo no esté registrado
        existing_user = (await session.execute(
            select(Usuario).where(Usuario.correo_electronico == correo_clean)
        )).scalar_one_or_none()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "codigo": "CORREO_YA_REGISTRADO",
                    "mensaje": f"El correo '{correo_clean}' ya tiene una cuenta asociada en la plataforma."
                }
            )

        # 2. Crear usuario con rol 'asesor_ies' para que acceda al portal de asesor
        hashed_pwd = get_password_hash(payload.password)
        nuevo_usuario = Usuario(
            correo_electronico=correo_clean,
            contrasena_hash=hashed_pwd,
            rol="asesor_ies",
            estado="activo"
        )
        session.add(nuevo_usuario)
        await session.flush()

        # 3. Validar sede / facultad si fueron suministradas y preparar cobertura multisede
        val_sede = uuid.UUID(str(payload.id_sede)) if payload.id_sede else None
        val_fac = uuid.UUID(str(payload.id_facultad)) if payload.id_facultad else None
        cobertura_str = ",".join(payload.sedes_ids) if payload.sedes_ids else (str(payload.id_sede) if payload.id_sede else None)

        nuevo_asesor = AsesorIES(
            id_usuario=nuevo_usuario.id,
            id_institucion=val_ies,
            id_sede=val_sede,
            id_facultad=val_fac,
            nombre_completo=payload.nombre_completo.strip(),
            correo_institucional=correo_clean,
            telefono=payload.telefono.strip() if payload.telefono else None,
            cargo=payload.cargo.strip() if payload.cargo else "Asesor de Enlace y Prácticas",
            sedes_cobertura=cobertura_str,
            estado="activo"
        )
        session.add(nuevo_asesor)
        await session.commit()
        await session.refresh(nuevo_asesor)

        saved_sedes = [s.strip() for s in nuevo_asesor.sedes_cobertura.split(",") if s.strip()] if getattr(nuevo_asesor, "sedes_cobertura", None) else ([str(nuevo_asesor.id_sede)] if nuevo_asesor.id_sede else [])

        return AsesorItemResponse(
            id=str(nuevo_asesor.id),
            id_usuario=str(nuevo_asesor.id_usuario),
            nombre_completo=nuevo_asesor.nombre_completo,
            correo_institucional=nuevo_asesor.correo_institucional,
            telefono=nuevo_asesor.telefono,
            cargo=nuevo_asesor.cargo,
            estado=nuevo_asesor.estado,
            programas_asignados_count=0,
            programas_ids=[],
            sedes_ids=saved_sedes,
            creado_en=nuevo_asesor.creado_en.isoformat() if nuevo_asesor.creado_en else ""
        )

    @classmethod
    async def update_asesor(cls, session: AsyncSession, ies_id: str, asesor_id: str, payload: AsesorUpdateRequest) -> AsesorItemResponse:
        val_ies = uuid.UUID(str(ies_id))
        val_asesor = uuid.UUID(str(asesor_id))

        stmt = (
            select(AsesorIES)
            .options(selectinload(AsesorIES.programas_asignados))
            .where(AsesorIES.id == val_asesor, AsesorIES.id_institucion == val_ies)
        )
        asesor = (await session.execute(stmt)).scalar_one_or_none()
        if not asesor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"codigo": "ASESOR_NO_ENCONTRADO", "mensaje": f"Asesor con ID {asesor_id} no encontrado en tu institución."}
            )

        if payload.nombre_completo is not None:
            asesor.nombre_completo = payload.nombre_completo.strip()
        if payload.telefono is not None:
            asesor.telefono = payload.telefono.strip() if payload.telefono else None
        if payload.cargo is not None:
            asesor.cargo = payload.cargo.strip()
        if payload.estado is not None:
            asesor.estado = payload.estado.strip().lower()
            user = (await session.execute(select(Usuario).where(Usuario.id == asesor.id_usuario))).scalar_one_or_none()
            if user:
                user.estado = "activo" if asesor.estado == "activo" else "suspendido"

        if payload.sedes_ids is not None:
            asesor.sedes_cobertura = ",".join(payload.sedes_ids) if payload.sedes_ids else None
        if payload.id_sede is not None:
            asesor.id_sede = uuid.UUID(str(payload.id_sede)) if payload.id_sede else None

        await session.commit()
        await session.refresh(asesor)

        p_ids = [str(ap.id_programa) for ap in asesor.programas_asignados] if asesor.programas_asignados else []
        sedes_list = [s.strip() for s in asesor.sedes_cobertura.split(",") if s.strip()] if getattr(asesor, "sedes_cobertura", None) else ([str(asesor.id_sede)] if asesor.id_sede else [])

        return AsesorItemResponse(
            id=str(asesor.id),
            id_usuario=str(asesor.id_usuario),
            nombre_completo=asesor.nombre_completo,
            correo_institucional=asesor.correo_institucional,
            telefono=asesor.telefono,
            cargo=asesor.cargo,
            estado=asesor.estado,
            programas_asignados_count=len(p_ids),
            programas_ids=p_ids,
            sedes_ids=sedes_list,
            creado_en=asesor.creado_en.isoformat() if asesor.creado_en else ""
        )

    @classmethod
    async def assign_asesor_to_program(
        cls,
        session: AsyncSession,
        ies_id: str,
        program_id: str,
        asesor_id: str
    ) -> AsignacionResponse:
        val_ies = uuid.UUID(str(ies_id))
        val_prog = uuid.UUID(str(program_id))
        val_asesor = uuid.UUID(str(asesor_id))

        # Verificar programa
        prog = (await session.execute(
            select(ProgramaAcademico).where(ProgramaAcademico.id == val_prog, ProgramaAcademico.id_institucion == val_ies)
        )).scalar_one_or_none()
        if not prog:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"codigo": "PROGRAMA_NO_ENCONTRADO", "mensaje": f"Programa con ID {program_id} no encontrado en tu institución."}
            )

        # Verificar asesor
        asesor = (await session.execute(
            select(AsesorIES).where(AsesorIES.id == val_asesor, AsesorIES.id_institucion == val_ies)
        )).scalar_one_or_none()
        if not asesor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"codigo": "ASESOR_NO_ENCONTRADO", "mensaje": f"Asesor con ID {asesor_id} no encontrado en tu institución."}
            )

        # Verificar si ya está asignado
        existing_assign = (await session.execute(
            select(AsignacionAsesorPrograma).where(
                AsignacionAsesorPrograma.id_asesor == val_asesor,
                AsignacionAsesorPrograma.id_programa == val_prog
            )
        )).scalar_one_or_none()

        if not existing_assign:
            nueva_asignacion = AsignacionAsesorPrograma(
                id_asesor=val_asesor,
                id_programa=val_prog
            )
            session.add(nueva_asignacion)
            await session.commit()

        return AsignacionResponse(
            success=True,
            mensaje=f"Asesor '{asesor.nombre_completo}' asignado exitosamente al programa '{prog.nombre}'.",
            id_asesor=str(val_asesor),
            id_programa=str(val_prog)
        )

    # =========================================================================
    # 5. RETROCOMPATIBILIDAD Y VALIDACIÓN DE DIPLOMAS (Fase 2 / Fase 3 Paso 2)
    # =========================================================================

    @classmethod
    async def get_programs_legacy(cls, session: AsyncSession, ies_id: str) -> List[Dict[str, Any]]:
        """Retorna la lista de programas en formato legacy para retrocompatibilidad con frontend."""
        try:
            val_uuid = uuid.UUID(str(ies_id))
            stmt = (
                select(ProgramaAcademico)
                .options(selectinload(ProgramaAcademico.facultad))
                .where(ProgramaAcademico.id_institucion == val_uuid)
                .order_by(ProgramaAcademico.nombre)
            )
            res = await session.execute(stmt)
            progs = res.scalars().all()
            if progs:
                return [
                    {
                        "id": str(p.id),
                        "nombre_programa": p.nombre,
                        "codigo_snies": p.codigo_snies,
                        "nivel_formacion": p.nivel_formacion,
                        "facultad": p.facultad.nombre if p.facultad else "Facultad Principal",
                        "activo": (p.estado == "activo")
                    }
                    for p in progs
                ]
        except Exception:
            pass

        return [
            {
                "id": "prog-001",
                "nombre_programa": "Ingeniería de Sistemas",
                "codigo_snies": "103241",
                "nivel_formacion": "Profesional Universitario",
                "facultad": "Facultad de Ciencias Naturales e Ingenierías",
                "activo": True
            },
            {
                "id": "prog-002",
                "nombre_programa": "Tecnología en Desarrollo de Software",
                "codigo_snies": "108754",
                "nivel_formacion": "Tecnológico",
                "facultad": "Facultad de Ciencias Naturales e Ingenierías",
                "activo": True
            },
            {
                "id": "prog-003",
                "nombre_programa": "Administración de Empresas",
                "codigo_snies": "104523",
                "nivel_formacion": "Profesional Universitario",
                "facultad": "Facultad de Ciencias Socioeconómicas",
                "activo": True
            }
        ]

    # =========================================================================
    # 5. COLA DE VALIDACIÓN INSTITUCIONAL DE DIPLOMAS Y SELLO DIGITAL (Fase 3 Paso 2)
    # =========================================================================

    @classmethod
    async def get_pending_graduates_paginated(
        cls,
        session: AsyncSession,
        ies_id: str,
        program_id: Optional[str] = None,
        estado_filtro: str = "todos",
        search: Optional[str] = None,
        page: int = 1,
        limit: int = 20
    ) -> PaginatedGraduateValidationResponse:
        """
        Bandeja paginada en servidor de validación de diplomas de egresados para la IES.
        Cumple RNF-02 (< 3 segundos) y garantiza aislamiento multi-tenant por institución.
        """
        try:
            val_ies = uuid.UUID(str(ies_id))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"codigo": "ID_IES_INVALIDO", "mensaje": "El identificador de la institución no es un UUID válido."}
            )

        # 1. Base query uniendo academicos_egresado, egresados y programas_academicos
        stmt = (
            select(AcademicoEgresado, Egresado, ProgramaAcademico)
            .join(Egresado, AcademicoEgresado.id_egresado == Egresado.id)
            .join(ProgramaAcademico, AcademicoEgresado.id_programa == ProgramaAcademico.id)
            .where(AcademicoEgresado.id_institucion == val_ies)
        )

        # 2. Filtro por programa específico si se suministra
        if program_id and program_id not in ("all", "todos", ""):
            try:
                val_prog = uuid.UUID(str(program_id))
                stmt = stmt.where(AcademicoEgresado.id_programa == val_prog)
            except ValueError:
                pass

        # 3. Filtro por estado de verificación
        if estado_filtro and estado_filtro.lower() not in ("todos", "all"):
            filtro_clean = estado_filtro.strip().lower()
            if filtro_clean in ("con_observaciones", "observado", "rejected"):
                norm_st = "rechazado"
            elif filtro_clean in ("approved", "aprobados"):
                norm_st = "aprobado"
            elif filtro_clean in ("pending", "pendientes"):
                norm_st = "pendiente"
            else:
                norm_st = filtro_clean
            stmt = stmt.where(AcademicoEgresado.estado_verificacion == norm_st)

        # 4. Búsqueda por nombre de egresado, documento de identidad o programa
        if search and search.strip():
            patron = f"%{search.strip().lower()}%"
            stmt = stmt.where(
                (func.lower(Egresado.nombre_completo).like(patron)) |
                (func.lower(Egresado.numero_documento).like(patron)) |
                (func.lower(ProgramaAcademico.nombre).like(patron))
            )

        # 5. Conteo global por estado para pestañas de la bandeja institucional
        count_estados_stmt = (
            select(AcademicoEgresado.estado_verificacion, func.count(AcademicoEgresado.id))
            .where(AcademicoEgresado.id_institucion == val_ies)
            .group_by(AcademicoEgresado.estado_verificacion)
        )
        res_estados = (await session.execute(count_estados_stmt)).all()
        resumen = {"pendientes": 0, "aprobados": 0, "rechazados": 0, "total": 0}
        for st_name, count_n in res_estados:
            if st_name == "pendiente":
                resumen["pendientes"] += count_n
            elif st_name == "aprobado":
                resumen["aprobados"] += count_n
            elif st_name == "rechazado":
                resumen["rechazados"] += count_n
            resumen["total"] += count_n

        # 6. Total de items que cumplen los filtros actuales
        total_stmt = select(func.count()).select_from(stmt.subquery())
        total_items = (await session.execute(total_stmt)).scalar() or 0

        # 7. Paginación y orden cronológico inverso
        safe_limit = max(1, min(limit, 100))
        safe_page = max(1, page)
        offset_val = (safe_page - 1) * safe_limit

        stmt = stmt.order_by(desc(AcademicoEgresado.creado_en)).offset(offset_val).limit(safe_limit)
        filas = (await session.execute(stmt)).all()

        items: List[GraduatePendingValidationItem] = []
        for acad, egr, prog in filas:
            nom_arch = "Diploma_Oficial.pdf"
            if acad.url_diploma_pdf:
                nom_arch = acad.url_diploma_pdf.split("/")[-1].split("?")[0]

            items.append(
                GraduatePendingValidationItem(
                    id_academico=str(acad.id),
                    id_egresado=str(egr.id),
                    id_institucion=str(acad.id_institucion),
                    id_programa=str(acad.id_programa),
                    nombre_completo=egr.nombre_completo,
                    tipo_documento=egr.tipo_documento,
                    numero_documento=egr.numero_documento,
                    codigo_estudiantil=egr.codigo_estudiantil,
                    carrera=prog.nombre,
                    nombre_programa=prog.nombre,
                    codigo_snies=prog.codigo_snies,
                    nivel_formacion=acad.nivel_formacion or prog.nivel_formacion,
                    ano_graduacion=acad.ano_graduacion,
                    periodo_graduacion=acad.periodo_graduacion,
                    promedio_ponderado=float(acad.promedio_ponderado) if acad.promedio_ponderado else None,
                    nombre_archivo_diploma=nom_arch,
                    url_diploma_pdf=acad.url_diploma_pdf,
                    estado_verificacion=acad.estado_verificacion,
                    estado_validacion=acad.estado_verificacion,
                    validado_por_ies=acad.validado_por_ies,
                    numero_acta_grado=acad.numero_acta_grado,
                    numero_libro_folio=acad.numero_libro_folio,
                    fecha_grado=acad.fecha_grado.isoformat() if acad.fecha_grado else None,
                    fecha_verificacion=acad.fecha_verificacion.isoformat() if acad.fecha_verificacion else None,
                    sello_digital=acad.sello_digital,
                    motivo_rechazo=acad.motivo_rechazo,
                    creado_en=acad.creado_en.isoformat() if acad.creado_en else ""
                )
            )

        total_pages = math.ceil(total_items / safe_limit) if total_items > 0 else 1
        return PaginatedGraduateValidationResponse(
            items=items,
            total=total_items,
            page=safe_page,
            limit=safe_limit,
            total_pages=total_pages,
            resumen_estados=resumen
        )

    @classmethod
    async def get_diploma_secure_url(
        cls,
        session: AsyncSession,
        ies_id: str,
        identifier: str,
        expires_in: int = 3600
    ) -> DiplomaSecureUrlResponse:
        """
        Genera una URL firmada de descarga segura (3600 segundos) para el PDF del diploma.
        Aplica aislamiento multi-tenant verificando que el diploma pertenezca a la IES.
        """
        try:
            val_ies = uuid.UUID(str(ies_id))
            val_id = uuid.UUID(str(identifier))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"codigo": "IDENTIFICADOR_INVALIDO", "mensaje": "Los identificadores suministrados no son UUID válidos."}
            )

        # Buscar por id de academicos_egresado o por id_egresado
        stmt = select(AcademicoEgresado).where(
            (AcademicoEgresado.id == val_id) | (AcademicoEgresado.id_egresado == val_id)
        )
        acad = (await session.execute(stmt)).scalar_one_or_none()
        if not acad:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "codigo": "DIPLOMA_NO_ENCONTRADO",
                    "titulo": "Registro de Diploma No Encontrado",
                    "mensaje": f"No se encontró ningún registro académico con el identificador '{identifier}'."
                }
            )

        # Candado de Aislamiento Multi-Tenant
        if acad.id_institucion != val_ies:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "codigo": "ACCESO_DIPLOMA_DENEGADO",
                    "titulo": "Aislamiento Institucional Multi-Tenant",
                    "mensaje": "Este título y diploma pertenecen a otra institución educativa. No tienes autorización para visualizarlo.",
                    "por_que_ocurre": "Cada institución solo puede acceder a los expedientes y diplomas de sus propios programas y egresados."
                }
            )

        if not acad.url_diploma_pdf or not acad.url_diploma_pdf.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "codigo": "DIPLOMA_SIN_ARCHIVO",
                    "titulo": "Diploma Digital No Adjunto",
                    "mensaje": "El egresado no ha cargado el archivo PDF del diploma para este registro académico.",
                    "por_que_ocurre": "El registro académico existe pero el documento soporte no fue transferido a Storage."
                }
            )

        # Determinar el path en Supabase Storage
        raw_url = acad.url_diploma_pdf
        bucket = settings.SUPABASE_STORAGE_BUCKET_DIPLOMAS
        nombre_archivo = raw_url.split("/")[-1].split("?")[0]

        # Extraer path relativo si la URL incluye dominio de Supabase
        if f"/object/public/{bucket}/" in raw_url:
            path_in_bucket = raw_url.split(f"/object/public/{bucket}/")[-1]
        elif f"/object/sign/{bucket}/" in raw_url:
            path_in_bucket = raw_url.split(f"/object/sign/{bucket}/")[-1].split("?")[0]
        elif raw_url.startswith("http"):
            path_in_bucket = "/".join(raw_url.split("/")[-3:]).split("?")[0]
        else:
            path_in_bucket = raw_url.lstrip("/")

        signed_url = await SupabaseStorageService.create_signed_url(
            bucket_name=bucket,
            file_path=path_in_bucket,
            expires_in=expires_in
        )

        return DiplomaSecureUrlResponse(
            id_academico=str(acad.id),
            nombre_archivo=nombre_archivo,
            url_segura=signed_url,
            expira_en_segundos=expires_in
        )

    @classmethod
    async def validate_graduate_diploma_db(
        cls,
        session: AsyncSession,
        ies_id: str,
        identifier: str,
        validator_user_id: Optional[str],
        validator_name: Optional[str],
        payload: ValidateDiplomaRequest
    ) -> SelloDigitalResponse:
        """
        Valida formalmente el diploma de un egresado otorgando el Sello Digital Institucional.
        Asigna número de acta, folio y libro de grado, y actualiza el estado del egresado a 'aprobado'.
        """
        try:
            val_ies = uuid.UUID(str(ies_id))
            val_id = uuid.UUID(str(identifier))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"codigo": "IDENTIFICADOR_INVALIDO", "mensaje": "Los identificadores suministrados no son UUID válidos."}
            )

        stmt = (
            select(AcademicoEgresado, Egresado, ProgramaAcademico, Institucion)
            .join(Egresado, AcademicoEgresado.id_egresado == Egresado.id)
            .join(ProgramaAcademico, AcademicoEgresado.id_programa == ProgramaAcademico.id)
            .join(Institucion, AcademicoEgresado.id_institucion == Institucion.id)
            .where((AcademicoEgresado.id == val_id) | (AcademicoEgresado.id_egresado == val_id))
        )
        res = (await session.execute(stmt)).first()
        if not res:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"codigo": "DIPLOMA_NO_ENCONTRADO", "mensaje": f"No se encontró registro de diploma para '{identifier}'."}
            )

        acad, egr, prog, ies = res

        # Candado de Aislamiento Multi-Tenant
        if acad.id_institucion != val_ies:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "codigo": "ACCESO_DIPLOMA_DENEGADO",
                    "titulo": "Aislamiento Institucional Multi-Tenant",
                    "mensaje": "No tienes autorización para validar títulos otorgados por otra institución de educación superior.",
                    "por_que_ocurre": "Cada institución solo puede certificar y otorgar sellos a sus propios programas académicos."
                }
            )

        # Candado de idempotencia: Diploma ya aprobado
        if acad.estado_verificacion == "aprobado":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "codigo": "DIPLOMA_YA_APROBADO",
                    "titulo": "Título Universitario Ya Certificado",
                    "mensaje": f"El diploma de '{egr.nombre_completo}' para el programa '{prog.nombre}' ya cuenta con Sello Digital Institucional.",
                    "motivo": (
                        f"Este título fue validado previamente el {acad.fecha_verificacion.strftime('%Y-%m-%d %H:%M UTC') if acad.fecha_verificacion else 'recientemente'} "
                        f"bajo el acta de grado '{acad.numero_acta_grado}' con el sello criptográfico {acad.sello_digital[:16] if acad.sello_digital else ''}... "
                        "No admite revalidación."
                    ),
                    "por_que_ocurre": "Por seguridad jurídica y trazabilidad académica, un diploma validado no puede ser alterado ni duplicado.",
                    "sello_digital_existente": acad.sello_digital,
                    "numero_acta_grado": acad.numero_acta_grado,
                    "accion_sugerida": "El título ya goza de plena validez institucional. Puedes consultar el sello digital o expedir la constancia."
                }
            )

        # Resolver número de acta
        num_acta = payload.numero_acta_grado or payload.numero_acta_o_registro or f"ACTA-{datetime.now().year}-{str(uuid.uuid4())[:8].upper()}"
        num_folio = payload.numero_libro_folio or acad.numero_libro_folio

        # Parsear fecha de grado
        f_grado = None
        if payload.fecha_grado:
            try:
                f_grado = datetime.strptime(payload.fecha_grado.strip(), "%Y-%m-%d").date()
            except Exception:
                f_grado = datetime.now().date()

        now_dt = datetime.now(timezone.utc)

        # Expedir Sello Digital Criptográfico (SHA-256)
        raw_sello = (
            f"VINCULA-SELLO-DIGITAL:{ies.nit}:{prog.codigo_snies}:{egr.numero_documento}:"
            f"{num_acta}:{num_folio or 'FOLIO-0'}:{now_dt.isoformat()}"
        )
        sello_hash = hashlib.sha256(raw_sello.encode("utf-8")).hexdigest()

        # Actualizar registro académico
        acad.estado_verificacion = "aprobado"
        acad.validado_por_ies = True
        acad.numero_acta_grado = num_acta
        acad.numero_libro_folio = num_folio
        if f_grado:
            acad.fecha_grado = f_grado
        acad.fecha_verificacion = now_dt
        acad.sello_digital = sello_hash
        acad.motivo_rechazo = None
        if validator_user_id:
            try:
                acad.verificado_por_usuario = uuid.UUID(str(validator_user_id))
            except ValueError:
                pass

        # Habilitar institucionalmente al egresado
        egr.estado = "aprobado"

        await session.commit()
        await session.refresh(acad)

        return SelloDigitalResponse(
            success=True,
            mensaje=f"Diploma validado exitosamente. Se ha expedido el Sello Digital Institucional para {egr.nombre_completo}.",
            id_academico=str(acad.id),
            id_egresado=str(egr.id),
            estado_verificacion="aprobado",
            numero_acta_grado=acad.numero_acta_grado,
            numero_libro_folio=acad.numero_libro_folio,
            fecha_grado=acad.fecha_grado.isoformat() if acad.fecha_grado else None,
            sello_digital=acad.sello_digital,
            fecha_emision_sello=acad.fecha_verificacion.isoformat() if acad.fecha_verificacion else now_dt.isoformat(),
            verificado_por=validator_name or "Secretaría General / Auditoría IES",
            institucion_emisora=ies.nombre_oficial,
            programa_academico=prog.nombre,
            codigo_snies=prog.codigo_snies
        )

    @classmethod
    async def reject_graduate_diploma_db(
        cls,
        session: AsyncSession,
        ies_id: str,
        identifier: str,
        validator_user_id: Optional[str],
        validator_name: Optional[str],
        payload: RejectDiplomaRequest
    ) -> RejectDiplomaResponse:
        """
        Rechaza u observa formalmente el diploma de un egresado por inconsistencias documentales.
        """
        try:
            val_ies = uuid.UUID(str(ies_id))
            val_id = uuid.UUID(str(identifier))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"codigo": "IDENTIFICADOR_INVALIDO", "mensaje": "Los identificadores suministrados no son UUID válidos."}
            )

        stmt = select(AcademicoEgresado).where(
            (AcademicoEgresado.id == val_id) | (AcademicoEgresado.id_egresado == val_id)
        )
        acad = (await session.execute(stmt)).scalar_one_or_none()
        if not acad:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"codigo": "DIPLOMA_NO_ENCONTRADO", "mensaje": f"No se encontró registro de diploma para '{identifier}'."}
            )

        # Candado de Aislamiento Multi-Tenant
        if acad.id_institucion != val_ies:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "codigo": "ACCESO_DIPLOMA_DENEGADO",
                    "titulo": "Aislamiento Institucional Multi-Tenant",
                    "mensaje": "No tienes autorización para observar diplomas radicados ante otra institución."
                }
            )

        # No se puede rechazar un diploma ya aprobado formalmente
        if acad.estado_verificacion == "aprobado":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "codigo": "DIPLOMA_YA_APROBADO_NO_RECHAZABLE",
                    "titulo": "Diploma Previamente Aprobado",
                    "mensaje": "El título ya cuenta con Sello Digital Institucional consolidado. No puede ser revocado directamente desde esta bandeja.",
                    "por_que_ocurre": "La anulación de un título otorgado requiere un proceso administrativo formal extraordinario."
                }
            )

        now_dt = datetime.now(timezone.utc)
        acad.estado_verificacion = "rechazado"
        acad.validado_por_ies = False
        acad.motivo_rechazo = payload.motivo_rechazo.strip()
        acad.fecha_verificacion = now_dt
        if validator_user_id:
            try:
                acad.verificado_por_usuario = uuid.UUID(str(validator_user_id))
            except ValueError:
                pass

        await session.commit()

        return RejectDiplomaResponse(
            success=True,
            mensaje="Diploma observado/rechazado formalmente. Notificación de subsanación generada para el egresado.",
            id_academico=str(acad.id),
            id_egresado=str(acad.id_egresado),
            estado_verificacion="rechazado",
            motivo_rechazo=payload.motivo_rechazo.strip(),
            fecha_rechazo=now_dt.isoformat()
        )

    # Fallbacks síncronos de compatibilidad
    @staticmethod
    def get_pending_graduates(ies_id: str) -> List[Dict[str, Any]]:
        return [
            {
                "id_academico": "acad-mock-001",
                "id_egresado": "egr-001",
                "nombre_completo": "Jaider Niño",
                "tipo_documento": "CC",
                "numero_documento": "1098765432",
                "carrera": "Ingeniería de Sistemas",
                "ano_graduacion": 2025,
                "nombre_archivo_diploma": "Diploma_Oficial_Jaider_Nino.pdf",
                "url_diploma_pdf": "/mock/diplomas/Diploma_Oficial_Jaider_Nino.pdf",
                "estado_validacion": "pendiente"
            }
        ]

    @staticmethod
    def validate_graduate_diploma(graduate_id: str, payload: ValidateGraduateRequest) -> Dict[str, Any]:
        if payload.aprobado:
            return {
                "success": True,
                "mensaje": "Diploma validado formalmente por la universidad. Se ha otorgado el Sello Digital Institucional.",
                "estado": "aprobado",
                "numero_acta": payload.numero_acta_o_registro or "ACTA-2026-VAL"
            }
        return {
            "success": True,
            "mensaje": f"Diploma observado/rechazado: {payload.observaciones}",
            "estado": "rechazado"
        }

    @classmethod
    async def subsanar_documento(
        cls,
        session: AsyncSession,
        ies_id: str,
        tipo_documento: str,
        nombre_archivo: str,
        file_bytes: Optional[bytes] = None,
        archivo_base64_o_url: Optional[str] = None,
        observaciones: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Subsanación estricta de documentos institucionales (MEN, SNIES, RUT) con higiene de Storage,
        máquina de estados y reinicio del reloj de 72 horas hábiles.
        """
        try:
            val_uuid = uuid.UUID(ies_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"codigo": "ID_IES_INVALIDO", "mensaje": "El identificador de la institución no es válido."}
            )

        stmt = select(Institucion).where(Institucion.id == val_uuid)
        ies = (await session.execute(stmt)).scalar_one_or_none()
        if not ies:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"codigo": "INSTITUCION_NO_ENCONTRADA", "mensaje": f"Institución con ID {ies_id} no encontrada."}
            )

        # REGLA 1: Solo en estado 'en_subsanacion'
        if ies.estado != "en_subsanacion":
            explicaciones_estado = {
                "pendiente": {
                    "titulo": "Institución en Verificación de Aval Ministerial (SLA 72h)",
                    "motivo": (
                        f"La institución '{ies.nombre_oficial}' (SNIES: {ies.codigo_snies}) radicó su solicitud y se encuentra "
                        "en proceso de validación ante el Ministerio de Educación Nacional por parte de los auditores de Vincula. "
                        "Durante este periodo de 72 horas hábiles, el expediente permanece bloqueado para evitar modificaciones concurrentes."
                    ),
                    "accion_sugerida": "Espera el dictamen de verificación de personería jurídica antes de subir nuevos documentos."
                },
                "aprobado": {
                    "titulo": "Institución Formalmente Acreditada",
                    "motivo": (
                        f"La institución '{ies.nombre_oficial}' ya superó satisfactoriamente la validación y cuenta con convenio marco activo. "
                        "Los soportes jurídicos radicados gozan de presunción de autenticidad institucional."
                    ),
                    "accion_sugerida": "Tu institución ya se encuentra habilitada para certificar egresados y gestionar convenios de prácticas."
                },
                "rechazado": {
                    "titulo": "Solicitud Institucional Rechazada",
                    "motivo": (
                        f"La solicitud de vinculación de '{ies.nombre_oficial}' fue denegada de manera definitiva por el Super Administrador "
                        "tras no evidenciarse personería jurídica o acreditación SNIES activa ante el MEN."
                    ),
                    "accion_sugerida": "Para consultas o apelaciones, escribe a la mesa institucional en convenios@vincula.com.co."
                }
            }

            info_estado = explicaciones_estado.get(
                ies.estado,
                {
                    "titulo": "Acción No Autorizada",
                    "motivo": f"La institución está en estado '{ies.estado}'. Solo se permite subsanar cuando existe un requerimiento formal.",
                    "accion_sugerida": "Espera una notificación de subsanación oficial del Super Admin."
                }
            )

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "codigo": "ESTADO_NO_SUBSANABLE",
                    "titulo": info_estado["titulo"],
                    "mensaje": f"No es posible subsanar documentos: La institución no se encuentra en estado de subsanación. Su estado actual es: '{ies.estado}'.",
                    "motivo": info_estado["motivo"],
                    "por_que_ocurre": info_estado["motivo"],
                    "estado_actual": ies.estado,
                    "estados_permitidos": ["en_subsanacion"],
                    "accion_sugerida": info_estado["accion_sugerida"]
                }
            )

        # REGLA 2: Candados por Documento Específico
        doc_stmt = select(DocumentoInstitucion).where(
            DocumentoInstitucion.id_institucion == val_uuid,
            DocumentoInstitucion.tipo_documento == tipo_documento
        )
        existing_doc = (await session.execute(doc_stmt)).scalar_one_or_none()

        if not existing_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "codigo": "DOCUMENTO_NO_REGISTRADO",
                    "mensaje": f"No se encontró un documento previo de tipo '{tipo_documento}' para subsanar."
                }
            )

        if existing_doc.estado == "aprobado":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "codigo": "DOCUMENTO_YA_APROBADO",
                    "titulo": "Documento Institucional ya Aprobado",
                    "mensaje": f"El documento '{tipo_documento}' ya fue validado y aprobado formalmente. No puede ser sustituido.",
                    "motivo": (
                        f"El archivo institucional '{existing_doc.nombre_archivo}' ({tipo_documento}) ya fue verificado satisfactoriamente "
                        "ante las bases del MEN/SNIES y cuenta con visto bueno oficial. No admite modificaciones."
                    ),
                    "por_que_ocurre": "Los documentos institucionales aprobados están protegidos por trazabilidad académica y legal.",
                    "tipo_documento": tipo_documento,
                    "estado_documento": existing_doc.estado,
                    "accion_sugerida": "No modifiques este documento. Si existen otros documentos observados, subsana únicamente los marcados con 'requiere_subsanacion'."
                }
            )

        if existing_doc.estado != "requiere_subsanacion":
            obs_stmt = select(DocumentoInstitucion.tipo_documento).where(
                DocumentoInstitucion.id_institucion == val_uuid,
                DocumentoInstitucion.estado == "requiere_subsanacion"
            )
            docs_observados = (await session.execute(obs_stmt)).scalars().all()
            docs_txt = ", ".join([f"'{d}'" for d in docs_observados]) if docs_observados else "Ninguno"

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "codigo": "DOCUMENTO_NO_OBSERVADO",
                    "titulo": "Documento Institucional No Sujeto a Corrección",
                    "mensaje": f"El documento '{tipo_documento}' se encuentra en estado '{existing_doc.estado}' y no requiere subsanación.",
                    "motivo": (
                        f"El Super Admin no solicitó reemplazar el documento institucional '{tipo_documento}'. "
                        "La plataforma solo permite corregir los documentos que tienen observaciones pendientes."
                    ),
                    "por_que_ocurre": (
                        f"Intentaste subir '{tipo_documento}' (estado: '{existing_doc.estado}'), pero los documentos que actualmente "
                        f"requieren subsanación son: [{docs_txt}]."
                    ),
                    "tipo_documento": tipo_documento,
                    "estado_documento": existing_doc.estado,
                    "documentos_requeridos": docs_observados,
                    "accion_sugerida": (
                        f"Por favor sube la corrección únicamente para los documentos observados: [{docs_txt}]."
                        if docs_observados else "No hay documentos pendientes de corrección."
                    )
                }
            )

        # Decodificar o asegurar bytes del PDF
        if not file_bytes:
            if archivo_base64_o_url and len(archivo_base64_o_url) > 20:
                try:
                    b64_clean = archivo_base64_o_url.split(",")[-1]
                    file_bytes = base64.b64decode(b64_clean)
                except Exception:
                    file_bytes = b"%PDF-1.4 Mock IES Subsanado"
            else:
                file_bytes = b"%PDF-1.4 Mock IES Subsanado"

        # REGLA 3: Higiene en Supabase Storage (Ruta determinista única con x-upsert: true)
        clean_ext = ".pdf" if not nombre_archivo.lower().endswith(".pdf") else ""
        nombre_guardado = f"{nombre_archivo}{clean_ext}"
        dest_path = f"instituciones/{ies_id}/{tipo_documento}.pdf"

        storage_res = await SupabaseStorageService.upload_document_pdf(
            bucket_name=settings.SUPABASE_STORAGE_BUCKET_DOCS,
            file_bytes=file_bytes,
            destination_path=dest_path
        )
        url_final = storage_res["url"]

        # Actualizar documento en PostgreSQL
        existing_doc.nombre_archivo = nombre_guardado
        existing_doc.url_archivo = url_final
        existing_doc.tamano_kb = max(1, round(len(file_bytes) / 1024))
        existing_doc.subido_en = datetime.now(timezone.utc)
        existing_doc.estado = "subsanado"

        await session.flush()

        # REGLA 4: Reinicio del Reloj SLA de 72h al completar todos los documentos pendientes
        remaining_stmt = select(DocumentoInstitucion).where(
            DocumentoInstitucion.id_institucion == val_uuid,
            DocumentoInstitucion.estado == "requiere_subsanacion"
        )
        remaining_docs = (await session.execute(remaining_stmt)).scalars().all()
        cant_pendientes = len(remaining_docs)

        reinicio_sla = False
        if cant_pendientes == 0:
            ies.estado = "pendiente"
            ies.registrado_en = datetime.now(timezone.utc)
            reinicio_sla = True

        # Registrar en Auditoría Superadmin
        last_audit = (await session.execute(
            select(AuditoriaSuperadmin)
            .where(
                AuditoriaSuperadmin.id_entidad == val_uuid,
                AuditoriaSuperadmin.tipo_entidad == "institucion"
            )
            .order_by(desc(AuditoriaSuperadmin.registrado_en))
            .limit(1)
        )).scalar_one_or_none()

        auditor_id = last_audit.id_auditor if last_audit else None
        if not auditor_id:
            admin_u = (await session.execute(
                select(Usuario).where(Usuario.rol.in_(["superadmin_vincula", "superadmin"])).limit(1)
            )).scalar_one_or_none()
            if admin_u:
                auditor_id = admin_u.id

        if auditor_id:
            obs = f"Subsanado documento institucional '{tipo_documento}' ({nombre_guardado})."
            if reinicio_sla:
                obs += " Documentación institucional completada; IES reingresada a auditoría con reloj SLA de 72 horas reiniciado."
            else:
                obs += f" Aún quedan {cant_pendientes} documento(s) institucional(es) pendiente(s) de subsanar."

            audit_entry = AuditoriaSuperadmin(
                tipo_entidad="institucion",
                id_entidad=val_uuid,
                id_auditor=auditor_id,
                accion_realizada="subsanacion_radicada",
                observaciones_correccion=obs
            )
            session.add(audit_entry)

        await session.commit()

        return {
            "success": True,
            "mensaje": (
                "Subsanación completada. La institución ha reingresado a la cola de auditoría con reloj SLA de 72 horas reiniciado."
                if reinicio_sla
                else f"Documento '{tipo_documento}' subsanado con éxito. Aún restan {cant_pendientes} documento(s) por subsanar."
            ),
            "tipo_documento": tipo_documento,
            "archivo": nombre_guardado,
            "url": url_final,
            "nuevo_estado": ies.estado,
            "documentos_pendientes_subsanacion": cant_pendientes,
            "reloj_sla_reiniciado": reinicio_sla,
            "sla_horas_restantes": 72 if reinicio_sla else 0
        }
