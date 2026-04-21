import { useAuthStore } from '../store/authStore'
import { useNavigationStore } from '../store/navigationStore'
import { useEffect } from 'react'

const pageRoles: Record<string, Array<'admin' | 'cashier'>> = {
  pos: ['admin', 'cashier'],
  'cash-session': ['admin', 'cashier'],
  inventory: ['admin', 'cashier'],
  sales: ['admin', 'cashier'],
  audit: ['admin'],
}

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const profile = useAuthStore((s) => s.profile)
  const currentPage = useNavigationStore((s) => s.currentPage)
  const setPage = useNavigationStore((s) => s.setPage)

  const allowedRoles = pageRoles[currentPage] ?? []
  const hasAccess = profile && allowedRoles.includes(profile.role)

  useEffect(() => {
    if (profile && !hasAccess) {
      setPage('pos')
    }
  }, [currentPage, profile, hasAccess, setPage])

  if (!hasAccess) return null

  return <>{children}</>
}
