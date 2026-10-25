import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import GraduateDashboard from './pages/GraduateDashboard.jsx';
import HomePage from './pages/HomePage.jsx';
import InstitutionAdminAdvisorsPage from './pages/InstitutionAdminAdvisorsPage.jsx';
import InstitutionAdminProfilePage from './pages/InstitutionAdminProfilePage.jsx';
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing & Auth */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />

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
        <Route path="/institucion/admin/asesores" element={<InstitutionAdminAdvisorsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
