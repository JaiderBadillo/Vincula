import { Link } from 'react-router-dom';
import { getInitials, useProfile } from '../../hooks/useProfile.js';

/* ─── Brand Logo ─── */

function Brand({ collapsed = false }) {
  return (
    <Link
      className={`flex items-center text-ink no-underline ${collapsed ? 'w-full justify-center' : 'w-fit gap-3'}`}
      to="/dashboard"
      aria-label="Vincula, panel de egresados"
      title={collapsed ? 'Vincula' : undefined}
    >
      <span
        className="grid size-10 shrink-0 place-items-center rounded-xl border border-green/20 bg-green/10 text-2xl text-green-dark shadow-xs"
        aria-hidden="true"
      >
        <i className="bx bx-briefcase" />
      </span>
      <span className={collapsed ? 'sr-only' : 'grid gap-0.5'}>
        <span className="font-display text-[0.8rem] font-bold tracking-[0.14em]">VINCULA</span>
        <span className="text-[0.6rem] font-medium tracking-wide text-secondary">
          Plataforma de empleabilidad
        </span>
      </span>
    </Link>
  );
}

/* ─── User Profile ─── */

function Avatar({ profile }) {
  return (
    <span
      className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-page font-display text-xs font-semibold text-green-dark shadow-xs"
      aria-hidden="true"
    >
      {profile.photo ? <img src={profile.photo} alt="" className="size-full object-cover" /> : getInitials(profile.fullName)}
    </span>
  );
}

function UserProfile({ collapsed = false }) {
  const { profile } = useProfile();

  if (collapsed) {
    return (
      <div className="flex w-full justify-center" title={profile.fullName}>
        <Avatar profile={profile} />
      </div>
    );
  }

  return (
    <Link
      to="/dashboard/perfil"
      className="flex items-center gap-3 px-1 no-underline transition-opacity hover:opacity-85 min-w-0"
      title={profile.fullName}
    >
      <Avatar profile={profile} />
      <p className="m-0 min-w-0 truncate text-sm font-semibold text-ink">
        {profile.fullName}
      </p>
    </Link>
  );
}

/* ─── Navigation ─── */

const navItems = [
  { id: 'home', label: 'Inicio', icon: 'bx-home-alt-2', to: '/dashboard', isLink: true },
  { id: 'profile', label: 'Mi Perfil & CV', icon: 'bx-user', to: '/dashboard/perfil', isLink: true },
  { id: 'vacancies', label: 'Explorar Vacantes', icon: 'bx-search-alt', to: '/dashboard/vacantes', isLink: true },
  { id: 'applications', label: 'Mis Postulaciones', icon: 'bx-list-check', to: '/dashboard/postulaciones', isLink: true },
  { id: 'institution', label: 'Portal Institución (IES)', icon: 'bxs-institution', to: '/institucion/dashboard', isLink: true, badge: 'Asesor' },
];

function NavigationItems({ activePage, onNavigate, collapsed = false }) {
  return (
    <nav className={`mt-8 ${collapsed ? 'w-full' : ''}`} aria-label="Navegación del egresado">
      <p
        className={`mb-2.5 px-3 text-[0.58rem] font-bold uppercase tracking-[0.18em] text-secondary ${
          collapsed ? 'sr-only' : ''
        }`}
      >
        Menú
      </p>
      <ul className="m-0 grid list-none gap-0.5 p-0">
        {navItems.map((item) => {
          const isActive = activePage === item.id;
          const Component = item.isLink ? Link : 'a';
          const linkProps = item.isLink ? { to: item.to } : { href: item.to };

          return (
            <li key={item.id}>
              <Component
                className={`group relative flex min-h-10 items-center rounded-lg text-[0.8rem] no-underline transition-colors duration-100 ${
                  collapsed ? 'justify-center px-0' : 'gap-3 px-3'
                } ${
                  isActive
                    ? 'bg-green/10 font-bold text-green-dark shadow-xs'
                    : 'font-medium text-secondary hover:bg-page hover:text-ink'
                }`}
                aria-current={isActive ? 'page' : undefined}
                title={collapsed ? item.label : undefined}
                onClick={onNavigate}
                {...linkProps}
              >
                {/* Active accent */}
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-green"
                    aria-hidden="true"
                  />
                )}

                <i
                  className={`bx ${item.icon} shrink-0 text-lg ${
                    isActive
                      ? 'text-green-dark'
                      : item.badge
                      ? 'text-green-dark'
                      : 'text-secondary group-hover:text-green-dark'
                  }`}
                  aria-hidden="true"
                />
                <span className={collapsed ? 'sr-only' : 'truncate flex-1'}>{item.label}</span>
                {!collapsed && item.badge && (
                  <span className="rounded-full px-2 py-0.5 text-[0.6rem] font-bold leading-none bg-green/10 border border-green/20 text-green-dark">
                    {item.badge}
                  </span>
                )}
              </Component>
            </li>
          );
        })}

        {/* Copiloto RAG — disabled */}
        <li>
          <span
            className={`flex min-h-10 items-center rounded-lg text-[0.8rem] font-medium text-secondary/40 ${
              collapsed ? 'justify-center px-0' : 'gap-3 px-3'
            }`}
            aria-disabled="true"
            title={collapsed ? 'Copiloto RAG — próximamente' : undefined}
          >
            <i className="bx bx-bot shrink-0 text-lg text-secondary/30" aria-hidden="true" />
            <span className={collapsed ? 'sr-only' : 'flex flex-1 items-center justify-between'}>
              <span>Copiloto RAG</span>
              {!collapsed && (
                <span className="rounded border border-line px-1.5 py-px text-[0.5rem] font-bold uppercase tracking-wider text-secondary/50">
                  Pronto
                </span>
              )}
            </span>
          </span>
        </li>
      </ul>
    </nav>
  );
}

