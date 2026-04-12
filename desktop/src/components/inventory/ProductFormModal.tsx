import { useState, useEffect } from 'react'
import supabase from '../../lib/supabaseClient'
import { logAction } from '../../lib/auditLogger'
import { useBarcode } from '../../hooks/useBarcode'
import type { Product } from '../../types/database'

const CATEGORIES = ['Bebidas', 'Snacks', 'Lácteos', 'Abarrotes', 'Limpieza', 'Otros']

interface ProductFormModalProps {
  product: Product | null
  onClose: () => void
  onSaved: () => void
}

interface FormState {
  name: string
  barcode: string
  category: string
  price: string
  cost_price: string
  stock: string
  min_stock: string
  description: string
}

function toFormState(p: Product | null): FormState {
  if (!p) {
    return {
      name: '',
      barcode: '',
      category: 'Otros',
      price: '',
      cost_price: '',
      stock: '',
      min_stock: '5',
      description: '',
    }
  }
  return {
    name: p.name,
    barcode: p.barcode ?? '',
    category: p.category,
    price: String(p.price),
    cost_price: String(p.cost_price),
    stock: String(p.stock),
    min_stock: String(p.min_stock),
    description: p.description ?? '',
  }
}

export default function ProductFormModal({ product, onClose, onSaved }: ProductFormModalProps) {
  const isEdit = product !== null
  const [form, setForm] = useState<FormState>(() => toFormState(product))
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Reset form when product prop changes
  useEffect(() => {
    setForm(toFormState(product))
    setError(null)
  }, [product])

  useBarcode({
    onScan: (barcode) => {
      if (!scanning) return
      setForm((prev) => ({ ...prev, barcode }))
      setScanning(false)
    },
    enabled: scanning,
  })

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const validate = (): string | null => {
    if (!form.name.trim()) return 'El nombre del producto es obligatorio'
    const price = parseFloat(form.price)
    const cost = parseFloat(form.cost_price)
    const stock = parseFloat(form.stock)
    const minStock = parseFloat(form.min_stock)
    if (isNaN(price) || price < 0) return 'El precio de venta debe ser mayor o igual a 0'
    if (isNaN(cost) || cost < 0) return 'El precio de costo debe ser mayor o igual a 0'
    if (isNaN(stock) || stock < 0) return 'El stock debe ser mayor o igual a 0'
    if (isNaN(minStock) || minStock < 0) return 'El stock mínimo debe ser mayor o igual a 0'
    if (!form.category) return 'Selecciona una categoría'
    return null
  }

  const checkDuplicateBarcode = async (): Promise<boolean> => {
    const bc = form.barcode.trim()
    if (!bc) return false

    const query = supabase
      .from('products')
      .select('id')
      .eq('barcode', bc)
      .eq('is_active', true)

    if (isEdit && product) {
      query.neq('id', product.id)
    }

    const { data } = await query.limit(1)
    return (data ?? []).length > 0
  }

  const handleSubmit = async () => {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError(null)

    const isDupe = await checkDuplicateBarcode()
    if (isDupe) {
      setError('Ya existe un producto activo con ese código de barras')
      setLoading(false)
      return
    }

    const price = parseFloat(form.price)
    const cost_price = parseFloat(form.cost_price)
    const stock = Math.floor(parseFloat(form.stock))
    const min_stock = Math.floor(parseFloat(form.min_stock))
    const barcode = form.barcode.trim() || null
    const description = form.description.trim()

    if (isEdit && product) {
      const { error: updateError } = await supabase
        .from('products')
        .update({ name: form.name.trim(), barcode, category: form.category, price, cost_price, stock, min_stock, description })
        .eq('id', product.id)

      if (updateError) {
        setError('Error al guardar: ' + updateError.message)
        setLoading(false)
        return
      }

      // Build old/new diff with only changed fields
      const oldValues: Record<string, unknown> = {}
      const newValues: Record<string, unknown> = {}

      const fields: Array<[keyof Product, unknown]> = [
        ['name', form.name.trim()],
        ['barcode', barcode],
        ['category', form.category],
        ['price', price],
        ['cost_price', cost_price],
        ['stock', stock],
        ['min_stock', min_stock],
        ['description', description],
      ]

      for (const [key, newVal] of fields) {
        const oldVal = product[key]
        if (oldVal !== newVal) {
          oldValues[key] = oldVal
          newValues[key] = newVal
        }
      }

      if (Object.keys(newValues).length > 0) {
        await logAction('PRODUCT_UPDATED', 'product', product.id, oldValues, newValues)
      }

      // Separate price audit entry if price or cost changed
      if ('price' in newValues || 'cost_price' in newValues) {
        await logAction('PRICE_CHANGED', 'product', product.id,
          {
            price: product.price,
            cost_price: product.cost_price,
          },
          {
            price,
            cost_price,
          }
        )
      }
    } else {
      const productData = {
        name: form.name.trim(),
        barcode,
        category: form.category,
        price,
        cost_price,
        stock,
        min_stock,
        description,
        is_active: true,
        image_url: null,
      }

      const { data: inserted, error: insertError } = await supabase
        .from('products')
        .insert(productData)
        .select('id')
        .single()

      if (insertError || !inserted) {
        setError('Error al agregar: ' + (insertError?.message ?? 'Error desconocido'))
        setLoading(false)
        return
      }

      await logAction('PRODUCT_CREATED', 'product', inserted.id, undefined, productData)
    }

    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-cream rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-coffee-900 mb-5">
          {isEdit ? 'Editar Producto' : 'Agregar Producto'}
        </h2>

        <div className="space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm text-coffee-700 mb-1">Nombre <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={set('name')}
              className="w-full px-3 py-2 rounded-lg bg-white border border-coffee-200 text-coffee-900 outline-none focus:border-coffee-500 text-sm"
              placeholder="Nombre del producto"
              autoFocus
            />
          </div>

          {/* Barcode */}
          <div>
            <label className="block text-sm text-coffee-700 mb-1">Código de barras</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.barcode}
                onChange={set('barcode')}
                className="flex-1 px-3 py-2 rounded-lg bg-white border border-coffee-200 text-coffee-900 outline-none focus:border-coffee-500 text-sm"
                placeholder="Escanea o escribe el código"
              />
              <button
                type="button"
                onClick={() => setScanning((prev) => !prev)}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  scanning
                    ? 'bg-coffee-900 text-white border-coffee-900'
                    : 'border-coffee-200 text-coffee-700 hover:bg-coffee-100'
                }`}
              >
                {scanning ? (
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-white animate-pulse" />
                    Esperando escaneo...
                  </span>
                ) : (
                  'Escanear'
                )}
              </button>
            </div>
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-sm text-coffee-700 mb-1">Categoría <span className="text-red-500">*</span></label>
            <select
              value={form.category}
              onChange={set('category')}
              className="w-full px-3 py-2 rounded-lg bg-white border border-coffee-200 text-coffee-900 outline-none focus:border-coffee-500 text-sm"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Precio de venta / Precio de costo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-coffee-700 mb-1">Precio de venta <span className="text-red-500">*</span></label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={set('price')}
                className="w-full px-3 py-2 rounded-lg bg-white border border-coffee-200 text-coffee-900 outline-none focus:border-coffee-500 text-sm"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm text-coffee-700 mb-1">Precio de costo <span className="text-red-500">*</span></label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.cost_price}
                onChange={set('cost_price')}
                className="w-full px-3 py-2 rounded-lg bg-white border border-coffee-200 text-coffee-900 outline-none focus:border-coffee-500 text-sm"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Stock / Stock mínimo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-coffee-700 mb-1">Stock <span className="text-red-500">*</span></label>
              <input
                type="number"
                min="0"
                step="1"
                value={form.stock}
                onChange={set('stock')}
                className="w-full px-3 py-2 rounded-lg bg-white border border-coffee-200 text-coffee-900 outline-none focus:border-coffee-500 text-sm"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm text-coffee-700 mb-1">Stock mínimo <span className="text-red-500">*</span></label>
              <input
                type="number"
                min="0"
                step="1"
                value={form.min_stock}
                onChange={set('min_stock')}
                className="w-full px-3 py-2 rounded-lg bg-white border border-coffee-200 text-coffee-900 outline-none focus:border-coffee-500 text-sm"
                placeholder="5"
              />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm text-coffee-700 mb-1">Descripción</label>
            <textarea
              value={form.description}
              onChange={set('description')}
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-white border border-coffee-200 text-coffee-900 outline-none focus:border-coffee-500 text-sm resize-none"
              placeholder="Descripción opcional"
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg border border-coffee-200 text-coffee-700 text-sm hover:bg-coffee-100 disabled:opacity-40 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg bg-coffee-900 text-white font-semibold text-sm hover:bg-coffee-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Agregar Producto'}
          </button>
        </div>
      </div>
    </div>
  )
}
