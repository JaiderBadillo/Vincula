import { useMemo, useState } from 'react';
import InstitutionPortalLayout from '../components/institution/InstitutionPortalLayout.jsx';
import InstitutionPageHero from '../components/institution/InstitutionPageHero.jsx';
import { Bar, Empty, LoadState, SearchBox, pct, useLoad } from '../components/institution/ui.jsx';
import { advisorPhotos } from '../data/institutionImages.js';
import { institutionService } from '../services/institutionService.js';

const load = () => institutionService.getCompaniesTracking();
const CONVENIO = { activo: 'Convenio activo', en_tramite: 'Convenio en trámite', vencido: 'Convenio vencido', terminado: 'Convenio terminado' };

export default function InstitutionCompanyTrackingPage() {
  const { data, error, loading } = useLoad(load);
  const [query, setQuery] = useState('');
  const items = useMemo(() => data?.items || [], [data]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((c) => !q || `${c.nombre} ${c.sector} ${c.ciudad}`.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <InstitutionPortalLayout activePage="empresas-seguimiento">
      <main className="w-full pb-16">
        <div className="mx-auto max-w-7xl space-y-8 px-5 pt-8 sm:px-8 lg:px-10">
          <InstitutionPageHero
            eyebrow="Trazabilidad empresarial"
            title="Seguimiento a empresas"
            subtitle="Empresas con vacantes dirigidas a los programas de la institución y qué ha pasado con los egresados en esos procesos."
            photo={advisorPhotos.companyTracking}
            stats={[
              { value: items.length, label: 'Empresas' },
              { value: items.reduce((n, c) => n + c.vacantes_abiertas, 0), label: 'Vacantes abiertas' },
              { value: items.reduce((n, c) => n + c.contratados, 0), label: 'Contrataciones' },
            ]}
          />

          <LoadState loading={loading} error={error} data={data}>
            <SearchBox value={query} onChange={setQuery} placeholder="Buscar empresa, sector o ciudad…" />
            {items.length === 0 ? <Empty>Aún ninguna empresa ha publicado vacantes dirigidas a los programas de tu institución.</Empty> : shown.length === 0 ? <Empty>Ninguna empresa coincide con la búsqueda.</Empty> : (
              <div className="grid gap-5 lg:grid-cols-2">
                {shown.map((c) => (
                  <article key={c.id} className="space-y-4 rounded-2xl border border-line bg-white p-5 shadow-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="m-0 font-display text-base font-bold text-ink">{c.nombre}</h3>
                        <p className="m-0 mt-0.5 text-xs text-secondary">{c.sector} · {c.ciudad}</p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-0.5 text-[0.65rem] font-bold ${c.convenio === 'activo' ? 'border-green/30 bg-green/15 text-green-dark' : 'border-line bg-page text-secondary'}`}>
                        {c.convenio ? CONVENIO[c.convenio] : 'Sin convenio'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-xl bg-page/60 p-2"><span className="block text-secondary">Vacantes</span><strong className="text-ink">{c.vacantes_abiertas} abiertas / {c.vacantes}</strong></div>
                      <div className="rounded-xl bg-page/60 p-2"><span className="block text-secondary">Egresados postulados</span><strong className="text-ink">{c.egresados_postulados}</strong></div>
                      <div className="rounded-xl bg-page/60 p-2"><span className="block text-secondary">Contratados</span><strong className="text-ink">{c.contratados} · {pct(c.tasa_contratacion)}</strong></div>
                    </div>
                    <div className="space-y-1.5">
                      {c.embudo.map((f) => (
                        <div key={f.fase} className="flex items-center gap-3 text-xs">
                          <span className="w-28 shrink-0 text-secondary">{f.etiqueta}</span>
                          <div className="flex-1"><Bar value={c.embudo[0].postulaciones ? (100 * f.postulaciones) / c.embudo[0].postulaciones : 0} /></div>
                          <strong className="w-8 text-right text-ink">{f.postulaciones}</strong>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </LoadState>
        </div>
      </main>
    </InstitutionPortalLayout>
  );
}
