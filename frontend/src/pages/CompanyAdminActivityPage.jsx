import { useState } from 'react';
import { Link } from 'react-router-dom';
import CompanyPortalLayout from '../components/company/CompanyPortalLayout.jsx';
import CompanyPageHero from '../components/company/CompanyPageHero.jsx';
import { companyPhotos } from '../data/companyImages.js';
import { useCompanyActivity } from '../hooks/useCompanyActivity.js';
import {
  FunnelConversionCard,
  MonthlyRecruitmentChart,
  TalentSourcesCard,
} from '../components/company/ActivityCharts.jsx';
import {
  ActivityLogSection,
  RecruiterPerformanceTable,
} from '../components/company/ActivityLogTable.jsx';

export default function CompanyAdminActivityPage() {
  const { data, error, exportActivityReport } = useCompanyActivity();
  const metrics = data?.metrics;
  const show = (value, suffix = '') => (value === null || value === undefined ? '—' : `${value}${suffix}`);

  const [toast, setToast] = useState(null);

  function handleExport() {
    exportActivityReport();
    setToast('Reporte descargado en formato CSV.');
    setTimeout(() => setToast(null), 3500);
  }

  const heroStats = [
    { value: show(metrics?.openVacancies), label: 'Vacantes activas' },
    { value: show(metrics?.applicantsTotal), label: 'Total postulantes' },
    { value: show(metrics?.hiredMonth), label: 'Contratados mes' },
    { value: show(metrics?.avgTimeToHireDays, ' días'), label: 'Tiempo prom.' },
  ];

  return (
    <CompanyPortalLayout activePage="admin-actividad">
      <main className="w-full pb-20">
        <div data-tour="company-admin-actividad" className="mx-auto max-w-6xl px-5 pt-6 sm:px-8 lg:px-10 space-y-6">
          {/* Banner Hero con fotografía y métricas */}
          <CompanyPageHero
            photo={companyPhotos.actividad}
            title="Actividad y Métricas de Contratación"
            subtitle="Monitoreo ejecutivo de atracción de talento, efectividad de convenios con IES y desempeño del equipo de reclutamiento."
            stats={heroStats}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={!data}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-xs transition-colors hover:bg-white/20 cursor-pointer"
                >
                  <i className="bx bx-download text-sm" />
                  <span>Exportar reporte (CSV)</span>
                </button>
                <Link
                  to="/empresa/admin/vacantes"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-ochre px-3.5 py-2 text-xs font-bold text-cocoa no-underline shadow-xs transition-colors hover:bg-ochre-light"
                >
                  <i className="bx bx-briefcase-alt-2 text-sm" />
                  <span>Gestionar vacantes</span>
                </Link>
              </div>
            }
          />

          {/* Toast de confirmación accesible */}
          {toast && (
            <div
              className="flex items-center justify-between rounded-xl border border-sand-line bg-cream px-4 py-2.5 text-xs text-ink shadow-sm animate-in fade-in"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center gap-2">
                <i className="bx bx-check-circle text-base text-terracotta" />
                <span>{toast}</span>
              </div>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="text-secondary hover:text-ink cursor-pointer"
                aria-label="Cerrar notificación"
              >
                <i className="bx bx-x text-lg" />
              </button>
            </div>
          )}

          {/* Tarjetas KPI ejecutivas en fila */}
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
            <div className="group rounded-2xl border border-sand-line bg-white p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-ochre/50 hover:shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[0.68rem] font-bold uppercase tracking-wider text-secondary">En filtro</span>
                <span className="grid size-8 place-items-center rounded-xl bg-ochre/20 text-cocoa transition-transform group-hover:scale-110">
                  <i className="bx bx-filter-alt text-base" />
                </span>
              </div>
              <p className="m-0 mt-3 font-display text-2xl sm:text-3xl font-extrabold text-ink leading-none">
                {show(metrics?.inReview)}
              </p>
              <p className="m-0 mt-1.5 text-xs text-secondary flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-ochre" />
                <span>Candidatos en evaluación</span>
              </p>
            </div>

            <div className="group rounded-2xl border border-sand-line bg-white p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-terracotta/50 hover:shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[0.68rem] font-bold uppercase tracking-wider text-secondary">Entrevistas</span>
                <span className="grid size-8 place-items-center rounded-xl bg-terracotta/15 text-terracotta transition-transform group-hover:scale-110">
                  <i className="bx bx-calendar-event text-base" />
                </span>
              </div>
              <p className="m-0 mt-3 font-display text-2xl sm:text-3xl font-extrabold text-ink leading-none">
                {show(metrics?.interviewing)}
              </p>
              <p className="m-0 mt-1.5 text-xs text-secondary flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-terracotta" />
                <span>Postulaciones en entrevista</span>
              </p>
            </div>

            <div className="group rounded-2xl border border-sand-line bg-white p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-sand-dark hover:shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[0.68rem] font-bold uppercase tracking-wider text-secondary">Conversión</span>
                <span className="grid size-8 place-items-center rounded-xl bg-sand text-cocoa transition-transform group-hover:scale-110">
                  <i className="bx bx-trending-up text-base" />
                </span>
              </div>
              <p className="m-0 mt-3 font-display text-2xl sm:text-3xl font-extrabold text-ink leading-none">
                {show(metrics?.conversionRate, '%')}
              </p>
              <p className="m-0 mt-1.5 text-xs text-secondary">Contratados sobre postulaciones</p>
            </div>

            <div className="group rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/40 via-white to-white p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[0.68rem] font-bold uppercase tracking-wider text-emerald-900">Con postulantes</span>
                <span className="grid size-8 place-items-center rounded-xl bg-emerald-100 text-emerald-800 transition-transform group-hover:scale-110">
                  <i className="bx bx-check-shield text-base" />
                </span>
              </div>
              <p className="m-0 mt-3 font-display text-2xl sm:text-3xl font-extrabold text-ink leading-none">
                {show(metrics?.vacanciesWithApplicantsPct, '%')}
              </p>
              <p className="m-0 mt-1.5 text-xs text-secondary">Vacantes abiertas que ya recibieron alguna</p>
            </div>
          </div>

          {error && <p className="m-0 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">{error}</p>}
          {!data && !error && <p className="m-0 p-4 text-sm text-secondary" role="status">Calculando la actividad…</p>}
          {data && metrics.applicantsTotal === 0 && (
            <p className="m-0 rounded-xl border border-sand-line bg-white p-4 text-sm text-secondary">
              Tus vacantes aún no tienen postulaciones. Las gráficas aparecerán cuando llegue la primera.
            </p>
          )}

          {data && metrics.applicantsTotal > 0 && (
            <>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="rounded-3xl border border-sand-line/90 bg-white p-6 shadow-sm lg:col-span-7">
                  <MonthlyRecruitmentChart data={data.monthlyTrend} />
                </div>
                <div className="rounded-3xl border border-sand-line/90 bg-white p-6 shadow-sm lg:col-span-5">
                  <TalentSourcesCard sources={data.talentSources} />
                </div>
              </div>

              <div className="rounded-3xl border border-sand-line/90 bg-white p-6 shadow-sm">
                <FunnelConversionCard funnel={data.funnel} avgTimeToHireDays={metrics.avgTimeToHireDays} />
              </div>

              <RecruiterPerformanceTable recruiters={data.recruiters} />
            </>
          )}

          {data && (
            <div className="rounded-2xl border border-sand-line bg-white p-5 shadow-2xs">
              <ActivityLogSection log={data.log} />
            </div>
          )}
        </div>
      </main>
    </CompanyPortalLayout>
  );
}

