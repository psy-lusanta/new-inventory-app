import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import Layout from './components/layout/Layout'
import DashboardPage from './pages/DashboardPage'
import TableViewPage from './pages/TableViewPage'
import TableSettingsPage from './pages/TableSettingsPage'
import ReportsPage from './pages/ReportsPage'
import UsersPage from './pages/UsersPage'
import AccountabilityFormPage from './pages/AccountabilityFormPage';
import NotFoundPage from './pages/NotFoundPage'
import LogsPage from './pages/LogsPage'
import AccessDenied from './pages/AccessDenied'
import Settings from './pages/SettingsPage'
import CostPage from './pages/CostPage'

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth()
  if (isLoading) return <div className="flex items-center justify-center h-screen">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth()
  if (isLoading) return null
  if (user?.role !== 'admin') return <AccessDenied />
  return <>{children}</>
}

export default function App() {
  const navigate = useNavigate()

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="logs" element={
          <AdminRoute>
            <LogsPage />
          </AdminRoute>
        } />
        <Route path="users" element={
          <AdminRoute>
            <UsersPage />
          </AdminRoute>
        } />
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="tables/:id" element={<TableViewPage />} />
        <Route path="tables/:id/settings" element={<TableSettingsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="cost" element={<CostPage />} />
        <Route path="settings" element={<Settings />} />
        <Route path="accountability" element={<AccountabilityFormPage />} />
        <Route path="logs" element={<LogsPage />} />
        <Route path="*" element={
          <div className="flex flex-col items-center justify-center min-h-screen gap-4">
            <h1 className="text-6xl font-bold text-gray-200 dark:text-gray-700">404</h1>
            <p className="text-gray-500 dark:text-gray-400">Page not found</p>
            <button onClick={() => navigate('/dashboard')} className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              Go to Dashboard
            </button>
          </div>
        } />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}