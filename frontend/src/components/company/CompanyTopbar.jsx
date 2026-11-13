import { useCompanyProfile } from '../../hooks/useCompanyProfile.js';
import { recruiterProfile } from '../../data/companyRecruiterDashboardData.js';
import { authService } from '../../services/authService.js';
import UserAccountDropdown from '../common/UserAccountDropdown.jsx';

function formatDashboardDate(date) {
  const formattedDate = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);

  return `${formattedDate.charAt(0).toLocaleUpperCase('es-CO')}${formattedDate.slice(1)}`;
}

export default function CompanyTopbar({
  onMenuToggle,
  mobileMenuOpen,
  menuButtonRef,
  sidebarCollapsed,
  onSidebarToggle,
  role = 'admin',
}) {
  const { companyProfile } = useCompanyProfile();
  const currentUser = authService.getCurrentUser();

  const recruiterName = currentUser?.nombre || recruiterProfile.fullName || 'Equipo de Selección';
  const recruiterInitials = recruiterName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase() || 'RC';

  const companyAdminName = companyProfile.name || companyProfile.commercialName || companyProfile.legalName || 'Empresa';
  const companyInitials = companyAdminName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase() || 'EM';

  return (
    <header className="sticky top-0 z-20 border-b border-sand-line bg-cream/95 backdrop-blur-sm">
      <div className="flex min-h-[4.75rem] w-full items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
        <div className="flex min-w-0 items-center gap-3">
          <button
            className="hidden size-10 shrink-0 place-items-center rounded-control border border-line bg-white text-xl text-ink shadow-xs transition-colors hover:bg-panel min-[1200px]:grid cursor-pointer"
            type="button"
            aria-label={sidebarCollapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}
            aria-expanded={!sidebarCollapsed}
            aria-controls="company-sidebar"
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
            aria-controls="company-sidebar"
            onClick={onMenuToggle}
          >
            <i className={`bx ${mobileMenuOpen ? 'bx-x' : 'bx-menu'}`} aria-hidden="true" />
          </button>
          <p className="truncate text-xs sm:text-sm font-semibold text-ink leading-tight">
            {formatDashboardDate(new Date())}
          </p>
        </div>

        {/* Menú de cuenta en la esquina superior derecha */}
        {role === 'recruiter' ? (
          <UserAccountDropdown
            role="company_recruiter"
            userName={recruiterName}
            userSubtitle={`Reclutador(a) · ${companyProfile.name}`}
            userAvatar={recruiterProfile.avatar}
            userInitials={recruiterInitials}
            borderClass="border-sand-line"
          />
        ) : (
          <UserAccountDropdown
            role="company_admin"
            userName={companyAdminName}
            userSubtitle={`Cuenta Empresarial · NIT ${companyProfile.nit}`}
            userAvatar={companyProfile.logo}
            userInitials={companyInitials}
            borderClass="border-sand-line"
          />
        )}
      </div>
    </header>
  );
}
