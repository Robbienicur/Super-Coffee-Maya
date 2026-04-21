import { useEffect } from 'react'
import { useAuthStore } from './store/authStore'
import { useNavigationStore } from './store/navigationStore'
import Login from './components/Login'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import UpdateBanner from './components/UpdateBanner'
import POS from './pages/POS'
import Inventory from './pages/Inventory'
import Sales from './pages/Sales'
import Audit from './pages/Audit'
import CashSession from './pages/CashSession'

const pages = {
  pos: POS,
  'cash-session': CashSession,
  inventory: Inventory,
  sales: Sales,
  audit: Audit,
} as const

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isLoading = useAuthStore((s) => s.isLoading)
  const initialize = useAuthStore((s) => s.initialize)
  const currentPage = useNavigationStore((s) => s.currentPage)

  useEffect(() => {
    initialize()
  }, [initialize])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-coffee-900">
        <div className="text-center">
          <img src={new URL('./assets/logo.png', import.meta.url).href} alt="Logo" className="w-16 h-16 rounded-full mx-auto mb-4 animate-pulse" />
          <p className="text-coffee-200">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <>
        <Login />
        <UpdateBanner />
      </>
    )
  }

  const PageComponent = pages[currentPage]

  return (
    <>
      <Layout>
        <ProtectedRoute>
          <PageComponent />
        </ProtectedRoute>
      </Layout>
      <UpdateBanner />
    </>
  )
}
