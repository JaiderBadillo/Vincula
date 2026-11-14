import { useMemo, useState } from 'react';

// Estado de cobertura: siempre icono + texto, nunca solo color.
// Colores fijos: los temas del portal reasignan terracotta/ochre y los tres estados deben distinguirse siempre.
const COVERAGE = {
  directa: { label: 'Cubierta', icon: 'bx-check-circle', bar: 'bg-[#336f24]', text: 'text-[#28571d]' },
  afin: { label: 'Área afín', icon: 'bx-adjust', bar: 'bg-[#e2a336]', text: 'text-ink' },
  brecha: { label: 'Brecha', icon: 'bx-x-circle', bar: 'bg-[#c4572a]', text: 'text-[#9f431d]' },
};

const CONFIDENCE = {
  baja: 'Muestra pequeña',
  media: 'Muestra media',
  alta: 'Muestra amplia',
};

const FILTERS = [
  { id: 'todas', label: 'Todas' },
  { id: 'brecha', label: 'Brechas' },
  { id: 'afin', label: 'Área afín' },
  { id: 'directa', label: 'Cubiertas' },
  { id: 'blanda', label: 'Transversales' },
];

function EmptyState({ icon, title, children, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-sand-line bg-cream/40 px-6 py-10 text-center">
      <i className={`bx ${icon} mb-3 block text-4xl text-terracotta`} aria-hidden="true" />
      <h4 className="m-0 font-display text-base font-bold text-ink">{title}</h4>
      <p className="m-0 mx-auto mt-2 max-w-xl text-sm leading-relaxed text-secondary">{children}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function Kpi({ label, value, detail }) {
  return (
    <div className="rounded-2xl border border-sand-line bg-white p-4">
      <dt className="text-[0.7rem] font-bold uppercase tracking-wider text-secondary">{label}</dt>
      <dd className="m-0 mt-1 font-display text-3xl font-extrabold leading-none text-ink">{value}</dd>
      <p className="m-0 mt-2 text-xs leading-snug text-secondary">{detail}</p>
    </div>
  );
}

/**
 * Diagnóstico de pertinencia de un programa. Todo sale del informe del backend
 * (vacantes reales dirigidas al programa); sin informe o sin datos se muestra el vacío.
 */
export default function TraceabilityCurriculumViews({ report, onOpenUploadModal }) {
  const [filter, setFilter] = useState('todas');

  const demanda = report?.demanda || [];
  const tecnicas = useMemo(() => demanda.filter((d) => d.categoria !== 'blanda'), [demanda]);
  const counts = useMemo(
    () => ({
      directa: tecnicas.filter((d) => d.cobertura === 'directa').length,
      afin: tecnicas.filter((d) => d.cobertura === 'afin').length,
      brecha: tecnicas.filter((d) => d.cobertura === 'brecha').length,
      blanda: demanda.length - tecnicas.length,
    }),
    [demanda, tecnicas]
  );

  const visibles = useMemo(() => {
    if (filter === 'todas') return demanda;
    if (filter === 'blanda') return demanda.filter((d) => d.categoria === 'blanda');
    return tecnicas.filter((d) => d.cobertura === filter);
  }, [filter, demanda, tecnicas]);

  if (!report) return null;

  const n = report.total_vacantes_analizadas;
  const uploadButton = (
    <button
      type="button"
      onClick={onOpenUploadModal}
      className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-terracotta px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-terracotta-dark"
    >
      <i className="bx bx-upload text-base" aria-hidden="true" />
      <span>Cargar malla curricular</span>
    </button>
  );

  if (!report.pensum_registrado) {
    return (
      <EmptyState icon="bx-book-add" title="Este programa aún no tiene malla curricular" action={uploadButton}>
        Sube el PDF del plan de estudios o regístralo a mano. Con la malla guardada, Víncula la compara con las
        vacantes que las empresas dirigen a este programa.
      </EmptyState>
    );
  }

  if (report.indice_pertinencia == null) {
    return (
      <EmptyState
        icon="bx-briefcase-alt-2"
        title={n === 0 ? 'Todavía no hay vacantes dirigidas a este programa' : 'Las vacantes aún no exigen competencias técnicas'}
      >
        {n === 0 ? (
          <>
            La malla está registrada ({report.total_asignaturas} asignaturas), pero ninguna vacante abierta marca este
            programa como afín. Hay {report.total_vacantes_abiertas}{' '}
            {report.total_vacantes_abiertas === 1 ? 'vacante abierta' : 'vacantes abiertas'} en la plataforma. El índice
            se calculará cuando las empresas publiquen ofertas para este programa; no se muestran datos estimados.
          </>
        ) : (
          <>Las {n} vacantes dirigidas al programa solo registran competencias transversales, que no entran al índice.</>
        )}
      </EmptyState>
    );
  }

  const indice = Math.round(report.indice_pertinencia);
  const totalTecnicas = tecnicas.length;

  return (
    <div className="space-y-6">
      {/* Indicadores */}
      <dl className="m-0 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-sand-line bg-cream/60 p-4">
          <dt className="text-[0.7rem] font-bold uppercase tracking-wider text-secondary">Alineación malla–demanda</dt>
          <dd className="m-0 mt-1 font-display text-4xl font-extrabold leading-none text-ink">{indice}%</dd>
          <p className="m-0 mt-2 text-xs font-semibold text-ink">{report.nivel_pertinencia}</p>
          <p className="m-0 mt-1 inline-flex items-center gap-1 text-xs text-secondary">
            <i className="bx bx-info-circle" aria-hidden="true" />
            {CONFIDENCE[report.confianza]} · {n} {n === 1 ? 'vacante' : 'vacantes'}
          </p>
        </div>
        <Kpi
          label="Vacantes analizadas"
          value={n}
          detail={`Dirigidas a este programa, de ${report.total_vacantes_abiertas} abiertas en la plataforma.`}
        />
        <Kpi
          label="Competencias respaldadas"
          value={`${counts.directa + counts.afin} de ${totalTecnicas}`}
          detail={`${counts.directa} cubiertas y ${counts.afin} por área afín, entre las técnicas que piden las vacantes.`}
        />
        <Kpi
          label="Vacantes bien cubiertas"
          value={`${report.vacantes_alta_cobertura} de ${n}`}
          detail="La malla respalda al menos el 70 % de lo que exige cada una."
        />
      </dl>

      {/* Composición de la demanda técnica */}
      {totalTecnicas > 0 && (
        <div className="space-y-2">
          <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" role="img"
            aria-label={`${counts.directa} cubiertas, ${counts.afin} por área afín, ${counts.brecha} brechas`}>
            {['directa', 'afin', 'brecha'].map((k) => counts[k] > 0 && (
              <span key={k} className={COVERAGE[k].bar} style={{ flexGrow: counts[k] }} title={`${COVERAGE[k].label}: ${counts[k]}`} />
            ))}
          </div>
          <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-1 p-0 text-xs text-secondary">
            {['directa', 'afin', 'brecha'].map((k) => (
              <li key={k} className="inline-flex items-center gap-1.5">
                <span className={`size-2.5 rounded-sm ${COVERAGE[k].bar}`} aria-hidden="true" />
                <span><strong className="text-ink">{counts[k]}</strong> {COVERAGE[k].label.toLowerCase()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Demanda por competencia */}
      <div className="rounded-2xl border border-sand-line bg-white">
        <div className="flex flex-col gap-3 border-b border-sand-line p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h4 className="m-0 font-display text-base font-bold text-ink">Lo que piden las vacantes y dónde lo enseña la malla</h4>
            <p className="m-0 mt-0.5 text-xs text-secondary">
              Ordenado por número de vacantes. La barra muestra en qué parte de las {n} vacantes aparece cada competencia.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filtrar competencias">
            {FILTERS.map((f) => {
              const count = f.id === 'todas' ? demanda.length : counts[f.id];
              const active = filter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(f.id)}
                  className={`cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors ${
                    active ? 'border-cocoa bg-cocoa text-white' : 'border-sand-line bg-white text-secondary hover:bg-cream hover:text-ink'
                  }`}
                >
                  {f.label} <span className={active ? 'text-white/70' : 'text-secondary'}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {visibles.length === 0 ? (
          <p className="m-0 p-6 text-center text-sm text-secondary">No hay competencias en esta categoría.</p>
        ) : (
          <ul className="m-0 list-none divide-y divide-sand-line p-0">
            {visibles.map((item) => {
              const esBlanda = item.categoria === 'blanda';
              const c = COVERAGE[item.cobertura];
              return (
                <li key={item.skill} className="grid grid-cols-1 gap-x-5 gap-y-2 p-4 sm:px-5 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_10rem] md:items-center">
                  <div className="min-w-0">
                    <p className="m-0 font-display text-sm font-bold text-ink">{item.skill}</p>
                    <p className="m-0 mt-0.5 text-xs leading-snug text-secondary">
                      {esBlanda ? (
                        'Competencia transversal: se informa, pero no entra al índice.'
                      ) : item.cobertura === 'brecha' ? (
                        item.area ? `Ninguna asignatura del área «${item.area}» la respalda.` : 'Ninguna asignatura la respalda.'
                      ) : (
                        <>
                          {item.cobertura === 'afin' ? 'Se enseña el área, no la herramienta: ' : 'Respaldada por '}
                          {item.asignaturas.map((a, i) => (
                            <span key={`${a.codigo}-${a.nombre}`}>
                              {i > 0 && ', '}
                              <strong className="font-semibold text-ink">{a.nombre}</strong> ({a.programa ? `${a.programa}, ` : ''}sem. {a.semestre})
                            </span>
                          ))}
                        </>
                      )}
                    </p>
                  </div>

                  <div title={`${item.vacantes} de ${n} vacantes (${item.porcentaje_vacantes}%)`}>
                    <div className="h-2 overflow-hidden rounded-full bg-sand">
                      <div
                        className={`h-full rounded-full ${esBlanda ? 'bg-secondary' : c.bar}`}
                        style={{ width: `${Math.max(item.porcentaje_vacantes, 3)}%` }}
                      />
                    </div>
                    <p className="m-0 mt-1 text-xs text-secondary">
                      <strong className="text-ink">{item.vacantes}</strong> de {n} vacantes
                      {item.obligatoria_en > 0 && ` · obligatoria en ${item.obligatoria_en}`}
                    </p>
                  </div>

                  {esBlanda ? (
                    <span className="text-xs font-semibold text-secondary md:justify-self-end">Transversal</span>
                  ) : (
                    <span className={`inline-flex items-center gap-1 justify-self-start text-xs font-bold md:justify-self-end ${c.text}`}>
                      <i className={`bx ${c.icon} text-base`} aria-hidden="true" />
                      {c.label}
                      {item.criticidad === 'alta' && <span className="font-semibold text-secondary">· prioritaria</span>}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Áreas de formación: oferta de la malla frente a la demanda */}
      {report.areas_formacion?.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-sand-line bg-white">
          <table className="w-full border-collapse text-left text-sm">
            <caption className="caption-top border-b border-sand-line p-4 text-left sm:px-5">
              <span className="block font-display text-base font-bold text-ink">Áreas de formación</span>
              <span className="block text-xs text-secondary">Cuántas asignaturas enseñan cada área y cuántas vacantes la piden.</span>
            </caption>
            <thead>
              <tr className="text-[0.7rem] uppercase tracking-wider text-secondary">
                <th scope="col" className="px-4 py-2 font-bold sm:px-5">Área</th>
                <th scope="col" className="px-4 py-2 text-right font-bold">Asignaturas</th>
                <th scope="col" className="px-4 py-2 text-right font-bold sm:px-5">Vacantes que la piden</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-line">
              {report.areas_formacion.map((a) => (
                <tr key={a.area}>
                  <th scope="row" className="px-4 py-2.5 font-semibold text-ink sm:px-5">
                    {a.area}
                    {a.asignaturas === 0 && <span className="ml-2 text-xs font-normal text-terracotta-dark">sin asignaturas</span>}
                    {a.vacantes === 0 && <span className="ml-2 text-xs font-normal text-secondary">sin demanda en las vacantes actuales</span>}
                  </th>
                  <td className="px-4 py-2.5 text-right tabular-nums text-ink">{a.asignaturas}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-ink sm:px-5">{a.vacantes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Hallazgos */}
      {report.recomendaciones_decanatura?.length > 0 && (
        <div className="rounded-2xl border border-sand-line bg-cream/60 p-5">
          <h4 className="m-0 font-display text-base font-bold text-ink">Hallazgos para el comité curricular</h4>
          <ul className="m-0 mt-3 list-none space-y-2 p-0">
            {report.recomendaciones_decanatura.map((rec) => (
              <li key={rec} className="flex items-start gap-2 text-sm leading-relaxed text-ink">
                <i className="bx bx-right-arrow-alt mt-0.5 text-base text-terracotta" aria-hidden="true" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <details className="rounded-2xl border border-sand-line bg-white p-4 text-sm text-secondary sm:px-5">
        <summary className="cursor-pointer font-semibold text-ink">Cómo se calcula el índice</summary>
        <div className="mt-3 space-y-2 leading-relaxed">
          <p className="m-0">
            Solo cuentan las vacantes abiertas de empresas aprobadas que marcan este programa como afín. De cada una se
            toman las competencias que exige: una obligatoria pesa 1 y una deseable 0,5.
          </p>
          <p className="m-0">
            Cada competencia se busca en la malla. Vale 1 si está <strong className="text-ink">cubierta</strong> (es propia del
            área de una asignatura o la institución la declaró en ella), 0,5 si es de un <strong className="text-ink">área afín</strong>{' '}
            (se enseña el área, pero no esa herramienta) y 0 si es una <strong className="text-ink">brecha</strong>.
          </p>
          <p className="m-0">
            El índice es la suma de lo cubierto dividida entre todo lo exigido. Las competencias transversales se
            muestran, pero no entran al cálculo. Con menos de 5 vacantes el resultado es solo indicativo.
          </p>
        </div>
      </details>
    </div>
  );
}
