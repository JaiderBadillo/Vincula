/**
 * Banner con fotografía para el encabezado de cada página del portal de empresas.
 * - `photo`: objeto de companyPhotos ({ src, alt, position })
 * - `stats`: [{ value, label }] se muestran sobre la foto con fondo translúcido
 * - `actions`: nodo con botones, alineado abajo a la derecha
 */
export default function CompanyPageHero({ photo, eyebrow, title, subtitle, stats = [], actions = null }) {
  return (
    <section
      className="showcase-card relative isolate flex min-h-[15rem] w-full items-end overflow-hidden rounded-card bg-cocoa text-white sm:min-h-[17rem]"
      aria-label={title}
    >
      <img
        className={`absolute inset-0 z-0 size-full object-cover ${photo.position || 'object-center'}`}
        src={photo.src}
        alt={photo.alt}
        loading="eager"
        decoding="async"
      />
      <div className="company-shade--bottom absolute inset-0 z-10" aria-hidden="true" />
      <div className="company-shade--side absolute inset-0 z-10 hidden md:block" aria-hidden="true" />

      <div className="relative z-20 flex w-full flex-col gap-5 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-xl">
          {eyebrow && (
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-white/85">
              {eyebrow}
            </span>
          )}
          <h1 className="m-0 font-display text-2xl font-semibold leading-tight sm:text-3xl">{title}</h1>
          {subtitle && <p className="m-0 mt-2 text-sm leading-relaxed text-white/80">{subtitle}</p>}
        </div>

        <div className="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
          {stats.length > 0 && (
            <dl className="m-0 flex items-stretch divide-x divide-white/20 rounded-xl border border-white/20 bg-cocoa/55 backdrop-blur-sm">
              {stats.map((stat) => (
                <div key={stat.label} className="px-4 py-2.5">
                  <dd className="m-0 font-display text-lg font-bold leading-none text-white">{stat.value}</dd>
                  <dt className="mt-1 text-[0.65rem] font-medium text-white/70">{stat.label}</dt>
                </div>
              ))}
            </dl>
          )}
          {actions}
        </div>
      </div>
    </section>
  );
}

