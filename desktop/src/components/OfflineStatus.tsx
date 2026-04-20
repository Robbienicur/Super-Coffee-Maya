import { useEffect, useState } from 'react'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { pendingSalesCount } from '../lib/offlineQueue'
import { drainPendingSales } from '../lib/syncManager'

export default function OfflineStatus() {
  const online = useOnlineStatus()
  const [pending, setPending] = useState(pendingSalesCount())
  const [syncing, setSyncing] = useState(false)

  // Recontar cuando cambia la cola (otro tab/venta). Poll barato, sólo a localStorage.
  useEffect(() => {
    const tick = () => setPending(pendingSalesCount())
    const id = setInterval(tick, 2000)
    window.addEventListener('storage', tick)
    return () => {
      clearInterval(id)
      window.removeEventListener('storage', tick)
    }
  }, [])

  // Cuando volvemos online y hay cola, drenamos.
  useEffect(() => {
    if (!online || pending === 0 || syncing) return
    setSyncing(true)
    drainPendingSales()
      .then(() => setPending(pendingSalesCount()))
      .finally(() => setSyncing(false))
  }, [online, pending, syncing])

  if (online && pending === 0) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-coffee-300">
        <Wifi size={12} />
        Conectado
      </span>
    )
  }

  if (!online) {
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
        <WifiOff size={12} />
        Modo offline{pending > 0 && ` · ${pending} pendiente${pending !== 1 ? 's' : ''}`}
      </span>
    )
  }

  // online con pendientes
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
      <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
      Sincronizando · {pending} pendiente{pending !== 1 ? 's' : ''}
    </span>
  )
}
