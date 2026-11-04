import { Link } from 'react-router-dom';
import CompanyPortalLayout from '../components/company/CompanyPortalLayout.jsx';
import CompanyPageHero from '../components/company/CompanyPageHero.jsx';
import { companyNavSections } from '../components/company/CompanySidebar.jsx';
import { companyPhotos } from '../data/companyImages.js';

const BLOCK_BY_PAGE = {
  'admin-sedes': { block: 3, photo: 'sedes', summary: 'Sedes de la empresa y cobertura de cada reclutador.' },
  'admin-reclutadores': { block: 2, photo: 'reclutadores', summary: 'Gestión y asignación de sedes para el equipo de reclutadores.' },
  'admin-vacantes': { block: 4, photo: 'vacantes', summary: 'Control central de vacantes y su reclutador responsable.' },
  'admin-convenios': { block: 5, photo: 'convenios', summary: 'Convenios vigentes con instituciones y renovaciones.' },
  'admin-actividad': { block: 6, photo: 'actividad', summary: 'Métricas de contratación, desempeño y bitácora de actividad.' },
  'admin-configuracion': { block: 7, photo: 'configuracion', summary: 'Notificaciones, seguridad de la cuenta y control de acceso.' },
};

/** Página temporal para secciones de la ruta que aún no se construyen. */
export default function CompanyAdminPlaceholderPage({ activePage }) {
  const item = companyNavSections.flatMap((s) => s.items).find((i) => i.id === activePage);
  const info = BLOCK_BY_PAGE[activePage];

  return (
    <CompanyPortalLayout activePage={activePage}>
      <main className="w-full pb-20">
        <div className="mx-auto max-w-6xl px-5 pt-6 sm:px-8 lg:px-10">
          <CompanyPageHero
            photo={companyPhotos[info?.photo] || companyPhotos.perfil}
            title={item?.label || 'Sección en construcción'}
            subtitle={info?.summary}
          />
          <Link
            to="/empresa/admin/perfil"
            className="mt-6 inline-flex items-center gap-1.5 rounded-xl border border-sand-line bg-white px-4 py-2 text-xs font-bold text-ink no-underline shadow-2xs transition-colors hover:bg-sand"
          >
            <i className="bx bx-arrow-back text-sm text-terracotta" />
            <span>Volver a los datos de la empresa</span>
          </Link>
        </div>
      </main>
    </CompanyPortalLayout>
  );
}
