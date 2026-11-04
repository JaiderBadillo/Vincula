import ProfileForm from '../ProfileForm.jsx';
import { primaryButton } from '../../utils/classes.js';

export default function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-ink py-12 text-white md:py-16 lg:pb-14 lg:pt-20" aria-labelledby="hero-title">
      {/* Background grid pattern */}
      <div className="hero-grid pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />

      {/* Decorative orbital circles */}
      <div className="hero-orbit pointer-events-none absolute -right-36 top-20 size-[34rem]" aria-hidden="true" />
      <div className="hero-orbit pointer-events-none absolute -right-12 top-52 size-[23rem]" aria-hidden="true" />
      <div className="pointer-events-none absolute right-[12rem] top-[16rem] size-2 rounded-full bg-lime" aria-hidden="true" />

      {/* Hero content grid */}
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 md:px-6 lg:grid-cols-[1.06fr_.94fr] lg:gap-10 lg:px-10">
        {/* Left column — copy */}
        <div className="hero-copy max-w-2xl">
          <p className="mb-7 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.15em] text-lime">
            <span className="h-px w-9 bg-lime" aria-hidden="true" />
            Conexiones que impulsan trayectorias
          </p>
          <h1 className="max-w-2xl font-display text-[clamp(2.65rem,5.3vw,4rem)] font-semibold leading-[1.1] tracking-[-0.045em] text-white" id="hero-title">
            Vinculación laboral para <span className="text-lime">talento universitario.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-white/70 sm:text-lg sm:leading-8">
            Una plataforma que conecta egresados, empleadores y universidades con oportunidades que responden a cada perfil.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a className={`${primaryButton} px-6 py-4 text-sm`} href="#capacidades">
              Conocer la plataforma <i className="bx bx-right-arrow-alt text-xl" aria-hidden="true" />
            </a>
            <span className="inline-flex items-center gap-2 text-sm text-white/65">
              <i className="bx bx-check-shield text-xl text-white/80" aria-hidden="true" />
              Abierta a talento de universidades públicas
            </span>
          </div>
          <ul className="mt-10 flex list-none flex-wrap gap-x-6 gap-y-3 border-t border-white/10 pt-5 text-sm text-white/60 max-sm:flex-col" aria-label="Funciones principales">
            <li className="flex items-center gap-2"><i className="bx bx-bulb text-lg text-lime" aria-hidden="true" />Recomendaciones por afinidad</li>
            <li className="flex items-center gap-2"><i className="bx bx-file text-lg text-lime" aria-hidden="true" />Perfil y hoja de vida</li>
            <li className="flex items-center gap-2"><i className="bx bx-bell text-lg text-lime" aria-hidden="true" />Alertas de vacantes</li>
          </ul>
        </div>

        {/* Right column — profile form panel */}
        <div className="hero-panel relative z-10 mx-auto w-full max-w-[500px]">
          <ProfileForm />
        </div>
      </div>
    </section>
  );
}
