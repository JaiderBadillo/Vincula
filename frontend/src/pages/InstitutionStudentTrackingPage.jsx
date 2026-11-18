import { Fragment, useMemo, useState } from 'react';
import InstitutionPortalLayout from '../components/institution/InstitutionPortalLayout.jsx';
import InstitutionPageHero from '../components/institution/InstitutionPageHero.jsx';
import { Empty, LoadState, SearchBox, pct, shortDate, useLoad } from '../components/institution/ui.jsx';
import { advisorPhotos } from '../data/institutionImages.js';
import { institutionService } from '../services/institutionService.js';

const load = () => institutionService.getGraduatesTracking();
const select = 'rounded-lg border border-line bg-page px-2.5 py-1.5 text-xs font-medium text-ink outline-none cursor-pointer';

export default function InstitutionStudentTrackingPage() {
  const { data, error, loading } = useLoad(load);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [program, setProgram] = useState('all');
  const [cohort, setCohort] = useState('all');
  const [open, setOpen] = useState(null);
  const items = useMemo(() => data?.items || [], [data]);

  const programs = useMemo(() => [...new Set(items.map((g) => g.programa))].sort((a, b) => a.localeCompare(b, 'es')), [items]);
  const cohorts = useMemo(() => [...new Set(items.map((g) => g.periodo))].sort().reverse(), [items]);
  const employed = items.filter((g) => g.estado === 'contratado').length;
  const applications = items.reduce((n, g) => n + g.postulaciones.length, 0);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((g) =>
      (status === 'all' || g.estado === status) && (program === 'all' || g.programa === program) && (cohort === 'all' || g.periodo === cohort)
      && (!q || `${g.nombre} ${g.programa} ${g.contratacion?.empresa || ''} ${g.contratacion?.vacante || ''}`.toLowerCase().includes(q)));
  }, [items, query, status, program, cohort]);

  return (
    <InstitutionPortalLayout activePage="estudiantes-seguimiento">
      <main className="w-full pb-16">
        <div className="mx-auto max-w-7xl space-y-8 px-5 pt-8 sm:px-8 lg:px-10">
          <InstitutionPageHero
            eyebrow="Trazabilidad y colocación laboral"
            title="Seguimiento laboral de egresados"
            subtitle="Estado de inserción, empresa contratante y avance en los procesos de selección de cada egresado, según los registros de Vincula."
            photo={advisorPhotos.studentTracking}
            stats={[
              { value: items.length ? pct(Math.round((1000 * employed) / items.length) / 10) : '—', label: 'Tasa de vinculación' },
              { value: employed, label: 'Contratados' },
              { value: items.length - employed, label: 'En búsqueda' },
              { value: applications, label: 'Postulaciones' },
            ]}
            actions={<button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-lime px-4 py-2 text-xs font-bold text-ink shadow-xs hover:bg-lime/85 cursor-pointer"><i className="bx bx-printer text-base" /><span>Imprimir</span></button>}
          />

          <LoadState loading={loading} error={error} data={data}>
            <div className="space-y-4 rounded-2xl border border-line bg-white p-5 shadow-xs">
              <SearchBox value={query} onChange={setQuery} placeholder="Buscar por nombre, programa, empresa o cargo…" />
              <div className="flex flex-wrap items-center gap-3 border-t border-line-soft pt-3">
                <select value={status} onChange={(e) => setStatus(e.target.value)} className={select} aria-label="Estado laboral">
                  <option value="all">Todos ({items.length})</option><option value="contratado">Contratados ({employed})</option><option value="en_busqueda">En búsqueda ({items.length - employed})</option>
                </select>
                <select value={program} onChange={(e) => setProgram(e.target.value)} className={select} aria-label="Programa">
                  <option value="all">Todos los programas</option>{programs.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <select value={cohort} onChange={(e) => setCohort(e.target.value)} className={select} aria-label="Corte de grado">
                  <option value="all">Todos los cortes</option>{cohorts.map((c) => <option key={c} value={c}>Grado {c}</option>)}
                </select>
                <span className="ml-auto text-xs text-secondary">Mostrando <strong>{shown.length}</strong> de {items.length}</span>
              </div>
            </div>

            {items.length === 0 ? <Empty>Aún no hay egresados registrados en tu institución.</Empty> : shown.length === 0 ? <Empty>Ningún egresado coincide con los filtros.</Empty> : (
              <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-xs">
                <table className="w-full border-collapse text-left text-xs">
                  <thead><tr className="border-b border-line bg-page/60 text-[0.68rem] font-bold uppercase tracking-wider text-secondary">
                    <th className="px-5 py-3.5">Egresado</th><th className="px-5 py-3.5">Programa y corte</th><th className="px-5 py-3.5">Estado</th><th className="px-5 py-3.5">Empresa / cargo</th><th className="px-5 py-3.5 text-center">Postulaciones</th>
                  </tr></thead>
                  <tbody className="divide-y divide-line-soft">
                    {shown.map((g) => (
                      <Fragment key={g.id}>
                        <tr className="cursor-pointer hover:bg-page/50" onClick={() => setOpen(open === g.id ? null : g.id)} aria-expanded={open === g.id}>
                          <td className="px-5 py-4"><span className="block font-display text-sm font-bold text-ink">{g.nombre}</span><span className="block text-[0.68rem] text-secondary">{g.correo}</span></td>
                          <td className="px-5 py-4"><span className="block font-semibold text-ink">{g.programa}</span><span className="block text-[0.68rem] text-secondary">Grado {g.periodo}{g.sede ? ` · ${g.sede}` : ''}</span></td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.68rem] font-bold ${g.estado === 'contratado' ? 'border-emerald-300 bg-emerald-100 text-emerald-900' : 'border-amber-300 bg-amber-100 text-amber-900'}`}>
                              {g.estado === 'contratado' ? 'Contratado' : 'En búsqueda'}
                            </span>
                          </td>
                          <td className="px-5 py-4">{g.contratacion ? <><span className="block font-bold text-ink">{g.contratacion.empresa}</span><span className="block text-[0.68rem] text-secondary">{g.contratacion.vacante}</span></> : <span className="italic text-secondary">Sin contratación registrada</span>}</td>
                          <td className="px-5 py-4 text-center font-bold text-ink">{g.postulaciones.length}</td>
                        </tr>
                        {open === g.id && (
                          <tr><td colSpan={5} className="bg-page/40 px-5 py-4">
                            {g.postulaciones.length === 0 ? <p className="m-0 text-xs text-secondary">Este egresado aún no se ha postulado a ninguna vacante.</p> : (
                              <ul className="m-0 list-none space-y-2 p-0">
                                {g.postulaciones.map((p, i) => (
                                  <li key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-white px-4 py-2.5">
                                    <span><strong className="text-ink">{p.vacante}</strong> <span className="text-secondary">· {p.empresa}</span></span>
                                    <span className="flex items-center gap-3 text-secondary">
                                      {p.afinidad != null && <span>Afinidad {p.afinidad}%</span>}
                                      <span>{shortDate(p.postulado_en)}</span>
                                      <span className="rounded-full bg-panel px-2.5 py-0.5 font-bold text-ink">{p.etiqueta}</span>
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td></tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </LoadState>
        </div>
      </main>
    </InstitutionPortalLayout>
  );
}
