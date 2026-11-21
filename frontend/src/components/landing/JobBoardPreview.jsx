import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { normalizeText } from '../../data/jobs.js';
import { vacancyService } from '../../services/vacancyService.js';
import { authService } from '../../services/authService.js';
import { formatPublicPublishedDate, mapPublicVacancy } from '../../utils/publicVacancies.js';
import { primaryButton, sectionEyebrow, sectionTitle } from '../../utils/classes.js';
import JobDetailDialog from '../JobDetailDialog.jsx';

const sectors = [
  { id: 'all', label: 'Todas' },
  { id: 'public', label: 'Sector público' },
  { id: 'private', label: 'Sector privado' },
];

function CompanyBadge({ job, sizeClass = 'size-10 text-[0.65rem]' }) {
  if (job.companyLogo && typeof job.companyLogo === 'string') {
    return (
      <span
        className={`grid shrink-0 place-items-center overflow-hidden rounded-control border border-line bg-white p-1 ${sizeClass}`}
        aria-hidden="true"
      >
        <img src={job.companyLogo} alt="" className="size-full object-contain" />
      </span>
    );
  }
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-control border border-line font-display font-bold tracking-wide ${sizeClass} ${job.companyLogoBg}`}
      aria-hidden="true"
    >
      {job.companyInitials}
    </span>
  );
}

function FeaturedVacancyCard({ job, onOpen }) {
  return (
    <article className="relative isolate flex min-h-[340px] flex-col overflow-hidden rounded-card bg-ink p-6 text-white sm:p-8 lg:min-h-[390px]">
      <div className="featured-rings pointer-events-none absolute inset-0" aria-hidden="true"><span /><span /></div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-lime">
          <span className="size-2 rounded-full bg-lime" aria-hidden="true" />
          Vacante activa
        </span>
        {job.vacancyCode && (
          <span className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 font-mono text-[0.65rem] font-bold uppercase tracking-wide text-white/80">
            {job.vacancyCode}
          </span>
        )}
      </div>
      <div className="mt-8 max-w-xl">
        <span className="inline-flex rounded-md bg-white/10 px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wide text-white/85">
          {job.sectorLabel} · {job.location}
        </span>
        <h3 className="mt-4 font-display text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-4xl">
          {job.title}
        </h3>
        <p className="mt-2 text-sm text-white/70">{job.company}</p>
        <p className="mt-4 line-clamp-3 max-w-lg text-sm leading-6 text-white/75">{job.description}</p>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <span className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/85">{job.category}</span>
        <span className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/85">{job.mode}</span>
        {job.experienceLabel && job.experienceLabel !== 'Sin definir' && (
          <span className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/85">{job.experienceLabel}</span>
        )}
      </div>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
        <button className={`${primaryButton} px-5 py-3`} type="button" onClick={() => onOpen(job)}>
          Ver oportunidad <i className="bx bx-right-arrow-alt text-xl" aria-hidden="true" />
        </button>
        <span className="inline-flex items-center gap-2 text-xs text-white/65">
          <i className="bx bx-bulb text-lg text-lime" aria-hidden="true" />
          {job.salaryFormatted}
        </span>
      </div>
    </article>
  );
}

function SecondaryVacancyCard({ job, onOpen }) {
  return (
    <article className="flex min-h-[13.5rem] flex-col rounded-card border border-line bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 text-xs font-semibold text-blue-muted">
        <span className="truncate">{job.category} · {job.location}</span>
        <i className={`bx ${job.sector === 'public' ? 'bx-buildings' : 'bx-briefcase-alt-2'} text-xl shrink-0`} aria-hidden="true" />
      </div>
      <h3 className="mt-3 font-display text-lg font-semibold leading-snug tracking-tight text-ink">{job.title}</h3>
      <p className="mt-1.5 text-sm leading-6 text-body-muted">{job.company}</p>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-4 text-xs text-secondary">
        <span>{job.mode}{job.experienceLabel && job.experienceLabel !== 'Sin definir' ? ` · ${job.experienceLabel}` : ''}</span>
        <button
          className="inline-flex items-center gap-1 py-1 font-display text-sm font-semibold text-green hover:text-green-dark"
          type="button"
          aria-label={`Ver detalle: ${job.title}`}
          onClick={() => onOpen(job)}
        >
          Ver detalle <i className="bx bx-right-arrow-alt text-lg" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

function VacancyDetailContent({ job }) {
  const isAuthenticated = authService.isAuthenticated();
  const applyTarget = isAuthenticated ? '/dashboard/vacantes' : '/login';

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <CompanyBadge job={job} sizeClass="size-14 text-sm" />
        <span className="rounded-full border border-green/25 bg-green/10 px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-wide text-green-dark">
          Convocatoria activa
        </span>
      </div>
      <p className="mb-2 mt-6 text-sm font-semibold text-blue-muted">
        {job.sectorLabel} · {job.category}
      </p>
      <h2 className="font-display text-2xl font-semibold leading-tight tracking-[-0.035em] text-ink">
        {job.title}
      </h2>
      <p className="mt-2 text-sm font-medium text-body-muted">{job.companyName}</p>

      <dl className="mt-5 grid gap-3 border-y border-line-soft py-4 text-sm sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold text-blue-muted">Código de vacante</dt>
          <dd className="mt-1 font-mono text-body-muted">{job.vacancyCode || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-blue-muted">Fecha de publicación</dt>
          <dd className="mt-1 text-body-muted">{formatPublicPublishedDate(job.publishedAt)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-blue-muted">Experiencia</dt>
          <dd className="mt-1 text-body-muted">{job.experienceLabel}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-blue-muted">Ubicación y modalidad</dt>
          <dd className="mt-1 text-body-muted">{job.location} · {job.mode}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-blue-muted">Compensación</dt>
          <dd className="mt-1 text-body-muted">{job.salaryFormatted}</dd>
        </div>
        {job.contractType && (
          <div>
            <dt className="text-xs font-semibold text-blue-muted">Contrato</dt>
            <dd className="mt-1 text-body-muted">{job.contractType}</dd>
          </div>
        )}
      </dl>

      <div className="mt-5">
        <h3 className="font-display text-sm font-semibold text-ink">Sobre esta oportunidad</h3>
        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-body-muted">{job.description}</p>
      </div>

      {job.skills.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {job.skills.slice(0, 6).map((skill) => (
            <span key={skill} className="rounded-lg border border-line-soft bg-page px-2.5 py-1 text-xs font-medium text-ink">
              {skill}
            </span>
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-4">
        <Link to={applyTarget} className={`${primaryButton} no-underline`}>
          {isAuthenticated ? 'Ir a postularme' : 'Ingresar para postularme'}
          <i className="bx bx-right-arrow-alt text-lg" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

function VacancyDetailPanel({ job }) {
  if (!job) {
    return (
      <div className="rounded-card border border-dashed border-line bg-white px-6 py-10 text-center text-sm leading-6 text-body-muted">
        Selecciona una vacante de la lista para consultar su información.
      </div>
    );
  }

  return (
    <aside className="h-fit rounded-card border border-line bg-white p-5 shadow-card sm:p-6" aria-label={`Detalles de ${job.title}`} aria-live="polite">
      <VacancyDetailContent job={job} />
    </aside>
  );
}

function VacancyListItem({ job, selected, onSelect }) {
  return (
    <li className={`border-b border-line-soft last:border-b-0 ${selected ? 'bg-panel/70' : 'bg-white'}`}>
      <button
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-page focus-visible:relative focus-visible:z-10 sm:gap-4 sm:px-5"
        type="button"
        aria-pressed={selected}
        aria-label={`Ver detalles de ${job.title}, ${job.companyName}, ${job.location}`}
        onClick={onSelect}
      >
        <CompanyBadge job={job} sizeClass="size-10 text-[0.65rem] sm:size-11" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-sm font-semibold leading-5 text-ink sm:text-[0.95rem]">
            {job.title}
          </span>
          <span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 text-xs leading-5 text-body-muted sm:text-sm">
            <span className="max-w-[14rem] truncate">{job.companyName}</span>
            <span className="text-secondary" aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <i className="bx bx-map" aria-hidden="true" />
              {job.location}
            </span>
          </span>
        </span>
        <span className="hidden shrink-0 text-xs text-secondary md:inline">
          {formatPublicPublishedDate(job.publishedAt)}
        </span>
        <span className="hidden shrink-0 rounded-full border border-line px-2.5 py-1 text-[0.62rem] font-semibold text-blue-muted sm:inline-flex">
          {job.mode}
        </span>
        <i className={`bx bx-chevron-right shrink-0 text-lg ${selected ? 'text-green' : 'text-secondary'}`} aria-hidden="true" />
      </button>
      {selected && (
        <div className="border-t border-line-soft p-4 sm:p-5 lg:hidden">
          <VacancyDetailContent job={job} />
        </div>
      )}
    </li>
  );
}

function ExploreVacancies({ visibleJobs, selectedVacancyId, onSelect, onClear }) {
  const selectedJob = visibleJobs.find((job) => job.id === selectedVacancyId) ?? visibleJobs[0] ?? null;

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(19rem,.92fr)] xl:gap-6">
      <section aria-label={`${visibleJobs.length} vacantes encontradas`} className="overflow-hidden rounded-card border border-line bg-white shadow-card">
        <div className="flex items-center justify-between gap-3 border-b border-line-soft px-4 py-3 sm:px-5">
          <p className="m-0 text-sm font-semibold text-ink">Vacantes encontradas</p>
          <span className="rounded-full bg-panel px-2.5 py-1 text-xs font-bold text-blue-muted">
            {visibleJobs.length}
          </span>
        </div>
        {visibleJobs.length ? (
          <ul className="m-0 list-none p-0">
            {visibleJobs.map((job) => (
              <VacancyListItem
                key={job.id}
                job={job}
                selected={selectedJob?.id === job.id}
                onSelect={() => onSelect(job.id)}
              />
            ))}
          </ul>
        ) : (
          <div className="px-5 py-10 text-center text-sm leading-6 text-body-muted" role="status" aria-live="polite">
            <p>No encontramos vacantes activas con esos filtros. Prueba con otra palabra o limpia la búsqueda.</p>
            <button
              className="mt-3 rounded-control border border-line px-4 py-2 text-sm font-semibold text-blue-muted hover:bg-panel"
              type="button"
              onClick={onClear}
            >
              Limpiar búsqueda
            </button>
          </div>
        )}
      </section>
      <div className="hidden lg:sticky lg:top-24 lg:block">
        <VacancyDetailPanel job={selectedJob} />
      </div>
    </div>
  );
}

export default function JobBoardPreview({ variant = 'home' }) {
  const dashboard = variant === 'dashboard';
  const explore = variant === 'explore';
  const [vacancies, setVacancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [sector, setSector] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedVacancyId, setSelectedVacancyId] = useState(null);
  const [showFullList, setShowFullList] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError('');
    vacancyService
      .getPublicVacancies({ limit: 30 })
      .then((res) => {
        if (!active) return;
        const mapped = (res?.items || []).map(mapPublicVacancy);
        setVacancies(mapped);
        if (mapped[0]?.id) setSelectedVacancyId(mapped[0].id);
      })
      .catch((err) => {
        if (active) setLoadError(err?.message || 'No se pudieron consultar las vacantes disponibles.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const visibleJobs = useMemo(() => {
    const normalizedKeyword = normalizeText(keyword);
    const normalizedLocation = normalizeText(location);
    return vacancies.filter((job) => {
      const sectorMatches = sector === 'all' || job.sector === sector;
      const searchIndex = normalizeText(
        `${job.title} ${job.company} ${job.category} ${job.location} ${job.mode} ${job.description} ${job.skills.join(' ')} ${job.targetPrograms.join(' ')}`
      );
      const locationIndex = normalizeText(`${job.location} ${job.city} ${job.mode} ${job.company}`);
      const keywordMatches = !normalizedKeyword || searchIndex.includes(normalizedKeyword);
      const locationMatches = !normalizedLocation || locationIndex.includes(normalizedLocation);
      return sectorMatches && keywordMatches && locationMatches;
    });
  }, [vacancies, keyword, location, sector]);

  const featuredJob = visibleJobs[0] ?? null;
  const secondaryJobs = visibleJobs.slice(1, 3);
  const isAuthenticated = authService.isAuthenticated();

  function submitSearch(event) {
    event.preventDefault();
  }

  function clearSearch() {
    setKeyword('');
    setLocation('');
    setSector('all');
    document.querySelector('#job-keyword')?.focus();
  }

  return (
    <section
      className={
        dashboard || explore
          ? 'bg-page py-6 scroll-mt-24 transition-all duration-300'
          : 'bg-page px-5 py-16 sm:px-6 lg:px-10 lg:py-20 scroll-mt-24 transition-all duration-300'
      }
      id="oportunidades"
      aria-labelledby={explore ? 'vacancies-page-title' : 'opportunities-title'}
    >
      <div className={explore ? 'w-full' : 'mx-auto max-w-7xl'}>
        {/* Section header + filters */}
        <div className={`mb-8 flex flex-col gap-6 lg:mb-10 ${explore ? 'xl:flex-row xl:items-end xl:justify-between' : 'lg:flex-row lg:items-end lg:justify-between'}`}>
          <div className="max-w-2xl">
            {!explore && <p className={sectionEyebrow}>{dashboard ? 'Buscar empleo' : 'Oportunidades para avanzar'}</p>}
            {!explore && (
              <h2 className={sectionTitle} id="opportunities-title">
                {dashboard ? 'Vacantes abiertas para explorar' : 'Encuentra un próximo paso que conecte contigo.'}
              </h2>
            )}
            {!explore && (
              <p className="mt-4 max-w-xl text-base leading-7 text-body-muted">
                {dashboard
                  ? 'Encuentra oportunidades del sector público y privado, y busca el siguiente paso para tu trayectoria.'
                  : 'Explora opciones del sector público y privado publicadas por empresas verificadas en la plataforma.'}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar vacantes por sector">
            {sectors.map((option) => (
              <button
                className={`rounded-full border px-4 py-2.5 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime ${
                  sector === option.id
                    ? 'border-ink bg-ink text-white'
                    : 'border-line bg-white text-blue-muted hover:border-ink'
                }`}
                type="button"
                key={option.id}
                aria-pressed={sector === option.id}
                onClick={() => setSector(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search bar */}
        <form
          className={`mb-7 grid gap-2 rounded-card border border-line bg-white p-2 shadow-card ${
            explore ? 'sm:grid-cols-2 xl:grid-cols-[1.2fr_.8fr_auto] xl:items-center' : 'sm:grid-cols-[1.2fr_.8fr_auto] sm:items-center'
          }`}
          role="search"
          aria-label="Buscar oportunidades laborales"
          onSubmit={submitSearch}
        >
          <label className="flex min-w-0 items-center gap-3 px-3 py-2 text-blue-muted" htmlFor="job-keyword">
            <i className="bx bx-search text-xl" aria-hidden="true" />
            <span className="sr-only">Cargo, área o palabra clave</span>
            <input
              className="w-full min-w-0 border-0 bg-transparent py-1 text-sm text-ink outline-none placeholder:text-secondary focus-visible:ring-0"
              id="job-keyword"
              type="search"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Cargo, área o palabra clave"
            />
          </label>
          <label className="flex min-w-0 items-center gap-3 border-t border-line-soft px-3 py-2 text-blue-muted sm:border-l sm:border-t-0 sm:pl-5" htmlFor="job-location">
            <i className="bx bx-map text-xl" aria-hidden="true" />
            <span className="sr-only">Ciudad o modalidad</span>
            <input
              className="w-full min-w-0 border-0 bg-transparent py-1 text-sm text-ink outline-none placeholder:text-secondary focus-visible:ring-0"
              id="job-location"
              type="search"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Ciudad o modalidad"
            />
          </label>
          <button className={`${primaryButton} whitespace-nowrap ${explore ? 'w-full sm:col-span-2 xl:col-span-1' : ''}`} type="submit">
            Buscar oportunidades <i className="bx bx-right-arrow-alt text-xl" aria-hidden="true" />
          </button>
        </form>

        {/* Results */}
        {loading ? (
          <div className="rounded-card border border-line bg-white px-5 py-10 text-center text-sm text-body-muted" role="status">
            <i className="bx bx-loader-alt bx-spin mr-2 text-lg text-green" aria-hidden="true" />
            Consultando vacantes activas...
          </div>
        ) : loadError ? (
          <div className="rounded-card border border-rose-200 bg-rose-50 px-5 py-6 text-center text-sm text-rose-800" role="alert">
            {loadError}
          </div>
        ) : explore || showFullList ? (
          <>
            <ExploreVacancies
              visibleJobs={visibleJobs}
              selectedVacancyId={selectedVacancyId}
              onSelect={setSelectedVacancyId}
              onClear={clearSearch}
            />
            {showFullList && !explore && (
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowFullList(false)}
                  className="rounded-control border border-line bg-white px-4 py-2 text-xs font-bold text-ink hover:bg-panel"
                >
                  Volver a vista destacada
                </button>
              </div>
            )}
          </>
        ) : visibleJobs.length ? (
          <div className="space-y-4">
            <div className={`grid gap-4 ${secondaryJobs.length > 0 ? 'lg:grid-cols-[1.12fr_.88fr]' : 'lg:grid-cols-1'}`}>
              {featuredJob && <FeaturedVacancyCard job={featuredJob} onOpen={setSelectedJob} />}
              {secondaryJobs.length > 0 && (
                <div className="grid gap-4">
                  {secondaryJobs.map((job) => (
                    <SecondaryVacancyCard key={job.id} job={job} onOpen={setSelectedJob} />
                  ))}
                </div>
              )}
            </div>

            {visibleJobs.length > 3 && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-white px-5 py-3.5 shadow-2xs">
                <p className="m-0 text-sm text-body-muted">
                  Mostrando 3 de <strong className="text-ink">{visibleJobs.length}</strong> vacantes activas disponibles.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowFullList(true)}
                    className="rounded-control border border-line bg-page px-4 py-2 text-xs font-bold text-ink hover:bg-panel"
                  >
                    Ver lista completa ({visibleJobs.length})
                  </button>
                  <Link
                    to={isAuthenticated ? '/dashboard/vacantes' : '/login'}
                    className={`${primaryButton} py-2 text-xs no-underline`}
                  >
                    {isAuthenticated ? 'Explorar catálogo completo' : 'Ingresar para postularme'}
                  </Link>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-card border border-dashed border-line bg-white px-5 py-10 text-center text-body-muted" role="status" aria-live="polite">
            <i className="bx bx-search-alt mb-2 text-3xl text-blue-muted" aria-hidden="true" />
            <p className="mb-4">
              {vacancies.length === 0
                ? 'Aún no hay vacantes públicas activas en este momento.'
                : 'No encontramos coincidencias con los filtros seleccionados.'}
            </p>
            {(keyword || location || sector !== 'all') && (
              <button className="rounded-control border border-line px-4 py-2 text-sm font-semibold text-blue-muted hover:bg-panel" type="button" onClick={clearSearch}>
                Limpiar búsqueda
              </button>
            )}
          </div>
        )}
      </div>

      {/* Job detail dialog */}
      <JobDetailDialog job={selectedJob} onClose={() => setSelectedJob(null)} />
    </section>
  );
}
