import { Link, useLocation } from 'react-router-dom';
import InstitutionPortalLayout from '../components/institution/InstitutionPortalLayout.jsx';

export default function InstitutionPlaceholderPage({ title = 'Módulo en Construcción', epic = 'Épica E5 — Institución' }) {
  const location = useLocation();

  return (
    <InstitutionPortalLayout activePage="placeholder">
      <main className="max-w-4xl mx-auto px-5 py-16 text-center">
        <div className="rounded-3xl border border-line bg-white p-8 sm:p-12 shadow-card">
          <div className="grid size-16 place-items-center rounded-2xl bg-lime/25 text-green-dark text-3xl mx-auto mb-4">
            <i className="bx bx-wrench" />
          </div>

          <span className="inline-block rounded-full bg-lime/20 text-green-dark border border-lime/40 px-3 py-1 text-xs font-bold uppercase tracking-wider mb-2">
            {epic}
          </span>

          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink mb-3">
            {title}
          </h1>

          <p className="text-sm text-body-muted max-w-lg mx-auto leading-relaxed mb-6">
            Esta vista está contemplada en la arquitectura de vistas del rol <strong>Asesor IES</strong>.
            Ruta actual: <code className="bg-panel px-2 py-0.5 rounded text-xs font-mono text-ink">{location.pathname}</code>.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/institucion/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-ink text-white px-5 py-2.5 text-xs font-bold no-underline hover:bg-ink-soft transition-colors cursor-pointer"
            >
              <i className="bx bx-arrow-back" />
              <span>Volver al Dashboard IES</span>
            </Link>
          </div>
        </div>
      </main>
    </InstitutionPortalLayout>
  );
}
