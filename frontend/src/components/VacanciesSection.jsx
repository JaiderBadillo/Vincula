import { useMemo, useState } from 'react';
import { jobs, normalizeText } from '../data/jobs.js';
import { primaryButton, sectionEyebrow, sectionTitle } from '../utils/classes.js';

const sectors = [
  { id: 'all', label: 'Todas' },
  { id: 'public', label: 'Sector público' },
  { id: 'private', label: 'Sector privado' },
];

function FeaturedVacancyCard({ job, onOpen }) {
  return (
    <article className="relative isolate flex min-h-[340px] flex-col overflow-hidden rounded-card bg-ink p-6 text-white sm:p-8 lg:min-h-[390px]">
      <div className="featured-rings pointer-events-none absolute inset-0" aria-hidden="true"><span /><span /></div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-lime"><span className="size-2 rounded-full bg-lime" aria-hidden="true" />Oportunidad destacada</span>
        <span className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-wide text-white/75">Ejemplo ilustrativo</span>
      </div>
      <div className="mt-9 max-w-xl">
        <span className="inline-flex rounded-md bg-white/10 px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wide text-white/85">{job.sectorLabel}</span>
        <h3 className="mt-4 font-display text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-4xl">{job.title}</h3>
        <p className="mt-2 text-sm text-white/65">{job.company}</p>
        <p className="mt-5 max-w-lg text-sm leading-6 text-white/75">{job.description}</p>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <span className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/80">{job.category}</span>
        <span className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/80">{job.mode}</span>
      </div>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
        <button className={`${primaryButton} px-5 py-3`} type="button" onClick={() => onOpen(job)}>Ver oportunidad <i className="bx bx-right-arrow-alt text-xl" aria-hidden="true" /></button>
        <span className="inline-flex items-center gap-2 text-xs text-white/60"><i className="bx bx-bulb text-lg text-lime" aria-hidden="true" />Explora según tu perfil e intereses</span>
      </div>
    </article>
  );
}

function SecondaryVacancyCard({ job, icon, onOpen }) {
  return (
    <article className="flex min-h-[13.5rem] flex-col rounded-card border border-line bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-blue-muted">
        <span>{job.id === 'gestion-proyectos' ? 'Oportunidad pública' : `${job.category} · ${job.location}`}</span>
        <i className={`bx ${icon} text-xl`} aria-hidden="true" />
      </div>
      <span className="mt-2 w-fit rounded-md border border-line-soft bg-panel px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-wide text-blue-muted">Ejemplo ilustrativo</span>
      <h3 className="mt-3 font-display text-lg font-semibold leading-snug tracking-tight text-ink">{job.title}</h3>
      <p className="mt-2 text-sm leading-6 text-body-muted">{job.company}</p>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-4 text-xs text-secondary">
        <span>{job.category} · {job.mode.replace('Modalidad ', '')}</span>
        <button className="inline-flex items-center gap-1 py-1 font-display text-sm font-semibold text-green hover:text-green-dark" type="button" aria-label={`Ver detalle: ${job.title}`} onClick={() => onOpen(job)}>Ver detalle <i className="bx bx-right-arrow-alt text-lg" aria-hidden="true" /></button>
      </div>
    </article>
  );
}

function AlertPreferences() {
  const [expanded, setExpanded] = useState(false);
  const [email, setEmail] = useState('');
  const [area, setArea] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [feedback, setFeedback] = useState('');

  const validEmail = /^\S+@\S+\.\S+$/.test(email.trim());

  function submitAlert(event) {
    event.preventDefault();
    setAttempted(true);
    setFeedback('');
    if (!validEmail || !area) return;
    setFeedback('Preferencias configuradas en esta demostración. No se enviaron ni almacenaron datos.');
  }

  return (
    <>
      <aside className="mt-5 flex flex-col gap-4 rounded-card border border-line bg-panel p-5 sm:flex-row sm:items-center sm:justify-between sm:px-7" aria-labelledby="alerts-title">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-2xl text-blue-muted" aria-hidden="true"><i className="bx bx-bell" /></span>
          <div><h3 className="font-display text-lg font-semibold text-ink" id="alerts-title">Que las oportunidades te encuentren.</h3><p className="mt-1 text-sm leading-6 text-[#48616b]">Configura alertas por área, ubicación y modalidad de trabajo.</p></div>
        </div>
        <button className={`${primaryButton} shrink-0`} type="button" aria-expanded={expanded} aria-controls="alerts-panel" onClick={() => setExpanded((open) => !open)}>
          {expanded ? 'Ocultar opciones' : 'Configurar alertas'} <i className={`bx ${expanded ? 'bx-chevron-up' : 'bx-right-arrow-alt'} text-xl`} aria-hidden="true" />
        </button>
      </aside>
      {expanded && (
        <form className="mt-3 rounded-card border border-line bg-white p-5 shadow-card sm:p-6" id="alerts-panel" noValidate onSubmit={submitAlert}>
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <div>
              <label className="mb-2 block text-sm font-bold text-ink" htmlFor="alert-email">Correo electrónico</label>
              <input className="min-h-11 w-full rounded-control border border-line px-4 py-3 text-sm outline-none placeholder:text-secondary focus:border-green focus:ring-4 focus:ring-green/10" type="email" id="alert-email" autoComplete="email" placeholder="tu@correo.com" value={email} aria-invalid={attempted && !validEmail} aria-describedby={attempted && !validEmail ? 'alert-email-error' : undefined} onChange={(event) => setEmail(event.target.value)} />
              {attempted && !validEmail && <p className="mt-1 text-xs font-bold text-red-700" id="alert-email-error">Escribe un correo válido.</p>}
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold text-ink" htmlFor="alert-area">Área profesional</label>
              <select className="min-h-11 w-full rounded-control border border-line bg-white px-4 py-3 text-sm outline-none focus:border-green focus:ring-4 focus:ring-green/10" id="alert-area" value={area} aria-invalid={attempted && !area} aria-describedby={attempted && !area ? 'alert-area-error' : undefined} onChange={(event) => setArea(event.target.value)}>
                <option value="">Selecciona un área</option><option>Administración y gestión</option><option>Datos y tecnología</option><option>Ingeniería</option><option>Otra área</option>
              </select>
              {attempted && !area && <p className="mt-1 text-xs font-bold text-red-700" id="alert-area-error">Selecciona un área.</p>}
            </div>
            <button className={`${primaryButton} w-full md:w-auto`} type="submit">Activar alerta</button>
          </div>
          {feedback && <p className="mt-4 rounded-control border border-green/20 bg-green/10 p-3 text-sm text-ink" role="status" aria-live="polite">{feedback}</p>}
          <p className="mb-0 mt-3 text-xs text-body-muted">Demostración visual: no se envían ni almacenan datos.</p>
        </form>
      )}
    </>
  );
}

