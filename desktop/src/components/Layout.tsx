import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useNavigationStore, type Page } from '../store/navigationStore'
import supabase from '../lib/supabaseClient'

interface NavItem {
  id: Page
  label: string
  icon: string
  roles: Array<'admin' | 'cashier'>
}

const navItems: NavItem[] = [
  { id: 'pos', label: 'Punto de Venta', icon: '🛒', roles: ['admin', 'cashier'] },
  { id: 'inventory', label: 'Inventario', icon: '📦', roles: ['admin', 'cashier'] },
  { id: 'sales', label: 'Ventas', icon: '📊', roles: ['admin', 'cashier'] },
  { id: 'audit', label: 'Auditoría', icon: '📋', roles: ['admin'] },
]

const pageLabels: Record<Page, string> = {
  pos: 'Punto de Venta',
  inventory: 'Inventario',
  sales: 'Ventas',
  audit: 'Auditoría',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false)
  const profile = useAuthStore((s) => s.profile)
  const logout = useAuthStore((s) => s.logout)
  const currentPage = useNavigationStore((s) => s.currentPage)
  const setPage = useNavigationStore((s) => s.setPage)

  const visibleItems = navItems.filter((item) =>
    item.roles.includes(profile?.role ?? 'cashier')
  )

  const [lowStockCount, setLowStockCount] = useState(0)

  useEffect(() => {
    const fetchLowStock = async () => {
      const { data } = await supabase
        .from('products')
        .select('stock, min_stock')
        .eq('is_active', true)

      const count = (data ?? []).filter((p) => p.stock <= p.min_stock).length
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
                className={`flex items-center gap-2.5 rounded-lg transition-colors text-left ${
                  expanded ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center'
                } ${
                  isActive
                    ? 'bg-coffee-800 border-l-[3px] border-coffee-200'
                    : 'opacity-60 hover:opacity-100 hover:bg-coffee-800/50'
                }`}
              >
                <span className="text-base flex-shrink-0">{item.icon}</span>
                {expanded && (
                  <span className={`text-sm whitespace-nowrap flex items-center gap-1.5 ${isActive ? 'font-medium' : ''}`}>
                    {item.label}
                    {item.id === 'inventory' && lowStockCount > 0 && (
                      <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full leading-none">
                        {lowStockCount}
                      </span>
                    )}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="border-t border-coffee-700 px-2 py-3">
          <button
            onClick={logout}
            className={`flex items-center gap-2.5 opacity-50 hover:opacity-100 transition-opacity w-full ${
              expanded ? 'px-3' : 'justify-center'
            }`}
          >
            <span className="text-sm flex-shrink-0">🚪</span>
            {expanded && (
              <span className="text-xs whitespace-nowrap">Cerrar Sesión</span>
            )}
          </button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-5 py-3 border-b border-coffee-200">
          <h1 className="text-lg font-semibold text-coffee-900">
            {pageLabels[currentPage]}
          </h1>
          <span className="text-xs text-coffee-300">
            {profile?.name || profile?.email} • {profile?.role === 'admin' ? 'Admin' : 'Cajero'}
          </span>
        </header>
        <div className="flex-1 overflow-auto p-5">
          {children}
        </div>
      </main>
    </div>
  )
}
