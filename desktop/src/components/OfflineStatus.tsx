import { useEffect, useRef, useState } from 'react'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { onQueueChange, pendingSalesCount } from '../lib/offlineQueue'
import { drainPendingSales } from '../lib/syncManager'

const BACKOFF_STEPS_MS = [5_000, 10_000, 30_000, 60_000]

export default function OfflineStatus() {
  const online = useOnlineStatus()
  const [pending, setPending] = useState(pendingSalesCount())
  const [syncing, setSyncing] = useState(false)
  const backoffIdxRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const tick = () => setPending(pendingSalesCount())
    const id = setInterval(tick, 2000)
    const off = onQueueChange(tick)
    window.addEventListener('storage', tick)
    return () => {
      clearInterval(id)
      off()
      window.removeEventListener('storage', tick)
    }
  }, [])

  // Drenar cola con backoff exponencial.
  useEffect(() => {
    if (!online || pending === 0 || syncing) {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      return
    }

    const runDrain = async () => {
      setSyncing(true)
      const synced = await drainPendingSales()
      setPending(pendingSalesCount())
      setSyncing(false)

      if (synced > 0) {
        backoffIdxRef.current = 0
      } else if (pendingSalesCount() > 0) {
        backoffIdxRef.current = Math.min(backoffIdxRef.current + 1, BACKOFF_STEPS_MS.length - 1)
        const delay = BACKOFF_STEPS_MS[backoffIdxRef.current]
        timerRef.current = setTimeout(runDrain, delay)
      }
    }

    runDrain()

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
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
