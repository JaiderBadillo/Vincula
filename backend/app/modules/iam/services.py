"""
Lógica de Negocio de Autenticación, Registro y Tokens (IAM Service).
Conexión directa a PostgreSQL / Supabase mediante SQLAlchemy 2.0 Asíncrono.
Integra Supabase Storage para almacenamiento S3 de PDFs de auditoría (RUT, Cámara de Comercio, SNIES).
"""

from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
import base64
import uuid
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from app.core.config import settings
from app.core.security import verify_password, get_password_hash, create_access_token
from app.integrations.supabase_storage import SupabaseStorageService
from app.integrations.n8n_webhooks import N8nWebhookDispatcher
from app.integrations.transactional_notifications import send_vincula_email
from app.modules.iam.models import Usuario
from app.modules.companies.models import Empresa, ReclutadorEmpresa, DocumentoEmpresa
from app.modules.institutions.models import (
    Institucion,
    AsesorIES,
    DocumentoInstitucion,
    ProgramaAcademico,
)
from app.modules.graduates.models import Egresado, AcademicoEgresado
from app.modules.iam.schemas import (
    LoginRequest,
    TokenResponse,
    RegisterGraduateRequest,
    RegisterCompanyRequest,
    RegisterInstitutionRequest,
)


class UserNotRegisteredError(Exception):
    def __init__(self, email: str, name: str, picture: str):
        self.email = email
        self.name = name
        self.picture = picture
        super().__init__(f"No existe una cuenta registrada con el correo {email}.")


