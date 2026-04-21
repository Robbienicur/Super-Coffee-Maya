import { useEffect, useState } from 'react'
import type { UpdateEvent } from '../preload'

export default function UpdateBanner() {
  const [event, setEvent] = useState<UpdateEvent | null>(null)

  useEffect(() => {
    if (!window.electronUpdater) return
    const off = window.electronUpdater.onEvent((e) => setEvent(e))
    return off
  }, [])

  if (!event || event.status === 'checking' || event.status === 'none' || event.status === 'error') {
    return null
  }

  if (event.status === 'available' || event.status === 'downloading') {
    const percent = event.status === 'downloading' ? event.percent : null
    return (
      <div className="fixed bottom-4 right-4 z-40 bg-coffee-900 text-white rounded-lg shadow-xl px-4 py-3 text-sm flex items-center gap-3 max-w-sm">
        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <div className="flex-1">
          <div className="font-medium">Descargando actualización…</div>
          {percent !== null && (
            <div className="mt-1 h-1 bg-coffee-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
          )}
        </div>
      </div>
    )
  }

  // downloaded — listo para instalar
  return (
    <div className="fixed bottom-4 right-4 z-40 bg-coffee-900 text-white rounded-lg shadow-xl px-4 py-3 text-sm flex items-center gap-3 max-w-sm">
      <div className="w-2 h-2 rounded-full bg-green-400" />
      <div className="flex-1">
        <div className="font-medium">Actualización lista</div>
        <div className="text-coffee-200 text-xs mt-0.5">Versión {event.version}</div>
      </div>
      <button
        onClick={() => window.electronUpdater.installNow()}
        className="px-3 py-1.5 rounded bg-amber-400 text-coffee-900 font-semibold text-xs hover:bg-amber-300 transition-colors"
      >
        Reiniciar
      </button>
    </div>
  )
}
