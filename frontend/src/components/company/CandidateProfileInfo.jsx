/** Perfil del candidato en Vincula, visto por el reclutador: datos reales comparados con lo que pide la vacante. */

const money = (n) => (n == null ? null : `$ ${(n / 1e6).toFixed(1).replace('.', ',')} M`);
const range = (min, max) => (min && max && min !== max ? `${money(min)} – ${money(max)}` : money(min || max));
const LEVELS = { 1: 'Básico', 2: 'Básico', 3: 'Intermedio', 4: 'Avanzado', 5: 'Experto' };
const level = (v) => (typeof v === 'number' ? LEVELS[v] : v) || null;
const pretty = (v) => (v === 'recien-egresado' ? 'Recién egresado' : v ? String(v).replace(/-/g, ' ').replace(/^./, (ch) => ch.toUpperCase()) : v);
const monthYear = (v) => (v ? new Date(`${String(v).slice(0, 7)}-01T12:00:00`).toLocaleDateString('es-CO', { month: 'short', year: 'numeric' }) : null);

function Section({ title, hint, children }) {
  return (
    <section className="space-y-2.5">
      <div>
        <h3 className="m-0 text-[0.7rem] font-bold uppercase tracking-wider text-secondary">{title}</h3>
        {hint && <p className="m-0 mt-0.5 text-xs text-secondary">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

const Muted = ({ children }) => <p className="m-0 text-sm text-secondary">{children}</p>;
const Chip = ({ children, tone = 'bg-sand/60 text-cocoa' }) => <span className={`rounded-lg px-2.5 py-1 text-xs font-medium ${tone}`}>{children}</span>;

/** Habilidades que pide la vacante: las que el candidato tiene registradas y las que no. */
export function RequiredSkills({ profile, fallback = [] }) {
  const required = profile?.requeridas || [];
  if (!profile) {
    return fallback.length ? <div className="flex flex-wrap gap-1.5">{fallback.map((s) => <Chip key={s}>{s}</Chip>)}</div> : <Muted>Cargando…</Muted>;
  }
  if (!required.length) return <Muted>La vacante no tiene habilidades registradas para comparar.</Muted>;
  const has = required.filter((r) => r.tiene).length;
  return (
    <div className="space-y-2.5">
      <p className="m-0 text-xs text-secondary"><strong className="text-ink">{has} de {required.length}</strong> están en el perfil del candidato</p>
      <div className="flex flex-wrap gap-1.5">
        {required.map((r) => (
          <Chip key={r.nombre} tone={r.tiene ? 'bg-emerald-50 text-emerald-900' : 'bg-stone-100 text-stone-500'}>
            {r.nombre}{!r.obligatoria && <span className="opacity-60"> · deseable</span>}
          </Chip>
        ))}
      </div>
      <p className="m-0 flex items-center gap-3 text-[0.68rem] text-secondary">
        <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-emerald-400" />En su perfil</span>
        <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-stone-300" />No registrada</span>
      </p>
    </div>
  );
}

function Row({ label, vacancy, candidate }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr_1fr] gap-3 py-2.5 text-sm">
      <span className="text-secondary">{label}</span>
      <span className="font-semibold text-ink">{vacancy || <span className="font-normal text-secondary">—</span>}</span>
      <span className="font-semibold text-ink">{candidate || <span className="font-normal text-secondary">No indica</span>}</span>
    </div>
  );
}

export default function CandidateProfileInfo({ state, candidate }) {
  const { data: p, loading, error } = state;
  if (error) return <p className="m-0 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700" role="alert">{error}</p>;
  if (loading || !p) return <Muted>Cargando el perfil del candidato…</Muted>;

  const s = p.salario;
  const d = p.disponibilidad;
  const c = p.condiciones_vacante;
  const offered = s.oferta_confidencial ? 'Confidencial' : range(s.oferta_min, s.oferta_max) || 'No publicado';
  const asked = !s.aspiracion_compartida ? 'No la comparte' : range(s.aspiracion_min, s.aspiracion_max);
  const others = p.habilidades.filter((h) => !p.requeridas.some((r) => r.nombre.toLowerCase() === h.nombre.toLowerCase()));
  const links = [['LinkedIn', p.enlaces.linkedin], ['GitHub', p.enlaces.github], ['Portafolio', p.enlaces.portafolio]].filter(([, url]) => url);
  const place = [p.ciudad, p.departamento].filter(Boolean).join(', ');

  return (
    <div className="space-y-7">
      <Section title="Perfil en Vincula">
        <div className="space-y-2">
          {p.titular && <p className="m-0 text-sm font-semibold text-ink">{p.titular}</p>}
          {p.biografia ? <p className="m-0 whitespace-pre-line text-sm leading-relaxed text-ink">{p.biografia}</p> : <Muted>No ha escrito una presentación.</Muted>}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {place && <Chip>{place}</Chip>}
            <Chip tone={d.disponible ? 'bg-emerald-50 text-emerald-900' : 'bg-stone-100 text-stone-500'}>{d.disponible ? `Disponible${d.tipo ? ` · ${d.tipo}` : ''}` : 'No marcó disponibilidad'}</Chip>
            {d.reubicarse && <Chip>Puede reubicarse</Chip>}
          </div>
        </div>
      </Section>

      <Section title="Condiciones" hint="Lo que ofrece la vacante frente a lo que busca el candidato.">
        <div className="divide-y divide-sand-line/70 rounded-2xl border border-sand-line px-4">
          <div className="grid grid-cols-[6.5rem_1fr_1fr] gap-3 py-2.5 text-[0.7rem] font-bold uppercase tracking-wider text-secondary"><span /><span>Vacante</span><span>Candidato</span></div>
          <Row label="Salario" vacancy={offered} candidate={asked} />
          <Row label="Modalidad" vacancy={c.modalidad} candidate={d.modalidades.join(', ')} />
          <Row label="Contrato" vacancy={c.contrato} candidate={d.contratos.join(', ')} />
          <Row label="Jornada" vacancy={c.jornada} candidate={null} />
          <Row label="Experiencia" vacancy={pretty(c.experiencia)} candidate={null} />
          <Row label="Ciudades" vacancy={null} candidate={d.ciudades.join(', ')} />
        </div>
        {s.encaje && (
          <p className={`m-0 rounded-xl px-3.5 py-2.5 text-xs font-semibold ${s.encaje === 'compatible' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
            {s.encaje === 'compatible' ? 'La aspiración salarial es compatible con la oferta.' : 'El candidato aspira a más de lo que ofrece la vacante.'}
          </p>
        )}
      </Section>

      <Section title="Habilidades" hint={`Lo que pide ${candidate.vacancyTitle ? `«${candidate.vacancyTitle}»` : 'la vacante'}`}>
        <RequiredSkills profile={p} />
        {others.length > 0 && (
          <div className="space-y-1.5 pt-2">
            <p className="m-0 text-xs font-bold text-ink">Otras habilidades del candidato</p>
            <div className="flex flex-wrap gap-1.5">{others.map((h) => <Chip key={h.nombre}>{h.nombre}{level(h.nivel) && <span className="opacity-60"> · {level(h.nivel)}</span>}</Chip>)}</div>
          </div>
        )}
      </Section>

      <Section title="Idiomas">
        {p.idiomas.length ? <div className="flex flex-wrap gap-1.5">{p.idiomas.map((i) => <Chip key={i.nombre}>{i.nombre}{i.nivel && <span className="opacity-60"> · {i.nivel}</span>}</Chip>)}</div> : <Muted>No registra idiomas.</Muted>}
      </Section>

      <Section title="Experiencia laboral">
        {p.experiencias.length === 0 ? <Muted>No registra experiencia laboral.</Muted> : (
          <ul className="m-0 list-none space-y-3 p-0">
            {p.experiencias.map((e, i) => (
              <li key={i} className="rounded-2xl border border-sand-line p-4">
                <p className="m-0 text-sm font-bold text-ink">{e.cargo}</p>
                <p className="m-0 text-xs text-secondary">{[e.empresa, [monthYear(e.inicio), e.actual ? 'Actualidad' : monthYear(e.fin)].filter(Boolean).join(' – ')].filter(Boolean).join(' · ')}</p>
                {e.descripcion && <p className="m-0 mt-2 whitespace-pre-line text-xs leading-relaxed text-ink">{e.descripcion}</p>}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {p.otra_formacion.length > 0 && (
        <Section title="Otra formación">
          <ul className="m-0 list-none space-y-2 p-0">
            {p.otra_formacion.map((f, i) => <li key={i} className="text-sm text-ink"><strong>{f.titulo}</strong><span className="text-secondary"> · {[f.institucion, f.anio].filter(Boolean).join(' · ')}</span></li>)}
          </ul>
        </Section>
      )}

      <Section title="Enlaces y hoja de vida">
        {links.length === 0 && p.hojas_de_vida.length === 0 ? <Muted>No agregó enlaces ni hoja de vida.</Muted> : (
          <div className="flex flex-wrap items-center gap-2">
            {links.map(([label, url]) => (
              <a key={label} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-sand-line px-3 py-2 text-xs font-bold text-ink no-underline hover:bg-cream">
                {label}<i className="bx bx-link-external text-secondary" aria-hidden="true" />
              </a>
            ))}
            {p.hojas_de_vida.length > 0 && <span className="text-xs text-secondary">{p.hojas_de_vida.length} hoja(s) de vida en su perfil</span>}
          </div>
        )}
      </Section>
    </div>
  );
}
