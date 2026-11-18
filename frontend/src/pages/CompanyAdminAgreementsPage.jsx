import CompanyPortalLayout from '../components/company/CompanyPortalLayout.jsx';
import CompanyPageHero from '../components/company/CompanyPageHero.jsx';
import ConveniosPanel from '../components/convenios/ConveniosPanel.jsx';
import { companyPhotos } from '../data/companyImages.js';

export default function CompanyAdminAgreementsPage() {
  return (
    <CompanyPortalLayout activePage="admin-convenios">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-4 sm:p-6 lg:p-8">
        <CompanyPageHero
          photo={companyPhotos.convenios}
          title="Convenios con instituciones"
          subtitle="Propón alianzas a las instituciones o responde las que te envíen, y publica vacantes exclusivas para sus egresados."
        />
        <ConveniosPanel lado="empresa" accent="bg-terracotta hover:bg-terracotta-dark" />
      </main>
    </CompanyPortalLayout>
  );
}
