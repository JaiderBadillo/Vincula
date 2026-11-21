import InstitutionPortalLayout from '../components/institution/InstitutionPortalLayout.jsx';
import InstitutionPageHero from '../components/institution/InstitutionPageHero.jsx';
import ConveniosPanel from '../components/convenios/ConveniosPanel.jsx';
import { advisorPhotos } from '../data/institutionImages.js';

export default function InstitutionCompanyValidationPage() {
  return (
    <InstitutionPortalLayout activePage="empresas-solicitudes">
      <main className="w-full pb-16">
        <div className="mx-auto max-w-5xl space-y-8 px-5 pt-8 sm:px-8 lg:px-10">
          <InstitutionPageHero
            title="Convenios con empresas"
            subtitle="Propón alianzas a las empresas o responde las que te envíen. Con un convenio vigente, la empresa puede publicar vacantes exclusivas para tus egresados."
            photo={advisorPhotos.companyValidation}
          />
          <ConveniosPanel lado="ies" />
        </div>
      </main>
    </InstitutionPortalLayout>
  );
}
