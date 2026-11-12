"""
Router de Autenticación, Registro y Usuarios (IAM).
Endpoints oficiales bajo prefijo /api/v1/auth
Soporta registro JSON (con base64) y multipart/form-data (con UploadFile) para PDFs de auditoría.
"""

from typing import Dict, Any, Optional
import uuid
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, status, Request, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.modules.iam.schemas import (
    LoginRequest,
    GoogleAuthRequest,
    TokenResponse,
    RegisterGraduateRequest,
    RegisterCompanyRequest,
    RegisterInstitutionRequest,
    UserMeResponse,
)
from app.modules.iam.services import IAMService, UserNotRegisteredError
from app.modules.institutions.models import Institucion, ProgramaAcademico
from app.modules.institutions.models import DocumentoInstitucion
from app.modules.companies.models import Empresa, DocumentoEmpresa
from app.modules.graduates.models import Egresado, AcademicoEgresado
from app.modules.superadmin.models import AuditoriaSuperadmin
from app.integrations.email_service import EmailService

router = APIRouter(prefix="/auth", tags=["IAM - Autenticación y Registro"])
from app.modules.iam.password_reset import router as password_reset_router
from app.modules.iam.advisor_settings import router as advisor_settings_router, record_advisor_access
from app.modules.iam.account_settings import router as account_settings_router
router.include_router(password_reset_router)
router.include_router(advisor_settings_router)
router.include_router(account_settings_router)


