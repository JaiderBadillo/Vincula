import { useState } from 'react';
import { Link } from 'react-router-dom';
import { primaryButton } from '../../utils/classes.js';

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

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <nav className="relative z-20 border-b border-white/10 bg-ink" aria-label="Navegación principal" id="inicio">
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
          <Link className={`${primaryButton} w-fit px-4 py-3 text-xs no-underline sm:text-sm`} to="/login" onClick={closeMenu}>
            Iniciar sesión <i className="bx bx-log-in text-lg" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </nav>
  );
}
