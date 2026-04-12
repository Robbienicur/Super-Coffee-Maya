import { useEffect, useRef } from 'react'

interface UseBarcodeOptions {
  onScan: (barcode: string) => void
  enabled?: boolean
}

export function useBarcode({ onScan, enabled = true }: UseBarcodeOptions) {
  const bufferRef = useRef('')
  const lastKeyTimeRef = useRef(0)

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now()

      if (e.key === 'Enter') {
        if (bufferRef.current.length > 4) {
          onScan(bufferRef.current)
        }
        bufferRef.current = ''
        lastKeyTimeRef.current = 0
        return
      }

      // Ignorar teclas modificadoras
      if (e.key.length !== 1) return

      if (now - lastKeyTimeRef.current > 100 && bufferRef.current.length > 0) {
        // Demasiado lento — resetear, es escritura humana
        bufferRef.current = ''
      }

      bufferRef.current += e.key
      lastKeyTimeRef.current = now
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onScan, enabled])
}
