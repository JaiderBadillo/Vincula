import { useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import InstitutionPortalLayout from '../components/institution/InstitutionPortalLayout.jsx';
import { Empty, LoadState, coverageTone, pct, useLoad } from '../components/institution/ui.jsx';
import { aiService } from '../services/aiService.js';

function SkillList({ items, tone, empty }) {
  if (!items.length) return <p className="m-0 mt-3 text-sm text-secondary">{empty}</p>;
  return (
    <ul className="m-0 mt-3 list-none divide-y divide-line-soft border-t border-line p-0">
      {items.map((item) => (
        <li key={item.skill} className="flex items-center justify-between gap-3 py-3 text-sm">
          <span className="flex min-w-0 items-center gap-2.5"><span className={`size-1.5 shrink-0 rounded-full ${tone}`} /><span className="truncate font-medium text-ink">{item.skill}</span></span>
          <span className="shrink-0 text-xs text-secondary">{item.vacantes} vacantes</span>
        </li>
      ))}
    </ul>
  );
}

export default function InstitutionProgramDetailPage() {
  const { programId } = useParams();
  const load = useCallback(async () => {
    const [report, outcomes] = await Promise.all([aiService.getProgramPertinence(programId), aiService.getProgramOutcomes(programId)]);
    return { report, outcomes };
  }, [programId]);
  const { data, error, loading } = useLoad(load);
  const r = data?.report;
  const o = data?.outcomes;
  const tone = coverageTone(r?.indice_pertinencia);
  const gaps = (r?.demanda || []).filter((d) => d.cobertura === 'brecha' && d.categoria === 'tecnica');
  const covered = (r?.demanda || []).filter((d) => d.cobertura !== 'brecha' && d.categoria === 'tecnica');

  return (
    <InstitutionPortalLayout activePage="competencias">
      <main className="w-full pb-16">
        <div className="mx-auto max-w-5xl px-5 pt-8 sm:px-8 lg:px-10">
          <Link to="/institucion/mercado-laboral/competencias" className="inline-flex items-center gap-1.5 text-sm font-semibold text-secondary no-underline hover:text-ink">
            <i className="bx bx-arrow-back" /><span>Volver a Mercado Laboral</span>
          </Link>

          <LoadState loading={loading} error={error} data={data}>
            {r && (
              <>
                <h1 className="m-0 mt-3 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">{r.programa_nombre}</h1>
                <p className="m-0 mt-1 text-sm text-body-muted">
                  {o.egresados_registrados} egresados · {o.egresados_contratados} contratados a través de Vincula · {r.total_vacantes_abiertas} vacantes abiertas dirigidas al programa
                </p>

                {r.indice_pertinencia == null ? (
                  <section className="mt-10 border-y border-line py-12 text-center">
                    <h2 className="m-0 font-display text-lg font-bold text-ink">{r.pensum_registrado ? 'Aún no hay vacantes que medir' : 'Aún no hay pensum cargado'}</h2>
                    <p className="m-0 mx-auto mt-1 max-w-md text-sm text-body-muted">
                      {r.pensum_registrado ? 'Cuando las empresas publiquen vacantes dirigidas a este programa, aquí verás qué cubre su plan de estudios.'
                        : 'El administrador de la institución puede cargar el pensum desde Trazabilidad y Pensums para medir su cobertura.'}
                    </p>
                  </section>
                ) : (
                  <>
                    <section className="mt-7 border-y border-line py-6">
                      <p className="m-0 text-sm text-secondary">Cobertura de competencias</p>
                      <p className={`m-0 mt-1 font-display text-4xl font-bold ${tone.text}`}>{pct(r.indice_pertinencia)}</p>
                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-panel"><div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${r.indice_pertinencia}%` }} /></div>
                      <p className="m-0 mt-2 text-xs text-secondary">Calculado sobre {r.total_vacantes_analizadas} vacantes · confianza {r.confianza}{r.pensum_version ? ` · pensum ${r.pensum_version}` : ''}</p>
                    </section>
                    <div className="mt-9 grid grid-cols-1 gap-10 md:grid-cols-2">
                      <section>
                        <h2 className="m-0 font-display text-lg font-bold text-ink">Sin cubrir <span className="text-sm font-medium text-secondary">{gaps.length}</span></h2>
                        <p className="m-0 mt-1 text-xs text-secondary">Las empresas las piden y el plan de estudios no las enseña.</p>
                        <SkillList items={gaps} tone="bg-rose-500" empty="Sin brechas detectadas." />
                      </section>
                      <section>
                        <h2 className="m-0 font-display text-lg font-bold text-ink">Cubiertas <span className="text-sm font-medium text-secondary">{covered.length}</span></h2>
                        <p className="m-0 mt-1 text-xs text-secondary">Ya están en el pensum y tienen demanda.</p>
                        <SkillList items={covered} tone="bg-emerald-600" empty="Ninguna competencia demandada está cubierta todavía." />
                      </section>
                    </div>
                  </>
                )}

                <section className="mt-10 border-t border-line pt-6">
                  <h2 className="m-0 font-display text-lg font-bold text-ink">Resultados de los egresados</h2>
                  {o.total_postulaciones === 0 ? <div className="mt-3"><Empty>Los egresados de este programa aún no se han postulado a vacantes.</Empty></div> : (
                    <>
                      <p className="m-0 mt-1 text-sm text-secondary">{o.egresados_postulados} egresados se postularon ({o.total_postulaciones} postulaciones). {!o.muestra_suficiente && `Con menos de ${o.minimo_muestra} postulaciones no se calculan tasas ni promedios.`}</p>
                      <ul className="m-0 mt-3 list-none space-y-2 p-0">
                        {o.embudo.map((f) => <li key={f.fase} className="flex justify-between rounded-xl border border-line px-4 py-2 text-sm"><span className="text-secondary">{f.etiqueta}</span><strong className="text-ink">{f.postulaciones}</strong></li>)}
                      </ul>
                    </>
                  )}
                </section>
              </>
            )}
          </LoadState>
        </div>
      </main>
    </InstitutionPortalLayout>
  );
}
