import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GraduatePortalLayout from '../components/dashboard/GraduatePortalLayout.jsx';
import CompanyPortalLayout from '../components/company/CompanyPortalLayout.jsx';
import InstitutionPortalLayout from '../components/institution/InstitutionPortalLayout.jsx';
import DocumentCorrections from '../components/documents/DocumentCorrections.jsx';
import { useVerificationStatus } from '../hooks/useVerificationStatus.js';

const paths = { graduate: '/dashboard', company: '/empresa/admin/perfil', institution: '/institucion/admin/perfil' };

export default function AccountVerificationPage({ kind }) {
  const navigate = useNavigate();
  const status = useVerificationStatus();
  useEffect(() => {
    if (status?.estado === 'aprobado') navigate(paths[kind], { replace: true });
  }, [status?.estado, kind, navigate]);

  const content = <main className="mx-auto max-w-5xl px-5 py-8 sm:py-10">
    <div className="mb-7">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-secondary">Mi expediente</p>
      <h1 className="mt-2 font-display text-2xl font-bold text-ink sm:text-3xl">Verificación de mi cuenta</h1>
      <p className="mt-2 text-sm text-secondary">Consulta el estado de tus documentos y las observaciones de quienes los revisan.</p>
    </div>
    {status?.estado !== 'aprobado' && <DocumentCorrections kind={kind} />}
  </main>;

  if (kind === 'graduate') return <GraduatePortalLayout activePage="verification">{content}</GraduatePortalLayout>;
  if (kind === 'company') return <CompanyPortalLayout activePage="admin-verificacion" role="admin">{content}</CompanyPortalLayout>;
  return <InstitutionPortalLayout activePage="admin-verificacion" role="admin">{content}</InstitutionPortalLayout>;
}
