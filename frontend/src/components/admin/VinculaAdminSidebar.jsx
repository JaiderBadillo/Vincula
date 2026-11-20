import { Link } from 'react-router-dom';
import { useVinculaAdmin } from '../../hooks/useVinculaAdmin.js';
import BrandMark from '../common/BrandMark.jsx';

function Brand({ collapsed }) {
  return (
    <Link
      className={`flex items-center text-ink no-underline ${collapsed ? 'w-full justify-center' : 'w-fit gap-3'}`}
      to="/admin/dashboard"
      aria-label="Vincula Plataforma"
      title={collapsed ? 'Vincula Plataforma' : undefined}
    >
      <BrandMark className="h-7" />
      <span className={collapsed ? 'sr-only' : 'grid gap-0.5'}>
        <span className="font-display text-[0.8rem] font-bold tracking-[0.14em] flex items-center gap-1.5">
          VINCULA{' '}
          <span className="rounded bg-ochre px-1.5 py-0.2 text-[0.62rem] font-black text-cocoa uppercase tracking-wider">
            Super Admin
          </span>
        </span>
        <span className="text-[0.6rem] font-medium tracking-wide text-secondary">
          Plataforma & Verificación
        </span>
      </span>
    </Link>
  );
}

export default function VinculaAdminSidebar({
  activePage = 'admin-dashboard',
  mobileOpen = false,
  onClose,
  collapsed = false,
}) {
  const { metrics } = useVinculaAdmin();

  const navSections = [
    {
      title: 'Panel Central',
      items: [
        {
          id: 'admin-dashboard',
          label: 'Inicio & Métricas',
          icon: 'bx-home-alt-2',
          to: '/admin/dashboard',
        },
      ],
    },
    {
      title: 'Validación y Acreditación',
      items: [
        {
          id: 'admin-empresas',
          label: 'Aprobar Empresas',
          icon: 'bx-buildings',
          to: '/admin/empresas',
          badge: metrics.pendingCompanies > 0 ? String(metrics.pendingCompanies) : null,
          badgeColor: 'bg-terracotta text-white font-bold',
        },
        {
          id: 'admin-instituciones',
          label: 'Aprobar IES (Universidades)',
          icon: 'bx-graduation',
          to: '/admin/instituciones',
          badge: metrics.pendingInstitutions > 0 ? String(metrics.pendingInstitutions) : null,
          badgeColor: 'bg-ochre text-cocoa font-bold',
        },
      ],
    },
    {
      title: 'Moderación',
      items: [
        {
          id: 'admin-moderacion',
          label: 'Reportes y moderación',
          icon: 'bx-shield-quarter',
          to: '/admin/moderacion',
        },
      ],
    },
  ];

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
        id="vincula-admin-sidebar"
        className={`fixed bottom-0 top-0 z-40 flex flex-col border-r border-sand-line bg-white text-ink shadow-xs transition-[width,transform] duration-200 ease-out min-[1200px]:translate-x-0 ${
          collapsed ? 'min-[1200px]:w-[5.5rem]' : 'min-[1200px]:w-[17.5rem]'
        } ${mobileOpen ? 'left-0 w-72 translate-x-0' : '-translate-x-full min-[1200px]:translate-x-0'}`}
        aria-label="Navegación del super administrador"
      >
        <div
          className={`flex min-h-[4.75rem] items-center border-b border-sand-line ${
            collapsed ? 'justify-center px-3' : 'justify-between px-5'
          }`}
        >
          <Brand collapsed={collapsed} />
          {mobileOpen && (
            <button
              type="button"
              onClick={onClose}
              className="grid size-8 place-items-center rounded-lg text-secondary hover:bg-cream hover:text-ink transition-colors min-[1200px]:hidden cursor-pointer"
              aria-label="Cerrar menú"
            >
              <i className="bx bx-x text-xl" />
            </button>
          )}
        </div>

        <nav
          className="flex-1 overflow-y-auto px-3 py-4 space-y-6"
          aria-label="Módulos de administración"
        >
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1">
              {!collapsed && (
                <p className="px-3 pb-1 text-xs font-semibold text-secondary">
                  {section.title}
                </p>
              )}
              <ul className="space-y-0.5 list-none p-0 m-0">
                {section.items.map((item) => {
                  const isActive = activePage === item.id;
                  return (
                    <li key={item.id}>
                      <Link
                        to={item.to}
                        onClick={() => mobileOpen && onClose()}
                        className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold no-underline transition-all cursor-pointer ${
                          collapsed ? 'justify-center px-0' : ''
                        } ${
                          isActive
                            ? 'bg-cocoa text-white shadow-xs'
                            : 'text-ink hover:bg-cream hover:text-terracotta'
                        }`}
                        title={collapsed ? item.label : undefined}
                      >
                        <i
                          className={`bx ${item.icon} text-lg shrink-0 transition-colors ${
                            isActive
                              ? 'text-ochre'
                              : 'text-secondary group-hover:text-terracotta'
                          }`}
                        />
                        {!collapsed && (
                          <div className="flex flex-1 items-center justify-between gap-1 overflow-hidden">
                            <span className="truncate">{item.label}</span>
                            {item.badge && (
                              <span
                                className={`rounded-full px-2 py-0.2 text-[0.62rem] ${item.badgeColor}`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </div>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}

