import { Link, useParams } from 'react-router-dom';
import InstitutionPortalLayout from '../components/institution/InstitutionPortalLayout.jsx';
import { coverageTone, getProgramById } from '../data/institutionTraceability.js';

function SkillList({ items, tone }) {
  if (items.length === 0) {
    return <p className="m-0 mt-3 text-sm text-secondary">Nada por aquí.</p>;
  }
  return (
    <ul className="m-0 mt-3 list-none divide-y divide-line-soft border-t border-line p-0">
      {items.map((item) => (
        <li key={item.skill} className="flex items-center justify-between gap-3 py-3 text-sm">
          <span className="flex min-w-0 items-center gap-2.5">
            <span className={`size-1.5 shrink-0 rounded-full ${tone}`} />
            <span className="truncate font-medium text-ink">{item.skill}</span>
          </span>
          <span className="shrink-0 text-xs text-secondary">{item.vacancies} vacantes</span>
        </li>
      ))}
    </ul>
  );
}

export default function InstitutionProgramDetailPage() {
  const { programId } = useParams();
  const program = getProgramById(programId);

  if (!program) {
    return (
      <InstitutionPortalLayout activePage="competencias">
        <main className="mx-auto max-w-3xl px-5 py-16 text-center">
          <h1 className="m-0 font-display text-2xl font-bold text-ink">No encontramos este programa</h1>
          <Link to="/institucion/mercado-laboral/competencias" className="mt-4 inline-block text-sm font-semibold text-green-dark">
            Volver a Mercado Laboral
          </Link>
        </main>
      </InstitutionPortalLayout>
    );
  }

  const tone = coverageTone(program.coverage);
  const hasData = program.coverage != null;
  const trendText =
    program.trend == null
      ? null
      : program.trend > 0
      ? `Subió ${program.trend} puntos este semestre`
      : program.trend < 0
      ? `Bajó ${Math.abs(program.trend)} puntos este semestre`
      : 'Sin cambios este semestre';

  return (
    <InstitutionPortalLayout activePage="competencias">
      <main className="w-full pb-16">
        <div className="mx-auto max-w-5xl px-5 pt-8 sm:px-8 lg:px-10">
          <Link
            to="/institucion/mercado-laboral/competencias"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-secondary no-underline hover:text-ink transition-colors"
          >
            <i className="bx bx-arrow-back" />
            <span>Volver a Mercado Laboral</span>
          </Link>

          <h1 className="m-0 mt-3 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {program.name}
          </h1>
          <p className="m-0 mt-1 text-sm text-body-muted">
            {program.faculty} · {program.graduates} egresados · {program.employedRate}% con empleo
          </p>

          {!hasData ? (
            <section className="mt-10 border-y border-line py-12 text-center">
              <h2 className="m-0 font-display text-lg font-bold text-ink">Aún no hay pensum cargado</h2>
              <p className="m-0 mx-auto mt-1 max-w-md text-sm text-body-muted">
                Sube el pensum de este programa para ver qué competencias cubre frente a lo que piden las empresas.
              </p>
              <button
                type="button"
                className="mt-5 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink-soft cursor-pointer"
              >
                Subir pensum
              </button>
            </section>
          ) : (
            <>
              {/* Cobertura */}
              <section className="mt-7 border-y border-line py-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="m-0 text-sm text-secondary">Cobertura de competencias</p>
                    <p className={`m-0 mt-1 font-display text-4xl font-bold ${tone.text}`}>{program.coverage}%</p>
                  </div>
                  <div className="text-right text-sm text-secondary">
                    {trendText && <p className="m-0">{trendText}</p>}
                    <p className="m-0">{program.pensumUpdated}</p>
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-panel">
                  <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${program.coverage}%` }} />
                </div>
              </section>

              <div className="mt-9 grid grid-cols-1 gap-10 md:grid-cols-2">
                <section>
                  <h2 className="m-0 font-display text-lg font-bold text-ink">
                    Sin cubrir{' '}
                    <span className="text-sm font-medium text-secondary">{program.uncovered.length}</span>
                  </h2>
                  <p className="m-0 mt-1 text-xs text-secondary">Las empresas las piden y el programa no las enseña.</p>
                  <SkillList items={program.uncovered} tone="bg-rose-500" />
                </section>

                <section>
                  <h2 className="m-0 font-display text-lg font-bold text-ink">
                    Cubiertas{' '}
                    <span className="text-sm font-medium text-secondary">{program.covered.length}</span>
                  </h2>
                  <p className="m-0 mt-1 text-xs text-secondary">Ya están en el pensum y tienen demanda.</p>
                  <SkillList items={program.covered} tone="bg-emerald-600" />
                </section>
              </div>

              {/* Acciones */}
              <section className="mt-10 flex flex-wrap items-center gap-3 border-t border-line pt-6">
                <button
                  type="button"
                  className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink-soft cursor-pointer"
                >
                  Proponer al director
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-page cursor-pointer"
                >
                  Buscar empresas que las piden
                </button>
                <button
                  type="button"
                  className="px-2 py-2 text-sm font-semibold text-green-dark hover:underline cursor-pointer"
                >
                  Actualizar pensum
                </button>
              </section>
            </>
          )}
        </div>
      </main>
    </InstitutionPortalLayout>
  );
}
