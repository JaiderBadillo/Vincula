import { Link } from 'react-router-dom';
import { getInitials, useProfile } from '../../hooks/useProfile.js';

function formatDashboardDate(date) {
  const formattedDate = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);

  return `${formattedDate.charAt(0).toLocaleUpperCase('es-CO')}${formattedDate.slice(1)}`;
}

export default function DashboardTopbar({ onMenuToggle, mobileMenuOpen, menuButtonRef, sidebarCollapsed, onSidebarToggle }) {
  const { profile } = useProfile();

  return (
    <header className="sticky top-0 z-20 border-b border-line-soft bg-page/95 backdrop-blur-sm">
      <div className="flex min-h-[4.75rem] w-full items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
        <div className="flex min-w-0 items-center gap-3">
          <button
            className="hidden size-10 shrink-0 place-items-center rounded-control border border-line bg-white text-xl text-ink shadow-xs transition-colors hover:bg-panel min-[1200px]:grid"
            type="button"
            aria-label={sidebarCollapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}
            aria-expanded={!sidebarCollapsed}
            aria-controls="dashboard-sidebar"
            onClick={onSidebarToggle}
          >
            <i className="bx bx-menu" aria-hidden="true" />
          </button>
          <button
            ref={menuButtonRef}
            className="grid size-10 shrink-0 place-items-center rounded-control border border-line bg-white text-xl text-ink shadow-xs transition-colors hover:bg-panel min-[1200px]:hidden"
            type="button"
            aria-label={mobileMenuOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
            aria-expanded={mobileMenuOpen}
            aria-controls="dashboard-mobile-menu"
            onClick={onMenuToggle}
          >
            <i className={`bx ${mobileMenuOpen ? 'bx-x' : 'bx-menu'}`} aria-hidden="true" />
          </button>
          <p className="truncate text-sm font-medium text-body-muted">{formatDashboardDate(new Date())}</p>
        </div>

        <Link to="/dashboard/perfil" className="flex shrink-0 items-center gap-3 rounded-full py-1 pl-1 pr-3 no-underline transition-colors hover:bg-panel" aria-label={`Ir a mi perfil: ${profile.fullName}`}>
          <span className="grid size-10 place-items-center overflow-hidden rounded-full border border-green/15 bg-panel font-display text-sm font-bold text-green" aria-hidden="true">
            {profile.photo ? <img src={profile.photo} alt="" className="size-full object-cover" /> : getInitials(profile.fullName)}
          </span>
          <span className="hidden font-display text-sm font-semibold text-ink sm:inline">{profile.fullName}</span>
        </Link>
      </div>
    </header>
  );
}
