import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';
import GraduateChatbot from './components/dashboard/GraduateChatbot.jsx';
import CompanyAdminActivityPage from './pages/CompanyAdminActivityPage.jsx';
import CompanyAdminAgreementsPage from './pages/CompanyAdminAgreementsPage.jsx';
import CompanyRecruiterDashboardPage from './pages/CompanyRecruiterDashboardPage.jsx';
import CompanyRecruiterCandidatesPage from './pages/CompanyRecruiterCandidatesPage.jsx';
import CompanyRecruiterTalentPoolPage from './pages/CompanyRecruiterTalentPoolPage.jsx';
import CompanyRecruiterVacanciesPage from './pages/CompanyRecruiterVacanciesPage.jsx';
import CompanyAdminProfilePage from './pages/CompanyAdminProfilePage.jsx';
import CompanyAdminRecruitersPage from './pages/CompanyAdminRecruitersPage.jsx';
import CompanyAdminSitesPage from './pages/CompanyAdminSitesPage.jsx';
import CompanyAdminVacanciesPage from './pages/CompanyAdminVacanciesPage.jsx';
import CompanyAdminVacancyEditorPage from './pages/CompanyAdminVacancyEditorPage.jsx';
import CompanyRegistrationPage from './pages/CompanyRegistrationPage.jsx';
import GraduateDashboard from './pages/GraduateDashboard.jsx';
import GraduateRegistrationPage from './pages/GraduateRegistrationPage.jsx';
import HomePage from './pages/HomePage.jsx';
import InstitutionAdminAdvisorsPage from './pages/InstitutionAdminAdvisorsPage.jsx';
import InstitutionAdminProfilePage from './pages/InstitutionAdminProfilePage.jsx';
import InstitutionAdminProgramsPage from './pages/InstitutionAdminProgramsPage.jsx';
import InstitutionAdminTraceabilityPage from './pages/InstitutionAdminTraceabilityPage.jsx';
import InstitutionRegistrationPage from './pages/InstitutionRegistrationPage.jsx';
import InstitutionCompanyTrackingPage from './pages/InstitutionCompanyTrackingPage.jsx';
import InstitutionCompanyValidationPage from './pages/InstitutionCompanyValidationPage.jsx';
import InstitutionDashboardPage from './pages/InstitutionDashboardPage.jsx';
import InstitutionGraduateValidationPage from './pages/InstitutionGraduateValidationPage.jsx';
import InstitutionLaborMarketPage from './pages/InstitutionLaborMarketPage.jsx';
import InstitutionPlaceholderPage from './pages/InstitutionPlaceholderPage.jsx';
import InstitutionPlacementStatsPage from './pages/InstitutionPlacementStatsPage.jsx';
import InstitutionProgramDetailPage from './pages/InstitutionProgramDetailPage.jsx';
import InstitutionStudentTrackingPage from './pages/InstitutionStudentTrackingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import PasswordRecoveryPage from './pages/PasswordRecoveryPage.jsx';
import MyApplicationsPage from './pages/MyApplicationsPage.jsx';
import MyApplicationsProposalPage from './pages/MyApplicationsProposalPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import VacanciesPage from './pages/VacanciesPage.jsx';
import VacanciesProposalPage from './pages/VacanciesProposalPage.jsx';
import VinculaAdminDashboardPage from './pages/VinculaAdminDashboardPage.jsx';
import VinculaAdminCompaniesPage from './pages/VinculaAdminCompaniesPage.jsx';
import VinculaAdminInstitutionsPage from './pages/VinculaAdminInstitutionsPage.jsx';
import OnboardingTour from './components/common/OnboardingTour.jsx';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
        {/* ─── Rutas Públicas (Landing y Registro / Login) ─── */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/recuperar-contrasena" element={<PasswordRecoveryPage />} />
        <Route path="/registro-egresado" element={<GraduateRegistrationPage />} />
        <Route path="/registro-empresa" element={<CompanyRegistrationPage />} />
        <Route path="/registro-institucion" element={<InstitutionRegistrationPage />} />

        {/* ─── Rol Egresado (Dashboard) - Protegido ─── */}
        <Route element={<ProtectedRoute allowedRoles={['egresado', 'superadmin_vincula']} />}>
          <Route path="/dashboard" element={<GraduateDashboard />} />
          <Route path="/dashboard/postulaciones" element={<MyApplicationsPage />} />
          <Route path="/dashboard/postulaciones-propuesta" element={<MyApplicationsProposalPage />} />
          <Route path="/dashboard/vacantes" element={<VacanciesPage />} />
          <Route path="/dashboard/vacantes-propuesta" element={<VacanciesProposalPage />} />
          <Route path="/dashboard/perfil" element={<ProfilePage />} />
        </Route>

        {/* ─── Rol Institución de Educación Superior (Asesor IES) - Protegido ─── */}
        <Route element={<ProtectedRoute allowedRoles={['asesor_ies', 'admin_ies', 'superadmin_vincula']} />}>
          <Route path="/institucion" element={<Navigate to="/institucion/dashboard" replace />} />
          <Route path="/institucion/dashboard" element={<InstitutionDashboardPage />} />
          <Route path="/institucion/programas/:programId" element={<InstitutionProgramDetailPage />} />
          <Route
            path="/institucion/estudiantes/solicitudes"
            element={<InstitutionGraduateValidationPage />}
          />
          <Route
            path="/institucion/estudiantes/seguimiento"
            element={<InstitutionStudentTrackingPage />}
          />
          <Route
            path="/institucion/estudiantes/estadisticas"
            element={<InstitutionPlacementStatsPage />}
          />
          <Route
            path="/institucion/empresas/solicitudes"
            element={<InstitutionCompanyValidationPage />}
          />
          <Route
            path="/institucion/empresas/seguimiento"
            element={<InstitutionCompanyTrackingPage />}
          />
          <Route
            path="/institucion/mercado-laboral/competencias"
            element={<InstitutionLaborMarketPage />}
          />
        </Route>

        {/* ─── Rol Administrador de la Institución Educativa (Admin IES) - Protegido ─── */}
        <Route element={<ProtectedRoute allowedRoles={['admin_ies', 'superadmin_vincula']} />}>
          <Route path="/institucion/admin" element={<Navigate to="/institucion/admin/perfil" replace />} />
          <Route path="/institucion/admin/perfil" element={<InstitutionAdminProfilePage />} />
          <Route path="/institucion/admin/programas" element={<InstitutionAdminProgramsPage />} />
          <Route path="/institucion/admin/trazabilidad" element={<InstitutionAdminTraceabilityPage />} />
          <Route path="/institucion/admin/asesores" element={<InstitutionAdminAdvisorsPage />} />
          <Route path="/institucion/admin/sedes" element={<Navigate to="/institucion/admin/asesores?tab=sedes" replace />} />
        </Route>

        {/* ─── Rol Administrador de Empresa (ver docs/ROADMAP_ADMIN_EMPRESA.md) - Protegido ─── */}
        <Route element={<ProtectedRoute allowedRoles={['admin_empresa', 'superadmin_vincula']} />}>
          <Route path="/empresa" element={<Navigate to="/empresa/admin/perfil" replace />} />
          <Route path="/empresa/admin" element={<Navigate to="/empresa/admin/perfil" replace />} />
          <Route path="/empresa/dashboard" element={<Navigate to="/empresa/admin/actividad" replace />} />
          <Route path="/empresa/actividad" element={<Navigate to="/empresa/admin/actividad" replace />} />
          <Route path="/empresa/admin/perfil" element={<CompanyAdminProfilePage />} />
          <Route path="/empresa/admin/sedes" element={<CompanyAdminSitesPage />} />
          <Route path="/empresa/admin/reclutadores" element={<CompanyAdminRecruitersPage />} />
          <Route path="/empresa/admin/vacantes" element={<CompanyAdminVacanciesPage />} />
          <Route path="/empresa/admin/vacantes/nueva" element={<CompanyAdminVacancyEditorPage key="nueva" />} />
          <Route path="/empresa/admin/vacantes/:vacancyId/editar" element={<CompanyAdminVacancyEditorPage />} />
          <Route path="/empresa/admin/convenios" element={<CompanyAdminAgreementsPage />} />
          <Route path="/empresa/admin/actividad" element={<CompanyAdminActivityPage />} />
          <Route path="/empresa/admin/configuracion" element={<Navigate to="/empresa/admin/perfil" replace />} />
        </Route>

        {/* ─── Rol Reclutador de Empresa (Operativa de selección y vacantes) - Protegido ─── */}
        <Route element={<ProtectedRoute allowedRoles={['reclutador_empresa', 'admin_empresa', 'superadmin_vincula']} />}>
          <Route path="/empresa/reclutador" element={<Navigate to="/empresa/reclutador/dashboard" replace />} />
          <Route path="/empresa/reclutador/dashboard" element={<CompanyRecruiterDashboardPage />} />
          <Route path="/empresa/reclutador/candidatos" element={<CompanyRecruiterCandidatesPage />} />
          <Route path="/empresa/reclutador/talento" element={<CompanyRecruiterTalentPoolPage />} />
          <Route path="/empresa/reclutador/vacantes" element={<CompanyRecruiterVacanciesPage />} />
          <Route
            path="/empresa/reclutador/vacantes/nueva"
            element={<CompanyAdminVacancyEditorPage key="recruiter-nueva" role="recruiter" />}
          />
          <Route
            path="/empresa/reclutador/vacantes/:vacancyId/editar"
            element={<CompanyAdminVacancyEditorPage role="recruiter" />}
          />
        </Route>

        {/* ─── Rol Super Administrador de Vincula (Plataforma y Acreditación) - Protegido ─── */}
        <Route element={<ProtectedRoute allowedRoles={['superadmin_vincula']} />}>
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<VinculaAdminDashboardPage />} />
          <Route path="/admin/empresas" element={<VinculaAdminCompaniesPage />} />
          <Route path="/admin/instituciones" element={<VinculaAdminInstitutionsPage />} />
        </Route>

        {/* ─── Redirección global para rutas no existentes ─── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <OnboardingTour />
      <GraduateChatbot />
      </ErrorBoundary>
    </BrowserRouter>
  );
}