class IAMService:
    @staticmethod
    async def authenticate_user(session: AsyncSession, login_data: LoginRequest) -> Optional[Dict[str, Any]]:
        """
        Autenticación de usuarios contra PostgreSQL (Supabase).
        Verifica contraseña bcrypt, actualiza último acceso y resuelve id_entidad y estado_validacion.
        """
        correo_clean = login_data.correo.strip().lower()

        stmt = select(Usuario).where(Usuario.correo_electronico == correo_clean)
        result = await session.execute(stmt)
        usuario = result.scalar_one_or_none()

        if not usuario:
            return None

        # Verificar si la cuenta está activa
        if usuario.estado != "activo":
            return None

        # Verificar contraseña con bcrypt
        if not verify_password(login_data.password, usuario.contrasena_hash):
            return None

        # Las cuentas antiguas de reclutador compartian una contrasena predeterminada.
        # El administrador debe asignarles una nueva desde el panel de reclutadores.
        if usuario.rol == 'reclutador_empresa' and verify_password('TalentoSeguro2026*!', usuario.contrasena_hash):
            return None

        # Actualizar último acceso en la base de datos
        usuario.ultimo_acceso_en = datetime.now(timezone.utc)
        await session.commit()

        # Resolver nombre, id_entidad y estado_validacion según el rol
        nombre = usuario.correo_electronico.split("@")[0]
        id_entidad = None
        estado_validacion = "aprobado"

        # 1. Rol Empresa (Admin o Reclutador)
        if usuario.rol in ("admin_empresa", "reclutador_empresa"):
            rec_stmt = (
                select(ReclutadorEmpresa, Empresa)
                .join(Empresa, ReclutadorEmpresa.id_empresa == Empresa.id)
                .where(ReclutadorEmpresa.id_usuario == usuario.id)
            )
            rec_res = await session.execute(rec_stmt)
            row = rec_res.first()
            if row:
                reclutador, empresa = row
                nombre = (empresa.nombre_comercial or empresa.razon_social) if usuario.rol == 'admin_empresa' else reclutador.nombre_completo
                id_entidad = str(empresa.id)
                estado_validacion = empresa.estado
            else:
                estado_validacion = "pendiente"

        # 2. Rol Institución Educativa (Admin o Asesor IES)
        elif usuario.rol in ("admin_ies", "asesor_ies"):
            asesor_stmt = (
                select(AsesorIES, Institucion)
                .join(Institucion, AsesorIES.id_institucion == Institucion.id)
                .where(AsesorIES.id_usuario == usuario.id)
            )
            asesor_res = await session.execute(asesor_stmt)
            row = asesor_res.first()
            if row:
                asesor, institucion = row
                nombre = asesor.nombre_completo or institucion.nombre_corto
                id_entidad = str(institucion.id)
                estado_validacion = institucion.estado
            else:
                estado_validacion = "pendiente"

        # 3. Rol Egresado
        elif usuario.rol == "egresado":
            egr_stmt = select(Egresado).where(Egresado.id_usuario == usuario.id)
            egr_res = await session.execute(egr_stmt)
            egresado = egr_res.scalar_one_or_none()
            if egresado:
                nombre = egresado.nombre_completo
                id_entidad = str(egresado.id)
            estado_validacion = "aprobado"

        # 4. Super Admin
        elif usuario.rol == "superadmin_vincula":
            nombre = "Super Administrador Vincula"
            estado_validacion = "aprobado"
            id_entidad = None

        return {
            "id": str(usuario.id),
            "nombre": nombre,
            "correo": usuario.correo_electronico,
            "rol": usuario.rol,
            "estado_validacion": estado_validacion,
            "id_entidad": id_entidad,
        }

    @staticmethod
    async def authenticate_google(
        session: AsyncSession,
        credential: Optional[str] = None,
        access_token: Optional[str] = None
    ) -> TokenResponse:
        """
        Autenticación y registro automático con Google Identity Services (OAuth 2.0).
        Soporta tanto ID Token (credential) como Access Token (OAuth2 popup).
        """
        import json
        import urllib.request

        idinfo: Dict[str, Any] = {}

        if credential:
            try:
                idinfo = id_token.verify_oauth2_token(
                    credential,
                    google_requests.Request(),
                    settings.GOOGLE_CLIENT_ID
                )
            except Exception as e:
                raise ValueError(f"Token de Google inválido o expirado: {str(e)}")
        elif access_token:
            try:
                req = urllib.request.Request(
                    "https://www.googleapis.com/oauth2/v3/userinfo",
                    headers={"Authorization": f"Bearer {access_token}"}
                )
                with urllib.request.urlopen(req, timeout=10) as resp:
                    idinfo = json.loads(resp.read().decode("utf-8"))
            except Exception as e:
                raise ValueError(f"Access Token de Google inválido o expirado: {str(e)}")
        else:
            raise ValueError("No se proporcionó credencial ni token de acceso de Google.")

        email = idinfo.get("email", "").strip().lower()
        if not email:
            raise ValueError("No se pudo obtener el correo de la cuenta de Google.")

        nombre = idinfo.get("name", "") or email.split("@")[0]
        avatar_url = idinfo.get("picture", "")
        google_sub = idinfo.get("sub", "")

        # 1. Buscar si el usuario ya existe en PostgreSQL
        stmt = select(Usuario).where(Usuario.correo_electronico == email)
        result = await session.execute(stmt)
        usuario = result.scalar_one_or_none()

        if not usuario:
            # Si el usuario no existe en la base de datos, no inventamos una cuenta fantasma.
            # Se levanta la excepción para que el frontend lo redirija a la pantalla de registro
            # con su nombre y correo de Google pre-diligenciados.
            raise UserNotRegisteredError(email=email, name=nombre, picture=avatar_url)

        if usuario.estado != "activo":
            raise ValueError("Tu cuenta se encuentra inactiva o suspendida. Comunícate con soporte.")

        if usuario.rol == "asesor_ies" and (
            not idinfo.get("email_verified") or not google_sub or usuario.google_sub != google_sub
        ):
            raise ValueError("Vincula primero tu cuenta de Google desde Configuración, ingresando con tu contraseña.")

        usuario.ultimo_acceso_en = datetime.now(timezone.utc)
        await session.commit()

        # 2. Resolver datos de entidad y nombre según el rol
        nombre_final = nombre
        id_entidad = None
        estado_validacion = "aprobado"

        if usuario.rol in ("admin_empresa", "reclutador_empresa"):
            rec_stmt = (
                select(ReclutadorEmpresa, Empresa)
                .join(Empresa, ReclutadorEmpresa.id_empresa == Empresa.id)
                .where(ReclutadorEmpresa.id_usuario == usuario.id)
            )
            rec_res = await session.execute(rec_stmt)
            row = rec_res.first()
            if row:
                reclutador, empresa = row
                nombre_final = (empresa.nombre_comercial or empresa.razon_social) if usuario.rol == 'admin_empresa' else reclutador.nombre_completo
                id_entidad = str(empresa.id)
                estado_validacion = empresa.estado
            else:
                estado_validacion = "pendiente"

        elif usuario.rol in ("admin_ies", "asesor_ies"):
            asesor_stmt = (
                select(AsesorIES, Institucion)
                .join(Institucion, AsesorIES.id_institucion == Institucion.id)
                .where(AsesorIES.id_usuario == usuario.id)
            )
            asesor_res = await session.execute(asesor_stmt)
            row = asesor_res.first()
            if row:
                asesor, institucion = row
                nombre_final = asesor.nombre_completo or institucion.nombre_corto
                id_entidad = str(institucion.id)
                estado_validacion = institucion.estado
            else:
                estado_validacion = "pendiente"

        elif usuario.rol == "egresado":
            egr_stmt = select(Egresado).where(Egresado.id_usuario == usuario.id)
            egr_res = await session.execute(egr_stmt)
            egresado = egr_res.scalar_one_or_none()
            if not egresado:
                doc_provisional = f"G-{google_sub[:10]}" if google_sub else f"G-{uuid.uuid4().hex[:8]}"
                egresado = Egresado(
                    id_usuario=usuario.id,
                    tipo_documento="CC",
                    numero_documento=doc_provisional,
                    nombre_completo=nombre,
                    ciudad_residencia="Bucaramanga",
                    departamento_residencia="Santander",
                    telefono="No suministrado",
                    correo_personal=usuario.correo_electronico,
                    url_avatar=avatar_url or None,
                    titular_profesional="Profesional en Formación / Graduado",
                    disponible_para_trabajar=True,
                    estado="activo"
                )
                session.add(egresado)
                await session.commit()

            nombre_final = egresado.nombre_completo or nombre
            id_entidad = str(egresado.id)
            if not egresado.url_avatar and avatar_url:
                egresado.url_avatar = avatar_url
                await session.commit()
            estado_validacion = "aprobado"

        elif usuario.rol == "superadmin_vincula":
            nombre_final = "Super Administrador Vincula"
            estado_validacion = "aprobado"
            id_entidad = None

        user_dict = {
            "id": str(usuario.id),
            "nombre": nombre_final,
            "correo": usuario.correo_electronico,
            "rol": usuario.rol,
            "estado_validacion": estado_validacion,
            "id_entidad": id_entidad,
        }

        return IAMService.create_token_for_user(user_dict)

    @staticmethod
    def create_token_for_user(user: Dict[str, Any]) -> TokenResponse:
        token_payload = {
            "sub": user["id"],
            "nombre": user["nombre"],
            "correo": user["correo"],
            "rol": user["rol"],
            "estado_validacion": user["estado_validacion"],
            "id_entidad": user.get("id_entidad")
        }
        token = create_access_token(token_payload)

        return TokenResponse(
            access_token=token,
            token_type="bearer",
            user_id=user["id"],
            nombre=user["nombre"],
            correo=user["correo"],
            rol=user["rol"],
            estado_validacion=user["estado_validacion"],
            id_entidad=user.get("id_entidad")
        )

    @staticmethod
    async def register_graduate(
        session: AsyncSession,
        data: RegisterGraduateRequest,
        raw_diploma: Optional[tuple] = None
    ) -> Dict[str, Any]:
        """
        Registro de egresado con inserción real en las tablas 'usuarios' y 'egresados'.
        """
        stmt = select(Usuario).where(Usuario.correo_electronico == data.correo.lower())
        existing = (await session.execute(stmt)).scalar_one_or_none()
        if existing:
            raise ValueError(f"El correo {data.correo} ya se encuentra registrado.")

        # 1. Crear Usuario
        nuevo_usuario = Usuario(
            correo_electronico=data.correo.lower(),
            contrasena_hash=get_password_hash(data.password),
            rol="egresado",
            estado="activo"
        )
        session.add(nuevo_usuario)
        await session.flush()

        # 2. Crear Egresado
        nuevo_egresado = Egresado(
            id_usuario=nuevo_usuario.id,
            tipo_documento=data.tipo_documento,
            numero_documento=data.numero_documento,
            nombre_completo=data.nombre_completo,
            ciudad_residencia=data.ciudad,
            departamento_residencia=data.departamento,
            telefono=data.telefono or "No suministrado",
            correo_personal=data.correo.lower(),
            titular_profesional=data.carrera,
            disponible_para_trabajar=True
        )
        session.add(nuevo_egresado)
        await session.flush()

        # 3. Vincular Historial Académico para Validación IES
        target_ies: Optional[Institucion] = None
        if data.id_institucion:
            try:
                val_uuid = uuid.UUID(str(data.id_institucion))
                res_ies = await session.execute(select(Institucion).where(Institucion.id == val_uuid))
                target_ies = res_ies.scalar_one_or_none()
            except (ValueError, TypeError):
                pass
            
            if not target_ies:
                clean_term = str(data.id_institucion).strip().lower()
                res_ies = await session.execute(
                    select(Institucion).where(
                        (func.lower(Institucion.nombre_corto) == clean_term) |
                        (func.lower(Institucion.nombre_oficial).ilike(f"%{clean_term}%"))
                    )
                )
                row_ies = res_ies.first()
                if row_ies:
                    target_ies = row_ies[0]

        if not target_ies:
            raise ValueError("La institución seleccionada no está registrada. Contacta soporte para vincularla antes de cargar el diploma.")

        if target_ies:
            target_prog: Optional[ProgramaAcademico] = None
            if data.carrera:
                clean_carrera = data.carrera.strip().lower()
                res_prog = await session.execute(
                    select(ProgramaAcademico).where(
                        ProgramaAcademico.id_institucion == target_ies.id,
                        (func.lower(ProgramaAcademico.nombre) == clean_carrera) |
                        (func.lower(ProgramaAcademico.nombre).ilike(f"%{clean_carrera}%"))
                    )
                )
                row_prog = res_prog.first()
                if row_prog:
                    target_prog = row_prog[0]

            if not target_prog:
                raise ValueError("El programa académico no figura en la institución seleccionada. Contacta soporte antes de cargar el diploma.")

            if target_prog:
                try:
                    ano_grad = int(data.ano_graduacion)
                except (ValueError, TypeError):
                    raise ValueError("Indica el año real de graduación.")
                if not 1900 <= ano_grad <= datetime.now().year:
                    raise ValueError("El año de graduación no es válido.")

                # Almacenar el archivo real del diploma en Supabase Storage si fue adjuntado por el egresado
                url_diploma_cargado = None
                if raw_diploma and len(raw_diploma) == 2 and raw_diploma[1]:
                    try:
                        nombre_original, bytes_archivo = raw_diploma
                        clean_slug = "".join(c for c in nombre_original if c.isalnum() or c in (".", "_", "-")).strip() or "diploma.pdf"
                        if not clean_slug.lower().endswith(".pdf"):
                            clean_slug += ".pdf"
                        dest_path = f"diplomas/{nuevo_egresado.id}/{uuid.uuid4()}/{clean_slug}"
                        storage_res = await SupabaseStorageService.upload_document_pdf(
                            bucket_name=settings.SUPABASE_STORAGE_BUCKET_DIPLOMAS,
                            file_bytes=bytes_archivo,
                            destination_path=dest_path
                        )
                        url_diploma_cargado = storage_res.get("url")
                    except Exception as ex:
                        raise ValueError("No se pudo guardar el diploma original. Intenta el registro nuevamente.") from ex

                nuevo_academico = AcademicoEgresado(
                    id_egresado=nuevo_egresado.id,
                    id_institucion=target_ies.id,
                    id_programa=target_prog.id,
                    id_sede=target_prog.id_sede,
                    nivel_formacion=data.nivel_educativo or target_prog.nivel_formacion or "Profesional Universitario",
                    ano_graduacion=ano_grad,
                    periodo_graduacion=None,
                    estado_academico="recien-egresado",
                    estado_laboral="buscando",
                    validado_por_ies=False,
                    estado_verificacion="pendiente",
                    url_diploma_pdf=url_diploma_cargado,
                    diploma_cargado_por_egresado=bool(url_diploma_cargado)
                )
                session.add(nuevo_academico)

        await session.commit()

        # 3. Disparar webhook asíncrono hacia n8n para bienvenida y notificación
        await N8nWebhookDispatcher.dispatch_event(
            "registro-egresado",
            {
                "evento": "egresado.registrado",
                "id_usuario": str(nuevo_usuario.id),
                "id_egresado": str(nuevo_egresado.id),
                "nombre": data.nombre_completo,
                "correo": data.correo.lower(),
                "carrera": data.carrera,
                "ciudad": data.ciudad,
                "departamento": data.departamento,
                "url_completar_perfil": "https://vincula-henna.vercel.app/login?redirect=%2Fdashboard%2Fperfil",
            }
        )

        await send_vincula_email("registro_egresado", data.correo.lower(),
                                 nombre=data.nombre_completo, carrera=data.carrera)

        return {
            "success": True,
            "mensaje": "Pre-registro de egresado exitoso. Tu cuenta está activa.",
            "user_id": str(nuevo_usuario.id),
            "id_egresado": str(nuevo_egresado.id),
            "nombre": data.nombre_completo,
            "correo": data.correo,
            "estado_validacion": "aprobado",
            "titulo_verificado": False
        }

    @staticmethod
    async def register_company(
        session: AsyncSession,
        data: RegisterCompanyRequest,
        raw_files: Optional[Dict[str, bytes]] = None
    ) -> Dict[str, Any]:
        """
        Radicación de Empresa en MODO CUARENTENA (estado: 'pendiente', SLA 72h).
        Inserta en 'empresas', 'usuarios', 'reclutadores_empresa' y 'documentos_empresa'
        guardando los PDFs en Supabase Storage (bucket 'vincula-documentos-auditoria').
        """
        stmt = select(Usuario).where(Usuario.correo_electronico == data.correo_contacto.lower())
        if (await session.execute(stmt)).scalar_one_or_none():
            raise ValueError(f"El correo {data.correo_contacto} ya se encuentra registrado.")

        emp_stmt = select(Empresa).where(Empresa.nit == data.nit)
        if (await session.execute(emp_stmt)).scalar_one_or_none():
            raise ValueError(f"La empresa con NIT {data.nit} ya se encuentra registrada.")

        # 1. Crear Empresa en estado 'pendiente' (Cuarentena)
        nueva_empresa = Empresa(
            razon_social=data.razon_social,
            nombre_comercial=data.nombre_comercial,
            nit=data.nit,
            codigo_ciiu=data.codigo_ciiu,
            descripcion_ciiu=data.descripcion_ciiu,
            sector_economico=data.sector_economico,
            tamano_empresa=data.tamano_empresa,
            departamento=data.departamento,
            ciudad=data.ciudad,
            direccion=data.direccion,
            telefono=data.telefono,
            correo_contacto=data.correo_contacto.lower(),
            sitio_web=data.sitio_web,
            nombre_representante_legal=data.nombre_representante_legal,
            documento_representante_legal=data.documento_representante_legal,
            persona_contacto=data.persona_contacto,
            estado="pendiente"  # CUARENTENA OBLIGATORIA
        )
        session.add(nueva_empresa)
        await session.flush()

        # 2. Crear Usuario
        nuevo_usuario = Usuario(
            correo_electronico=data.correo_contacto.lower(),
            contrasena_hash=get_password_hash(data.password),
            rol="admin_empresa",
            estado="activo"
        )
        session.add(nuevo_usuario)
        await session.flush()

        # 3. Crear Reclutador / Admin de la Empresa
        nuevo_reclutador = ReclutadorEmpresa(
            id_usuario=nuevo_usuario.id,
            id_empresa=nueva_empresa.id,
            nombre_completo=data.persona_contacto,
            correo_corporativo=data.correo_contacto.lower(),
            telefono=data.telefono,
            cargo="Administrador de Empresa"
        )
        session.add(nuevo_reclutador)

        # 4. Procesar y Almacenar Documentos en Supabase Storage (PDFs de Auditoría)
        documentos_procesados = []

        # A) Documentos enviados vía base64 en payload JSON
        if data.documentos:
            for doc in data.documentos:
                try:
                    file_bytes = base64.b64decode(doc.contenido_base64)
                    clean_filename = doc.nombre_archivo.replace(" ", "_")
                    dest_path = f"empresas/{nueva_empresa.id}/{doc.tipo_documento}_{clean_filename}"

                    storage_res = await SupabaseStorageService.upload_document_pdf(
                        bucket_name=settings.SUPABASE_STORAGE_BUCKET_DOCS,
                        file_bytes=file_bytes,
                        destination_path=dest_path
                    )

                    doc_record = DocumentoEmpresa(
                        id_empresa=nueva_empresa.id,
                        tipo_documento=doc.tipo_documento,
                        nombre_archivo=doc.nombre_archivo,
                        url_archivo=storage_res["url"],
                        archivo_cargado_por_usuario=True,
                        tamano_kb=max(len(file_bytes) // 1024, 1),
                        estado="adjunto"
                    )
                    session.add(doc_record)
                    documentos_procesados.append({
                        "tipo": doc.tipo_documento,
                        "archivo": doc.nombre_archivo,
                        "url": storage_res["url"],
                        "tamano_kb": max(len(file_bytes) // 1024, 1)
                    })
                except Exception as err:
                    raise ValueError(f"No se pudo guardar el documento original de empresa: {doc.tipo_documento}.") from err

        # B) Documentos enviados vía raw bytes (multipart form-data)
        if raw_files:
            for tipo_doc, (filename, file_bytes) in raw_files.items():
                if file_bytes:
                    try:
                        clean_filename = filename.replace(" ", "_")
                        dest_path = f"empresas/{nueva_empresa.id}/{tipo_doc}_{clean_filename}"

                        storage_res = await SupabaseStorageService.upload_document_pdf(
                            bucket_name=settings.SUPABASE_STORAGE_BUCKET_DOCS,
                            file_bytes=file_bytes,
                            destination_path=dest_path
                        )

                        doc_record = DocumentoEmpresa(
                            id_empresa=nueva_empresa.id,
                            tipo_documento=tipo_doc,
                            nombre_archivo=filename,
                            url_archivo=storage_res["url"],
                            archivo_cargado_por_usuario=True,
                            tamano_kb=max(len(file_bytes) // 1024, 1),
                            estado="adjunto"
                        )
                        session.add(doc_record)
                        documentos_procesados.append({
                            "tipo": tipo_doc,
                            "archivo": filename,
                            "url": storage_res["url"],
                            "tamano_kb": max(len(file_bytes) // 1024, 1)
                        })
                    except Exception as err:
                        raise ValueError(f"No se pudo guardar el documento original de empresa: {tipo_doc}.") from err

        await session.commit()

        radicado = f"RAD-EMP-2026-{str(nueva_empresa.id)[:8].upper()}"

        # Disparar webhook asíncrono hacia n8n para notificación de radicación y SLA 72h
        await N8nWebhookDispatcher.dispatch_event(
            "registro-empresa",
            {
                "evento": "empresa.registrada",
                "radicado": radicado,
                "id_usuario": str(nuevo_usuario.id),
                "id_empresa": str(nueva_empresa.id),
                "razon_social": data.razon_social,
                "nit": data.nit,
                "correo_contacto": data.correo_contacto.lower(),
                "representante_legal": data.nombre_representante_legal,
                "persona_contacto": data.persona_contacto,
                "sla_horas": 72,
            }
        )

        await send_vincula_email("registro_empresa", data.correo_contacto.lower(),
                                 empresa=data.razon_social or data.nombre_comercial, radicado=radicado)

        return {
            "success": True,
            "radicado": radicado,
            "sla_horas": 72,
            "mensaje": (
                "Empresa radicada exitosamente. Tu cuenta ha sido activada en MODO CUARENTENA. "
                "El Super Admin verificará tu Cámara de Comercio y RUT en un plazo máximo de 72 horas."
            ),
            "user_id": str(nuevo_usuario.id),
            "id_empresa": str(nueva_empresa.id),
            "razon_social": data.razon_social,
            "nit": data.nit,
            "estado_validacion": "pendiente",
            "documentos_cargados": len(documentos_procesados),
            "detalle_documentos": documentos_procesados,
            "can_login": True
        }

    @staticmethod
    async def register_institution(
        session: AsyncSession,
        data: RegisterInstitutionRequest,
        raw_files: Optional[Dict[str, bytes]] = None
    ) -> Dict[str, Any]:
        """
        Radicación de IES en MODO CUARENTENA (estado: 'pendiente', SLA 72h).
        Inserta en 'instituciones', 'usuarios', 'asesores_ies' y 'documentos_institucion'
        guardando los PDFs en Supabase Storage (bucket 'vincula-documentos-auditoria').
        """
        stmt = select(Usuario).where(Usuario.correo_electronico == data.correo_institucional.lower())
        if (await session.execute(stmt)).scalar_one_or_none():
            raise ValueError(f"El correo {data.correo_institucional} ya se encuentra registrado.")

        ies_stmt = select(Institucion).where(Institucion.codigo_snies == data.codigo_snies)
        if (await session.execute(ies_stmt)).scalar_one_or_none():
            raise ValueError(f"La institución con código SNIES {data.codigo_snies} ya existe.")

        # 1. Crear Institución
        nueva_ies = Institucion(
            nombre_oficial=data.nombre_institucion,
            nombre_corto=data.sigla,
            codigo_snies=data.codigo_snies,
            nit=data.nit,
            caracter_academico=data.caracter_academico,
            nombre_rector=data.nombre_rector,
            documento_rector=data.documento_rector,
            persona_contacto=data.nombre_contacto_asesor,
            direccion=data.direccion,
            ciudad=data.ciudad,
            departamento=data.departamento,
            telefono=data.telefono,
            correo_institucional=data.correo_institucional.lower(),
            sitio_web=data.sitio_web,
            estado="pendiente"  # CUARENTENA OBLIGATORIA
        )
        session.add(nueva_ies)
        await session.flush()

        # 2. Crear Usuario
        nuevo_usuario = Usuario(
            correo_electronico=data.correo_institucional.lower(),
            contrasena_hash=get_password_hash(data.password),
            rol="admin_ies",
            estado="activo"
        )
        session.add(nuevo_usuario)
        await session.flush()

        # 3. Crear Asesor / Admin de la IES
        nuevo_asesor = AsesorIES(
            id_usuario=nuevo_usuario.id,
            id_institucion=nueva_ies.id,
            nombre_completo=data.nombre_contacto_asesor,
            correo_institucional=data.correo_institucional.lower(),
            telefono=data.telefono,
            cargo=data.cargo_asesor
        )
        session.add(nuevo_asesor)

        # 4. Procesar y Almacenar Documentos en Supabase Storage
        documentos_procesados = []

        if data.documentos:
            for doc in data.documentos:
                try:
                    file_bytes = base64.b64decode(doc.contenido_base64)
                    clean_filename = doc.nombre_archivo.replace(" ", "_")
                    dest_path = f"instituciones/{nueva_ies.id}/{doc.tipo_documento}_{clean_filename}"

                    storage_res = await SupabaseStorageService.upload_document_pdf(
                        bucket_name=settings.SUPABASE_STORAGE_BUCKET_DOCS,
                        file_bytes=file_bytes,
                        destination_path=dest_path
                    )

                    doc_record = DocumentoInstitucion(
                        id_institucion=nueva_ies.id,
                        tipo_documento=doc.tipo_documento,
                        nombre_archivo=doc.nombre_archivo,
                        url_archivo=storage_res["url"],
                        archivo_cargado_por_usuario=True,
                        tamano_kb=max(len(file_bytes) // 1024, 1),
                        estado="adjunto"
                    )
                    session.add(doc_record)
                    documentos_procesados.append({
                        "tipo": doc.tipo_documento,
                        "archivo": doc.nombre_archivo,
                        "url": storage_res["url"],
                        "tamano_kb": max(len(file_bytes) // 1024, 1)
                    })
                except Exception as err:
                    raise ValueError(f"No se pudo guardar el documento original de IES: {doc.tipo_documento}.") from err

        if raw_files:
            for tipo_doc, (filename, file_bytes) in raw_files.items():
                if file_bytes:
                    try:
                        clean_filename = filename.replace(" ", "_")
                        dest_path = f"instituciones/{nueva_ies.id}/{tipo_doc}_{clean_filename}"

                        storage_res = await SupabaseStorageService.upload_document_pdf(
                            bucket_name=settings.SUPABASE_STORAGE_BUCKET_DOCS,
                            file_bytes=file_bytes,
                            destination_path=dest_path
                        )

                        doc_record = DocumentoInstitucion(
                            id_institucion=nueva_ies.id,
                            tipo_documento=tipo_doc,
                            nombre_archivo=filename,
                            url_archivo=storage_res["url"],
                            archivo_cargado_por_usuario=True,
                            tamano_kb=max(len(file_bytes) // 1024, 1),
                            estado="adjunto"
                        )
                        session.add(doc_record)
                        documentos_procesados.append({
                            "tipo": tipo_doc,
                            "archivo": filename,
                            "url": storage_res["url"],
                            "tamano_kb": max(len(file_bytes) // 1024, 1)
                        })
                    except Exception as err:
                        raise ValueError(f"No se pudo guardar el documento original de IES: {tipo_doc}.") from err

        await session.commit()

        radicado = f"RAD-IES-2026-{str(nueva_ies.id)[:8].upper()}"

        # Disparar webhook asíncrono hacia n8n para radicación institucional
        await N8nWebhookDispatcher.dispatch_event(
            "registro-institucion",
            {
                "evento": "institucion.registrada",
                "radicado": radicado,
                "id_usuario": str(nuevo_usuario.id),
                "id_institucion": str(nueva_ies.id),
                "nombre_institucion": data.nombre_institucion,
                "codigo_snies": data.codigo_snies,
                "nit": data.nit,
                "correo_institucional": data.correo_institucional.lower(),
                "sla_horas": 72,
            }
        )

        await send_vincula_email("registro_ies", data.correo_institucional.lower(),
                                 institucion=data.nombre_institucion, radicado=radicado)

        return {
            "success": True,
            "radicado": radicado,
            "sla_horas": 72,
            "mensaje": (
                "Institución de Educación Superior radicada con éxito. "
                "En proceso de validación ministerial y cotejo SNIES en máximo 72 horas."
            ),
            "user_id": str(nuevo_usuario.id),
            "id_institucion": str(nueva_ies.id),
            "nombre_institucion": data.nombre_institucion,
            "codigo_snies": data.codigo_snies,
            "estado_validacion": "pendiente",
            "documentos_cargados": len(documentos_procesados),
            "detalle_documentos": documentos_procesados,
            "can_login": True
        }
