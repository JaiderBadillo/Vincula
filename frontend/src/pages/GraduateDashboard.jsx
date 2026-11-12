import { useMemo, useState } from 'react';
import DashboardStatCard from '../components/dashboard/DashboardStatCard.jsx';
import GraduatePortalLayout from '../components/dashboard/GraduatePortalLayout.jsx';
import GridVacancyDetailModal from '../components/dashboard/GridVacancyDetailModal.jsx';
import ResumeUploadCard from '../components/dashboard/ResumeUploadCard.jsx';
import SavedVacanciesSection from '../components/dashboard/SavedVacanciesSection.jsx';
import JobBoardPreview from '../components/landing/JobBoardPreview.jsx';
import { useSavedJobs } from '../hooks/useSavedJobs.js';
import { useProfile, computeProfileStrength } from '../hooks/useProfile.js';
import { authService } from '../services/authService.js';
import DocumentCorrections from '../components/documents/DocumentCorrections.jsx';

export default function GraduateDashboard() {
  const { savedJobs, savedCount, isSaved, toggleSave } = useSavedJobs();
  const { profile } = useProfile();
  const currentUser = authService.getCurrentUser();
  const rawName = profile?.fullName || currentUser?.nombre || '';
  const firstName = rawName.trim().split(' ')[0] || 'Egresado';
  const { score: profileScore } = useMemo(() => computeProfileStrength(profile), [profile]);

  const [detailJob, setDetailJob] = useState(null);
  const [appliedJobs, setAppliedJobs] = useState(new Set());
  const [toastMessage, setToastMessage] = useState(null);

  function notify(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }

  function handleApply(job) {
    setAppliedJobs((prev) => new Set(prev).add(job.id));
    notify(`¡Postulación enviada exitosamente a ${job.company} (${job.title})!`);
  }

  function handleScrollToSection(targetId) {
    const el = document.getElementById(targetId);
    if (!el) return;

    el.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Indicador visual sutil para destacar la sección a la que se navegó
    el.classList.add('ring-2', 'ring-lime', 'ring-offset-4', 'rounded-2xl');
    setTimeout(() => {
      el.classList.remove('ring-2', 'ring-lime', 'ring-offset-4', 'rounded-2xl');
    }, 1800);
  }

  const dynamicStats = useMemo(
    () => [
      {
        label: 'Perfil Completado',
        value: `${profileScore}%`,
        icon: 'bx-user-check',
        isProgress: true,
        progressValue: profileScore,
        accent: 'green',
        onClick: () => handleScrollToSection('subir-cv'),
        actionText: 'Bajar a CV y perfil',
      },
      {
        label: 'Vacantes Guardadas',
        value: String(savedCount),
        icon: 'bxs-bookmark-star',
        accent: 'amber',
        onClick: () => handleScrollToSection('vacantes-guardadas'),
        actionText: 'Bajar a guardadas',
      },
      {
        label: 'Vacantes con alto Match',
        value: '0',
        icon: 'bx-target-lock',
        accent: 'blue',
        onClick: () => handleScrollToSection('oportunidades'),
        actionText: 'Bajar a vacantes',
      },
    ],
    [profileScore, savedCount]
  );

  return (
    <GraduatePortalLayout activePage="home">
      <main className="w-full pb-12 lg:pb-16">
        <div className="mx-auto max-w-6xl px-5 pt-5"><DocumentCorrections kind="graduate" /></div>
        {/* ─── Hero Welcome Banner ─── */}
        <section
          className="relative isolate overflow-hidden bg-ink"
          aria-labelledby="dashboard-title"
        >
          {/* Background image with gradient fade */}
          <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
            <img
              className="size-full object-cover object-[center_30%] opacity-25"
              src="https://images.pexels.com/photos/1519088/pexels-photo-1519088.jpeg?auto=compress&cs=tinysrgb&w=1920&q=80"
              alt=""
              loading="eager"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/90 to-ink/60" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
          </div>

          {/* Decorative grid & orbits */}
          <div className="hero-grid pointer-events-none absolute inset-0 z-0" aria-hidden="true" />
          <div className="hero-orbit pointer-events-none absolute -right-20 -top-20 z-0 size-72 opacity-20" aria-hidden="true" />
          <div className="hero-orbit pointer-events-none absolute -right-10 -top-10 z-0 size-48 opacity-15" aria-hidden="true" />

          <div className="relative z-10 mx-auto max-w-6xl px-5 py-10 text-white sm:px-8 sm:py-14 lg:px-10 lg:py-16">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              {/* Left: Greeting */}
              <div className="max-w-2xl">
                <p className="mb-3 inline-flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.15em] text-lime">
                  <span className="size-2 rounded-full bg-lime" aria-hidden="true" />
                  Tu espacio profesional
                </p>
                <h1
                  className="font-display text-[clamp(1.8rem,4vw,2.8rem)] font-semibold leading-[1.12] tracking-[-0.045em]"
                  id="dashboard-title"
                >
                  ¡Hola{firstName && firstName !== 'Egresado' ? `, ${firstName}` : ''}!{' '}
                  <span className="text-lime">Tenemos algunas vacantes para ti</span>
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-6 text-white/65">
                  Aquí puedes ver un resumen de tu actividad, tus convocatorias guardadas, subir tu hoja de vida y explorar nuevas oportunidades con convenios institucionales.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Main Content ─── */}
        <div className="mx-auto max-w-6xl px-5 pt-8 sm:px-8 sm:pt-10 lg:px-10 lg:pt-12">
          <div className="grid gap-8 sm:gap-10">
            {/* Stat Cards Row */}
            <section data-tour="grad-perfil-kpi" aria-label="Resumen de tu perfil">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-[0.15em] text-blue-muted">Tu punto de partida</p>
                  <h2 className="font-display text-lg font-semibold tracking-tight text-ink">Resumen de actividad</h2>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
                {dynamicStats.map((stat) => (
                  <DashboardStatCard key={stat.label} {...stat} />
                ))}
              </div>
            </section>

            {/* Resume Upload */}
            <div data-tour="grad-subir-cv">
              <ResumeUploadCard />
            </div>

            {/* ─── Sección de Vacantes Guardadas (Favoritas) ─── */}
            <SavedVacanciesSection
              onOpenJob={(job) => setDetailJob(job)}
              onApplyJob={handleApply}
              appliedJobIds={appliedJobs}
            />

            {/* Job Board */}
            <JobBoardPreview variant="dashboard" />
          </div>

          <p className="mt-8 border-t border-line-soft pt-5 text-xs leading-5 text-body-muted">
            Plataforma de vinculación laboral · Red de talento universitario institucional
          </p>
        </div>
      </main>

      {/* ─── Modal de Detalle de Vacante (Reutilizable para Ficha Completa) ─── */}
      <GridVacancyDetailModal
        job={detailJob}
        isOpen={Boolean(detailJob)}
        onClose={() => setDetailJob(null)}
        onApply={(job) => {
          handleApply(job);
        }}
        isApplied={detailJob ? appliedJobs.has(detailJob.id) : false}
        isSaved={detailJob ? isSaved(detailJob.id) : false}
        onToggleSave={(id) => {
          toggleSave(id);
          notify(isSaved(id) ? 'Vacante eliminada de tus guardados.' : 'Vacante guardada en tus favoritos.');
        }}
        allJobs={savedJobs}
        onSelectJob={(newJob) => setDetailJob(newJob)}
      />

      {/* ─── Toast de Notificación Flotante ─── */}
      {toastMessage && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
          <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white shadow-hero animate-in fade-in slide-in-from-bottom-2">
            <i className="bx bxs-check-circle text-lime text-lg" />
            {toastMessage}
          </div>
        </div>
      )}
    </GraduatePortalLayout>
  );
}