export default function VacanciesSection({ onOpenJob }) {
  const [sector, setSector] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');

  const visibleJobs = useMemo(() => {
    const normalizedKeyword = normalizeText(keyword);
    const normalizedLocation = normalizeText(location);
    return jobs.filter((job) => {
      const sectorMatches = sector === 'all' || job.sector === sector;
      const searchIndex = normalizeText(`${job.searchText} ${job.title} ${job.company} ${job.category} ${job.location} ${job.mode}`);
      const locationIndex = normalizeText(`${job.location} ${job.mode} ${job.company}`);
      const keywordMatches = !normalizedKeyword || searchIndex.includes(normalizedKeyword);
      const locationMatches = !normalizedLocation || locationIndex.includes(normalizedLocation);
      return sectorMatches && keywordMatches && locationMatches;
    });
  }, [keyword, location, sector]);

  const featuredJob = visibleJobs.find((job) => job.featured);
  const secondaryJobs = visibleJobs.filter((job) => !job.featured);

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
    <section className="bg-page px-5 py-16 sm:px-6 lg:px-10 lg:py-20" id="oportunidades" aria-labelledby="opportunities-title">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-6 lg:mb-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className={sectionEyebrow}>Oportunidades para avanzar</p>
            <h2 className={sectionTitle} id="opportunities-title">Encuentra un próximo paso que conecte contigo.</h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-body-muted">Explora opciones del sector público y privado, y compara cada oportunidad con lo que buscas.</p>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar vacantes por sector">
            {sectors.map((option) => (
              <button
                className={`rounded-full border px-4 py-2.5 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime ${sector === option.id ? 'border-ink bg-ink text-white' : 'border-line bg-white text-blue-muted hover:border-ink'}`}
                type="button"
                key={option.id}
                aria-pressed={sector === option.id}
                onClick={() => setSector(option.id)}
              >{option.label}</button>
            ))}
          </div>
        </div>

        <form className="mb-7 grid gap-2 rounded-card border border-line bg-white p-2 shadow-card sm:grid-cols-[1.2fr_.8fr_auto] sm:items-center" role="search" aria-label="Buscar oportunidades laborales" onSubmit={submitSearch}>
          <label className="flex min-w-0 items-center gap-3 px-3 py-2 text-blue-muted" htmlFor="job-keyword">
            <i className="bx bx-search text-xl" aria-hidden="true" /><span className="sr-only">Cargo, área o palabra clave</span>
            <input className="w-full min-w-0 border-0 bg-transparent py-1 text-sm text-ink outline-none placeholder:text-secondary focus-visible:ring-0" id="job-keyword" type="search" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Cargo, área o palabra clave" />
          </label>
          <label className="flex min-w-0 items-center gap-3 border-t border-line-soft px-3 py-2 text-blue-muted sm:border-l sm:border-t-0 sm:pl-5" htmlFor="job-location">
            <i className="bx bx-map text-xl" aria-hidden="true" /><span className="sr-only">Ciudad o modalidad</span>
            <input className="w-full min-w-0 border-0 bg-transparent py-1 text-sm text-ink outline-none placeholder:text-secondary focus-visible:ring-0" id="job-location" type="search" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Ciudad o modalidad" />
          </label>
          <button className={`${primaryButton} whitespace-nowrap`} type="submit">Buscar oportunidades <i className="bx bx-right-arrow-alt text-xl" aria-hidden="true" /></button>
        </form>

        {visibleJobs.length ? (
          <div className="grid gap-4 lg:grid-cols-[1.12fr_.88fr]">
            {featuredJob && <FeaturedVacancyCard job={featuredJob} onOpen={onOpenJob} />}
            <div className="grid gap-4">
              {secondaryJobs.map((job) => <SecondaryVacancyCard key={job.id} job={job} icon={job.id === 'gestion-proyectos' ? 'bx-buildings' : 'bx-cog'} onOpen={onOpenJob} />)}
            </div>
          </div>
        ) : (
          <div className="rounded-card border border-dashed border-line bg-white px-5 py-10 text-center text-body-muted" role="status" aria-live="polite">
            <i className="bx bx-search-alt mb-2 text-3xl text-blue-muted" aria-hidden="true" />
            <p className="mb-4">No encontramos coincidencias en estos ejemplos.</p>
            <button className="rounded-control border border-line px-4 py-2 text-sm font-semibold text-blue-muted hover:bg-panel" type="button" onClick={clearSearch}>Limpiar búsqueda</button>
          </div>
        )}
        <AlertPreferences />
      </div>
    </section>
  );
}
