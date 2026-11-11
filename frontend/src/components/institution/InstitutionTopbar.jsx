import { useState } from 'react';
import { advisorProfile } from '../../data/institutionData.js';
import { useInstitutionProfile } from '../../hooks/useInstitutionProfile.js';
import { authService } from '../../services/authService.js';
import InstitutionThemeSelector from './InstitutionThemeSelector.jsx';
import UserAccountDropdown from '../common/UserAccountDropdown.jsx';

function formatDashboardDate(date) {
  const formattedDate = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);

  return `${formattedDate.charAt(0).toLocaleUpperCase('es-CO')}${formattedDate.slice(1)}`;
}

export default function InstitutionTopbar({
  onMenuToggle,
  mobileMenuOpen,
  menuButtonRef,
  sidebarCollapsed,
  onSidebarToggle,
  role = 'advisor',
}) {
  const { institutionProfile } = useInstitutionProfile();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const currentUser = authService.getCurrentUser();

  const rawAdvisorName = currentUser?.nombre || advisorProfile.fullName || 'Coordinación IES';
  const advisorInitials = rawAdvisorName
    .replace('Dra. ', '')
    .replace('Dr. ', '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase() || 'IES';

  const currentDisplayName = role === 'admin' ? (currentUser?.nombre || institutionProfile.name) : rawAdvisorName;

  return (
    <header
      className={`sticky top-0 z-20 border-b backdrop-blur-sm ${
        role === 'admin' ? 'border-sand-line bg-cream/95' : 'border-line-soft bg-page/95'
      }`}
    >
      <div className="flex min-h-[4.75rem] w-full items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
        {/* Left: Toggles & Date */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            className="hidden size-10 shrink-0 place-items-center rounded-control border border-line bg-white text-xl text-ink shadow-xs transition-colors hover:bg-panel min-[1200px]:grid cursor-pointer"
            type="button"
            aria-label={sidebarCollapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}
            aria-expanded={!sidebarCollapsed}
            aria-controls="institution-sidebar"
            onClick={onSidebarToggle}
          >
            <i className="bx bx-menu" aria-hidden="true" />
          </button>
          <button
            ref={menuButtonRef}
            className="grid size-10 shrink-0 place-items-center rounded-control border border-line bg-white text-xl text-ink shadow-xs transition-colors hover:bg-panel min-[1200px]:hidden cursor-pointer"
            type="button"
            aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={mobileMenuOpen}
            aria-controls="institution-sidebar"
            onClick={onMenuToggle}
          >
            <i className={`bx ${mobileMenuOpen ? 'bx-x' : 'bx-menu'}`} aria-hidden="true" />
          </button>
          <p className="truncate text-xs sm:text-sm font-semibold text-ink leading-tight">
            {formatDashboardDate(new Date())}
          </p>
        </div>

        {/* Right: Institutional Badge & Info */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          {/* Selector interactivo de tema institucional (Admin y Asesor IES) */}
          <InstitutionThemeSelector />

          {/* Quick Alert Bell (solo asesor) */}
          {role !== 'admin' && (
            <div className="relative">
              <span
                className="grid size-9 place-items-center rounded-xl border border-line bg-white text-ink text-lg shadow-2xs"
                title="19 solicitudes pendientes en cola"
              >
                <i className="bx bx-bell" />
              </span>
              <span className="absolute -top-1 -right-1 grid size-4 place-items-center rounded-full bg-emerald-700 text-[0.6rem] font-bold text-white ring-2 ring-page">
                19
              </span>
            </div>
          )}

          {/* Menú de cuenta con desplegable (Configuración y Salir) */}
          <UserAccountDropdown
            role={role === 'admin' ? 'institution_admin' : 'institution_advisor'}
            userName={currentDisplayName}
            userSubtitle={
              role === 'admin'
                ? `Cuenta Institucional · NIT ${institutionProfile.nit}`
                : advisorProfile.role
            }
            userAvatar={
              role === 'admin'
                ? institutionProfile.logo
                : !avatarFailed
                ? advisorProfile.avatar
                : null
            }
            userInitials={role === 'admin' ? institutionProfile.acronym || 'IES' : advisorInitials}
            borderClass={role === 'admin' ? 'border-sand-line' : 'border-line-soft'}
          />
        </div>
      </div>
    </header>
  );
}
