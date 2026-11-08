import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { authService } from '../../services/authService.js';

/**
 * Normaliza cualquier variante de nombre de rol (backend FastAPI o credenciales frontend)
 * a un identificador canónico estándar.
 *
 * @param {string} role
 * @returns {string}
 */
export function normalizeRole(role) {
  if (!role) return '';
  const r = String(role).toLowerCase().trim();
  switch (r) {
    case 'egresado':
    case 'graduate':
      return 'egresado';
    case 'asesor_ies':
    case 'ies_asesor':
    case 'institucion_asesor':
    case 'institution_advisor':
      return 'asesor_ies';
    case 'admin_ies':
    case 'ies_admin':
    case 'institucion_admin':
    case 'institution_admin':
      return 'admin_ies';
    case 'admin_empresa':
    case 'empresa_admin':
    case 'company_admin':
    case 'company_quarantine':
    case 'empresa_aprobada':
    case 'empresa':
      return 'admin_empresa';
    case 'reclutador':
    case 'reclutador_empresa':
    case 'empresa_reclutador':
    case 'company_recruiter':
      return 'reclutador_empresa';
    case 'superadmin':
    case 'superadmin_vincula':
    case 'vincula_admin':
    case 'admin':
      return 'superadmin_vincula';
    default:
      return r;
  }
}

/**
 * Obtiene la ruta principal correspondiente a un rol de usuario determinado.
 * Utilizada para redirigir a un usuario autorizado hacia su portal nativo cuando
 * intenta ingresar a una sección no permitida para su rol.
 *
 * @param {string} role
 * @param {string} [estadoValidacion]
 * @returns {string}
 */
export function getHomeRouteForRole(role, estadoValidacion) {
  const norm = normalizeRole(role);
  switch (norm) {
    case 'superadmin_vincula':
      return '/admin/dashboard';
    case 'admin_ies':
      return '/institucion/admin/perfil';
    case 'asesor_ies':
      return '/institucion/dashboard';
    case 'admin_empresa':
      if (estadoValidacion === 'pendiente') {
        return '/empresa/admin/actividad';
      }
      return '/empresa/admin/perfil';
    case 'reclutador_empresa':
      return '/empresa/reclutador/dashboard';
    case 'egresado':
    default:
      return '/dashboard';
  }
}

/**
 * Componente Guardián de Rutas Protegidas (Fase 7 - Seguridad de Acceso y Multi-Tenancy)
 *
 * Verifica:
 * 1. Que exista una sesión activa autenticada con token JWT en el cliente.
 * 2. Si se especifican `allowedRoles`, valida que el rol del usuario actual tenga permiso.
 *
 * Si no está autenticado: redirige a /login conservando la URL solicitada.
 * Si el rol no tiene permiso: redirige al portal nativo correspondiente al rol del usuario.
 *
 * @param {Object} props
 * @param {string[]} [props.allowedRoles] Lista de roles permitidos para la ruta
 * @param {React.ReactNode} [props.children] Componente hijo opcional (si se usa directamente)
 */
export default function ProtectedRoute({ allowedRoles = [], children }) {
  const location = useLocation();
  const isAuthenticated = authService.isAuthenticated();
  const user = authService.getCurrentUser();

  // 1. Verificación de Autenticación:
  // Si no hay token o usuario en sesión, rechazar acceso y redirigir al login
  if (!isAuthenticated || !user) {
    const targetUrl = location.pathname + location.search;
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(targetUrl)}`}
        state={{ from: location }}
        replace
      />
    );
  }

  // 2. Verificación de Roles y Autorización:
  // Si se definen roles permitidos, validar pertenencia
  if (allowedRoles.length > 0) {
    const userRoleNorm = normalizeRole(user.rol);
    const normalizedAllowed = allowedRoles.map(normalizeRole);

    const hasAccess = normalizedAllowed.includes(userRoleNorm);

    if (!hasAccess) {
      console.warn(
        `[Seguridad Vincula] Acceso denegado a '${location.pathname}'. Rol '${userRoleNorm}' no autorizado. Requerido:`,
        normalizedAllowed
      );
      const fallbackRoute = getHomeRouteForRole(user.rol, user.estado_validacion);
      return <Navigate to={fallbackRoute} replace />;
    }
  }

  // 3. Renderizar componentes hijos o el Outlet de React Router
  return children ? children : <Outlet />;
}

