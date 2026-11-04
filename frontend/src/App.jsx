import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import MyApplicationsPage from './pages/MyApplicationsPage.jsx';
import MyApplicationsProposalPage from './pages/MyApplicationsProposalPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import VacanciesPage from './pages/VacanciesPage.jsx';
import VacanciesProposalPage from './pages/VacanciesProposalPage.jsx';
import VinculaAdminDashboardPage from './pages/VinculaAdminDashboardPage.jsx';
import VinculaAdminCompaniesPage from './pages/VinculaAdminCompaniesPage.jsx';
import VinculaAdminInstitutionsPage from './pages/VinculaAdminInstitutionsPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing & Auth */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro-egresado" element={<GraduateRegistrationPage />} />
        <Route path="/registro-empresa" element={<CompanyRegistrationPage />} />
        <Route path="/registro-institucion" element={<InstitutionRegistrationPage />} />

        {/* Rol Egresado (Dashboard) */}
        <Route path="/dashboard" element={<GraduateDashboard />} />
        <Route path="/dashboard/postulaciones" element={<MyApplicationsPage />} />
        <Route path="/dashboard/postulaciones-propuesta" element={<MyApplicationsProposalPage />} />
        <Route path="/dashboard/vacantes" element={<VacanciesPage />} />
        <Route path="/dashboard/vacantes-propuesta" element={<VacanciesProposalPage />} />
        <Route path="/dashboard/perfil" element={<ProfilePage />} />

        {/* Rol Institución de Educación Superior (Asesor IES) */}
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
        {/* Rol Administrador de la Institución Educativa (Admin IES) */}
        <Route path="/institucion/admin" element={<Navigate to="/institucion/admin/perfil" replace />} />
        <Route path="/institucion/admin/perfil" element={<InstitutionAdminProfilePage />} />
        <Route path="/institucion/admin/programas" element={<InstitutionAdminProgramsPage />} />
        <Route path="/institucion/admin/trazabilidad" element={<InstitutionAdminTraceabilityPage />} />
        <Route path="/institucion/admin/asesores" element={<InstitutionAdminAdvisorsPage />} />
        <Route path="/institucion/admin/sedes" element={<Navigate to="/institucion/admin/asesores?tab=sedes" replace />} />

        {/* Rol Administrador de Empresa (ver docs/ROADMAP_ADMIN_EMPRESA.md) */}
        <Route path="/empresa" element={<Navigate to="/empresa/admin/perfil" replace />} />
        <Route path="/empresa/admin" element={<Navigate to="/empresa/admin/perfil" replace />} />
        <Route path="/empresa/admin/perfil" element={<CompanyAdminProfilePage />} />
        <Route path="/empresa/admin/sedes" element={<CompanyAdminSitesPage />} />
        <Route path="/empresa/admin/reclutadores" element={<CompanyAdminRecruitersPage />} />
        <Route path="/empresa/admin/vacantes" element={<CompanyAdminVacanciesPage />} />
        <Route path="/empresa/admin/vacantes/nueva" element={<CompanyAdminVacancyEditorPage key="nueva" />} />
        <Route path="/empresa/admin/vacantes/:vacancyId/editar" element={<CompanyAdminVacancyEditorPage />} />
        <Route path="/empresa/admin/convenios" element={<CompanyAdminAgreementsPage />} />
        <Route path="/empresa/admin/actividad" element={<CompanyAdminActivityPage />} />
        <Route path="/empresa/admin/configuracion" element={<Navigate to="/empresa/admin/perfil" replace />} />

        {/* Rol Reclutador de Empresa (Operativa de selección y postulaciones) */}
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

        {/* Rol Super Administrador de Vincula (Acreditación y Validación de Plataforma) */}
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/dashboard" element={<VinculaAdminDashboardPage />} />
        <Route path="/admin/empresas" element={<VinculaAdminCompaniesPage />} />
        <Route path="/admin/instituciones" element={<VinculaAdminInstitutionsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
