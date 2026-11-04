import { Link } from 'react-router-dom';
import InstitutionPortalLayout from '../components/institution/InstitutionPortalLayout.jsx';
import InstitutionPageHero from '../components/institution/InstitutionPageHero.jsx';
import { advisorProfile } from '../data/institutionData.js';
import { advisorPhotos } from '../data/institutionImages.js';
import {
  coverageTone,
  getPriorityGaps,
  institutionTeam,
  overview,
  programTraceability,
} from '../data/institutionTraceability.js';

function Initials({ name }) {
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-panel text-xs font-bold text-ink">
      {name
        .split(' ')
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase()}
    </span>
  );
}

export default function InstitutionLaborMarketPage() {
  const gaps = getPriorityGaps(5);
  const programsWithGap = programTraceability.filter((p) => p.coverage != null && p.coverage < 75).length;
  const firstName = advisorProfile.fullName.replace('Dra. ', '').split(' ')[0];

  return (
    <InstitutionPortalLayout activePage="competencias">
      <main className="w-full pb-16">
        <div className="mx-auto max-w-7xl px-5 pt-8 sm:px-8 lg:px-10 space-y-8">
          
          {/* ─── Hero Fotográfico Institucional & Indicadores del Mercado ─── */}
          <InstitutionPageHero
            eyebrow="Observatorio de Tendencias & Brecha de Cualificaciones"
            title="Programas y Demanda del Mercado Laboral"
            subtitle="Análisis comparativo entre los contenidos curriculares institucionales y las competencias técnicas más solicitadas por las empresas contratantes en tiempo real."
            photo={advisorPhotos.laborMarket}
            stats={[
              {
                value: `${overview.employedRate}%`,
                label: 'Egresados con Empleo',
              },
              {
                value: overview.openVacancies,
                label: 'Vacantes Abiertas',
              },
              {
                value: programsWithGap,
                label: 'Programas con Brecha',
              },
            ]}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to="/institucion/estudiantes/estadisticas"
                  className="inline-flex items-center gap-2 rounded-xl bg-lime hover:bg-lime/85 text-ink font-bold px-4 py-2 text-xs shadow-xs transition-all no-underline"
                >
                  <i className="bx bx-bar-chart-alt-2 text-base" />
                  <span>Ver Analíticas Completas</span>
                </Link>
                <Link
                  to="/institucion/dashboard"
                  className="inline-flex items-center gap-2 rounded-xl border border-line bg-white hover:bg-page text-ink font-semibold px-4 py-2 text-xs shadow-xs transition-all no-underline"
                >
                  <i className="bx bx-arrow-back text-base" />
                  <span>Volver al Panel</span>
                </Link>
              </div>
            }
          />

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_20rem]">
            {/* Programas y demanda */}
            <section aria-labelledby="programs-title" className="rounded-2xl border border-line bg-white p-6 shadow-xs">
              <div className="flex items-baseline justify-between border-b border-line pb-4">
                <h2 id="programs-title" className="m-0 font-display text-lg font-bold text-ink">
                  Alineación de Programas Académicos
                </h2>
                <span className="hidden text-xs text-secondary sm:inline">
                  Cobertura = habilidades demandadas presentes en el plan de estudios
                </span>
              </div>

              <ul className="m-0 mt-3 list-none divide-y divide-line-soft p-0">
                {programTraceability.map((program) => {
                  const tone = coverageTone(program.coverage);
                  const missing = program.uncovered.length;

                  return (
                    <li key={program.id}>
                      <Link
                        to={`/institucion/programas/${program.id}`}
                        className="-mx-2 flex flex-col gap-2 rounded-lg px-2 py-4 text-ink no-underline transition-colors hover:bg-page/70 sm:flex-row sm:items-center sm:gap-5"
                      >
                        <span className="min-w-0 sm:w-56">
                          <span className="block truncate text-sm font-semibold">{program.name}</span>
                          <span className="block text-xs text-secondary">{program.graduates} egresados</span>
                        </span>

                        {program.coverage == null ? (
                          <span className="flex-1 text-sm text-secondary">
                            Sube el pensum para ver su cobertura
                          </span>
                        ) : (
                          <>
                            <span className="flex flex-1 items-center gap-3">
                              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel">
                                <span
                                  className={`block h-full rounded-full ${tone.bar}`}
                                  style={{ width: `${program.coverage}%` }}
                                />
                              </span>
                              <span className={`w-10 text-right text-sm font-bold ${tone.text}`}>
                                {program.coverage}%
                              </span>
                            </span>
                            <span className="text-xs text-secondary sm:w-40">
                              {missing === 0
                                ? 'Sin brechas'
                                : `${missing} ${missing === 1 ? 'competencia sin cubrir' : 'competencias sin cubrir'}`}
                            </span>
                          </>
                        )}
                        <i className="bx bx-chevron-right hidden text-xl text-secondary sm:block" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* Columna derecha: Brechas prioritarias y Equipo */}
            <aside className="space-y-6">
              <section aria-labelledby="gaps-title" className="rounded-2xl border border-line bg-white p-5 shadow-xs">
                <div className="border-b border-line pb-3">
                  <h2 id="gaps-title" className="m-0 font-display text-base font-bold text-ink">
                    Brechas prioritarias
                  </h2>
                  <p className="m-0 mt-1 text-xs text-secondary">
                    Habilidades altamente solicitadas por empresas que ningún programa cubre.
                  </p>
                </div>
                <ul className="m-0 mt-3 list-none divide-y divide-line-soft p-0">
                  {gaps.map((gap) => (
                    <li key={gap.skill} className="flex items-center justify-between gap-3 py-3 text-sm">
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-ink">{gap.skill}</span>
                        <span className="block truncate text-xs text-secondary">
                          {gap.programs.length === 1
                            ? gap.programs[0]
                            : `${gap.programs.length} programas`}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs font-semibold text-ink">
                        {gap.vacancies} vacantes
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <section aria-labelledby="team-title" className="rounded-2xl border border-line bg-white p-5 shadow-xs">
                <div className="flex items-baseline justify-between border-b border-line pb-3">
                  <h2 id="team-title" className="m-0 font-display text-base font-bold text-ink">
                    Equipo de Articulación
                  </h2>
                  <button
                    type="button"
                    className="text-xs font-semibold text-green-dark hover:underline cursor-pointer"
                  >
                    Invitar
                  </button>
                </div>
                <ul className="m-0 mt-3 list-none space-y-3 p-0">
                  {institutionTeam.map((member) => (
                    <li key={member.id} className="flex items-center gap-3">
                      {member.avatar ? (
                        <img src={member.avatar} alt="" className="size-9 shrink-0 rounded-full object-cover" />
                      ) : (
                        <Initials name={member.name} />
                      )}
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-ink">{member.name}</span>
                        <span className="block truncate text-xs text-secondary">{member.role}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </aside>
          </div>
        </div>
      </main>
    </InstitutionPortalLayout>
  );
}
