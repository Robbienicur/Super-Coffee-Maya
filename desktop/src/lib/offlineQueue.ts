import type { Product } from '../types/database'

const PRODUCTS_CACHE_KEY = 'coffe-maya.products-cache'
const PENDING_SALES_KEY = 'coffe-maya.pending-sales'

export interface PendingSaleItem {
  product_id: string
  quantity: number
  unit_price: number
  subtotal: number
}

export interface PendingSale {
  // id temporal local — se descarta al sincronizar
  tempId: string
  created_at_local: string
  cashier_id: string
  cashier_email: string
  total: number
  amount_paid: number
  change_given: number
  payment_method: 'cash' | 'card' | 'transfer'
  items: PendingSaleItem[]
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

export function queuePendingSale(sale: PendingSale): void {
  const current = getPendingSales()
  current.push(sale)
  localStorage.setItem(PENDING_SALES_KEY, JSON.stringify(current))
}

export function getPendingSales(): PendingSale[] {
  try {
    const raw = localStorage.getItem(PENDING_SALES_KEY)
    if (!raw) return []
    return JSON.parse(raw) as PendingSale[]
  } catch {
    return []
  }
}

export function removePendingSale(tempId: string): void {
  const current = getPendingSales().filter((s) => s.tempId !== tempId)
  localStorage.setItem(PENDING_SALES_KEY, JSON.stringify(current))
}

export function pendingSalesCount(): number {
  return getPendingSales().length
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
