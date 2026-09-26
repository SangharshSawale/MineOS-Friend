import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { ModulePage } from './pages/ModulePage'
import { InspectionDetailPage, InspectionListPage } from './pages/InspectionPages'
import { ActionsPage } from './pages/WorkflowManagementPage'
import { ViolationsPage } from './pages/ViolationsPage'
import { IncidentManagementPage } from './pages/IncidentManagementPage'
import { CompliancePage } from './pages/CompliancePage'
import { ReportsPage } from './pages/ReportsPage'
import { MinesPage } from './pages/MinesPage'
import { AuditTrailPage } from './pages/AuditTrailPage'
import { GisMapPage } from './pages/GisMapPage'
import { AiRiskPage } from './pages/AiRiskPage'
import { ContractorsPage } from './pages/ContractorsPage'
import { SettingsPage } from './pages/SettingsPage'
import { AiAssistantPage } from './pages/AiAssistantPage'

// Dedicated Role Modules
import { UsersManagementPage, RolesPermissionsPage } from './pages/UsersAndRolesPages'
import { DocumentsVaultPage } from './pages/DocumentsVaultPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { ProductionPage, EnvironmentPage } from './pages/OperationsAndEnvironmentPages'
import { WorkersRosterPage, ApprovalsPage } from './pages/WorkersAndApprovalsPages'
import { SafetyObservationsPage } from './pages/SafetyObservationsPage'
import {
  WorkerDashboardPage,
  WorkerTasksPage,
  WorkerAttendancePage,
  WorkerTrainingPage,
  WorkerProfilePage
} from './pages/WorkerWorkspacePages'
import { WorkerAttendanceManagementPage } from './pages/WorkerAttendanceManagementPage'

import { ProtectedRoute } from './routes/ProtectedRoute'
import { useAuth } from './context/AuthContext'

function LandingRedirect() {
  const { user } = useAuth()
  return <Navigate to={user ? `/${user.role}/dashboard` : '/login'} replace />
}

function RoleAlias() {
  const { user } = useAuth()
  return <Navigate to={user ? `/${user.role}/dashboard` : '/login'} replace />
}

function SmartDashboardRouter() {
  const { user } = useAuth()
  if (user?.role === 'worker') {
    return <WorkerDashboardPage />
  }
  return <DashboardPage />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          {/* Dashboard */}
          <Route path="/:role/dashboard" element={<SmartDashboardRouter />} />

          {/* User & Role Administration */}
          <Route path="/:role/users" element={<UsersManagementPage />} />
          <Route path="/:role/roles" element={<RolesPermissionsPage />} />

          {/* Mines & Assets */}
          <Route path="/:role/mines" element={<MinesPage />} />
          <Route path="/:role/my-mine" element={<MinesPage />} />

          {/* Compliance & Governance */}
          <Route path="/:role/compliance" element={<CompliancePage />} />
          <Route path="/:role/documents" element={<DocumentsVaultPage />} />
          <Route path="/:role/audit" element={<AuditTrailPage />} />

          {/* Notifications & Alerts */}
          <Route path="/:role/notifications" element={<NotificationsPage />} />
          <Route path="/:role/alerts" element={<NotificationsPage />} />

          {/* Statutory Workflows */}
          <Route path="/:role/inspections" element={<InspectionListPage />} />
          <Route path="/:role/inspections/:id" element={<InspectionDetailPage />} />
          <Route path="/:role/violations" element={<ViolationsPage />} />
          <Route path="/:role/actions" element={<ActionsPage />} />
          <Route path="/:role/my-actions" element={<ActionsPage />} />
          <Route path="/:role/incidents" element={<IncidentManagementPage />} />
          <Route path="/:role/observations" element={<SafetyObservationsPage />} />
          <Route path="/:role/report-safety" element={<SafetyObservationsPage />} />
          <Route path="/:role/approvals" element={<ApprovalsPage />} />

          {/* Operations, Contractors & Environment */}
          <Route path="/:role/contractors" element={<ContractorsPage />} />
          <Route path="/:role/workers" element={<WorkersRosterPage />} />
          <Route path="/:role/worker-attendance" element={<WorkerAttendanceManagementPage />} />
          <Route path="/:role/production" element={<ProductionPage />} />
          <Route path="/:role/environment" element={<EnvironmentPage />} />

          {/* Geospatial & AI Risk Intelligence */}
          <Route path="/:role/gis" element={<GisMapPage />} />
          <Route path="/:role/ai-risk" element={<AiRiskPage />} />
          <Route path="/:role/risk-analysis" element={<AiRiskPage />} />
          <Route path="/:role/ai-insights" element={<AiAssistantPage />} />
          <Route path="/:role/ai-assistant" element={<AiAssistantPage />} />

          {/* Reporting */}
          <Route path="/:role/reports" element={<ReportsPage />} />
          <Route path="/:role/my-reports" element={<ReportsPage />} />

          {/* Worker Frontline Space */}
          <Route path="/:role/tasks" element={<WorkerTasksPage />} />
          <Route path="/:role/attendance" element={<WorkerAttendancePage />} />
          <Route path="/:role/training" element={<WorkerTrainingPage />} />
          <Route path="/:role/profile" element={<WorkerProfilePage />} />

          {/* Settings & Fallback */}
          <Route path="/:role/settings" element={<SettingsPage />} />
          <Route path="/:role/:module" element={<ModulePage />} />
        </Route>

        <Route path="/dashboard" element={<RoleAlias />} />
        <Route path="/manager" element={<RoleAlias />} />
        <Route path="/safety" element={<RoleAlias />} />
        <Route path="/corporate" element={<RoleAlias />} />
        <Route path="/regulator" element={<RoleAlias />} />
      </Route>
      <Route path="*" element={<LandingRedirect />} />
    </Routes>
  )
}
