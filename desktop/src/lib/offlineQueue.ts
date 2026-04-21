import type { Product } from '../types/database'

const PRODUCTS_CACHE_KEY = 'coffe-maya.products-cache'
const PENDING_SALES_KEY = 'coffe-maya.pending-sales'
const BROADCAST_CHANNEL = 'coffe-maya-queue'

export interface PendingSaleItem {
  product_id: string
  quantity: number
  unit_price: number
  subtotal: number
}

export interface PendingSale {
  // id temporal local — se descarta al sincronizar
  tempId: string
  // UUID propio para idempotencia en el servidor
  client_sale_id: string
  created_at_local: string
  cashier_id: string
  cashier_email: string
  total: number
  amount_paid: number
  change_given: number
  payment_method: 'cash' | 'card' | 'transfer'
  items: PendingSaleItem[]
  // marca el último intento fallido para backoff
  failed_at?: string
}

export function setCachedProducts(products: Product[]): void {
  try {
    localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(products))
  } catch {
    // storage lleno o corrupto: no bloquea al usuario
  }
}

export function getCachedProducts(): Product[] {
  try {
    const raw = localStorage.getItem(PRODUCTS_CACHE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Product[]
  } catch {
    return []
  }
}

// Mutex por promise: fallback cuando no hay navigator.locks (tests/jsdom).
let mutexChain: Promise<unknown> = Promise.resolve()

async function withQueueLock<T>(fn: () => T | Promise<T>): Promise<T> {
  const locks = (typeof navigator !== 'undefined' ? navigator.locks : undefined) as
    | { request: (name: string, cb: () => Promise<T>) => Promise<T> }
    | undefined

  if (locks && typeof locks.request === 'function') {
    return locks.request('coffe-maya-queue', async () => fn())
  }

  const next = mutexChain.then(() => fn())
  // Cadena sin romperla ante rechazos, el caller verá el error.
  mutexChain = next.catch(() => undefined)
  return next
}

function notifyQueueChange(): void {
  if (typeof BroadcastChannel === 'undefined') return
  try {
    const ch = new BroadcastChannel(BROADCAST_CHANNEL)
    ch.postMessage({ type: 'updated', at: Date.now() })
    ch.close()
  } catch {
    // noop
  }
}

export function onQueueChange(listener: () => void): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => {}
  const ch = new BroadcastChannel(BROADCAST_CHANNEL)
  ch.onmessage = () => listener()
  return () => ch.close()
}

export async function queuePendingSale(sale: PendingSale): Promise<void> {
  await withQueueLock(() => {
    const current = readPendingSalesRaw()
    current.push(sale)
    localStorage.setItem(PENDING_SALES_KEY, JSON.stringify(current))
  })
  notifyQueueChange()
}

function readPendingSalesRaw(): PendingSale[] {
  try {
    const raw = localStorage.getItem(PENDING_SALES_KEY)
    if (!raw) return []
    return JSON.parse(raw) as PendingSale[]
  } catch {
    return []
  }
}

export function getPendingSales(): PendingSale[] {
  return readPendingSalesRaw()
}

export async function removePendingSale(tempId: string): Promise<void> {
  await withQueueLock(() => {
    const current = readPendingSalesRaw().filter((s) => s.tempId !== tempId)
    localStorage.setItem(PENDING_SALES_KEY, JSON.stringify(current))
  })
  notifyQueueChange()
}

export async function markPendingSaleFailed(tempId: string): Promise<void> {
  await withQueueLock(() => {
    const current = readPendingSalesRaw().map((s) =>
      s.tempId === tempId ? { ...s, failed_at: new Date().toISOString() } : s
    )
    localStorage.setItem(PENDING_SALES_KEY, JSON.stringify(current))
  })
  notifyQueueChange()
}

export function pendingSalesCount(): number {
  return readPendingSalesRaw().length
}

export function isNetworkError(err: unknown): boolean {
  if (!err) return false
  const msg = String((err as { message?: string }).message ?? err).toLowerCase()
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('fetch failed') ||
    !navigator.onLine
  )
}

export function makeTempId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function makeClientSaleId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback: suficiente para idempotencia local + servidor
  const rnd = () => Math.random().toString(16).slice(2, 10)
  return `${rnd()}-${rnd()}-${rnd()}-${rnd()}`
}
