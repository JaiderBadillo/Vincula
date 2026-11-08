"""
Router de Autenticación, Registro y Usuarios (IAM).
Endpoints oficiales bajo prefijo /api/v1/auth
Soporta registro JSON (con base64) y multipart/form-data (con UploadFile) para PDFs de auditoría.
"""

from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.modules.iam.schemas import (
    LoginRequest,
    TokenResponse,
    RegisterGraduateRequest,
    RegisterCompanyRequest,
    RegisterInstitutionRequest,
    UserMeResponse,
)
from app.modules.iam.services import IAMService
from app.integrations.email_service import EmailService

router = APIRouter(prefix="/auth", tags=["IAM - Autenticación y Registro"])


@router.post("/login", response_model=TokenResponse)
async def login(credentials: LoginRequest, db: AsyncSession = Depends(get_db)):
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

    return IAMService.create_token_for_user(user)


@router.post("/registro-egresado")
async def registro_egresado(payload: RegisterGraduateRequest, db: AsyncSession = Depends(get_db)):
    """
    Registro y pre-registro de egresados universitarios con persistencia real.
    """
    try:
        return await IAMService.register_graduate(db, payload)
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
async def test_email(destinatario: str):
    """
    Endpoint de prueba para verificar la conectividad de Gmail SMTP.
    Envía un correo de prueba de bienvenida al destinatario suministrado.
    """
    res = await EmailService.send_graduate_welcome_email(
        to_email=destinatario,
        name="Usuario de Prueba",
        career="Ingeniería de Sistemas (UTS)"
    )
    if not res.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Fallo enviando correo: {res.get('error') or res.get('reason')}"
        )
    return {"success": True, "mensaje": f"Correo enviado exitosamente a {destinatario}"}

