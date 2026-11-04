import { useState } from 'react';
import { Link } from 'react-router-dom';
import { advisorProfile } from '../../data/institutionData.js';
import { useInstitutionProfile } from '../../hooks/useInstitutionProfile.js';

function Brand({ collapsed = false, role = 'advisor' }) {
  const isAdmin = role === 'admin';
  return (
    <Link
      className={`flex items-center text-ink no-underline ${collapsed ? 'w-full justify-center' : 'w-fit gap-3'}`}
      to={isAdmin ? '/institucion/admin/perfil' : '/institucion/dashboard'}
      aria-label="Vincula IES, portal institucional"
      title={collapsed ? 'Vincula IES' : undefined}
    >
      <span
        className={`grid size-10 shrink-0 place-items-center rounded-xl border text-2xl shadow-xs ${
          isAdmin
            ? 'border-sand-line bg-sand/70 text-terracotta'
            : 'border-green/20 bg-green/10 text-green-dark'
        }`}
        aria-hidden="true"
      >
        <i className="bx bxs-institution" />
      </span>
      <span className={collapsed ? 'sr-only' : 'grid gap-0.5'}>
        <span className="font-display text-[0.8rem] font-bold tracking-[0.14em] flex items-center gap-1.5">
          VINCULA{' '}
          <span
            className={`rounded px-1.5 py-0.2 text-[0.62rem] font-black uppercase tracking-wider ${
              isAdmin ? 'bg-terracotta text-white font-bold' : 'bg-lime text-ink'
            }`}
          >
            {isAdmin ? 'Admin' : 'IES'}
          </span>
        </span>
        <span className="text-[0.6rem] font-medium tracking-wide text-secondary">
          Portal Institucional IES
        </span>
      </span>
    </Link>
  );
}

