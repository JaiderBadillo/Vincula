import { useState } from 'react';
import { Link } from 'react-router-dom';
import InstitutionPortalLayout from '../components/institution/InstitutionPortalLayout.jsx';
import InstitutionPageHero from '../components/institution/InstitutionPageHero.jsx';
import { advisorPhotos } from '../data/institutionImages.js';
import { authService } from '../services/authService.js';
import {
  advisorProfile,
  institutionMetrics,
  pendingStudentRequests,
  pendingCompanyRequests,
  placementByFaculty,
  quickActionModules,
} from '../data/institutionData.js';

export default function InstitutionDashboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('2026-2');
  const currentUser = authService.getCurrentUser();
  const advisorName = currentUser?.nombre || advisorProfile.fullName || 'Coordinación IES';

  return (
    <InstitutionPortalLayout activePage="dashboard">
      <main className="w-full pb-20">
        <div className="mx-auto max-w-7xl px-5 pt-8 sm:px-8 lg:px-10 space-y-8">
          
          {/* ─── Hero Showcase Institucional (Estilo Sonnet con Identidad UTS) ─── */}
          <InstitutionPageHero
            eyebrow="Observatorio de Empleabilidad & Gestión IES"
            title={`¡Bienvenido(a), ${advisorName}!`}
            subtitle="Supervisa la inserción laboral de los egresados de la institución, valida solicitudes académicas en cola y gestiona los convenios empresariales activos."
            photo={advisorPhotos.dashboard}
            stats={[
              {
                value: institutionMetrics.registeredStudents.total.toLocaleString('es-CO'),
                label: 'Egresados',
              },
              {
                value: institutionMetrics.employedStudents.ratePercentage,
                label: 'Vinculación',
              },
              {
                value: institutionMetrics.availableVacancies.total,
                label: 'Vacantes',
              },
              {
                value: '19',
                label: 'En Cola',
              },
            ]}
            actions={
              <Link
                to="/institucion/estudiantes/solicitudes"
                data-tour="ies-atender-solicitudes"
                className="inline-flex items-center gap-2 rounded-xl bg-lime hover:bg-lime/85 text-ink font-bold px-4 py-2.5 text-xs shadow-xs transition-all no-underline cursor-pointer"
              >
                <i className="bx bx-check-shield text-base" />
                <span>Atender Solicitudes (19)</span>
              </Link>
            }
          />

          {/* ─── Barra de Control de Periodo Académico & Estado en Vivo ─── */}
          <div data-tour="ies-kpis" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-line bg-white p-4 shadow-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-secondary">
                Periodo de corte institucional:
              </span>
              <div className="flex items-center gap-1.5 rounded-xl border border-line bg-page p-1 shadow-2xs">
                {[
                  { id: '2026-2', label: '2026 - II (Actual)' },
                  { id: '2026-1', label: '2026 - I' },
                  { id: '2025-2', label: '2025 - II' },
                  { id: 'historico', label: 'Histórico' },
                ].map((period) => (
                  <button
                    key={period.id}
                    type="button"
                    onClick={() => setSelectedPeriod(period.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                      selectedPeriod === period.id
                        ? 'bg-lime text-ink shadow-xs font-bold'
                        : 'text-secondary hover:text-ink hover:bg-white'
                    }`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-secondary font-medium">
              <span className="inline-flex items-center gap-1.5">
                <i className="bx bx-time-five text-green text-sm" />
                <span>Actualizado hoy, 08:00 AM</span>
              </span>
              <span>·</span>
              <span className="text-green-dark font-semibold">100% sincronizado</span>
            </div>
          </div>

          {/* ─── 1. Barra Superior de Resumen General (Top KPIs) ─── */}
          {/* NOTA: Excluye empresas registradas/activas por requerimiento expreso del usuario */}
          <section aria-labelledby="kpis-section-title">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-secondary">
                  Indicadores de Impacto IES
                </p>
                <h2 id="kpis-section-title" className="font-display text-lg sm:text-xl font-bold text-ink m-0">
                  Resumen de Estudiantes y Empleabilidad
                </h2>
              </div>
              <span className="text-xs text-secondary font-medium hidden sm:inline">
                Corte actualizado: Hoy, 08:00 AM
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* KPI 1: Estudiantes Registrados */}
              <div className="rounded-2xl border border-line bg-white p-5 shadow-xs transition-all hover:shadow-card hover:border-green/30">
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-xl bg-lime/20 text-green-dark text-xl font-bold">
                    <i className="bx bx-group" />
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[0.68rem] font-bold text-emerald-800">
                    <i className="bx bx-trending-up" />
                    {institutionMetrics.registeredStudents.growthPercentage}
                  </span>
                </div>
                <div className="mt-4">
                  <p className="m-0 text-xs font-semibold text-secondary uppercase tracking-wider">
                    {institutionMetrics.registeredStudents.label}
                  </p>
                  <p className="font-display text-2xl sm:text-3xl font-extrabold text-ink m-0 mt-1">
                    {institutionMetrics.registeredStudents.total.toLocaleString('es-CO')}
                  </p>
                  <p className="m-0 text-xs text-body-muted mt-1.5 flex items-center gap-1">
                    <i className="bx bx-plus-circle text-green" />
                    <strong>+{institutionMetrics.registeredStudents.newThisMonth}</strong> nuevos este mes
                  </p>
                </div>
              </div>

              {/* KPI 2: Vacantes Disponibles */}
              <div className="rounded-2xl border border-line bg-white p-5 shadow-xs transition-all hover:shadow-card hover:border-lime/60">
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-xl bg-lime/25 text-green-dark text-xl font-bold">
                    <i className="bx bx-briefcase" />
                  </span>
                  <span className="rounded-full bg-panel px-2.5 py-0.5 text-[0.65rem] font-bold text-ink">
                    {institutionMetrics.availableVacancies.activeExclusivelyForUTS} exclusivas institucionales
                  </span>
                </div>
                <div className="mt-4">
                  <p className="m-0 text-xs font-semibold text-secondary uppercase tracking-wider">
                    {institutionMetrics.availableVacancies.label}
                  </p>
                  <p className="font-display text-2xl sm:text-3xl font-extrabold text-ink m-0 mt-1">
                    {institutionMetrics.availableVacancies.total}
                  </p>
                  <p className="m-0 text-xs text-body-muted mt-1.5 flex items-center gap-1">
                    <i className="bx bx-bolt-circle text-amber-500" />
                    <strong>+{institutionMetrics.availableVacancies.newThisWeek}</strong> publicadas esta semana
                  </p>
                </div>
              </div>

              {/* KPI 3: Estudiantes con Empleo / Contratados */}
              <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/60 via-white to-white p-5 shadow-xs transition-all hover:shadow-card hover:border-emerald-400">
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-xl bg-emerald-600 text-white text-xl font-bold shadow-xs">
                    <i className="bx bx-user-check" />
                  </span>
                  <span className="rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-0.5 text-xs font-extrabold">
                    {institutionMetrics.employedStudents.ratePercentage}
                  </span>
                </div>
                <div className="mt-4">
                  <p className="m-0 text-xs font-semibold text-emerald-900 uppercase tracking-wider">
                    {institutionMetrics.employedStudents.label}
                  </p>
                  <p className="font-display text-2xl sm:text-3xl font-extrabold text-ink m-0 mt-1">
                    {institutionMetrics.employedStudents.total.toLocaleString('es-CO')}
                  </p>
                  <p className="m-0 text-xs text-body-muted mt-1.5">
                    <strong>+{institutionMetrics.employedStudents.recentHiresMonth}</strong> contrataciones en el último mes
                  </p>
                </div>
              </div>

              {/* KPI 4: Estudiantes sin Empleo / En Búsqueda Activa */}
              <div className="rounded-2xl border border-line bg-white p-5 shadow-xs transition-all hover:shadow-card hover:border-slate-300">
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-xl bg-panel text-ink text-xl font-bold shadow-xs">
                    <i className="bx bx-search-alt" />
                  </span>
                  <span className="rounded-full bg-panel text-ink border border-line px-2 py-0.5 text-xs font-extrabold">
                    {institutionMetrics.unemployedStudents.ratePercentage}
                  </span>
                </div>
                <div className="mt-4">
                  <p className="m-0 text-xs font-semibold text-secondary uppercase tracking-wider">
                    {institutionMetrics.unemployedStudents.label}
                  </p>
                  <p className="font-display text-2xl sm:text-3xl font-extrabold text-ink m-0 mt-1">
                    {institutionMetrics.unemployedStudents.total.toLocaleString('es-CO')}
                  </p>
                  <p className="m-0 text-xs text-body-muted mt-1.5">
                    <strong>{institutionMetrics.unemployedStudents.activelyApplying}</strong> postulando activamente
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ─── 2. Botones de Acceso Rápido para los Demás Módulos ─── */}
          <section aria-labelledby="modules-section-title">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-secondary">
                  Navegación Operativa
                </p>
                <h2 id="modules-section-title" className="font-display text-lg sm:text-xl font-bold text-ink m-0">
                  Acceso Rápido a Módulos del Asesor
                </h2>
              </div>
              <p className="text-xs text-body-muted m-0">
                Gestiona solicitudes de validación, expedientes e inteligencia de mercado
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {quickActionModules.map((module) => (
                <Link
                  key={module.id}
                  to={module.to}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-line bg-white p-5 text-left no-underline shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-green/40 hover:shadow-card"
                >
                  {/* Subtle top corner gradient */}
                  <div className={`absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl ${module.accentColor} rounded-bl-full pointer-events-none opacity-70 group-hover:opacity-100 transition-opacity`} />

                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3.5">
                      <span className={`grid size-12 place-items-center rounded-xl text-2xl font-bold shadow-2xs transition-transform group-hover:scale-105 ${module.iconColor}`}>
                        <i className={`bx ${module.icon}`} />
                      </span>
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.68rem] font-bold ${module.badgeColor}`}>
                        {module.badge}
                      </span>
                    </div>

                    <h3 className="font-display text-base font-bold text-ink m-0 group-hover:text-green-dark transition-colors flex items-center gap-1.5">
                      <span>{module.title}</span>
                      <i className="bx bx-right-arrow-alt text-base opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-green" />
                    </h3>

                    <p className="mt-1.5 text-xs text-body-muted leading-relaxed m-0 line-clamp-2">
                      {module.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-line-soft flex items-center justify-between text-xs font-semibold text-green-dark">
                    <span>Abrir módulo</span>
                    <i className="bx bx-chevron-right text-base text-secondary group-hover:text-green group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* ─── 3. Bandejas de Atención Inmediata en Paralelo (Egresados & Convenios) ─── */}
          <div className="grid gap-6 lg:grid-cols-2">

            {/* Columna Izquierda: Cola Prioritaria de Solicitudes de Egresados */}
            <div className="rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-line-soft">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-8 place-items-center rounded-lg bg-amber-100 text-amber-800 text-lg">
                      <i className="bx bx-user-check" />
                    </span>
                    <div>
                      <h3 className="font-display text-sm sm:text-base font-bold text-ink m-0">
                        Validación de Egresados
                      </h3>
                      <p className="text-[0.68rem] text-secondary m-0">
                        Cuentas nuevas y actualización de títulos por revisar
                      </p>
                    </div>
                  </div>

                  <Link
                    to="/institucion/estudiantes/solicitudes"
                    className="text-xs font-bold text-green-dark hover:underline no-underline"
                  >
                    Ver todas (14) →
                  </Link>
                </div>

                <div className="divide-y divide-line-soft mt-3">
                  {pendingStudentRequests.map((req) => (
                    <div key={req.id} className="py-3 flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={req.avatar}
                          alt={req.studentName}
                          className="size-10 rounded-full object-cover shrink-0 border border-line"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-ink truncate m-0">
                            {req.studentName}
                          </p>
                          <p className="text-[0.68rem] text-secondary truncate m-0">
                            {req.program} · Grad: {req.graduationYear}
                          </p>
                          <span className="inline-block mt-0.5 text-[0.62rem] font-semibold text-amber-800 bg-amber-50 px-2 py-0.2 rounded border border-amber-200">
                            {req.requestType}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <span className="text-[0.65rem] text-secondary block">{req.requestedAt}</span>
                        <Link
                          to="/institucion/estudiantes/solicitudes"
                          className="mt-1 inline-flex items-center gap-1 rounded-lg border border-line bg-page px-2 py-1 text-[0.68rem] font-bold text-ink hover:bg-green hover:text-white hover:border-green transition-colors no-underline"
                        >
                          <span>Revisar</span>
                          <i className="bx bx-chevron-right text-xs" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-line-soft bg-page/50 -mx-5 -mb-5 sm:-mx-6 sm:-mb-6 p-4 rounded-b-2xl flex items-center justify-between text-xs">
                <span className="text-secondary">
                  💡 Recuerda que rechazar una solicitud requiere completar el <strong>Modal de Observaciones</strong>.
                </span>
                <Link
                  to="/institucion/estudiantes/solicitudes"
                  className="font-bold text-ink hover:text-green shrink-0 ml-2 no-underline"
                >
                  Ir al módulo
                </Link>
              </div>
            </div>

            {/* Columna Derecha: Cola de Convenios Empresariales */}
            <div className="rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-line-soft">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-8 place-items-center rounded-lg bg-lime/25 text-green-dark text-lg">
                      <i className="bx bx-buildings" />
                    </span>
                    <div>
                      <h3 className="font-display text-sm sm:text-base font-bold text-ink m-0">
                        Convenios Empresariales en Cola
                      </h3>
                      <p className="text-[0.68rem] text-secondary m-0">
                        Empresas radicando documentación legal y NIT
                      </p>
                    </div>
                  </div>

                  <Link
                    to="/institucion/empresas/solicitudes"
                    className="text-xs font-bold text-green-dark hover:underline no-underline"
                  >
                    Ver todas (5) →
                  </Link>
                </div>

                <div className="divide-y divide-line-soft mt-3">
                  {pendingCompanyRequests.map((emp) => (
                    <div key={emp.id} className="py-3 flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`grid size-10 place-items-center rounded-xl font-display font-bold text-xs shrink-0 ${emp.logoBg}`}>
                          {emp.logoInitials}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-ink truncate m-0">
                            {emp.companyName}
                          </p>
                          <p className="text-[0.68rem] text-secondary truncate m-0">
                            NIT: {emp.nit} · {emp.sector}
                          </p>
                          <p className="text-[0.65rem] text-body-muted truncate m-0 mt-0.5">
                            {emp.contactPerson}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <span className="rounded-full bg-lime/25 text-ink border border-lime/60 px-2 py-0.5 text-[0.62rem] font-bold block mb-1">
                          ~{emp.vacanciesProjected} vacantes
                        </span>
                        <Link
                          to="/institucion/empresas/solicitudes"
                          className="inline-flex items-center gap-1 rounded-lg border border-line bg-page px-2 py-1 text-[0.68rem] font-bold text-ink hover:bg-lime hover:border-lime/60 transition-colors no-underline"
                        >
                          <span>Validar</span>
                          <i className="bx bx-chevron-right text-xs" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-line-soft bg-page/50 -mx-5 -mb-5 sm:-mx-6 sm:-mb-6 p-4 rounded-b-2xl flex items-center justify-between text-xs">
                <span className="text-secondary">
                  📄 Validación exclusiva: Solo las aprobadas por la IES podrán publicar ofertas.
                </span>
                <Link
                  to="/institucion/empresas/solicitudes"
                  className="font-bold text-ink hover:text-green shrink-0 ml-2 no-underline"
                >
                  Ir al módulo
                </Link>
              </div>
            </div>

          </div>

          {/* ─── 4. Tasa de Empleabilidad por Facultad (Resumen Ejecutivo) ─── */}
          <section className="rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-xs" aria-labelledby="faculty-placement-title">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-line-soft">
              <div>
                <h3 id="faculty-placement-title" className="font-display text-base font-bold text-ink m-0">
                  Distribución de Empleabilidad por Facultades
                </h3>
                <p className="text-xs text-body-muted m-0 mt-0.5">
                  Proporción de egresados formalmente ubicados en el sector productivo
                </p>
              </div>

              <Link
                to="/institucion/estudiantes/estadisticas"
                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-page px-3 py-1.5 text-xs font-bold text-ink hover:border-green hover:text-green-dark no-underline transition-colors shrink-0"
              >
                <i className="bx bx-line-chart text-sm" />
                <span>Ver Reporte Estadístico Completo</span>
              </Link>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {placementByFaculty.map((item) => (
                <div key={item.faculty} className="rounded-xl border border-line-soft bg-page/60 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="grid size-8 place-items-center rounded-lg bg-green/10 text-green-dark text-lg shrink-0">
                        <i className={`bx ${item.icon}`} />
                      </span>
                      <strong className="text-xs sm:text-sm font-bold text-ink truncate">
                        {item.faculty}
                      </strong>
                    </div>
                    <span className="font-display text-base font-bold text-green-dark shrink-0">
                      {item.percentage}%
                    </span>
                  </div>

                  {/* Barra de progreso */}
                  <div>
                    <div className="h-2.5 w-full rounded-full bg-line overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-green to-lime transition-all duration-500"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <div className="mt-1.5 flex justify-between text-[0.68rem] text-secondary">
                      <span>{item.employed.toLocaleString('es-CO')} contratados de {item.totalStudents.toLocaleString('es-CO')}</span>
                      <span className="font-semibold text-ink">{item.topProgram}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>
      </main>
    </InstitutionPortalLayout>
  );
}
