import { useState } from 'react';
import ProfileForm from './ProfileForm.jsx';
import { primaryButton } from '../utils/classes.js';

const navItems = [
  { label: 'Egresados', href: '#egresados' },
  { label: 'Empleadores', href: '#empleadores' },
  { label: 'Universidades', href: '#universidades' },
];

function Brand() {
  return (
    <a className="flex items-center gap-3 text-white no-underline" href="#inicio" aria-label="Vincula, inicio">
      <span className="grid size-10 place-items-center rounded-xl border border-white/20 bg-white/5 text-2xl text-lime" aria-hidden="true">
        <i className="bx bx-briefcase" />
      </span>
      <span className="grid gap-0.5">
        <span className="font-display text-sm font-bold tracking-[0.12em]">VINCULA</span>
        <span className="text-xs text-white/55">Red de talento universitario</span>
      </span>
    </a>
  );
}

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="relative overflow-hidden bg-ink text-white" id="inicio">
      <nav className="relative z-20 border-b border-white/10 bg-ink" aria-label="Navegación principal">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 px-5 py-4 sm:px-6 lg:flex-nowrap lg:px-10">
          <Brand />
          <button
            className="grid size-11 place-items-center rounded-xl border border-white/25 text-2xl text-white lg:hidden"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="site-navigation"
            aria-label={menuOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <i className={`bx ${menuOpen ? 'bx-x' : 'bx-menu'}`} aria-hidden="true" />
          </button>
          <div
            className={`${menuOpen ? 'flex' : 'hidden'} w-full flex-col gap-5 pb-2 pt-5 lg:flex lg:w-auto lg:flex-1 lg:flex-row lg:items-center lg:justify-between lg:gap-8 lg:pb-0 lg:pt-0`}
            id="site-navigation"
          >
            <ul className="m-0 flex list-none flex-col gap-1 p-0 lg:mx-auto lg:flex-row lg:items-center lg:gap-8">
              {navItems.map((item) => (
                <li key={item.href}>
                  <a className="block py-2 text-sm text-white/65 no-underline hover:text-white focus-visible:text-white" href={item.href} onClick={closeMenu}>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
            <a className={`${primaryButton} w-fit px-4 py-3 text-xs sm:text-sm`} href="#capacidades" onClick={closeMenu}>
              Conocer la plataforma <i className="bx bx-right-arrow-alt text-lg" aria-hidden="true" />
            </a>
          </div>
        </div>
      </nav>

      <section className="relative isolate py-12 md:py-16 lg:pb-14 lg:pt-20" aria-labelledby="hero-title">
        <div className="hero-grid pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="hero-orbit pointer-events-none absolute -right-36 top-20 size-[34rem]" aria-hidden="true" />
        <div className="hero-orbit pointer-events-none absolute -right-12 top-52 size-[23rem]" aria-hidden="true" />
        <div className="pointer-events-none absolute right-[12rem] top-[16rem] size-2 rounded-full bg-lime" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 md:px-6 lg:grid-cols-[1.06fr_.94fr] lg:gap-10 lg:px-10">
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
          <div className="hero-panel relative z-10 mx-auto w-full max-w-[500px]">
            <ProfileForm />
          </div>
        </div>
      </section>
    </header>
  );
}
