import { sectionEyebrow, sectionTitle } from '../utils/classes.js';

const audiences = [
  {
    id: 'egresados',
    name: 'Egresados',
    subtitle: 'Explora tu siguiente paso',
    tools: <>Perfil y hoja de vida<br />Recomendaciones inteligentes</>,
    support: 'Vacantes afines, postulaciones y alertas para seguir nuevas oportunidades.',
  },
  {
    id: 'empleadores',
    name: 'Empleadores',
    subtitle: 'Encuentra perfiles relevantes',
    tools: <>Publicación de vacantes<br />Búsqueda por capacidades</>,
    support: 'Un canal claro para presentar oportunidades y conocer postulaciones.',
  },
  {
    id: 'universidades',
    name: 'Universidades',
    subtitle: 'Acompaña a tu comunidad',
    tools: <>Red institucional<br />Seguimiento a egresados</>,
    support: 'Apoyo para mantener el vínculo con la comunidad y acercarla al empleo.',
  },
];

export default function AudienceCapabilities() {
  return (
    <section className="border-y border-line-soft bg-white px-5 py-16 sm:px-6 lg:px-10 lg:py-20" id="capacidades" aria-labelledby="capabilities-title">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.72fr_1.28fr] lg:gap-16">
        <div className="lg:pt-2">
          <p className={sectionEyebrow}>Capacidades por audiencia</p>
          <h2 className={sectionTitle} id="capabilities-title">Cada vínculo tiene herramientas propias.</h2>
          <p className="mt-5 max-w-md text-base leading-7 text-body-muted">Una experiencia que acompaña a quienes buscan, ofrecen y fortalecen oportunidades laborales.</p>
          <div className="mt-8 flex items-center gap-3 rounded-control border border-line bg-page p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-panel text-xl text-blue-muted" aria-hidden="true"><i className="bx bx-network-chart" /></span>
            <p className="text-sm leading-5 text-[#48616b]">Red de empleo público y privado, en un mismo espacio.</p>
          </div>
        </div>
        <div className="min-w-0 overflow-x-auto">
          <table className="capability-table w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-y border-[#cbd5d9] text-[0.65rem] font-bold uppercase tracking-[0.15em] text-secondary">
                <th className="px-3 py-4" scope="col">Audiencia</th>
                <th className="px-3 py-4" scope="col">Herramientas</th>
                <th className="px-3 py-4" scope="col">Cómo acompaña</th>
              </tr>
            </thead>
            <tbody>
              {audiences.map((audience) => (
                <tr className="border-b border-[#e2e8ea]" key={audience.id} id={audience.id}>
                  <th className="min-w-36 px-3 py-6 align-middle font-normal" scope="row">
                    <span className="block font-display text-base font-semibold text-ink">{audience.name}</span>
                    <span className="mt-1 block text-xs text-secondary">{audience.subtitle}</span>
                  </th>
                  <td className="min-w-40 px-3 py-6 leading-6 text-blue-muted" data-label="Herramientas">{audience.tools}</td>
                  <td className="min-w-48 px-3 py-6 leading-6 text-body-muted" data-label="Cómo acompaña">{audience.support}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
