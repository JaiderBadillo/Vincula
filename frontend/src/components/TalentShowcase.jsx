import { sectionEyebrow, sectionTitle } from '../utils/classes.js';

const photos = [
  {
    id: 'profesional-laboratorio',
    size: 'md:col-span-5 min-h-[21rem]',
    src: 'https://images.pexels.com/photos/32213421/pexels-photo-32213421.jpeg?auto=compress&cs=tinysrgb&w=1200&q=80',
    alt: 'Profesional en un laboratorio moderno. Fotografía de Yusuf Çelik en Pexels.',
    type: 'bottom',
    caption: 'Conecta lo que sabes con nuevas oportunidades.',
    eyebrow: 'Experiencia y conocimiento',
  },
  {
    id: 'red-abierta',
    size: 'md:col-span-4 min-h-[18rem]',
    src: 'https://images.pexels.com/photos/8533082/pexels-photo-8533082.jpeg?auto=compress&cs=tinysrgb&w=900&q=80',
    alt: 'Dos profesionales colaboran en un entorno de laboratorio. Fotografía de Artem Podrez en Pexels.',
    type: 'side',
    caption: 'Una red abierta de empleo',
    icon: 'bx-network-chart',
  },
  {
    id: 'perfil-afín',
    size: 'md:col-span-3 min-h-[15.5rem]',
    src: 'https://images.pexels.com/photos/36898131/pexels-photo-36898131.jpeg?auto=compress&cs=tinysrgb&w=900&q=80',
    alt: 'Profesional de tecnología trabajando frente a un computador. Fotografía de Twinkle photography en Pexels.',
    type: 'side',
    caption: 'Vacantes afines a tu perfil',
    icon: 'bx-bulb',
  },
];

export default function TalentShowcase() {
  return (
    <section className="bg-page px-5 py-16 sm:px-6 lg:px-10 lg:py-20" aria-labelledby="showcase-title">
      <div className="mx-auto max-w-7xl">
        <div className="mb-9 max-w-3xl">
          <p className={sectionEyebrow}>En la práctica</p>
          <h2 className={sectionTitle} id="showcase-title">Talento público. Nuevas posibilidades.</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-12 md:items-end">
          {photos.map((photo) => (
            <article className={`showcase-card relative isolate flex w-full items-end overflow-hidden rounded-card bg-panel text-white ${photo.size}`} key={photo.id}>
              <img className="absolute inset-0 z-0 size-full object-cover" src={photo.src} alt={photo.alt} loading="lazy" decoding="async" />
              <div className={`showcase-image-shade--${photo.type} absolute inset-0 z-10`} aria-hidden="true" />
              {photo.type === 'bottom' ? (
                <div className="relative z-20 p-7 sm:p-8">
                  <span className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-white/85"><span className="size-2 rounded-full bg-lime" aria-hidden="true" />{photo.eyebrow}</span>
                  <h3 className="max-w-lg font-display text-2xl font-semibold leading-tight sm:text-3xl">{photo.caption}</h3>
                </div>
              ) : (
                <span className="absolute bottom-5 left-5 z-20 inline-flex max-w-[calc(100%-2.5rem)] items-center gap-2 rounded-xl border border-white/20 bg-ink/60 px-4 py-3 text-xs text-white backdrop-blur-sm">
                  <i className={`bx ${photo.icon} text-lg text-lime`} aria-hidden="true" />{photo.caption}
                </span>
              )}
              {photo.type === 'bottom' && <span className="absolute bottom-5 right-5 z-20 grid size-11 place-items-center rounded-xl border border-white/25 bg-white/10 text-xl backdrop-blur-sm" aria-hidden="true"><i className="bx bx-right-arrow-alt" /></span>}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