@router.get("/estado-documental")
async def estado_documental(current_user: Dict[str, Any] = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Estado y observaciones persistidas, limitado a la entidad del usuario autenticado."""
    role = current_user.get("rol")
    if role == "egresado":
        user_id = uuid.UUID(str(current_user["sub"]))
        graduate = (await db.execute(select(Egresado).where(Egresado.id_usuario == user_id))).scalar_one_or_none()
        if graduate is None:
            raise HTTPException(status_code=404, detail="Egresado no encontrado.")
        academic = (await db.execute(select(AcademicoEgresado).where(AcademicoEgresado.id_egresado == graduate.id)
                                     .order_by(AcademicoEgresado.creado_en.desc()))).scalars().first()
        if academic is None:
            return {"estado": "sin_registro", "motivo": None, "documentos": [], "puede_subir": False}
        has_file = bool(academic.diploma_cargado_por_egresado and academic.url_diploma_pdf)
        return {"estado": academic.estado_verificacion, "motivo": academic.motivo_rechazo,
                "documentos": [{"tipo": "diploma", "nombre": academic.url_diploma_pdf.rsplit("/", 1)[-1], "estado": academic.estado_verificacion}] if has_file else [],
                "puede_subir": academic.estado_verificacion != "aprobado"}

    kind = "empresa" if role in ("admin_empresa", "empresa_admin") else "institucion" if role in ("admin_ies", "ies_admin") else None
    if kind is None:
        raise HTTPException(status_code=403, detail="Rol sin expediente documental.")
    try:
        entity_id = uuid.UUID(str(current_user["id_entidad"]))
    except (KeyError, ValueError, TypeError):
        raise HTTPException(status_code=400, detail="La cuenta no tiene entidad vinculada.")
    entity_model, doc_model, foreign_key = (Empresa, DocumentoEmpresa, DocumentoEmpresa.id_empresa) if kind == "empresa" else (Institucion, DocumentoInstitucion, DocumentoInstitucion.id_institucion)
    entity = (await db.execute(select(entity_model).where(entity_model.id == entity_id))).scalar_one_or_none()
    if entity is None:
        raise HTTPException(status_code=404, detail="Expediente no encontrado.")
    docs = (await db.execute(select(doc_model).where(foreign_key == entity_id))).scalars().all()
    audit = (await db.execute(select(AuditoriaSuperadmin).where(
        AuditoriaSuperadmin.id_entidad == entity_id, AuditoriaSuperadmin.tipo_entidad == kind,
        AuditoriaSuperadmin.accion_realizada.in_(["subsanacion_solicitada", "rechazo"])
    ).order_by(AuditoriaSuperadmin.registrado_en.desc()).limit(1))).scalar_one_or_none()
    return {"estado": entity.estado, "motivo": audit.observaciones_correccion if audit and entity.estado in ("en_subsanacion", "rechazado") else None,
            "documentos": [{"tipo": d.tipo_documento, "nombre": d.nombre_archivo, "estado": d.estado} for d in docs],
            "puede_subir": entity.estado == "en_subsanacion"}


@router.get("/catalogo-academico")
async def catalogo_academico(db: AsyncSession = Depends(get_db)):
    """Opciones existentes para asociar un diploma sin crear instituciones ni códigos SNIES."""
    records = (await db.execute(
        select(Institucion.id, Institucion.nombre_oficial, Institucion.nombre_corto,
               ProgramaAcademico.nombre)
        .join(ProgramaAcademico, ProgramaAcademico.id_institucion == Institucion.id)
        .where(ProgramaAcademico.estado == "activo")
        .order_by(Institucion.nombre_oficial, ProgramaAcademico.nombre)
    )).all()
    institutions = {}
    for ies_id, name, short_name, program_name in records:
        entry = institutions.setdefault(str(ies_id), {
            "id": str(ies_id), "name": name, "shortName": short_name, "programs": []
        })
        if program_name not in entry["programs"]:
            entry["programs"].append(program_name)
    return list(institutions.values())


@router.post("/login", response_model=TokenResponse)
async def login(credentials: LoginRequest, request: Request, tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    """
    Inicio de sesión multi-rol contra PostgreSQL (Supabase).
    Retorna JWT firmado que incluye rol, estado_validacion ('pendiente', 'aprobado', etc.) e id_entidad.
    Si la empresa o IES está en estado 'pendiente', puede loguearse para acceder a su panel de cuarentena.
    """
    user = await IAMService.authenticate_user(db, credentials)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos, o la cuenta está inactiva.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = IAMService.create_token_for_user(user)
    if user["rol"] == "asesor_ies":
        await record_advisor_access(db, uuid.UUID(user["id"]), "contraseña", request, tasks)
    return token


@router.post("/google", response_model=TokenResponse)
async def login_google(payload: GoogleAuthRequest, request: Request, tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    """
    Inicio de sesión con Google Identity Services (OAuth 2.0).
    Verifica el token de Google. Si el correo existe en la base de datos, emite el JWT de sesión.
    Si el correo no está registrado, responde con 404 y datos para redireccionar al registro.
    """
    try:
        token = await IAMService.authenticate_google(
            db,
            credential=payload.credential,
            access_token=payload.access_token
        )
        if token.rol == "asesor_ies":
            await record_advisor_access(db, uuid.UUID(token.user_id), "google", request, tasks)
        return token
    except UserNotRegisteredError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "USER_NOT_REGISTERED",
                "mensaje": str(e),
                "email": e.email,
                "name": e.name,
                "picture": e.picture,
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/registro-egresado")
async def registro_egresado(payload: RegisterGraduateRequest, db: AsyncSession = Depends(get_db)):
    """
    Registro y pre-registro de egresados universitarios con persistencia real (JSON).
    """
    try:
        return await IAMService.register_graduate(db, payload)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/registro-egresado-form")
async def registro_egresado_form(
    tipo_documento: str = Form("CC"),
    numero_documento: str = Form(...),
    nombre_completo: str = Form(...),
    correo: str = Form(...),
    password: Optional[str] = Form("Egresado123*"),
    telefono: Optional[str] = Form(None),
    departamento: str = Form("Santander"),
    ciudad: str = Form("Bucaramanga"),
    id_institucion: Optional[str] = Form(None),
    carrera: str = Form(...),
    nivel_educativo: Optional[str] = Form("Profesional Universitario"),
    ano_graduacion: str = Form(...),
    autoriza_datos: bool = Form(True),
    diploma_pdf: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Registro de egresado vía multipart/form-data con carga real del archivo de diploma PDF a Supabase Storage.
    """
    req = RegisterGraduateRequest(
        tipo_documento=tipo_documento,
        numero_documento=numero_documento,
        nombre_completo=nombre_completo,
        correo=correo,
        password=password,
        telefono=telefono,
        departamento=departamento,
        ciudad=ciudad,
        id_institucion=id_institucion,
        carrera=carrera,
        nivel_educativo=nivel_educativo,
        ano_graduacion=ano_graduacion,
        autoriza_datos=autoriza_datos,
    )

    file_bytes = await diploma_pdf.read()
    if not diploma_pdf.filename or not diploma_pdf.filename.lower().endswith(".pdf") or not file_bytes.startswith(b"%PDF-"):
        raise HTTPException(status_code=400, detail="Adjunta el PDF original de tu diploma o acta de grado.")
    if len(file_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="El PDF excede el límite de 10 MB.")
    raw_diploma = (diploma_pdf.filename, file_bytes)

    try:
        return await IAMService.register_graduate(db, req, raw_diploma=raw_diploma)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/registro-empresa")
async def registro_empresa(payload: RegisterCompanyRequest, db: AsyncSession = Depends(get_db)):
    """
    Radicación de empresa con activación en MODO CUARENTENA (SLA 72h).
    Soporta documentos PDF de auditoría codificados en base64 en 'documentos'.
    """
    try:
        return await IAMService.register_company(db, payload)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/registro-empresa-form")
async def registro_empresa_form(
    razon_social: str = Form(...),
    nombre_comercial: str = Form(...),
    nit: str = Form(...),
    codigo_ciiu: Optional[str] = Form("6201"),
    descripcion_ciiu: Optional[str] = Form("Actividades de tecnología y servicios empresariales"),
    sector_economico: str = Form(...),
    tamano_empresa: str = Form(...),
    departamento: str = Form(...),
    ciudad: str = Form(...),
    direccion: str = Form(...),
    telefono: str = Form(...),
    correo_contacto: str = Form(...),
    password: Optional[str] = Form("Empresa123*"),
    nombre_representante_legal: str = Form(...),
    documento_representante_legal: str = Form(...),
    persona_contacto: str = Form(...),
    sitio_web: Optional[str] = Form(None),
    rut_pdf: Optional[UploadFile] = File(None),
    camara_comercio_pdf: Optional[UploadFile] = File(None),
    cedula_rep_legal_pdf: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Radicación de empresa vía multipart/form-data con carga directa de archivos PDF a Supabase Storage.
    """
    req = RegisterCompanyRequest(
        razon_social=razon_social,
        nombre_comercial=nombre_comercial,
        nit=nit,
        codigo_ciiu=codigo_ciiu,
        descripcion_ciiu=descripcion_ciiu,
        sector_economico=sector_economico,
        tamano_empresa=tamano_empresa,
        departamento=departamento,
        ciudad=ciudad,
        direccion=direccion,
        telefono=telefono,
        correo_contacto=correo_contacto,
        password=password,
        sitio_web=sitio_web,
        nombre_representante_legal=nombre_representante_legal,
        documento_representante_legal=documento_representante_legal,
        persona_contacto=persona_contacto
    )

    raw_files = {}
    if rut_pdf and rut_pdf.filename:
        raw_files["rut"] = (rut_pdf.filename, await rut_pdf.read())
    if camara_comercio_pdf and camara_comercio_pdf.filename:
        raw_files["camara_comercio"] = (camara_comercio_pdf.filename, await camara_comercio_pdf.read())
    if cedula_rep_legal_pdf and cedula_rep_legal_pdf.filename:
        raw_files["cedula_rep_legal"] = (cedula_rep_legal_pdf.filename, await cedula_rep_legal_pdf.read())

    try:
        return await IAMService.register_company(db, req, raw_files=raw_files)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/registro-institucion")
async def registro_institucion(payload: RegisterInstitutionRequest, db: AsyncSession = Depends(get_db)):
    """
    Radicación de IES con verificación del aval ministerial SNIES (SLA 72h).
    Soporta documentos PDF codificados en base64 en 'documentos'.
    """
    try:
        return await IAMService.register_institution(db, payload)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/registro-institucion-form")
async def registro_institucion_form(
    nombre_institucion: str = Form(...),
    sigla: Optional[str] = Form(None),
    codigo_snies: str = Form(...),
    caracter_academico: Optional[str] = Form("Institución Universitaria"),
    origen_institucional: Optional[str] = Form("Oficial / Pública"),
    nit: str = Form(...),
    departamento: str = Form(...),
    ciudad: str = Form(...),
    direccion: str = Form(...),
    sitio_web: Optional[str] = Form(None),
    correo_institucional: str = Form(...),
    password: Optional[str] = Form("IesAdmin123*"),
    telefono: str = Form(...),
    nombre_rector: str = Form(...),
    documento_rector: Optional[str] = Form("No suministrado"),
    nombre_contacto_asesor: str = Form(...),
    cargo_asesor: Optional[str] = Form("Coordinador de Egresados y Empleabilidad"),
    resolucion_men_pdf: Optional[UploadFile] = File(None),
    snies_cert_pdf: Optional[UploadFile] = File(None),
    rut_pdf: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Radicación de IES vía multipart/form-data con carga de PDFs institucionales a Supabase Storage.
    """
    req = RegisterInstitutionRequest(
        nombre_institucion=nombre_institucion,
        sigla=sigla,
        codigo_snies=codigo_snies,
        caracter_academico=caracter_academico,
        origen_institucional=origen_institucional,
        nit=nit,
        departamento=departamento,
        ciudad=ciudad,
        direccion=direccion,
        sitio_web=sitio_web,
        correo_institucional=correo_institucional,
        password=password,
        telefono=telefono,
        nombre_rector=nombre_rector,
        documento_rector=documento_rector,
        nombre_contacto_asesor=nombre_contacto_asesor,
        cargo_asesor=cargo_asesor
    )

    raw_files = {}
    if resolucion_men_pdf and resolucion_men_pdf.filename:
        raw_files["resolucion_men"] = (resolucion_men_pdf.filename, await resolucion_men_pdf.read())
    if snies_cert_pdf and snies_cert_pdf.filename:
        raw_files["snies_activo"] = (snies_cert_pdf.filename, await snies_cert_pdf.read())
    if rut_pdf and rut_pdf.filename:
        raw_files["rut"] = (rut_pdf.filename, await rut_pdf.read())

    try:
        return await IAMService.register_institution(db, req, raw_files=raw_files)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/me", response_model=UserMeResponse)
async def get_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Retorna la información del usuario autenticado con su rol, estado de validación y permiso de operación.
    """
    estado = current_user.get("estado_validacion", "pendiente")
    return UserMeResponse(
        id=current_user.get("sub", ""),
        nombre=current_user.get("nombre", ""),
        correo=current_user.get("correo", ""),
        rol=current_user.get("rol", ""),
        estado_validacion=estado,
        motivo_subsanacion=current_user.get("motivo_subsanacion"),
        id_entidad=current_user.get("id_entidad"),
        es_cuenta_aprobada=(estado == "aprobado")
    )


@router.post("/test-email")
async def test_email(destinatario: str, tipo: str = "registro"):
    """
    Endpoint de prueba para verificar la conectividad y el diseño visual de Gmail SMTP.
    Tipos soportados: 'registro', 'aprobacion_empresa', 'aprobacion_ies', 'postulacion', 'avance_fase'
    """
    if tipo == "aprobacion_empresa":
        res = await EmailService.send_company_approved_email(
            to_email=destinatario,
            company_name="Innovación y Software S.A.S.",
            nit="901.482.190-4",
            notes="Verificación de RUT DIAN y Certificado de Existencia en Cámara de Comercio aprobada satisfactoriamente.",
        )
    elif tipo == "aprobacion_ies":
        res = await EmailService.send_institution_approved_email(
            to_email=destinatario,
            institution_name="Unidades Tecnológicas de Santander (UTS)",
            snies_code="2812",
            notes="Resolución MEN y código SNIES validados por el Comité de Gobernanza de Vincula.",
        )
    elif tipo == "postulacion":
        res = await EmailService.send_application_created_email(
            to_email=destinatario,
            graduate_name="Jaider Badillo",
            vacancy_title="Ingeniero de Software Full Stack (React & FastAPI)",
            company_name="Soluciones Digitales de Santander S.A.S.",
            vacancy_code="VAC-2026-084",
            modality="Híbrido",
            location="Bucaramanga, Santander",
        )
    elif tipo == "avance_fase":
        res = await EmailService.send_application_phase_changed_email(
            to_email=destinatario,
            graduate_name="Jaider Badillo",
            vacancy_title="Ingeniero de Software Full Stack (React & FastAPI)",
            company_name="Soluciones Digitales de Santander S.A.S.",
            new_stage="interview",
            previous_stage="evaluation",
            vacancy_code="VAC-2026-084",
            recruiter_feedback="Excelente desempeño en el reto de arquitectura técnica. Pasas a entrevista con el líder de ingeniería.",
            interview_details="Viernes 14 de Noviembre, 10:00 AM - 11:00 AM · Modalidad: Virtual (Google Meet)",
        )
    else:
        res = await EmailService.send_graduate_welcome_email(
            to_email=destinatario,
            name="Jaider Badillo",
            career="Ingeniería de Sistemas (UTS)",
            city="Bucaramanga, Santander",
        )

    if not res.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Fallo enviando correo: {res.get('error') or res.get('reason')}"
        )
    return {"success": True, "tipo": tipo, "mensaje": f"Correo '{tipo}' enviado exitosamente a {destinatario}"}