function AdvisorProfileCard({ collapsed = false }) {
  const [imgError, setImgError] = useState(false);
  const initials = advisorProfile.fullName
    .replace('Dra. ', '')
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  const avatar = (
    <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-page font-display text-xs font-bold text-green-dark shadow-xs">
      {advisorProfile.avatar && !imgError ? (
        <img
          src={advisorProfile.avatar}
          alt={advisorProfile.fullName}
          onError={() => setImgError(true)}
          className="size-full object-cover"
        />
      ) : (
        initials
      )}
    </span>
  );

  if (collapsed) {
    return (
      <div className="flex w-full justify-center" title={advisorProfile.fullName}>
        {avatar}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 min-w-0" title={advisorProfile.fullName}>
      {avatar}
      <p className="m-0 min-w-0 truncate text-sm font-semibold text-ink">
        {advisorProfile.fullName}
      </p>
    </div>
  );
}

function AdminProfileCard({ collapsed = false, profile }) {
  const brandIcon = profile?.logo ? (
    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white p-1 border border-sand-line shadow-2xs overflow-hidden">
      <img
        src={profile.logo}
        alt={profile.name}
        className="size-full object-contain"
      />
    </span>
  ) : (
    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-cocoa text-ochre font-display text-xs font-bold shadow-2xs">
      {profile?.acronym || 'IES'}
    </span>
  );

  if (collapsed) {
    return (
      <div className="flex w-full justify-center" title={profile?.name}>
        {brandIcon}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 min-w-0" title={profile?.name}>
      {brandIcon}
      <p className="m-0 min-w-0 truncate text-sm font-semibold text-ink">
        {profile?.name}
      </p>
    </div>
  );
}

const adminNavSections = [
  {
    title: 'Mi institución',
    items: [
      { id: 'admin-perfil', label: 'Datos de la institución', icon: 'bx-buildings', to: '/institucion/admin/perfil' },
      { id: 'admin-sedes', label: 'Sedes y Campus', icon: 'bx-map-pin', to: '/institucion/admin/asesores?tab=sedes' },
      { id: 'admin-programas', label: 'Programas y Carreras', icon: 'bx-book-bookmark', to: '/institucion/admin/programas' },
      { id: 'admin-trazabilidad', label: 'Trazabilidad y Pensums', icon: 'bx-line-chart', to: '/institucion/admin/trazabilidad' },
      { id: 'admin-asesores', label: 'Asesores por Sede', icon: 'bx-group', to: '/institucion/admin/asesores' },
    ],
  },
];

const advisorNavSections = [
  {
    title: 'Panel General',
    items: [
      {
        id: 'dashboard',
        label: 'Inicio',
        icon: 'bx-home-alt-2',
        to: '/institucion/dashboard',
      },
    ],
  },
  {
    title: 'Egresados',
    items: [
      {
        id: 'estudiantes-solicitudes',
        label: 'Validar Egresados',
        icon: 'bx-user-check',
        to: '/institucion/estudiantes/solicitudes',
        badge: '14',
        badgeColor: 'bg-emerald-700 text-white font-bold',
      },
      {
        id: 'estudiantes-seguimiento',
        label: 'Seguimiento Laboral',
        icon: 'bx-history',
        to: '/institucion/estudiantes/seguimiento',
      },
      {
        id: 'estudiantes-estadisticas',
        label: 'Estadísticas de Colocación',
        icon: 'bx-bar-chart-alt-2',
        to: '/institucion/estudiantes/estadisticas',
      },
    ],
  },
  {
    title: 'Empresas y Convenios',
    items: [
      {
        id: 'empresas-solicitudes',
        label: 'Validar Convenios',
        icon: 'bx-buildings',
        to: '/institucion/empresas/solicitudes',
        badge: '5',
        badgeColor: 'bg-sand text-cocoa font-bold border border-sand-line',
      },
      {
        id: 'empresas-seguimiento',
        label: 'Seguimiento a Empresas',
        icon: 'bx-line-chart-down',
        to: '/institucion/empresas/seguimiento',
      },
    ],
  },
  {
    title: 'Mercado Laboral',
    items: [
      {
        id: 'competencias',
        label: 'Habilidades Demandadas',
        icon: 'bx-radar',
        to: '/institucion/mercado-laboral/competencias',
      },
    ],
  },
];

export default function InstitutionSidebar({
  activePage = 'dashboard',
  mobileOpen = false,
  onClose,
  collapsed = false,
  role = 'advisor',
}) {
  const { institutionProfile } = useInstitutionProfile();
  const navSections = role === 'admin' ? adminNavSections : advisorNavSections;

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-ink/50 backdrop-blur-xs transition-opacity duration-200 min-[1200px]:hidden ${
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Sidebar container: permanent white bar */}
      <aside
        id="institution-sidebar"
        className={`fixed bottom-0 top-0 z-40 flex flex-col border-r ${
          role === 'admin' ? 'border-sand-line' : 'border-line'
        } bg-white text-ink shadow-xs transition-[width,transform] duration-200 ease-out min-[1200px]:translate-x-0 ${
          collapsed ? 'min-[1200px]:w-[5.5rem]' : 'min-[1200px]:w-[17.5rem]'
        } ${mobileOpen ? 'left-0 w-72 translate-x-0' : '-translate-x-full min-[1200px]:translate-x-0'}`}
        aria-label={role === 'admin' ? 'Navegación del administrador institucional' : 'Navegación del asesor institucional'}
      >
        {/* Top Header */}
        <div
          className={`flex min-h-[4.75rem] items-center border-b ${
            role === 'admin' ? 'border-sand-line' : 'border-line'
          } ${collapsed ? 'justify-center px-3' : 'justify-between px-5'}`}
        >
          <Brand collapsed={collapsed} role={role} />

          {mobileOpen && (
            <button
              type="button"
              onClick={onClose}
              className="grid size-8 place-items-center rounded-lg text-secondary hover:bg-page hover:text-ink transition-colors min-[1200px]:hidden cursor-pointer"
              aria-label="Cerrar menú"
            >
              <i className="bx bx-x text-2xl" />
            </button>
          )}
        </div>

        {/* Profile identity: foto/logo y nombre sin recuadro ni línea divisoria artificial */}
        <div className={`px-5 pt-4 pb-2 ${collapsed ? 'px-2 py-3' : ''}`}>
          {role === 'admin' ? (
            <AdminProfileCard collapsed={collapsed} profile={institutionProfile} />
          ) : (
            <AdvisorProfileCard collapsed={collapsed} />
          )}
        </div>

        {/* Scrollable Navigation */}
        <nav
          className={`flex-1 overflow-y-auto px-3.5 pb-6 space-y-5 scrollbar-none ${collapsed ? 'pt-2' : 'pt-3'}`}
          aria-label="Menú principal de gestión IES"
        >
          {navSections.map((section) => (
            <div key={section.title}>
              <p
                className={`mb-2 px-2.5 text-[0.58rem] font-bold uppercase tracking-[0.16em] text-secondary ${
                  collapsed ? 'sr-only' : ''
                }`}
              >
                {section.title}
              </p>
              <ul className="m-0 grid list-none gap-0.5 p-0">
                {section.items.map((item) => {
                  const isActive = activePage === item.id;

                  return (
                    <li key={item.id}>
                      <Link
                        to={item.to}
                        onClick={onClose}
                        title={collapsed ? item.label : undefined}
                        className={`group relative flex min-h-10 items-center rounded-xl text-[0.8rem] no-underline transition-all duration-150 ${
                          collapsed ? 'justify-center px-0' : 'gap-3 px-3'
                        } ${
                          isActive
                            ? role === 'admin'
                              ? 'bg-sand font-bold text-cocoa'
                              : 'bg-green/10 font-bold text-green-dark shadow-xs'
                            : role === 'admin'
                              ? 'font-medium text-secondary hover:bg-cream hover:text-cocoa'
                              : 'font-medium text-secondary hover:bg-page hover:text-ink'
                        }`}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        {isActive && (
                          <span
                            className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full ${
                              role === 'admin' ? 'bg-terracotta' : 'bg-green'
                            }`}
                            aria-hidden="true"
                          />
                        )}

                        <i
                          className={`bx ${item.icon} shrink-0 text-lg transition-colors ${
                            isActive
                              ? role === 'admin'
                                ? 'text-terracotta'
                                : 'text-green-dark'
                              : role === 'admin'
                                ? 'text-secondary group-hover:text-terracotta'
                                : 'text-secondary group-hover:text-green-dark'
                          }`}
                          aria-hidden="true"
                        />

                        <span className={`truncate flex-1 ${collapsed ? 'sr-only' : ''}`}>{item.label}</span>

                        {!collapsed && item.badge && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[0.62rem] ${
                              item.badgeColor || 'bg-panel text-ink border border-line'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {/* Cambio de vista (mientras no exista el inicio de sesión por rol) */}
          <div className={`pt-2 space-y-0.5 border-t ${role === 'admin' ? 'border-sand-line' : 'border-line'}`}>
            <Link
              to={role === 'admin' ? '/institucion/dashboard' : '/institucion/admin/perfil'}
              className={`flex items-center rounded-xl p-2.5 text-[0.72rem] text-secondary ${
                role === 'admin' ? 'hover:text-terracotta hover:bg-cream' : 'hover:text-green-dark hover:bg-page'
              } no-underline transition-colors ${
                collapsed ? 'justify-center' : 'gap-2'
              }`}
              title={role === 'admin' ? 'Ver como asesor' : 'Ver como administrador'}
            >
              <i className="bx bx-transfer-alt text-base text-secondary" />
              <span className={collapsed ? 'sr-only' : ''}>
                {role === 'admin' ? 'Ver como asesor' : 'Ver como administrador'}
              </span>
            </Link>
            <Link
              to="/empresa/admin/perfil"
              className={`flex items-center rounded-xl p-2.5 text-[0.72rem] text-secondary ${
                role === 'admin' ? 'hover:text-terracotta hover:bg-cream' : 'hover:text-green-dark hover:bg-page'
              } no-underline transition-colors ${
                collapsed ? 'justify-center' : 'gap-2'
              }`}
              title="Ver como administrador de empresa"
            >
              <i className="bx bxs-business text-base text-secondary" />
              <span className={collapsed ? 'sr-only' : ''}>Ver como empresa</span>
            </Link>
            <Link
              to="/dashboard"
              className={`flex items-center rounded-xl p-2.5 text-[0.72rem] text-secondary ${
                role === 'admin' ? 'hover:text-terracotta hover:bg-cream' : 'hover:text-green-dark hover:bg-page'
              } no-underline transition-colors ${
                collapsed ? 'justify-center' : 'gap-2'
              }`}
              title="Vista de Egresado"
            >
              <i className="bx bx-arrow-back text-base text-secondary" />
              <span className={collapsed ? 'sr-only' : ''}>Ir a Portal Egresados</span>
            </Link>
          </div>
        </nav>
      </aside>
    </>
  );
}
