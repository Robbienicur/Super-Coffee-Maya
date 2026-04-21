'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  ShoppingCart,
  Wallet,
  Package,
  FileText,
  Users,
  LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/ventas', label: 'Ventas', icon: ShoppingCart },
  { href: '/cortes', label: 'Cortes', icon: Wallet },
  { href: '/inventario', label: 'Inventario', icon: Package },
  { href: '/auditoria', label: 'Auditoría', icon: FileText },
  { href: '/usuarios', label: 'Usuarios', icon: Users },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="w-56 bg-coffee-900 text-coffee-100 flex flex-col h-screen flex-shrink-0">
      <div className="px-4 py-5 border-b border-coffee-700">
        <h2 className="font-bold text-coffee-200 text-sm">Coffe Maya</h2>
        <p className="text-coffee-500 text-xs">Panel Admin</p>
      </div>

      <div className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-coffee-800 text-coffee-100 font-medium border-l-[3px] border-coffee-200'
                  : 'text-coffee-300 hover:bg-coffee-800/50 hover:text-coffee-100'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          )
        })}
      </div>

      <div className="border-t border-coffee-700 px-2 py-3">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 text-coffee-500 hover:text-coffee-100 transition-colors text-sm w-full"
        >
          <LogOut size={16} />
          Cerrar Sesión
        </button>
      </div>
    </nav>
  )
}
