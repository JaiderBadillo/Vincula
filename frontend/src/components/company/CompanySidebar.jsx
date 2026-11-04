import { Link } from 'react-router-dom';
import { useCompanyProfile } from '../../hooks/useCompanyProfile.js';
import CompanyLogo from './CompanyLogo.jsx';
import { recruiterProfile } from '../../data/companyRecruiterDashboardData.js';

export const companyNavSections = [
  {
    title: 'Mi empresa',
    items: [
      { id: 'admin-perfil', label: 'Datos de la empresa', icon: 'bx-buildings', to: '/empresa/admin/perfil', ready: true },
      { id: 'admin-sedes', label: 'Sedes y Áreas', icon: 'bx-map-pin', to: '/empresa/admin/sedes', ready: true },
    ],
  },
  {
    title: 'Equipo de selección',
    items: [
      { id: 'admin-reclutadores', label: 'Reclutadores', icon: 'bx-group', to: '/empresa/admin/reclutadores', ready: true },
      { id: 'admin-vacantes', label: 'Vacantes', icon: 'bx-briefcase-alt-2', to: '/empresa/admin/vacantes', ready: true },
    ],
  },
  {
    title: 'Relaciones y control',
    items: [
      { id: 'admin-convenios', label: 'Convenios con IES', icon: 'bx-link-alt', to: '/empresa/admin/convenios', ready: true },
      { id: 'admin-actividad', label: 'Actividad y Métricas', icon: 'bx-bar-chart-alt-2', to: '/empresa/admin/actividad', ready: true },
    ],
  },
];

export const recruiterNavSections = [
  {
    title: 'Panel General',
    items: [
      { id: 'recruiter-dashboard', label: 'Inicio', icon: 'bx-home-alt-2', to: '/empresa/reclutador/dashboard', ready: true },
    ],
  },
  {
    title: 'Selección y Talento',
    items: [
      {
        id: 'recruiter-candidatos',
        label: 'Candidatos y Embudo',
        icon: 'bx-user-check',
        to: '/empresa/reclutador/candidatos',
        badge: '14',
        badgeColor: 'bg-terracotta text-white font-bold',
        ready: true,
      },
      {
        id: 'recruiter-vacantes',
        label: 'Mis Vacantes',
        icon: 'bx-briefcase-alt-2',
        to: '/empresa/reclutador/vacantes',
        badge: '5',
        badgeColor: 'bg-ochre/25 text-cocoa font-bold',
        ready: true,
      },
      {
        id: 'recruiter-talento',
        label: 'Banco de Talento IES',
        icon: 'bx-search-alt',
        to: '/empresa/reclutador/talento',
        badge: 'Sourcing',
        badgeColor: 'bg-ochre/25 text-cocoa font-bold',
        ready: true,
      },
    ],
  },
];

function Brand({ collapsed, role = 'admin' }) {
  const targetHome = role === 'recruiter' ? '/empresa/reclutador/dashboard' : '/empresa/admin/perfil';
  return (
    <Link
      className={`flex items-center text-ink no-underline ${collapsed ? 'w-full justify-center' : 'w-fit gap-3'}`}
      to={targetHome}
      aria-label="Vincula Empresas"
      title={collapsed ? 'Vincula Empresas' : undefined}
    >
      <span
        className="grid size-10 shrink-0 place-items-center rounded-xl border border-terracotta/25 bg-terracotta/10 text-2xl text-terracotta shadow-xs"
        aria-hidden="true"
      >
        <i className="bx bxs-business" />
      </span>
      <span className={collapsed ? 'sr-only' : 'grid gap-0.5'}>
        <span className="font-display text-[0.8rem] font-bold tracking-[0.14em] flex items-center gap-1.5">
          VINCULA{' '}
          <span className="rounded bg-ochre px-1.5 py-0.2 text-[0.62rem] font-black text-cocoa uppercase tracking-wider">
            {role === 'recruiter' ? 'Selección' : 'Empresas'}
          </span>
        </span>
        <span className="text-[0.6rem] font-medium tracking-wide text-secondary">
          {role === 'recruiter' ? 'Portal de Reclutamiento' : 'Administración Central'}
        </span>
      </span>
    </Link>
  );
}

