export interface Profile {
  id: string
  email: string
  name: string
  role: 'admin' | 'cashier'
  is_active: boolean
  last_activity_at: string | null
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  barcode: string | null
  name: string
  description: string
  price: number
  cost_price: number
  stock: number
  min_stock: number
  track_stock: boolean
  category: string
  image_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Sale {
  id: string
  cashier_id: string
  session_id: string | null
  total: number
  discount_amount: number
  payment_method: 'cash' | 'card' | 'transfer'
  amount_paid: number
  change_given: number
  status: 'completed' | 'cancelled' | 'refunded'
  notes: string
  stock_restored: boolean
  created_at: string
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string
  quantity: number
  unit_price: number
  subtotal: number
  created_at: string
}

export interface AuditLog {
  id: string
  user_id: string | null
  user_email: string
  action: string
  entity_type: 'product' | 'sale' | 'user' | 'session' | 'system'
  entity_id: string
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  ip_address: string
  created_at: string
}

export interface StockAdjustment {
  id: string
  product_id: string
  user_id: string
  previous_stock: number
  new_stock: number
  reason: string
  created_at: string
}

export interface DenominationCounts {
  bills: Record<string, number>
  coins: Record<string, number>
}

export interface CashSession {
  id: string
  cashier_id: string
  status: 'open' | 'closing' | 'closed'
  opened_at: string
  closed_at: string | null
  opening_float: number
  closing_counts: DenominationCounts | null
  closing_cash_counted: number | null
  closing_notes: string
  closed_by: string | null
  expected_cash: number | null
  cash_sales: number | null
  card_sales: number | null
  transfer_sales: number | null
  total_drops: number | null
  total_pickups: number | null
  total_expenses: number | null
  total_refunds: number | null
  sales_count: number | null
  difference: number
  reopened_from_id: string | null
  created_at: string
  updated_at: string
}

export interface CashMovement {
  id: string
  session_id: string
  type: 'drop' | 'pickup' | 'expense'
  amount: number
  reason: string
  created_by: string
  created_at: string
}

export interface Database {
  __InternalSupabase: {
    PostgrestVersion: '12'
  }
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Omit<Profile, 'created_at' | 'updated_at'>; Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>; Relationships: [] }
      products: { Row: Product; Insert: Omit<Product, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<Product, 'id' | 'created_at' | 'updated_at'>>; Relationships: [] }
      sales: { Row: Sale; Insert: Omit<Sale, 'id' | 'created_at' | 'session_id'> & Partial<Pick<Sale, 'session_id'>>; Update: Partial<Pick<Sale, 'status' | 'notes'>>; Relationships: [] }
      sale_items: { Row: SaleItem; Insert: Omit<SaleItem, 'id' | 'created_at'>; Update: never; Relationships: [] }
      audit_logs: { Row: AuditLog; Insert: Omit<AuditLog, 'id' | 'created_at' | 'ip_address'> & Partial<Pick<AuditLog, 'ip_address'>>; Update: never; Relationships: [] }
      stock_adjustments: { Row: StockAdjustment; Insert: Omit<StockAdjustment, 'id' | 'created_at'>; Update: never; Relationships: [] }
      cash_sessions: {
        Row: CashSession
        Insert: Pick<CashSession, 'cashier_id' | 'opening_float'> & Partial<Pick<CashSession, 'status'>>
        Update: Partial<Pick<CashSession, 'status' | 'closing_notes'>>
        Relationships: []
      }
      cash_movements: {
        Row: CashMovement
        Insert: Omit<CashMovement, 'id' | 'created_at'>
        Update: never
        Relationships: []
      }
    }
    Views: {
      products_low_stock: { Row: Product; Relationships: [] }
    }
    Functions: {
      get_today_best_seller: {
        Args: Record<string, never>
        Returns: { product_id: string; name: string; total_qty: number }[]
      }
    }
  }
}
