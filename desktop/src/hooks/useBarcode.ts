import { useEffect, useRef } from 'react'

interface UseBarcodeOptions {
  onScan: (barcode: string) => void
  enabled?: boolean
}

export function useBarcode({ onScan, enabled = true }: UseBarcodeOptions) {
  const bufferRef = useRef('')
  const lastKeyTimeRef = useRef(0)
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now()

      if (e.key === 'Enter') {
        if (bufferRef.current.length > 4) {
          onScanRef.current(bufferRef.current)
        }
        bufferRef.current = ''
        lastKeyTimeRef.current = 0
        return
      }

      if (e.key.length !== 1) return

      if (now - lastKeyTimeRef.current > 100 && bufferRef.current.length > 0) {
        bufferRef.current = ''
      }

      bufferRef.current += e.key
      lastKeyTimeRef.current = now
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enabled])
}
