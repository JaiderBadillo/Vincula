import { useState } from 'react';
import { Link } from 'react-router-dom';
import { primaryButton } from '../utils/classes.js';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const fieldClasses =
    'min-h-12 w-full rounded-[0.75rem] border border-line bg-white px-4 py-3.5 text-sm text-ink outline-none placeholder:text-secondary focus:border-green focus:ring-4 focus:ring-green/10 transition-all';

  function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
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
          {/* Header */}
          <div className="text-center">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              Bienvenido de nuevo
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-body-muted">
              Ingresa tus credenciales para acceder a tus postulaciones.
            </p>
          </div>

          {/* Form */}
          <form className="mt-8" noValidate onSubmit={handleSubmit}>
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

            <button className={`${primaryButton} w-full justify-between px-6 py-4 shadow-sm text-sm sm:text-base`} type="submit">
              <span>Iniciar sesión</span>
              <i className="bx bx-right-arrow-alt text-xl" aria-hidden="true" />
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-xs font-medium uppercase tracking-wider text-secondary">o continúa con</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          {/* Google */}
          <button
            type="button"
            className="flex min-h-12 w-full items-center justify-center gap-3 rounded-control border border-line bg-white px-4 py-3 text-sm font-semibold text-ink shadow-xs transition-colors hover:bg-panel"
          >
            <i className="bx bxl-google text-xl text-green" aria-hidden="true" />
            Google
          </button>

          <p className="mt-6 text-center text-sm text-body-muted">
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
