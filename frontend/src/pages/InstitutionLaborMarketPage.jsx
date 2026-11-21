import { Link } from 'react-router-dom';
import InstitutionPortalLayout from '../components/institution/InstitutionPortalLayout.jsx';
import InstitutionPageHero from '../components/institution/InstitutionPageHero.jsx';
import { Card, Empty, LoadState, coverageTone, useLoad } from '../components/institution/ui.jsx';
import { advisorPhotos } from '../data/institutionImages.js';
import { aiService } from '../services/aiService.js';
import { institutionService } from '../services/institutionService.js';

/** Cobertura de cada programa frente a las vacantes reales dirigidas a él (informe de pertinencia). */
async function loadPrograms() {
  const { items } = await institutionService.getProgramas({ limit: 100 });
  return Promise.all(items.filter((p) => p.estado === 'activo').map(async (p) => {
    try {
      return { program: p, report: await aiService.getProgramPertinence(p.id) };
    } catch {
      return { program: p, report: null }; // un programa con error no debe ocultar a los demás
    }
  }));
}

export default function InstitutionLaborMarketPage() {
  const { data, error, loading } = useLoad(loadPrograms);
  const rows = data || [];

  // Brechas que aparecen en varios programas, ordenadas por vacantes que las piden
  const gaps = [...rows.reduce((map, { program, report }) => {
    (report?.demanda || []).filter((d) => d.cobertura === 'brecha' && d.categoria === 'tecnica').forEach((d) => {
      const g = map.get(d.skill) || { skill: d.skill, vacantes: 0, programas: [] };
      g.vacantes += d.vacantes;
      g.programas.push(program.nombre);
      map.set(d.skill, g);
    });
    return map;
  }, new Map()).values()].sort((a, b) => b.vacantes - a.vacantes).slice(0, 8);

  const measured = rows.filter((r) => r.report?.indice_pertinencia != null);
  const withGap = measured.filter((r) => r.report.indice_pertinencia < 75).length;
  const openVacancies = Math.max(0, ...rows.map((r) => r.report?.total_vacantes_abiertas || 0));

  return (
    <InstitutionPortalLayout activePage="competencias">
      <main className="w-full pb-16">
        <div className="mx-auto max-w-7xl space-y-8 px-5 pt-8 sm:px-8 lg:px-10">
          <InstitutionPageHero
            title="Programas y demanda del mercado laboral"
            subtitle="Compara el plan de estudios de cada programa con las competencias que piden las vacantes abiertas en Vincula."
            photo={advisorPhotos.laborMarket}
            stats={[
              { value: rows.length, label: 'Programas activos' },
              { value: openVacancies, label: 'Vacantes abiertas' },
              { value: withGap, label: 'Programas con brecha' },
            ]}
            actions={<Link to="/institucion/estudiantes/estadisticas" className="inline-flex items-center gap-2 rounded-xl bg-lime px-4 py-2 text-xs font-bold text-ink no-underline shadow-xs hover:bg-lime/85"><i className="bx bx-bar-chart-alt-2 text-base" /><span>Ver estadísticas de colocación</span></Link>}
          />

          <LoadState loading={loading} error={error} data={data}>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_20rem]">
              <section data-tour="ies-mercado-laboral">
                <Card title="Alineación de programas académicos" note="Cobertura = competencias demandadas que aparecen en el plan de estudios.">
                  {rows.length === 0 ? <Empty>Aún no hay programas activos registrados.</Empty> : (
                    <ul className="m-0 list-none divide-y divide-line-soft p-0">
                      {rows.map(({ program, report }) => {
                        const v = report?.indice_pertinencia;
                        const tone = coverageTone(v);
                        const missing = (report?.demanda || []).filter((d) => d.cobertura === 'brecha' && d.categoria === 'tecnica').length;
                        return (
                          <li key={program.id}>
                            <Link to={`/institucion/programas/${program.id}`} className="-mx-2 flex flex-col gap-2 rounded-lg px-2 py-4 text-ink no-underline hover:bg-page/70 sm:flex-row sm:items-center sm:gap-5">
                              <span className="min-w-0 sm:w-56"><span className="block truncate text-sm font-semibold">{program.nombre}</span><span className="block text-xs text-secondary">{program.nombre_facultad}</span></span>
                              {v == null ? (
                                <span className="flex-1 text-sm text-secondary">{!report ? 'No se pudo calcular' : !report.pensum_registrado ? 'Sube el pensum para ver su cobertura' : 'Aún no hay vacantes dirigidas a este programa'}</span>
                              ) : (
                                <>
                                  <span className="flex flex-1 items-center gap-3">
                                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel"><span className={`block h-full rounded-full ${tone.bar}`} style={{ width: `${v}%` }} /></span>
                                    <span className={`w-12 text-right text-sm font-bold ${tone.text}`}>{v}%</span>
                                  </span>
                                  <span className="text-xs text-secondary sm:w-44">{missing === 0 ? 'Sin brechas' : `${missing} ${missing === 1 ? 'competencia sin cubrir' : 'competencias sin cubrir'}`}</span>
                                </>
                              )}
                              <i className="bx bx-chevron-right hidden text-xl text-secondary sm:block" />
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Card>
              </section>

              <aside>
                <Card title="Brechas prioritarias" note="Competencias pedidas por las vacantes que el plan de estudios no cubre.">
                  {gaps.length === 0 ? <Empty>No se detectaron brechas con los datos actuales.</Empty> : (
                    <ul className="m-0 list-none divide-y divide-line-soft p-0">
                      {gaps.map((g) => (
                        <li key={g.skill} className="flex items-center justify-between gap-3 py-3 text-sm">
                          <span className="min-w-0"><span className="block truncate font-medium text-ink">{g.skill}</span><span className="block truncate text-xs text-secondary">{g.programas.length === 1 ? g.programas[0] : `${g.programas.length} programas`}</span></span>
                          <span className="shrink-0 text-xs font-semibold text-ink">{g.vacantes} vacantes</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </aside>
            </div>
          </LoadState>
        </div>
      </main>
    </InstitutionPortalLayout>
  );
}
