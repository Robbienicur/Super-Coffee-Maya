import { useState, useEffect } from 'react'
import { ShoppingCart, Package, BarChart3, ClipboardList, Wallet, LogOut, AlertTriangle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useSessionStore } from '../store/sessionStore'
import { useNavigationStore, type Page } from '../store/navigationStore'
import supabase from '../lib/supabaseClient'
import { logAction } from '../lib/auditLogger'
import OfflineStatus from './OfflineStatus'

interface NavItem {
  id: Page
  label: string
  icon: LucideIcon
  roles: Array<'admin' | 'cashier'>
}

const navItems: NavItem[] = [
  { id: 'pos', label: 'Punto de Venta', icon: ShoppingCart, roles: ['admin', 'cashier'] },
  { id: 'cash-session', label: 'Caja', icon: Wallet, roles: ['admin', 'cashier'] },
  { id: 'inventory', label: 'Inventario', icon: Package, roles: ['admin', 'cashier'] },
  { id: 'sales', label: 'Ventas', icon: BarChart3, roles: ['admin', 'cashier'] },
  { id: 'audit', label: 'Auditoría', icon: ClipboardList, roles: ['admin'] },
]

const pageLabels: Record<Page, string> = {
  pos: 'Punto de Venta',
  'cash-session': 'Caja',
  inventory: 'Inventario',
  sales: 'Ventas',
  audit: 'Auditoría',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const profile = useAuthStore((s) => s.profile)
  const logout = useAuthStore((s) => s.logout)
  const currentPage = useNavigationStore((s) => s.currentPage)
  const setPage = useNavigationStore((s) => s.setPage)
  const session = useSessionStore((s) => s.session)
  const loadSession = useSessionStore((s) => s.loadForCashier)

  const handleLogoutClick = () => {
    if (session) {
      setShowLogoutModal(true)
    } else {
      logout()
    }
  }

  const confirmLogoutKeepSession = async () => {
    if (profile) {
      await logAction('LOGOUT_WITH_OPEN_SESSION', 'cash_session', session?.id, undefined, {
        opening_float: session?.opening_float,
        opened_at: session?.opened_at,
      })
    }
    setShowLogoutModal(false)
    await logout()
  }

  const goToCloseCaja = () => {
    setShowLogoutModal(false)
    setPage('cash-session')
  }

  useEffect(() => {
    if (profile?.id) loadSession(profile.id)
  }, [profile?.id, loadSession])

  const visibleItems = navItems.filter((item) =>
    item.roles.includes(profile?.role ?? 'cashier')
  )

  const [lowStockCount, setLowStockCount] = useState(0)

  useEffect(() => {
    const fetchLowStock = async () => {
      const { data } = await supabase
        .from('products')
        .select('stock, min_stock, track_stock')
        .eq('is_active', true)
        .eq('track_stock', true)

      const count = (data ?? []).filter((p) => p.track_stock && p.stock <= p.min_stock).length
      setLowStockCount(count)
    }

    fetchLowStock()

    const channel = supabase
      .channel('layout-low-stock')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchLowStock()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <div className="flex h-screen bg-cream-dark">
      <nav
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className={`flex flex-col bg-coffee-900 text-coffee-100 transition-all duration-200 ${
          expanded ? 'w-[200px]' : 'w-14'
        }`}
      >
        <div className="flex items-center gap-2.5 px-3 py-4 mb-4">
          <img src={new URL('../assets/logo.png', import.meta.url).href} alt="Logo" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
          {expanded && (
            <span className="font-bold text-coffee-200 whitespace-nowrap text-sm">
              Super Coffee Maya
            </span>
          )}
        </div>

        <div className="flex-1 flex flex-col gap-1 px-2">
          {visibleItems.map((item) => {
            const isActive = currentPage === item.id
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                aria-label={item.label}
                title={item.label}
                className={`flex items-center gap-2.5 rounded-lg transition-colors text-left ${
                  expanded ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center'
                } ${
                  isActive
                    ? 'bg-coffee-800 border-l-[3px] border-coffee-200'
                    : 'opacity-60 hover:opacity-100 hover:bg-coffee-800/50'
                }`}
              >
                <item.icon size={18} className="flex-shrink-0" />
                {expanded && (
                  <span className={`text-sm whitespace-nowrap flex items-center gap-1.5 ${isActive ? 'font-medium' : ''}`}>
                    {item.label}
                    {item.id === 'inventory' && lowStockCount > 0 && (
                      <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full leading-none">
                        {lowStockCount}
                      </span>
                    )}
                    {item.id === 'cash-session' && (
                      <span className={`w-2 h-2 rounded-full ${session ? 'bg-green-400' : 'bg-coffee-400'}`} />
                    )}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="border-t border-coffee-700 px-2 py-3">
          <button
            onClick={handleLogoutClick}
            className={`flex items-center gap-2.5 opacity-50 hover:opacity-100 transition-opacity w-full ${
              expanded ? 'px-3' : 'justify-center'
            }`}
          >
            <LogOut size={16} className="flex-shrink-0" />
            {expanded && (
              <span className="text-xs whitespace-nowrap">Cerrar Sesión</span>
            )}
          </button>
        </div>
      </nav>

      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-[fade-in_200ms_ease-out]">
          <div className="bg-cream rounded-xl p-6 w-full max-w-md shadow-xl animate-[scale-in_200ms_ease-out]">
            <div className="flex items-start gap-3 mb-3">
              <AlertTriangle size={22} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-bold text-coffee-900">Tienes caja abierta</h2>
                <p className="text-sm text-coffee-600 mt-1">
                  Recomendamos cerrar la caja (reporte Z) antes de cerrar sesión.
                  Si la dejas abierta y no la cierras el mismo día, al regresar
                  <strong> tendrás que cerrarla antes de poder vender</strong>.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 mt-4">
              <button
                onClick={goToCloseCaja}
                className="w-full py-2.5 rounded-lg bg-coffee-900 text-white font-semibold text-sm hover:bg-coffee-800 transition-colors"
              >
                Cerrar caja ahora (recomendado)
              </button>
              <button
                onClick={confirmLogoutKeepSession}
                className="w-full py-2.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-sm hover:bg-amber-100 transition-colors"
              >
                Cerrar sesión dejando la caja abierta
              </button>
              <button
                onClick={() => setShowLogoutModal(false)}
                className="w-full py-2 text-xs text-coffee-500 hover:text-coffee-700"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-5 py-3 border-b border-coffee-200">
          <h1 className="text-lg font-semibold text-coffee-900">
            {pageLabels[currentPage]}
          </h1>
          <div className="flex items-center gap-3">
            <OfflineStatus />
            <span className="text-xs text-coffee-300">
              {profile?.name || profile?.email} • {profile?.role === 'admin' ? 'Administrador' : 'Cajero'}
            </span>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-5">
          {children}
        </div>
      </main>
    </div>
  )
}
