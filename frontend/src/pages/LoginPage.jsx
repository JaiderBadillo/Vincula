import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { primaryButton } from '../utils/classes.js';
import { useAuthCredentials } from '../hooks/useAuthCredentials.js';
import { authService } from '../services/authService.js';

const GOOGLE_CLIENT_ID =
  import.meta.env?.VITE_GOOGLE_CLIENT_ID ||
  '698543862122-050jkphuknmg709207im4lfs39744ef8.apps.googleusercontent.com';

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { credentials } = useAuthCredentials();

  const isLogout = searchParams.get('logout') === '1';

  // Si se ingresa con ?logout=1, asegurar la limpieza completa de la sesión local
  useEffect(() => {
    if (isLogout) {
      authService.logout();
      try {
        localStorage.removeItem('vincula.profile.v1');
      } catch {
        // noop
      }
    }
  }, [isLogout]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const fieldClasses =
    'min-h-12 w-full rounded-[0.75rem] border border-line bg-white px-4 py-3.5 text-sm text-ink outline-none placeholder:text-secondary focus:border-green focus:ring-4 focus:ring-green/10 transition-all';

  function routeForRole(rol, estadoValidacion) {
    switch (rol) {
      case 'superadmin_vincula':
      case 'superadmin':
      case 'vincula_admin':
      case 'admin':
        return '/admin/dashboard';
      case 'admin_empresa':
      case 'empresa_admin':
      case 'company_admin':
      case 'company_quarantine':
      case 'empresa_aprobada':
      case 'empresa':
        if (estadoValidacion === 'pendiente') {
          return '/empresa/admin/actividad';
        }
        return '/empresa/admin/perfil';
      case 'reclutador_empresa':
      case 'empresa_reclutador':
      case 'reclutador':
      case 'company_recruiter':
        return '/empresa/reclutador/dashboard';
      case 'admin_ies':
      case 'institucion_admin':
      case 'institution_admin':
        return '/institucion/admin/perfil';
      case 'asesor_ies':
      case 'institucion_asesor':
      case 'institution_advisor':
        return '/institucion/dashboard';
      case 'egresado':
      case 'graduate':
      default:
        return '/dashboard';
    }
  }

  const handleGoogleCredentialResponse = async (response) => {
    if (!response?.credential) {
      setAuthError('No se recibió la credencial de autenticación de Google.');
      return;
    }
    setIsGoogleLoading(true);
    setAuthError(null);
    try {
      const data = await authService.loginWithGoogle(response.credential);
      setIsGoogleLoading(false);

      const redirectUrl = searchParams.get('redirect');
      if (redirectUrl && redirectUrl.startsWith('/')) {
        navigate(redirectUrl, { replace: true });
        return;
      }

      const targetRoute = routeForRole(data.rol, data.estado_validacion);
      navigate(targetRoute, { replace: true });
    } catch (err) {
      setIsGoogleLoading(false);
      if (err.status === 404 && err.data?.code === 'USER_NOT_REGISTERED') {
        const regEmail = err.data.email || '';
        const regName = err.data.name || '';
        navigate(`/registro-egresado?email=${encodeURIComponent(regEmail)}&name=${encodeURIComponent(regName)}`);
        return;
      }
      setAuthError(err.message || 'Error al iniciar sesión con Google.');
    }
  };

  /**
   * Dispara el flujo OAuth 2.0 Popup de Google con Google Identity Services
   */
  function handleGoogleLoginClick() {
    setAuthError(null);

    if (!window.google?.accounts?.oauth2) {
      setAuthError('Cargando servicios de Google... Por favor reintenta en un momento.');
      return;
    }

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'openid email profile',
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            console.warn('Google OAuth response:', tokenResponse);
            if (tokenResponse.error !== 'access_denied') {
              setAuthError('Google: ' + (tokenResponse.error_description || tokenResponse.error));
            }
            setIsGoogleLoading(false);
            return;
          }

          if (!tokenResponse.access_token) {
            setAuthError('No se recibió el token de acceso de Google.');
            setIsGoogleLoading(false);
            return;
          }

          setIsGoogleLoading(true);
          try {
            const data = await authService.loginWithGoogle({ access_token: tokenResponse.access_token });
            setIsGoogleLoading(false);

            const redirectUrl = searchParams.get('redirect');
            if (redirectUrl && redirectUrl.startsWith('/')) {
              navigate(redirectUrl, { replace: true });
              return;
            }

            const targetRoute = routeForRole(data.rol, data.estado_validacion);
            navigate(targetRoute, { replace: true });
          } catch (err) {
            setIsGoogleLoading(false);
            if (err.status === 404 && err.data?.code === 'USER_NOT_REGISTERED') {
              const regEmail = err.data.email || '';
              const regName = err.data.name || '';
              navigate(`/registro-egresado?email=${encodeURIComponent(regEmail)}&name=${encodeURIComponent(regName)}`);
              return;
            }
            setAuthError(err.message || 'Error al autenticar con Google en el servidor.');
          }
        },
      });

      client.requestAccessToken();
    } catch (err) {
      console.error('Error inicializando token client de Google:', err);
      setAuthError('No se pudo abrir la ventana de Google: ' + err.message);
    }
  }

  useEffect(() => {
    // Inicializar One Tap si está disponible en background
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });
      } catch (e) {
        // noop
      }
    }
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
    setAuthError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setAuthError('Por favor ingresa tu correo electrónico.');
      return;
    }
    if (!password) {
      setAuthError('Por favor ingresa tu contraseña.');
      return;
    }
    if (password.length < 6) {
      setAuthError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Intentar autenticación real contra FastAPI en vivo
      const data = await authService.login(trimmedEmail, password);
      setIsLoading(false);

      // Si el usuario intentaba acceder a una URL específica previa (por ejemplo, desde ProtectedRoute)
      const redirectUrl = searchParams.get('redirect');
      if (redirectUrl && redirectUrl.startsWith('/')) {
        navigate(redirectUrl, { replace: true });
        return;
      }

      const targetRoute = routeForRole(data.rol, data.estado_validacion);
      navigate(targetRoute, { replace: true });
    } catch (apiErr) {
      setIsLoading(false);

      // Si fue error de credenciales explícito desde FastAPI (401)
      if (apiErr.status === 401) {
        setAuthError(apiErr.message || 'Correo o contraseña incorrectos.');
        return;
      }

      // Si fue error de validación de campos desde FastAPI (422)
      if (apiErr.status === 422) {
        setAuthError(apiErr.message || 'Los datos ingresados no cumplen con los requisitos mínimos.');
        return;
      }

      // Si el backend FastAPI no está corriendo (error de conexión)
      // se intenta el fallback local de contingencia para no interrumpir el flujo del usuario
      console.warn('Backend FastAPI no respondió, verificando credenciales locales:', apiErr.message);

      const matchedRole = Object.values(credentials).find(
        (c) => c.email.toLowerCase() === trimmedEmail.toLowerCase()
      );

      if (matchedRole && matchedRole.password === password) {
        authService.saveSession({
          access_token: 'local-session-' + matchedRole.roleId,
          user_id: matchedRole.roleId,
          nombre: matchedRole.name,
          correo: matchedRole.email,
          rol: matchedRole.roleId,
          estado_validacion: matchedRole.roleId === 'company_quarantine' ? 'pendiente' : 'aprobado',
          id_entidad: 'local-entidad',
        });

        const redirectUrl = searchParams.get('redirect');
        if (redirectUrl && redirectUrl.startsWith('/')) {
          navigate(redirectUrl, { replace: true });
          return;
        }

        navigate(matchedRole.portalRoute || '/dashboard', { replace: true });
        return;
      }

      setAuthError(apiErr.message || 'No fue posible conectar con el servidor backend.');
    }
  }

  function handleQuickFill(roleKey) {
    const roleCreds = credentials[roleKey];
    if (roleCreds) {
      setEmail(roleCreds.email);
      setPassword(roleCreds.password);
      setAuthError(null);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col justify-between overflow-hidden bg-page">
      {/* ─── Top Bar: Brand & Back link ─── */}
      <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between px-5 pt-6 sm:px-8">
        <Link
          to="/"
          className="inline-flex items-center gap-3 text-ink no-underline transition-opacity hover:opacity-90"
          aria-label="Vincula, volver al inicio"
        >
          <span
            className="grid size-10 place-items-center rounded-xl border border-ink/10 bg-ink text-2xl text-lime shadow-sm"
            aria-hidden="true"
          >
            <i className="bx bx-briefcase" />
          </span>
          <span className="grid gap-0.5 text-left">
            <span className="font-display text-sm font-bold tracking-[0.12em]">VINCULA</span>
            <span className="text-xs text-body-muted">Red de talento universitario</span>
          </span>
        </Link>

        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/90 px-4 py-1.5 text-xs font-semibold text-ink shadow-xs backdrop-blur-sm transition-colors hover:bg-panel no-underline"
        >
          <i className="bx bx-left-arrow-alt text-base" aria-hidden="true" />
          Volver al inicio
        </Link>
      </header>

      {/* ─── Center: Login Box (Centered, slightly larger & comfortable) ─── */}
      <main className="relative z-20 mx-auto my-auto flex w-full max-w-lg flex-col justify-center px-4 py-8 sm:px-6">
        <div className="w-full rounded-3xl border border-line/90 bg-white/95 p-8 shadow-hero backdrop-blur-xl sm:p-10">
          {/* Alerta de sesión cerrada */}
          {isLogout && (
            <div className="mb-6 rounded-2xl border border-sand-line bg-sand/40 p-4 text-xs text-cocoa flex items-center gap-3 animate-in fade-in">
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-terracotta text-white text-base">
                <i className="bx bx-check" />
              </span>
              <div>
                <p className="m-0 font-bold text-ink">Sesión finalizada con éxito</p>
                <p className="m-0 text-[0.7rem] text-secondary">
                  Has salido de la plataforma de forma segura. Ingresa de nuevo tus credenciales cuando lo requieras.
                </p>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="text-center">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              Bienvenido de nuevo
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-body-muted">
              Ingresa tus credenciales para acceder a la plataforma.
            </p>
          </div>

          {/* Alerta de error de autenticación */}
          {authError && (
            <div className="mt-6 rounded-2xl border border-terracotta/30 bg-terracotta/10 p-3.5 text-xs font-semibold text-terracotta-dark flex items-center gap-2.5">
              <i className="bx bx-error-circle text-lg shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* Form */}
          <form className="mt-6" noValidate onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="mb-2 block text-sm font-bold text-ink" htmlFor="login-email">
                Correo electrónico
              </label>
              <div className="relative">
                <i
                  className="bx bx-envelope absolute left-4 top-1/2 -translate-y-1/2 text-lg text-secondary"
                  aria-hidden="true"
                />
                <input
                  className={`${fieldClasses} pl-11`}
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.edu.co"
                  autoComplete="email"
                  required
                  aria-invalid={submitted && !email.trim()}
                />
              </div>
              {submitted && !email.trim() && (
                <p className="mt-1 text-xs font-bold text-red-700">Ingresa tu correo electrónico.</p>
              )}
            </div>

            <div className="mb-6">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-bold text-ink" htmlFor="login-password">
                  Contraseña
                </label>
                <button
                  type="button"
                  className="text-xs font-semibold text-green hover:text-green-dark"
                  tabIndex={-1}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <i
                  className="bx bx-lock-alt absolute left-4 top-1/2 -translate-y-1/2 text-lg text-secondary"
                  aria-hidden="true"
                />
                <input
                  className={`${fieldClasses} pl-11 pr-11`}
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña"
                  autoComplete="current-password"
                  required
                  aria-invalid={submitted && !password}
                />
                <button
                  type="button"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xl text-secondary hover:text-ink"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  tabIndex={-1}
                >
                  <i className={`bx ${showPassword ? 'bx-hide' : 'bx-show'}`} />
                </button>
              </div>
              {submitted && !password && (
                <p className="mt-1 text-xs font-bold text-red-700">Ingresa tu contraseña.</p>
              )}
            </div>

            <button
              className={`${primaryButton} w-full justify-between px-6 py-4 shadow-sm text-sm sm:text-base ${
                isLoading ? 'opacity-80 cursor-wait' : ''
              }`}
              type="submit"
              disabled={isLoading}
            >
              <span>{isLoading ? 'Conectando con Supabase...' : 'Iniciar sesión'}</span>
              {isLoading ? (
                <i className="bx bx-loader-alt animate-spin text-xl" aria-hidden="true" />
              ) : (
                <i className="bx bx-right-arrow-alt text-xl" aria-hidden="true" />
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-xs font-medium uppercase tracking-wider text-secondary">o continúa con</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          {/* Google OAuth 2.0 */}
          <div className="flex flex-col items-center justify-center w-full">
            <button
              type="button"
              onClick={handleGoogleLoginClick}
              disabled={isGoogleLoading || isLoading}
              className="flex min-h-12 w-full items-center justify-center gap-3 rounded-control border border-line bg-white px-4 py-3 text-sm font-semibold text-ink shadow-xs transition-all hover:bg-panel hover:border-green/40 hover:shadow-sm cursor-pointer disabled:opacity-60"
            >
              {isGoogleLoading ? (
                <>
                  <i className="bx bx-loader-alt animate-spin text-xl text-green" aria-hidden="true" />
                  <span className="text-secondary font-medium">Validando con Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continuar con Google</span>
                </>
              )}
            </button>
          </div>

          {/* Cuentas activas en la plataforma */}
          <div className="mt-6 rounded-2xl border border-sand-line bg-sand/30 p-3.5">
            <p className="m-0 mb-2.5 text-center text-[0.68rem] font-bold uppercase tracking-wider text-secondary">
              Cuentas oficiales activas (Supabase PostgreSQL)
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('vincula_admin')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-terracotta/30 bg-terracotta/10 px-3.5 py-1.5 text-xs font-bold text-terracotta hover:bg-terracotta hover:text-white transition-colors cursor-pointer"
                title="Super Administrador Vincula (admin@vincula.com.co)"
              >
                <i className="bx bx-shield-quarter text-sm" aria-hidden="true" />
                Admin Vincula
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('institution_admin')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-green/30 bg-green/10 px-3.5 py-1.5 text-xs font-bold text-green-dark hover:bg-green hover:text-white transition-colors cursor-pointer"
                title="Cuenta Institucional UTS (ies@uts.edu.co)"
              >
                <i className="bx bx-buildings text-sm" aria-hidden="true" />
                Cuenta UTS (IES)
              </button>
            </div>
          </div>

          <p className="mt-5 text-center text-sm text-body-muted">
            ¿No tienes cuenta?{' '}
            <Link to="/" className="font-semibold text-green hover:text-green-dark no-underline">
              Regístrate aquí
            </Link>
          </p>
        </div>
      </main>

      {/* ─── Background Panoramic Horizontal Image across the bottom with Gradient Fade ─── */}
      <div
        className="pointer-events-none absolute bottom-0 inset-x-0 z-0 h-64 sm:h-80 md:h-96 lg:h-[420px] w-full overflow-hidden"
        style={{
          maskImage: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 45%, rgba(0,0,0,0) 100%)',
          WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 45%, rgba(0,0,0,0) 100%)',
        }}
        aria-hidden="true"
      >
        <img
          className="size-full object-cover object-[center_35%]"
          src="https://images.pexels.com/photos/3184328/pexels-photo-3184328.jpeg?auto=compress&cs=tinysrgb&w=1920&q=80"
          alt=""
          loading="lazy"
          decoding="async"
        />
        {/* Soft gradient wash to blend seamlessly into page background */}
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-page/40 to-page" />
      </div>
    </div>
  );
}
