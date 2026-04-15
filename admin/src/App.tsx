import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import MainLayout from './layouts/MainLayout'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Exercises from './pages/Exercises'
import Plans from './pages/Plans'
import Knowledge from './pages/Knowledge'
import Push from './pages/Push'
import Settings from './pages/Settings'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="exercises" element={<Exercises />} />
        <Route path="plans" element={<Plans />} />
        <Route path="knowledge/*" element={<Knowledge />} />
        <Route path="push" element={<Push />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
