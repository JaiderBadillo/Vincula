function Kpi({ label, value, detail }) {
  return (
    <div className="rounded-2xl border border-sand-line bg-white p-4">
      <dt className="text-[0.7rem] font-bold uppercase tracking-wider text-secondary">{label}</dt>
      <dd className="m-0 mt-1 font-display text-3xl font-extrabold leading-none text-ink">{value}</dd>
      <p className="m-0 mt-2 text-xs leading-snug text-secondary">{detail}</p>
    </div>
  );
}

const dias = (valor) => (valor == null ? 'Sin datos' : `${String(valor).replace('.', ',')} días`);

/**
 * Resultados reales de los egresados del programa en los procesos de selección.
 * Los conteos se muestran siempre; tasas, tiempos y promedios solo con muestra suficiente.
 */
export default function TraceabilityOutcomes({ outcomes }) {
  if (!outcomes) return null;

  if (outcomes.egresados_registrados === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-sand-line bg-cream/40 px-6 py-8 text-center">
        <i className="bx bx-user-plus mb-2 block text-3xl text-terracotta" aria-hidden="true" />
        <h4 className="m-0 font-display text-base font-bold text-ink">Aún no hay egresados de este programa en la plataforma</h4>
        <p className="m-0 mx-auto mt-2 max-w-xl text-sm leading-relaxed text-secondary">
          Cuando se registren y se postulen a vacantes, aquí verás hasta dónde llegan en los procesos de selección.
        </p>
      </div>
    );
  }

  const total = outcomes.total_postulaciones;
  const faltan = outcomes.minimo_muestra - total;

  return (
    <div className="space-y-5">
      <dl className="m-0 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Egresados registrados"
          value={outcomes.egresados_registrados}
          detail={`${outcomes.egresados_postulados} se ${outcomes.egresados_postulados === 1 ? 'ha' : 'han'} postulado a alguna vacante.`}
        />
        <Kpi label="Postulaciones" value={total} detail={`${outcomes.postulaciones_descartadas} descartadas.`} />
        <Kpi
          label="Egresados contratados"
          value={outcomes.egresados_contratados}
          detail="Con contratación confirmada por la empresa."
        />
        <Kpi
          label="Tasa de contratación"
          value={outcomes.tasa_contratacion == null ? '—' : `${Math.round(outcomes.tasa_contratacion)}%`}
          detail={
            outcomes.muestra_suficiente
              ? 'Egresados contratados entre los que se postularon.'
              : `Se calcula a partir de ${outcomes.minimo_muestra} postulaciones.`
          }
        />
      </dl>

      {!outcomes.muestra_suficiente && (
        <p className="m-0 flex items-start gap-2 rounded-xl border border-sand-line bg-cream/60 p-3 text-xs leading-relaxed text-secondary">
          <i className="bx bx-info-circle mt-0.5 text-base text-ink" aria-hidden="true" />
          <span>
            <strong className="text-ink">Datos insuficientes para porcentajes y tiempos.</strong>{' '}
            {total === 0
              ? `Todavía no hay postulaciones de egresados de este programa.`
              : `Hay ${total} ${total === 1 ? 'postulación' : 'postulaciones'}; faltan ${faltan} para calcular tasas, tiempos y afinidad promedio.`}{' '}
            Los conteos sí son reales.
          </span>
        </p>
      )}

      {total > 0 && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Embudo: una sola serie, un solo color; el valor va escrito en cada fila */}
          <div className="rounded-2xl border border-sand-line bg-white p-4 sm:p-5">
            <h4 className="m-0 font-display text-base font-bold text-ink">Hasta dónde llegan las postulaciones</h4>
            <p className="m-0 mt-0.5 text-xs text-secondary">Postulaciones que alcanzaron cada fase, sobre {total}.</p>
            <ol className="m-0 mt-4 list-none space-y-2.5 p-0">
              {outcomes.embudo.map((paso) => (
                <li key={paso.fase} className="grid grid-cols-[8.5rem_minmax(0,1fr)_2.5rem] items-center gap-3 text-xs">
                  <span className="font-semibold text-ink">{paso.etiqueta}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-sand" title={`${paso.postulaciones} de ${total}`}>
                    <span
                      className="block h-full rounded-full bg-[#336f24]"
                      style={{ width: `${paso.postulaciones === 0 ? 0 : Math.max((paso.postulaciones / total) * 100, 3)}%` }}
                    />
                  </span>
                  <span className="text-right font-bold tabular-nums text-ink">{paso.postulaciones}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border border-sand-line bg-white p-4 sm:p-5">
              <h4 className="m-0 font-display text-base font-bold text-ink">Tiempos y afinidad</h4>
              <dl className="m-0 mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                <div>
                  <dt className="text-secondary">Mediana hasta la oferta</dt>
                  <dd className="m-0 font-bold text-ink">{dias(outcomes.dias_mediana_oferta)}</dd>
                </div>
                <div>
                  <dt className="text-secondary">Mediana hasta la contratación</dt>
                  <dd className="m-0 font-bold text-ink">{dias(outcomes.dias_mediana_contratacion)}</dd>
                </div>
                <div>
                  <dt className="text-secondary">Afinidad promedio de contratados</dt>
                  <dd className="m-0 font-bold text-ink">
                    {outcomes.afinidad_promedio_contratados == null ? 'Sin datos' : `${Math.round(outcomes.afinidad_promedio_contratados)}%`}
                  </dd>
                </div>
                <div>
                  <dt className="text-secondary">Afinidad promedio de descartados</dt>
                  <dd className="m-0 font-bold text-ink">
                    {outcomes.afinidad_promedio_descartados == null ? 'Sin datos' : `${Math.round(outcomes.afinidad_promedio_descartados)}%`}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border border-sand-line bg-white p-4 sm:p-5">
              <h4 className="m-0 font-display text-base font-bold text-ink">Motivos de descarte</h4>
              {outcomes.motivos_descarte.length === 0 ? (
                <p className="m-0 mt-2 text-xs text-secondary">Ninguna postulación de este programa ha sido descartada.</p>
              ) : (
                <ul className="m-0 mt-3 list-none space-y-2 p-0 text-xs">
                  {outcomes.motivos_descarte.map((m) => (
                    <li key={m.motivo} className="flex items-start justify-between gap-3">
                      <span className="text-ink">{m.motivo}</span>
                      <span className="shrink-0 font-bold tabular-nums text-ink">{m.postulaciones}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