export default function CompanySidebar({
  activePage = 'admin-perfil',
  mobileOpen = false,
  onClose,
  collapsed = false,
  role = 'admin',
}) {
  const { companyProfile } = useCompanyProfile();
  const navSections = role === 'recruiter' ? recruiterNavSections : companyNavSections;

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-ink/50 backdrop-blur-xs transition-opacity duration-200 min-[1200px]:hidden ${
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden="true"
        onClick={onClose}
      />

      <aside
        id="company-sidebar"
        className={`fixed bottom-0 top-0 z-40 flex flex-col border-r border-sand-line bg-white text-ink shadow-xs transition-[width,transform] duration-200 ease-out min-[1200px]:translate-x-0 ${
          collapsed ? 'min-[1200px]:w-[5.5rem]' : 'min-[1200px]:w-[17.5rem]'
        } ${mobileOpen ? 'left-0 w-72 translate-x-0' : '-translate-x-full min-[1200px]:translate-x-0'}`}
        aria-label="Navegación del portal de empresa"
      >
        <div
          className={`flex min-h-[4.75rem] items-center border-b border-sand-line ${
            collapsed ? 'justify-center px-3' : 'justify-between px-5'
          }`}
        >
          <Brand collapsed={collapsed} role={role} />
          {mobileOpen && (
            <button
              type="button"
              onClick={onClose}
              className="grid size-8 place-items-center rounded-lg text-secondary hover:bg-cream hover:text-ink transition-colors min-[1200px]:hidden cursor-pointer"
              aria-label="Cerrar menú"
            >
              <i className="bx bx-x text-2xl" />
            </button>
          )}
        </div>

        {/* Identidad del perfil activo en el sidebar */}
        <div className={`px-5 pt-4 pb-2 ${collapsed ? 'px-2 py-3' : ''}`}>
          {role === 'recruiter' ? (
            <div
              className={`flex items-center min-w-0 ${collapsed ? 'justify-center' : 'gap-3'}`}
              title={recruiterProfile.fullName}
            >
              <img
                src={recruiterProfile.avatar}
                alt=""
                className="size-9 rounded-xl object-cover border border-sand-line shadow-2xs shrink-0"
              />
              {!collapsed && (
                <div className="min-w-0">
                  <p className="m-0 truncate text-sm font-semibold text-ink leading-tight">
                    {recruiterProfile.fullName}
                  </p>
                  <span className="text-[0.62rem] text-secondary">
                    {recruiterProfile.role}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div
              className={`flex items-center min-w-0 ${collapsed ? 'justify-center' : 'gap-3'}`}
              title={companyProfile.name}
            >
              <CompanyLogo profile={companyProfile} size="size-9" />
              {!collapsed && (
                <p className="m-0 min-w-0 truncate text-sm font-semibold text-ink leading-tight">
                  {companyProfile.name}
                </p>
              )}
            </div>
          )}
        </div>

        <nav
          className={`flex-1 overflow-y-auto px-3.5 pb-6 space-y-5 scrollbar-none ${collapsed ? 'pt-2' : 'pt-3'}`}
          aria-label="Menú principal"
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
                            ? 'bg-sand font-bold text-cocoa'
                            : 'font-medium text-secondary hover:bg-cream hover:text-cocoa'
                        }`}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        {isActive && (
                          <span
                            className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-terracotta"
                            aria-hidden="true"
                          />
                        )}
                        <i
                          className={`bx ${item.icon} shrink-0 text-lg transition-colors ${
                            isActive ? 'text-terracotta' : 'text-secondary group-hover:text-terracotta'
                          }`}
                          aria-hidden="true"
                        />
                        <span className={`truncate flex-1 ${collapsed ? 'sr-only' : ''}`}>{item.label}</span>
                        {!collapsed && item.badge && (
                          <span
                            className={`rounded-full px-2 py-0.2 text-[0.62rem] ${
                              item.badgeColor || 'bg-sand text-cocoa'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                        {!collapsed && !item.ready && !item.badge && (
                          <span className="text-[0.62rem] font-medium text-secondary">Pronto</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {/* Selector de rol / cambio de vista (análogo al de la IES) */}
          <div className="pt-2 space-y-0.5 border-t border-sand-line">
            {role === 'recruiter' ? (
              <Link
                to="/empresa/admin/perfil"
                className={`flex items-center rounded-xl p-2.5 text-[0.72rem] text-secondary hover:text-terracotta hover:bg-cream no-underline transition-colors ${
                  collapsed ? 'justify-center' : 'gap-2'
                }`}
                title="Ver como administrador de empresa"
              >
                <i className="bx bxs-business text-base text-secondary" />
                <span className={collapsed ? 'sr-only' : ''}>Ver como administrador</span>
              </Link>
            ) : (
              <Link
                to="/empresa/reclutador/dashboard"
                className={`flex items-center rounded-xl p-2.5 text-[0.72rem] text-secondary hover:text-terracotta hover:bg-cream no-underline transition-colors ${
                  collapsed ? 'justify-center' : 'gap-2'
                }`}
                title="Ver como reclutador"
              >
                <i className="bx bx-user-voice text-base text-secondary" />
                <span className={collapsed ? 'sr-only' : ''}>Ver como reclutador</span>
              </Link>
            )}

            <Link
              to="/institucion/admin/perfil"
              className={`flex items-center rounded-xl p-2.5 text-[0.72rem] text-secondary hover:text-terracotta hover:bg-cream no-underline transition-colors ${
                collapsed ? 'justify-center' : 'gap-2'
              }`}
              title="Ver como administrador de la institución"
            >
              <i className="bx bx-transfer-alt text-base text-secondary" />
              <span className={collapsed ? 'sr-only' : ''}>Ver como institución IES</span>
            </Link>
            <Link
              to="/dashboard"
              className={`flex items-center rounded-xl p-2.5 text-[0.72rem] text-secondary hover:text-terracotta hover:bg-cream no-underline transition-colors ${
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
