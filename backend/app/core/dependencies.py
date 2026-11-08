"""
Dependencias Transversales de Seguridad y Gating de Cuarentena (FastAPI).
Implementa la Opción 2: Permite login pero aplica Gating estricto de autorización
para proteger a los egresados de empresas o IES no validadas.
"""

from typing import List, Optional, Dict, Any, Callable
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.security import decode_access_token

security_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer)
) -> Dict[str, Any]:
    """
    Extrae y valida el JWT del encabezado Authorization: Bearer <token>.
    Retorna el payload del usuario autenticado.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales de autenticación no suministradas.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado. Inicia sesión nuevamente.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload


def require_role(allowed_roles: List[str]) -> Callable:
    """
    Fábrica de dependencias que comprueba si el rol del usuario autenticado
    se encuentra dentro de la lista de roles autorizados.
    """
    async def role_checker(
        current_user: Dict[str, Any] = Depends(get_current_user)
    ) -> Dict[str, Any]:
        user_role = current_user.get("rol")
        # Normalización para aceptar variantes 'admin_empresa' y 'empresa_admin'
        normalized_role = user_role
        if user_role == "empresa_admin":
            normalized_role = "admin_empresa"
        elif user_role == "reclutador":
            normalized_role = "reclutador_empresa"
        elif user_role == "ies_admin":
            normalized_role = "admin_ies"
        elif user_role == "ies_asesor":
            normalized_role = "asesor_ies"
        elif user_role == "superadmin":
            normalized_role = "superadmin_vincula"

        if user_role not in allowed_roles and normalized_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso denegado: Se requiere rol {allowed_roles}, pero tu rol es '{user_role}'.",
            )
        return current_user

    return role_checker


async def require_approved_company(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    GATING DE SEGURIDAD (OPCIÓN 2) PARA EMPRESAS:
    Si la empresa tiene estado 'pendiente' o 'en_subsanacion', BLOQUEA el acceso a
    endpoints de publicación de vacantes activas y búsqueda de candidatos/hojas de vida.
    Solo les permite acceder a su pantalla de Cuarentena (radicado, perfil borrador y re-subida de PDFs).
    """
    user_role = current_user.get("rol")
    company_roles = ["admin_empresa", "reclutador_empresa", "empresa_admin", "reclutador"]
    if user_role in company_roles:
        estado = current_user.get("estado_validacion", "pendiente").lower()

        if estado == "pendiente":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "codigo": "EMPRESA_EN_CUARENTENA",
                    "estado": "pendiente",
                    "mensaje": (
                        "Tu empresa se encuentra en proceso de validación oficial (SLA máx. 72h). "
                        "Para proteger a los egresados contra fraudes, las funciones de publicación "
                        "y exploración de talento están bloqueadas hasta que el Super Admin apruebe tus documentos."
                    )
                }
            )

        if estado == "en_subsanacion":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "codigo": "EMPRESA_EN_SUBSANACION",
                    "estado": "en_subsanacion",
                    "motivo": current_user.get("motivo_subsanacion", "Documentos con inconsistencias"),
                    "mensaje": (
                        "El Super Admin ha solicitado subsanar documentos de tu empresa. "
                        "Ingresa a tu panel de Cuarentena para cargar los archivos requeridos."
                    )
                }
            )

        if estado == "rechazado":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "codigo": "EMPRESA_RECHAZADA",
                    "estado": "rechazado",
                    "mensaje": "La solicitud de registro de tu empresa fue rechazada por el equipo de auditoría."
                }
            )

    return current_user


async def require_approved_institution(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    GATING DE SEGURIDAD (OPCIÓN 2) PARA IES:
    Si la Institución de Educación Superior no está en estado 'aprobado',
    no puede validar títulos de egresados ni celebrar convenios marco.
    """
    user_role = current_user.get("rol")
    ies_roles = ["admin_ies", "asesor_ies", "ies_admin", "ies_asesor"]
    if user_role in ies_roles:
        estado = current_user.get("estado_validacion", "pendiente").lower()
        if estado != "aprobado":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "codigo": "IES_EN_CUARENTENA",
                    "estado": estado,
                    "mensaje": (
                        "La institución educativa se encuentra en proceso de auditoría y cotejo "
                        "con el SNIES / Ministerio de Educación Nacional. Funciones operativas bloqueadas."
                    )
                }
            )

    return current_user
