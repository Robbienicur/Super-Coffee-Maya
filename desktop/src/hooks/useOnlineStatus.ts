import { useEffect, useState } from 'react'
import supabase from '../lib/supabaseClient'

// Ping periódico: navigator.onLine miente a veces (dice "online" con wifi sin salida).
const PING_INTERVAL_MS = 30_000

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true)

  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    let cancelled = false
    const ping = async () => {
      if (!navigator.onLine) {
        setOnline(false)
        return
      }
      try {
        // Query barato: existe user-check en auth; si contesta, estamos online.
        const { error } = await supabase.from('products').select('id').limit(1)
        if (cancelled) return
        setOnline(!error)
      } catch {
        if (!cancelled) setOnline(false)
      }
    }

    ping()
    const id = setInterval(ping, PING_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(id)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return online
}
