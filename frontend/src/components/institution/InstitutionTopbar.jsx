import { useState } from 'react';
import { advisorProfile } from '../../data/institutionData.js';
import { useInstitutionProfile } from '../../hooks/useInstitutionProfile.js';

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

  const advisorInitials = advisorProfile.fullName
    .replace('Dra. ', '')
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
  return (
    <header className="sticky top-0 z-20 border-b border-line-soft bg-page/95 backdrop-blur-sm">
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
          {/* Institution Badge (solo para asesor, pues para admin la cuenta ya es la universidad) */}
          {role !== 'admin' && (
            <div className="hidden md:flex items-center gap-2 rounded-full border border-green/20 bg-green/5 px-3 py-1.5 text-xs text-green-dark">
              <i className="bx bxs-badge-check text-green text-base" aria-hidden="true" />
              <span className="font-bold truncate max-w-[15rem]">
                UTS · Unidades Tecnológicas de Santander
              </span>
            </div>
          )}

          {/* Quick Alert Bell (solo asesor) */}
          {role !== 'admin' && (
            <div className="relative">
              <span
                className="grid size-9 place-items-center rounded-xl border border-line bg-white text-ink text-lg shadow-2xs"
                title="19 solicitudes pendientes en cola"
              >
                <i className="bx bx-bell" />
              </span>
              <span className="absolute -top-1 -right-1 grid size-4 place-items-center rounded-full bg-amber-500 text-[0.6rem] font-black text-ink ring-2 ring-page">
                19
              </span>
            </div>
          )}

          {/* Account Profile Card (Universidad para Admin, Asesor para Advisor) */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-line-soft">
            {role === 'admin' ? (
              <>
                {institutionProfile.logo ? (
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white p-1 border border-line shadow-2xs overflow-hidden">
                    <img
                      src={institutionProfile.logo}
                      alt={institutionProfile.name}
                      className="size-full object-contain"
                    />
                  </span>
                ) : (
                  <span className="grid size-9 place-items-center rounded-xl bg-ink font-display text-xs font-bold text-lime shadow-2xs">
                    {institutionProfile.acronym || 'IES'}
                  </span>
                )}
                <div className="hidden lg:block text-left">
                  <p className="m-0 font-display text-xs font-bold text-ink leading-tight">
                    {institutionProfile.name}
                  </p>
                  <p className="m-0 text-[0.62rem] text-secondary">
                    Cuenta Institucional · NIT {institutionProfile.nit}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="relative">
                  {advisorProfile.avatar && !avatarFailed ? (
                    <img
                      src={advisorProfile.avatar}
                      alt={advisorProfile.fullName}
                      onError={() => setAvatarFailed(true)}
                      className="size-9 rounded-full object-cover border border-green/30"
                    />
                  ) : (
                    <span className="grid size-9 place-items-center rounded-full bg-green/15 text-green-dark font-display text-xs font-bold border border-green/30">
                      {advisorInitials}
                    </span>
                  )}
                  <span className="absolute bottom-0 right-0 size-2 rounded-full bg-emerald-500 ring-1 ring-white" />
                </div>
                <div className="hidden lg:block text-left">
                  <p className="m-0 font-display text-xs font-bold text-ink leading-tight">
                    {advisorProfile.fullName}
                  </p>
                  <p className="m-0 text-[0.62rem] text-secondary">
                    {advisorProfile.role}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