/* ─── Footer ─── */

function SidebarFooter({ onNavigate, collapsed = false }) {
  return (
    <div className={`mt-auto space-y-1 border-t border-line pt-4 ${collapsed ? 'w-full' : ''}`}>
      <a
        className={`flex min-h-9 items-center rounded-lg text-[0.75rem] font-medium text-secondary hover:bg-page hover:text-ink no-underline transition-colors ${
          collapsed ? 'justify-center px-0' : 'gap-3 px-3'
        }`}
        href="#"
        title={collapsed ? 'Ayuda' : undefined}
      >
        <i className="bx bx-help-circle shrink-0 text-base" aria-hidden="true" />
        <span className={collapsed ? 'sr-only' : ''}>Ayuda</span>
      </a>

      <Link
        className={`flex min-h-9 items-center rounded-lg text-[0.75rem] font-medium text-secondary hover:bg-page hover:text-red-600 no-underline transition-colors ${
          collapsed ? 'justify-center px-0' : 'gap-3 px-3'
        }`}
        to="/login"
        aria-label="Cerrar sesión"
        title={collapsed ? 'Cerrar sesión' : undefined}
        onClick={onNavigate}
      >
        <i className="bx bx-log-out shrink-0 text-base" aria-hidden="true" />
        <span className={collapsed ? 'sr-only' : ''}>Cerrar sesión</span>
      </Link>
    </div>
  );
}

/* ─── Sidebar Contents ─── */

function SidebarContents({ activePage, onNavigate, collapsed = false }) {
  return (
    <>
      <div className={`flex items-center ${collapsed ? 'justify-center w-full' : 'justify-between w-full'}`}>
        <Brand collapsed={collapsed} />
      </div>

      <div className={`mt-6 ${collapsed ? 'w-full' : ''}`}>
        <UserProfile collapsed={collapsed} />
      </div>

      <NavigationItems activePage={activePage} onNavigate={onNavigate} collapsed={collapsed} />
      <SidebarFooter onNavigate={onNavigate} collapsed={collapsed} />
    </>
  );
}

/* ─── Main Export ─── */

export default function DashboardSidebar({ activePage, mobileOpen, onClose, collapsed = false }) {
  return (
    <>
      {/* Desktop: permanent white bar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden flex-col overflow-y-auto border-r border-line bg-white py-6 text-ink shadow-xs transition-[width,padding] duration-200 ease-out min-[1200px]:flex ${
          collapsed ? 'w-[5.5rem] items-center px-3' : 'w-[17rem] px-4'
        }`}
        id="dashboard-sidebar"
        aria-label="Navegación principal del dashboard"
        data-collapsed={collapsed}
      >
        <SidebarContents
          activePage={activePage}
          collapsed={collapsed}
        />
      </aside>

      {/* Mobile */}
      {mobileOpen && (
        <>
          <button
            className="fixed inset-0 z-40 bg-ink/50 backdrop-blur-[2px] min-[1200px]:hidden"
            type="button"
            aria-label="Cerrar menú de navegación"
            onClick={onClose}
          />
          <aside
            className="fixed inset-y-0 left-0 z-50 flex w-[min(82vw,18rem)] flex-col overflow-y-auto border-r border-line bg-white px-4 py-6 text-ink shadow-hero min-[1200px]:hidden"
            id="dashboard-mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menú del egresado"
          >
            <div className="flex items-center justify-between gap-3">
              <Brand />
              <button
                className="grid size-9 place-items-center rounded-lg border border-line text-lg text-secondary hover:bg-page hover:text-ink transition-colors cursor-pointer"
                type="button"
                aria-label="Cerrar menú"
                onClick={onClose}
              >
                <i className="bx bx-x" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-6">
              <UserProfile />
            </div>
            <NavigationItems activePage={activePage} onNavigate={onClose} />
            <SidebarFooter onNavigate={onClose} />
          </aside>
        </>
      )}
    </>
  );
}
