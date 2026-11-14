import { Link } from 'react-router-dom';
import CompanyPortalLayout from '../components/company/CompanyPortalLayout.jsx';
import CompanyPageHero from '../components/company/CompanyPageHero.jsx';
import { companyPhotos } from '../data/companyImages.js';
import { authService } from '../services/authService.js';
import { useCompanyVacancies } from '../hooks/useCompanyVacancies.js';
import { useCompanyRecruiters } from '../hooks/useCompanyRecruiters.js';

export default function CompanyRecruiterDashboardPage() {
  const user = authService.getCurrentUser();
  const { recruiters, loading: recruitersLoading, error: recruitersError } = useCompanyRecruiters();
  const { vacancies, loading: vacanciesLoading, error: vacanciesError } = useCompanyVacancies();
  const recruiter = recruiters.find((item) => item.userId === user?.id);
  const assigned = recruiter ? vacancies.filter((vacancy) => vacancy.ownerRecruiterId === recruiter.id) : [];
  const active = assigned.filter((vacancy) => vacancy.status === 'open');
  const applicants = assigned.reduce((total, vacancy) => total + (Number(vacancy.applicantsCount) || 0), 0);
  const loading = recruitersLoading || vacanciesLoading;
  const error = recruitersError || vacanciesError;

  return (
    <CompanyPortalLayout activePage="recruiter-dashboard" role="recruiter">
      <main className="mx-auto w-full max-w-7xl space-y-6 px-5 pb-20 pt-8 sm:px-8">
        <CompanyPageHero
          photo={companyPhotos.reclutadores}
          title={`Hola, ${(recruiter?.fullName || user?.nombre || 'reclutador').split(' ')[0]}`}
          subtitle="Aquí se muestran las vacantes que tienes asignadas y las postulaciones registradas en Vincula."
          stats={[
            { value: loading || error ? '—' : String(assigned.length), label: 'Mis vacantes' },
            { value: loading || error ? '—' : String(active.length), label: 'Vacantes abiertas' },
            { value: loading || error ? '—' : String(applicants), label: 'Postulaciones recibidas' },
          ]}
        />
        {loading && <p className="rounded-xl border border-sand-line bg-white p-5 text-sm" role="status">Consultando tus vacantes…</p>}
        {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800" role="alert">No pudimos consultar los datos de tu cuenta: {error}</p>}
        {!loading && !error && !assigned.length && (
          <section className="rounded-2xl border border-sand-line bg-white p-8 text-center">
            <h2 className="font-display text-xl font-bold text-ink">Aún no tienes vacantes asignadas</h2>
            <p className="mt-2 text-sm text-secondary">Cuando una vacante de tu empresa se te asigne, aparecerá aquí. No hay candidatos que revisar todavía.</p>
            <Link to="/empresa/reclutador/vacantes" className="mt-4 inline-block rounded-xl bg-cocoa px-5 py-3 text-sm font-bold text-white no-underline">Ver mis vacantes</Link>
          </section>
        )}
        {!loading && !error && assigned.length > 0 && (
          <section className="rounded-2xl border border-sand-line bg-white p-6">
            <h2 className="font-display text-lg font-bold text-ink">Vacantes asignadas</h2>
            <ul className="mt-4 grid list-none gap-3 p-0">
              {assigned.map((vacancy) => (
                <li key={vacancy.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sand-line p-4">
                  <div><p className="m-0 font-semibold text-ink">{vacancy.title}</p><p className="m-0 mt-1 text-xs text-secondary">{vacancy.applicantsCount || 0} postulaciones · {vacancy.status === 'open' ? 'Abierta' : vacancy.status === 'draft' ? 'Borrador' : vacancy.status === 'paused' ? 'Pausada' : 'Cerrada'}</p></div>
                  <Link to={`/empresa/reclutador/candidatos?vacancy=${encodeURIComponent(vacancy.id)}`} className="text-sm font-bold text-cocoa">Ver postulaciones</Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </CompanyPortalLayout>
  );
}
