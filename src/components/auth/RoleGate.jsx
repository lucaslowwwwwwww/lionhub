import { useAuth } from '../../hooks/useAuth'

/**
 * RoleGate — renders children only if the user's role matches.
 *
 * Usage:
 *   <RoleGate role="admin">
 *     <AdminPanel />
 *   </RoleGate>
 *
 * Props:
 *   role      – required role string (e.g. "admin")
 *   fallback  – optional JSX to render when role doesn't match (defaults to null)
 */
export default function RoleGate({ role, fallback = null, children }) {
  const { userProfile, loading } = useAuth()

  if (loading) return null

  const userRole = userProfile?.role
  
  // Master passes everything
  if (userRole === 'master') {
    return children
  }

  const allowedRoles = Array.isArray(role) ? role : [role]

  if (!userProfile || !allowedRoles.includes(userRole)) {
    return fallback
  }

  return children
}
