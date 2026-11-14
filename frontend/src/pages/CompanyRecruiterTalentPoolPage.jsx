import { Link } from 'react-router-dom';
import CompanyPortalLayout from '../components/company/CompanyPortalLayout.jsx';

export default function CompanyRecruiterTalentPoolPage() {
  return (
    <CompanyPortalLayout activePage="recruiter-talento" role="recruiter">
      <main className="mx-auto max-w-4xl px-5 py-12 sm:px-8">
        <section className="rounded-2xl border border-sand-line bg-white p-8 shadow-sm">
          <span className="grid size-12 place-items-center rounded-xl bg-sand text-2xl text-cocoa"><i className="bx bx-search-alt" /></span>
          <h1 className="mt-5 font-display text-2xl font-bold text-ink">Banco de talento IES</h1>
          <p className="mt-3 text-sm leading-6 text-secondary">La búsqueda de talento todavía no cuenta con una consulta verificada a la base de datos. Por eso no mostramos perfiles de ejemplo como si fueran candidatos disponibles.</p>
          <Link to="/empresa/reclutador/candidatos" className="mt-5 inline-block rounded-xl bg-cocoa px-5 py-3 text-sm font-bold text-white no-underline">Ver postulaciones reales</Link>
        </section>
      </main>
    </CompanyPortalLayout>
  );
}
