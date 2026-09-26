import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isRoutePermittedForRole } from '../config/navigationConfig'

export function ProtectedRoute() {
  const { user } = useAuth()
  const { role } = useParams()
  const location = useLocation()

  if (!user) return <Navigate to="/login" replace />
  if (role && role !== user.role) return <Navigate to={`/${user.role}/dashboard`} replace />

  // Validate that subpath is authorized for this role
  const parts = location.pathname.split('/').filter(Boolean)
  if (parts.length >= 2) {
    const subPath = parts.slice(1).join('/')
    if (!isRoutePermittedForRole(user.role, subPath)) {
      return <Navigate to={`/${user.role}/dashboard`} replace />
    }
  }

  return <Outlet />
}
