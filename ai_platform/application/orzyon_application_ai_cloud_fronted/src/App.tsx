import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import { AppProvider, useApp } from './state/AppContext'
import { ToastProvider } from './components/Toast'
import { AppShell } from './components/AppShell'
import LoginPage from './pages/LoginPage'
const HomePage = lazy(() => import('./pages/HomePage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const SectorPage = lazy(() => import('./pages/SectorPage'))
const OrganizationPage = lazy(() => import('./pages/OrganizationPage'))
const ClustersPage = lazy(() => import('./pages/ClustersPage'))
const ClusterCreatePage = lazy(() => import('./pages/ClusterCreatePage'))
const ClusterDetailPage = lazy(() => import('./pages/ClusterDetailPage'))
const AgentsPage = lazy(() => import('./pages/AgentsPage'))
const AgentEditorPage = lazy(() => import('./pages/AgentEditorPage'))
const PlaygroundPage = lazy(() => import('./pages/PlaygroundPage'))
const ModelsPage = lazy(() => import('./pages/ModelsPage'))
const AccessPage = lazy(() => import('./pages/AccessPage'))
const ApplicationsPage = lazy(() => import('./pages/ApplicationsPage'))
const ApplicationCreatePage = lazy(() => import('./pages/ApplicationCreatePage'))
const ApplicationDetailPage = lazy(() => import('./pages/ApplicationDetailPage'))
const ServicesPage = lazy(() => import('./pages/ServicesPage'))
const ServiceDeployPage = lazy(() => import('./pages/ServiceDeployPage'))
const ServiceDetailPage = lazy(() => import('./pages/ServiceDetailPage'))
const MetricsPage = lazy(() => import('./pages/MetricsPage'))
const CostsPage = lazy(() => import('./pages/CostsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const OperationsPage = lazy(() => import('./pages/OperationsPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function RequireSession({ children }: { children: ReactNode }) {
  const { session } = useApp()
  const location = useLocation()
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}

function RequireOperator({ children }: { children: ReactNode }) {
  const { session } = useApp()
  // Comportamento de interface da simulação, não um controle de segurança.
  if (session?.role !== 'operador') return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <ToastProvider>
      <AppProvider>
        <Suspense fallback={<div className="p-8 text-sm text-muted">Carregando…</div>}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <RequireSession>
                <AppShell />
              </RequireSession>
            }
          >
            <Route index element={<HomePage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="organizacao" element={<OrganizationPage />} />
            <Route path="clusters" element={<ClustersPage />} />
            <Route path="clusters/novo" element={<ClusterCreatePage />} />
            <Route path="clusters/:clusterId" element={<ClusterDetailPage />} />
            <Route path="clusters/:clusterId/:tab" element={<ClusterDetailPage />} />
            <Route path="aplicacoes" element={<ApplicationsPage />} />
            <Route path="aplicacoes/novo" element={<ApplicationCreatePage />} />
            <Route path="aplicacoes/:applicationId" element={<ApplicationDetailPage />} />
            <Route path="aplicacoes/:applicationId/dashboard" element={<DashboardPage />} />
            <Route path="setor/:sectorKey" element={<SectorPage />} />
            <Route path="setor/:sectorKey/dashboard" element={<DashboardPage />} />
            <Route path="agentes" element={<AgentsPage />} />
            <Route path="agentes/novo" element={<AgentEditorPage />} />
            <Route path="agentes/:agentId" element={<AgentEditorPage />} />
            <Route path="playground" element={<PlaygroundPage />} />
            <Route path="modelos" element={<ModelsPage />} />
            <Route path="modelos/:tab" element={<ModelsPage />} />
            <Route path="acesso" element={<AccessPage />} />
            <Route path="servicos" element={<ServicesPage />} />
            <Route path="servicos/novo" element={<ServiceDeployPage />} />
            <Route path="servicos/:serviceId" element={<ServiceDetailPage />} />
            <Route path="metricas" element={<MetricsPage />} />
            <Route path="custos" element={<CostsPage />} />
            <Route path="configuracoes" element={<SettingsPage />} />
            <Route
              path="operacao"
              element={
                <RequireOperator>
                  <OperationsPage />
                </RequireOperator>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
        </Suspense>
      </AppProvider>
    </ToastProvider>
  )
}
