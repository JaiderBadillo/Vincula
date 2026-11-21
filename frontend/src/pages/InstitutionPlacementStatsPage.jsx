import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import InstitutionPortalLayout from '../components/institution/InstitutionPortalLayout.jsx';
import InstitutionPageHero from '../components/institution/InstitutionPageHero.jsx';
import { advisorPhotos } from '../data/institutionImages.js';
import { aiService } from '../services/aiService.js';
import { Bars, Card, Empty, Kpi, days, money, pct } from '../components/institution/ui.jsx';

export default function InstitutionPlacementStatsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let alive = true;
    aiService.getPlacementStats().then((d) => alive && setData(d)).catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, []);

  const programs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.programas || []).filter((p) => !q || `${p.nombre} ${p.facultad}`.toLowerCase().includes(q));
  }, [data, search]);

  const r = data?.resumen;

  return (
    <InstitutionPortalLayout activePage="estudiantes-estadisticas">
      <main className="w-full pb-20">
        <div className="mx-auto max-w-7xl space-y-8 px-4 pt-8 sm:px-6 lg:px-8">
          <InstitutionPageHero
            title="Estadísticas de colocación"
            subtitle="Contrataciones de egresados registradas en Vincula: tasa de colocación, tiempo del proceso, salario publicado y empresas que contratan."
            photo={advisorPhotos.placementStats}
            stats={r ? [
              { value: pct(r.tasa), label: 'Tasa de colocación' },
              { value: `${r.colocados}/${r.egresados}`, label: 'Colocados / egresados' },
            ] : []}
            actions={
              <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2 text-xs font-semibold text-ink shadow-xs hover:bg-page cursor-pointer">
                <i className="bx bx-printer text-base" /><span>Imprimir reporte</span>
              </button>
            }
          />

          {error && <p className="m-0 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700" role="alert">{error}</p>}
          {!data && !error && <Empty>Cargando estadísticas…</Empty>}

          {data && (
            <>
              <p className="m-0 rounded-xl border border-line bg-white px-4 py-3 text-xs text-secondary">
                <strong className="text-ink">Cómo se calcula:</strong> un egresado está <em>colocado</em> cuando una empresa lo marcó como contratado en Vincula.
                No incluye empleos conseguidos fuera de la plataforma. Los salarios son el punto medio del rango publicado en la vacante (se omiten los confidenciales).
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Kpi label="Tasa de colocación" value={pct(r.tasa)} hint={r.egresados ? `${r.colocados} de ${r.egresados} egresados registrados` : 'Aún no hay egresados registrados'} />
                <Kpi label="Tiempo hasta contratación" value={days(r.dias_mediana)} hint={r.dias_muestra ? `Mediana de ${r.dias_muestra} contratación(es), desde la postulación` : 'Sin contrataciones registradas'} />
                <Kpi label="Salario promedio" value={money(r.salario_promedio)} hint={r.salario_muestra ? `Sobre ${r.salario_muestra} vacante(s) con salario publicado` : 'Ninguna vacante contratada publicó salario'} />
                <Kpi label="Egresados colocados" value={r.colocados} hint={`${r.egresados - r.colocados} sin contratación registrada`} />
              </div>

              {data.facultades.length > 0 && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {data.facultades.map((f) => (
                    <div key={f.id} className="rounded-2xl border border-line bg-white p-5 shadow-2xs">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="m-0 font-display text-base font-bold text-ink">{f.nombre}</h3>
                          <p className="m-0 mt-0.5 text-xs text-secondary">{f.programas} programa(s) · {f.egresados} egresado(s)</p>
                        </div>
                        <span className="rounded-full border border-green/30 bg-green/15 px-3 py-1 text-xs font-bold text-green-dark">{pct(f.tasa)}</span>
                      </div>
                      <div className="mt-3 h-2.5 overflow-hidden rounded-full border border-line/60 bg-page">
                        <div className="h-full rounded-full bg-green-dark" style={{ width: `${f.tasa || 0}%` }} />
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
                        <div className="rounded-xl bg-page/60 p-2"><span className="block text-secondary">Salario promedio</span><strong className="text-ink">{money(f.salario_promedio)}</strong></div>
                        <div className="rounded-xl bg-page/60 p-2"><span className="block text-secondary">Tiempo (mediana)</span><strong className="text-ink">{days(f.dias_mediana)}</strong></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Card title="Colocación por programa académico" note="Ordenado por tasa de colocación.">
                <div className="flex items-center justify-between gap-3">
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar programa…" aria-label="Buscar programa"
                    className="w-full max-w-xs rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink focus:border-green focus:outline-none" />
                  <Link to="/institucion/estudiantes/seguimiento" className="text-xs font-bold text-green-dark no-underline hover:underline">Ver directorio individual</Link>
                </div>
                {programs.length === 0 ? <Empty>{data.programas.length ? 'Ningún programa coincide con la búsqueda.' : 'Aún no hay egresados registrados en tus programas.'}</Empty> : (
                  <div className="overflow-x-auto rounded-xl border border-line">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-line bg-page/70 text-[0.68rem] font-semibold uppercase tracking-wider text-secondary">
                        <tr><th className="px-4 py-3">Programa</th><th className="px-4 py-3 text-center">Colocados / egresados</th><th className="px-4 py-3">Tasa</th><th className="px-4 py-3">Salario prom.</th><th className="px-4 py-3 text-center">Tiempo</th></tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {programs.map((p) => (
                          <tr key={p.id} className="hover:bg-page/40">
                            <td className="px-4 py-3"><div className="font-semibold text-ink">{p.nombre}</div><div className="text-[0.7rem] text-secondary">{p.facultad} · {p.nivel}</div></td>
                            <td className="px-4 py-3 text-center"><strong className="text-ink">{p.colocados}</strong> <span className="text-secondary">/ {p.egresados}</span></td>
                            <td className="min-w-[130px] px-4 py-3">
                              <span className="font-bold text-ink">{pct(p.tasa)}</span>
                              <div className="mt-1 h-1.5 overflow-hidden rounded-full border border-line/60 bg-page"><div className="h-full rounded-full bg-green-dark" style={{ width: `${p.tasa || 0}%` }} /></div>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 font-semibold text-ink">{money(p.salario_promedio)}</td>
                            <td className="px-4 py-3 text-center text-ink">{days(p.dias_mediana)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card title="Tiempo del proceso de selección" note="Días entre la postulación y la contratación.">
                  <Bars rows={data.tiempos} empty="Aún no hay contrataciones registradas." />
                </Card>
                <Card title="Rango salarial publicado" note="Salario mensual de las vacantes en las que se contrató a un egresado.">
                  <Bars rows={data.salarios} empty="Ninguna vacante contratada publicó un salario mensual." />
                </Card>
                <Card title="Tipo de contrato">
                  <Bars rows={data.contratos} empty="Aún no hay contrataciones registradas." />
                </Card>
                <Card title="Modalidad de trabajo">
                  <Bars rows={data.modalidades} empty="Aún no hay contrataciones registradas." />
                </Card>
              </div>

              <Card title="Empresas que contratan egresados" note="Ordenadas por número de egresados contratados.">
                {data.empresas.length === 0 ? <Empty>Aún ninguna empresa ha contratado egresados.</Empty> : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {data.empresas.map((e) => (
                      <div key={e.id} className="rounded-2xl border border-line bg-page/30 p-4">
                        <h3 className="m-0 text-sm font-bold text-ink">{e.nombre}</h3>
                        <p className="m-0 text-[0.7rem] text-secondary">{e.sector}</p>
                        <p className="m-0 mt-3 text-xs text-secondary"><strong className="font-display text-lg text-ink">{e.contratados}</strong> egresado(s) contratado(s)</p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card title="Evolución por año de graduación" note="Qué proporción de cada cohorte ya fue contratada a través de Vincula.">
                {data.cohortes.length === 0 ? <Empty>Aún no hay egresados registrados.</Empty> : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {data.cohortes.map((c) => (
                      <div key={c.ano} className="space-y-2 rounded-xl border border-line bg-page/40 p-4">
                        <div className="flex items-center justify-between"><span className="font-display text-sm font-bold text-ink">{c.ano}</span><span className="rounded border border-green/20 bg-green/10 px-2 py-0.5 text-xs font-bold text-green-dark">{pct(c.tasa)}</span></div>
                        <div className="h-1.5 overflow-hidden rounded-full border border-line/60 bg-white"><div className="h-full rounded-full bg-green-dark" style={{ width: `${c.tasa || 0}%` }} /></div>
                        <p className="m-0 text-[0.72rem] text-secondary">{c.colocados} de {c.egresados} egresados · {money(c.salario_promedio)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </main>
    </InstitutionPortalLayout>
  );
}
