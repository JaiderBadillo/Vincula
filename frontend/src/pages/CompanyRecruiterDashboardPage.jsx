import { useState } from 'react';
import { Link } from 'react-router-dom';
import CompanyPortalLayout from '../components/company/CompanyPortalLayout.jsx';
import CompanyPageHero from '../components/company/CompanyPageHero.jsx';
import { companyPhotos } from '../data/companyImages.js';
import {
  pendingApplicantsQueue,
  quickActionModules,
  recruiterDashboardMetrics,
  recruiterProfile,
  upcomingInterviews,
} from '../data/companyRecruiterDashboardData.js';

export default function CompanyRecruiterDashboardPage() {
  const [selectedSiteFilter, setSelectedSiteFilter] = useState('all');
  const [evaluatedApplicant, setEvaluatedApplicant] = useState(null);
  const [feedbackToast, setFeedbackToast] = useState(null);

  // Filtrado de la cola de postulantes por sede asignada
  const filteredApplicants =
    selectedSiteFilter === 'all'
      ? pendingApplicantsQueue
      : pendingApplicantsQueue.filter((app) => {
          if (selectedSiteFilter === 'bga') return app.site.toLowerCase().includes('bucaramanga');
          if (selectedSiteFilter === 'bcm') return app.site.toLowerCase().includes('barranca');
          if (selectedSiteFilter === 'gir') return app.site.toLowerCase().includes('girón');
          return true;
        });

  function handleActionCandidate(actionLabel, candidateName) {
    setEvaluatedApplicant(null);
    setFeedbackToast(`Acción completada: ${actionLabel} para "${candidateName}".`);
    setTimeout(() => setFeedbackToast(null), 3500);
  }

  const heroStats = [
    {
      value: String(recruiterDashboardMetrics.activeVacancies.total),
      label: 'Mis Vacantes',
    },
    {
      value: String(recruiterDashboardMetrics.pendingReviewApplicants.total),
      label: 'En Cola',
    },
    {
      value: String(recruiterDashboardMetrics.scheduledInterviews.total),
      label: 'Entrevistas',
    },
    {
      value: String(recruiterDashboardMetrics.hiresThisMonth.total),
      label: 'Contratados',
    },
  ];

  return (
    <CompanyPortalLayout activePage="recruiter-dashboard" role="recruiter">
      <main className="w-full pb-20">
        <div className="mx-auto max-w-7xl px-5 pt-8 sm:px-8 lg:px-10 space-y-8">
          {/* ─── 1. Hero Showcase del Reclutador (Estilo Sonnet cálido) ─── */}
          <CompanyPageHero
            photo={companyPhotos.reclutadores || companyPhotos.talento}
            title={`¡Hola, ${recruiterProfile.fullName.split(' ')[0]}!`}
            subtitle="Gestiona el embudo de selección de tus vacantes asignadas, califica candidatos en cola y atiende las entrevistas de hoy."
            stats={heroStats}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to="/empresa/reclutador/candidatos"
                  className="inline-flex items-center gap-2 rounded-xl bg-ochre hover:bg-ochre-light text-cocoa font-bold px-4 py-2.5 text-xs shadow-xs transition-all no-underline cursor-pointer"
                >
                  <i className="bx bx-user-check text-base" />
                  <span>Revisar postulaciones (14)</span>
                </Link>
                <Link
                  to="/empresa/reclutador/vacantes/nueva"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-xs hover:bg-white/20 no-underline transition-colors cursor-pointer"
                >
                  <i className="bx bx-plus text-sm" />
                  <span>Nueva vacante</span>
                </Link>
              </div>
            }
          />

          {/* Toast de confirmación de acciones rápidas */}
          {feedbackToast && (
            <div
              className="flex items-center justify-between rounded-xl border border-sand-line bg-cream px-4 py-2.5 text-xs text-ink shadow-sm animate-in fade-in"
              role="status"
            >
              <div className="flex items-center gap-2">
                <i className="bx bx-check-circle text-base text-terracotta" />
                <span>{feedbackToast}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedbackToast(null)}
                className="text-secondary hover:text-ink cursor-pointer"
              >
                <i className="bx bx-x text-lg" />
              </button>
            </div>
          )}

          {/* ─── 2. Barra de Control de Sede Asignada ─── */}
          <div className="flex items-center gap-2 flex-wrap rounded-2xl border border-sand-line bg-white p-4 shadow-2xs">
            <span className="text-xs font-semibold text-secondary">
              Filtrar por sede asignada:
            </span>
            <div className="flex items-center gap-1.5 rounded-xl border border-sand-line bg-cream/60 p-1 shadow-2xs">
              {[
                { id: 'all', label: 'Todas mis sedes (3)' },
                { id: 'bga', label: 'Bucaramanga' },
                { id: 'bcm', label: 'Barrancabermeja' },
                { id: 'gir', label: 'Girón' },
              ].map((site) => (
                <button
                  key={site.id}
                  type="button"
                  onClick={() => setSelectedSiteFilter(site.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    selectedSiteFilter === site.id
                      ? 'bg-cocoa text-white shadow-xs font-bold'
                      : 'text-secondary hover:text-ink hover:bg-white'
                  }`}
                >
                  {site.label}
                </button>
              ))}
            </div>
          </div>

          {/* ─── 3. Barra Superior de Resumen General (Top KPIs) ─── */}
          <section aria-labelledby="recruiter-kpis-title">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-secondary">
                  Indicadores Personales de Selección
                </p>
                <h2 id="recruiter-kpis-title" className="font-display text-lg sm:text-xl font-bold text-ink m-0">
                  Resumen Operativo de María Fernanda
                </h2>
              </div>
              <span className="text-xs text-secondary font-medium hidden sm:inline">
                Corte: Hoy, 08:42 AM
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* KPI 1: Vacantes Asignadas */}
              <div className="rounded-2xl border border-sand-line bg-white p-5 shadow-2xs transition-all hover:border-terracotta/40 hover:shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-xl bg-ochre/25 text-cocoa text-xl font-bold">
                    <i className="bx bx-briefcase" />
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-cream border border-sand-line px-2 py-0.5 text-[0.68rem] font-bold text-cocoa">
                    +{recruiterDashboardMetrics.activeVacancies.newThisWeek} esta semana
                  </span>
                </div>
                <div className="mt-4">
                  <p className="m-0 text-xs font-semibold text-secondary uppercase tracking-wider">
                    {recruiterDashboardMetrics.activeVacancies.label}
                  </p>
                  <p className="font-display text-2xl sm:text-3xl font-extrabold text-ink m-0 mt-1">
                    {recruiterDashboardMetrics.activeVacancies.total}
                  </p>
                  <p className="m-0 text-xs text-secondary mt-1.5 flex items-center gap-1">
                    <i className="bx bx-check-circle text-emerald-600" />
                    <span>Todas con procesos abiertos</span>
                  </p>
                </div>
              </div>

              {/* KPI 2: Postulantes por Revisar */}
              <div className="rounded-2xl border border-terracotta/30 bg-gradient-to-br from-terracotta/5 via-white to-white p-5 shadow-2xs transition-all hover:border-terracotta hover:shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-xl bg-terracotta text-white text-xl font-bold shadow-xs">
                    <i className="bx bx-user-voice" />
                  </span>
                  <span className="rounded-full bg-terracotta/15 text-terracotta-dark border border-terracotta/25 px-2.5 py-0.5 text-xs font-extrabold">
                    {recruiterDashboardMetrics.pendingReviewApplicants.growth}
                  </span>
                </div>
                <div className="mt-4">
                  <p className="m-0 text-xs font-semibold text-terracotta-dark uppercase tracking-wider">
                    {recruiterDashboardMetrics.pendingReviewApplicants.label}
                  </p>
                  <p className="font-display text-2xl sm:text-3xl font-extrabold text-ink m-0 mt-1">
                    {recruiterDashboardMetrics.pendingReviewApplicants.total}
                  </p>
                  <p className="m-0 text-xs text-secondary mt-1.5 flex items-center gap-1">
                    <i className="bx bx-time text-ochre" />
                    <span>Tiempo prom. revisión: 1.8 días</span>
                  </p>
                </div>
              </div>

              {/* KPI 3: Entrevistas de la Semana */}
              <div className="rounded-2xl border border-sand-line bg-white p-5 shadow-2xs transition-all hover:border-ochre hover:shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-xl bg-sand text-cocoa text-xl font-bold">
                    <i className="bx bx-calendar-event" />
                  </span>
                  <span className="rounded-full bg-sand px-2.5 py-0.5 text-[0.68rem] font-bold text-cocoa">
                    {recruiterDashboardMetrics.scheduledInterviews.todayCount} hoy
                  </span>
                </div>
                <div className="mt-4">
                  <p className="m-0 text-xs font-semibold text-secondary uppercase tracking-wider">
                    {recruiterDashboardMetrics.scheduledInterviews.label}
                  </p>
                  <p className="font-display text-2xl sm:text-3xl font-extrabold text-ink m-0 mt-1">
                    {recruiterDashboardMetrics.scheduledInterviews.total}
                  </p>
                  <p className="m-0 text-xs text-secondary mt-1.5">
                    <strong>100%</strong> confirmadas en agenda
                  </p>
                </div>
              </div>

              {/* KPI 4: Contrataciones del Mes */}
              <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/60 via-white to-white p-5 shadow-2xs transition-all hover:border-emerald-400 hover:shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-xl bg-emerald-600 text-white text-xl font-bold shadow-xs">
                    <i className="bx bx-user-check" />
                  </span>
                  <span className="rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-0.5 text-xs font-extrabold">
                    {recruiterDashboardMetrics.hiresThisMonth.rate}
                  </span>
                </div>
                <div className="mt-4">
                  <p className="m-0 text-xs font-semibold text-emerald-900 uppercase tracking-wider">
                    {recruiterDashboardMetrics.hiresThisMonth.label}
                  </p>
                  <p className="font-display text-2xl sm:text-3xl font-extrabold text-ink m-0 mt-1">
                    {recruiterDashboardMetrics.hiresThisMonth.total}
                  </p>
                  <p className="m-0 text-xs text-body-muted mt-1.5">
                    Meta mensual: <strong>12 contrataciones</strong>
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ─── 4. Módulos de Acceso Rápido del Reclutador (Estilo Sonnet) ─── */}
          <section aria-labelledby="recruiter-modules-title">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-secondary">
                  Navegación Operativa
                </p>
                <h2 id="recruiter-modules-title" className="font-display text-lg sm:text-xl font-bold text-ink m-0">
                  Acceso Rápido a Módulos de Selección
                </h2>
              </div>
              <p className="text-xs text-secondary m-0">
                Flujos de evaluación de hojas de vida, control de ofertas y atracción de talento universitario
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {quickActionModules.map((module) => (
                <Link
                  key={module.id}
                  to={module.to}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-sand-line bg-white p-5 text-left no-underline shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-terracotta/40 hover:shadow-card"
                >
                  <div
                    className={`absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl ${module.accentColor} rounded-bl-full pointer-events-none opacity-70 group-hover:opacity-100 transition-opacity`}
                  />

                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3.5">
                      <span
                        className={`grid size-12 place-items-center rounded-xl text-2xl font-bold shadow-2xs transition-transform group-hover:scale-105 ${module.iconColor}`}
                      >
                        <i className={`bx ${module.icon}`} />
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.68rem] font-bold ${module.badgeColor}`}
                      >
                        {module.badge}
                      </span>
                    </div>

                    <h3 className="font-display text-base font-bold text-ink m-0 group-hover:text-terracotta transition-colors flex items-center gap-1.5">
                      <span>{module.title}</span>
                      <i className="bx bx-right-arrow-alt text-base opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-terracotta" />
                    </h3>

                    <p className="mt-1.5 text-xs text-secondary leading-relaxed m-0 line-clamp-2">
                      {module.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-sand-line/60 flex items-center justify-between text-xs font-semibold text-terracotta">
                    <span>Abrir módulo</span>
                    <i className="bx bx-chevron-right text-base text-secondary group-hover:text-terracotta group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* ─── 5. Bandejas de Atención Inmediata en Paralelo (Candidatos & Entrevistas) ─── */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Columna Izquierda (7 cols): Cola de Postulantes Nuevos por Revisar */}
            <div className="rounded-2xl border border-sand-line bg-white p-5 sm:p-6 shadow-2xs lg:col-span-7 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3.5 border-b border-sand-line">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-9 place-items-center rounded-xl bg-terracotta/15 text-terracotta text-lg font-bold">
                      <i className="bx bx-user-check" />
                    </span>
                    <div>
                      <h3 className="font-display text-sm sm:text-base font-bold text-ink m-0">
                        Postulaciones Nuevas por Revisar
                      </h3>
                      <p className="text-[0.68rem] text-secondary m-0">
                        Egresados esperando tu primer filtro de selección
                      </p>
                    </div>
                  </div>

                  <Link
                    to="/empresa/reclutador/candidatos"
                    className="text-xs font-bold text-terracotta hover:underline no-underline"
                  >
                    Ver todas (14) →
                  </Link>
                </div>

                <div className="divide-y divide-sand-line/60 mt-2">
                  {filteredApplicants.map((app) => (
                    <div
                      key={app.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors hover:bg-cream/30 -mx-2 px-2 rounded-xl"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <img
                          src={app.avatar}
                          alt=""
                          className="size-10 rounded-xl object-cover border border-sand-line shadow-2xs shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-display text-xs font-bold text-ink leading-tight">
                              {app.candidateName}
                            </span>
                            <span className="rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.2 text-[0.62rem] font-bold">
                              {app.matchPercentage}% afinidad
                            </span>
                          </div>

                          <p className="m-0 mt-0.5 text-[0.72rem] text-secondary truncate">
                            {app.program} • <strong className="text-cocoa">{app.institution}</strong>
                          </p>

                          <p className="m-0 mt-0.5 text-[0.68rem] text-terracotta font-semibold truncate">
                            Vacante: {app.vacancyTitle} ({app.site})
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <span className="text-[0.65rem] text-secondary hidden sm:inline">
                          {app.appliedAt}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEvaluatedApplicant(app)}
                          className="rounded-xl border border-sand-line bg-white px-3 py-1.5 text-xs font-bold text-cocoa shadow-2xs transition-colors hover:bg-sand cursor-pointer"
                        >
                          Evaluar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-sand-line text-right">
                <Link
                  to="/empresa/reclutador/candidatos"
                  className="text-xs font-bold text-terracotta hover:underline no-underline"
                >
                  Ir al embudo de candidatos completo →
                </Link>
              </div>
            </div>

            {/* Columna Derecha (5 cols): Agenda de Próximas Entrevistas */}
            <div className="rounded-2xl border border-sand-line bg-white p-5 sm:p-6 shadow-2xs lg:col-span-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3.5 border-b border-sand-line">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-9 place-items-center rounded-xl bg-ochre/25 text-cocoa text-lg font-bold">
                      <i className="bx bx-calendar" />
                    </span>
                    <div>
                      <h3 className="font-display text-sm sm:text-base font-bold text-ink m-0">
                        Próximas Entrevistas
                      </h3>
                      <p className="text-[0.68rem] text-secondary m-0">
                        Agenda de citaciones técnicas y entrevistas
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full bg-sand px-2 py-0.5 text-[0.65rem] font-bold text-cocoa">
                    {upcomingInterviews.filter((i) => i.isToday).length} hoy
                  </span>
                </div>

                <div className="space-y-3 mt-3">
                  {upcomingInterviews.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-sand-line bg-cream/40 p-3 space-y-2 transition-all hover:border-terracotta/30 hover:bg-white"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            {item.isToday ? (
                              <span className="rounded-full bg-terracotta text-white px-2 py-0.2 text-[0.6rem] font-bold">
                                {item.time}
                              </span>
                            ) : (
                              <span className="rounded-full bg-sand text-cocoa px-2 py-0.2 text-[0.6rem] font-bold">
                                {item.time}
                              </span>
                            )}
                            <span className="text-[0.68rem] font-semibold text-secondary">
                              {item.type}
                            </span>
                          </div>
                          <p className="m-0 mt-1 font-display text-xs font-bold text-ink leading-tight">
                            {item.candidateName}
                          </p>
                          <p className="m-0 text-[0.68rem] text-secondary truncate">
                            {item.vacancyTitle}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-2 py-0.2 text-[0.6rem] font-bold shrink-0 ${
                            item.status === 'Confirmada'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-ochre/25 text-cocoa'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-sand-line/50 text-[0.68rem] text-secondary">
                        <span className="flex items-center gap-1 truncate max-w-[200px]">
                          <i className="bx bx-map-pin text-terracotta" />
                          <span>{item.channel}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setFeedbackToast(`Recordatorio enviado a ${item.candidateName}.`);
                            setTimeout(() => setFeedbackToast(null), 3000);
                          }}
                          className="font-bold text-terracotta hover:underline cursor-pointer"
                        >
                          Recordar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-sand-line flex items-center justify-between text-xs">
                <span className="text-secondary font-medium">Sincronizado con Outlook / Meet</span>
                <span className="font-bold text-cocoa">6 programadas</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ─── Modal de Evaluación Rápida del Candidato ─── */}
      {evaluatedApplicant && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/65 backdrop-blur-xs animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-3xl border border-sand-line bg-white shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-sand-line bg-cream/70 px-6 py-4">
              <div className="flex items-center gap-3">
                <img
                  src={evaluatedApplicant.avatar}
                  alt=""
                  className="size-11 rounded-xl object-cover border border-sand-line shadow-2xs"
                />
                <div>
                  <h3 className="m-0 font-display text-base font-bold text-ink">
                    {evaluatedApplicant.candidateName}
                  </h3>
                  <p className="m-0 text-xs text-secondary">
                    {evaluatedApplicant.program}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEvaluatedApplicant(null)}
                className="grid size-8 place-items-center rounded-xl text-secondary hover:bg-sand/60 hover:text-ink cursor-pointer"
              >
                <i className="bx bx-x text-2xl" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-2xl border border-sand-line bg-sand/20 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink">
                    Vacante postulada:
                  </span>
                  <span className="rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.2 text-[0.68rem] font-bold">
                    {evaluatedApplicant.matchPercentage}% Afinidad de Pensum
                  </span>
                </div>
                <p className="m-0 text-xs text-secondary font-medium">
                  {evaluatedApplicant.vacancyTitle} ({evaluatedApplicant.vacancyCode})
                </p>
                <p className="m-0 text-[0.68rem] text-secondary">
                  Institución: <strong className="text-ink">{evaluatedApplicant.institution}</strong>
                </p>
              </div>

              <div>
                <p className="m-0 mb-1.5 text-xs font-bold uppercase tracking-wider text-secondary">
                  Habilidades compatibles detectadas
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {evaluatedApplicant.skillsMatch.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-lg border border-sand-line bg-cream px-2.5 py-1 text-xs font-semibold text-cocoa"
                    >
                      ✓ {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-sand-line bg-cream/50 p-3 text-xs text-secondary">
                <p className="m-0 leading-relaxed">
                  El candidato cuenta con título verificado en plataforma por la dirección de graduados de la <strong>{evaluatedApplicant.institution}</strong>.
                </p>
              </div>

              {/* Botones de acción rápida */}
              <div className="pt-3 border-t border-sand-line flex flex-wrap items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => handleActionCandidate('Descartado con nota', evaluatedApplicant.candidateName)}
                  className="rounded-xl border border-sand-line px-3.5 py-2 text-xs font-semibold text-terracotta hover:bg-terracotta/10 cursor-pointer"
                >
                  Descartar
                </button>
                <button
                  type="button"
                  onClick={() => handleActionCandidate('Preseleccionado para filtro', evaluatedApplicant.candidateName)}
                  className="rounded-xl border border-sand-line bg-white px-3.5 py-2 text-xs font-bold text-cocoa hover:bg-sand cursor-pointer"
                >
                  Preseleccionar
                </button>
                <button
                  type="button"
                  onClick={() => handleActionCandidate('Citado a entrevista técnica', evaluatedApplicant.candidateName)}
                  className="rounded-xl bg-terracotta px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-terracotta-dark cursor-pointer"
                >
                  Citar a entrevista
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </CompanyPortalLayout>
  );
}

