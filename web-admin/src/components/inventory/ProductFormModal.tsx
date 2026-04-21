'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { insertAuditLog } from '@/lib/auditLog'
import type { Product } from '@/types/database'
import { applyTaxIfNeeded } from '@/lib/taxMath'
import { PRODUCT_CATEGORIES } from '@/lib/categories'

interface ProductFormModalProps {
  product: Product | null
  open: boolean
  onClose: () => void
  onSaved: () => void
}

interface FormData {
  barcode: string
  name: string
  description: string
  price: string
  cost_price: string
  stock: string
  min_stock: string
  track_stock: boolean
  category: string
  image_url: string
}

const EMPTY_FORM: FormData = {
  barcode: '',
  name: '',
  description: '',
  price: '',
  cost_price: '',
  stock: '',
  min_stock: '5',
  track_stock: true,
  category: '',
  image_url: '',
}

export default function ProductFormModal({
  product,
  open,
  onClose,
  onSaved,
}: ProductFormModalProps) {
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [includesTax, setIncludesTax] = useState(false)
  const [taxRatePercent, setTaxRatePercent] = useState('8')

  const isEdit = !!product

  useEffect(() => {
    if (product) {
      setForm({
        barcode: product.barcode ?? '',
        name: product.name,
        description: product.description,
        price: String(product.price),
        cost_price: String(product.cost_price),
        stock: String(product.stock),
        min_stock: String(product.min_stock),
        track_stock: product.track_stock,
        category: product.category,
        image_url: product.image_url ?? '',
      })
    } else {
      setForm(EMPTY_FORM)
    }
    setIncludesTax(false)
    setTaxRatePercent('8')
    setError('')
  }, [product, open])

  function updateField(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.price || !form.category) {
      setError('Nombre, precio y categoría son obligatorios.')
      return
    }

    if (!isEdit && parseFloat(form.cost_price) > 0 && !includesTax) {
      const rate = parseFloat(taxRatePercent)
      if (isNaN(rate) || rate < 0 || rate > 100) {
        setError('Ingresa una tasa de impuesto válida (0 a 100) o marca que ya está incluido.')
        return
      }
    }

    setLoading(true)
    setError('')
    const supabase = createClient()

    const rawCost = parseFloat(form.cost_price) || 0
    const taxRateDecimal = (parseFloat(taxRatePercent) || 0) / 100
    const computedCost = isEdit
      ? rawCost
      : applyTaxIfNeeded(rawCost, includesTax, taxRateDecimal)

    const payload = {
      barcode: form.barcode || null,
      name: form.name,
      description: form.description,
      price: parseFloat(form.price),
      cost_price: computedCost,
      stock: form.track_stock ? (parseInt(form.stock) || 0) : 0,
      min_stock: form.track_stock ? (parseInt(form.min_stock) || 5) : 0,
      track_stock: form.track_stock,
      category: form.category,
      image_url: form.image_url || null,
    }

    if (isEdit && product) {
      const oldValues: Record<string, unknown> = {}
      const newValues: Record<string, unknown> = {}

      const TRACKED_FIELDS: Array<keyof typeof payload> = [
        'name',
        'barcode',
        'description',
        'category',
        'price',
        'cost_price',
        'stock',
        'min_stock',
        'track_stock',
        'image_url',
      ]

      for (const field of TRACKED_FIELDS) {
        const oldVal = (product as unknown as Record<string, unknown>)[field] ?? null
        const newVal = payload[field] ?? null
        if (oldVal !== newVal) {
          oldValues[field] = oldVal
          newValues[field] = newVal
        }
      }

      const { error: updateError } = await supabase
        .from('products')
        // @ts-expect-error: supabase-js v2.103 schema inference issue with manual Database types
        .update(payload)
        .eq('id', product.id)

      if (updateError) {
        setError(updateError.message)
        setLoading(false)
        return
      }

      if (Object.keys(oldValues).length > 0) {
        const priceChanged = 'price' in oldValues
        const stockChanged = 'stock' in oldValues
        const onlyPriceChanged = priceChanged && Object.keys(oldValues).length === 1
        const onlyStockChanged = stockChanged && Object.keys(oldValues).length === 1

        const action = onlyPriceChanged
          ? 'PRICE_CHANGED'
          : onlyStockChanged
            ? 'STOCK_ADJUSTED'
            : 'PRODUCT_UPDATED'
        await insertAuditLog(action, 'product', product.id, oldValues, newValues)
      }
    } else {
      const { data: newProduct, error: insertError } = await supabase
        .from('products')
        // @ts-expect-error: supabase-js v2.103 schema inference issue with manual Database types
        .insert({ ...payload, is_active: true })
        .select('id')
        .single()

      if (insertError) {
        setError(insertError.message)
        setLoading(false)
        return
      }

      if (newProduct) {
        await insertAuditLog('PRODUCT_CREATED', 'product', (newProduct as { id: string }).id, null, payload)
      }
    }

    setLoading(false)
    onSaved()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Código de barras</Label>
              <Input
                value={form.barcode}
                onChange={(e) => updateField('barcode', e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div>
              <Label>Categoría *</Label>
              <select
                value={form.category}
                onChange={(e) => updateField('category', e.target.value)}
                className="w-full h-8 rounded-md border border-input bg-transparent px-3 text-sm text-coffee-900"
                required
              >
                <option value="">Selecciona...</option>
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label>Nombre *</Label>
            <Input
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Nombre del producto"
              required
            />
          </div>

          <div>
            <Label>Descripción</Label>
            <Input
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Descripción breve"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Precio de venta *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => updateField('price', e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Precio de costo</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.cost_price}
                onChange={(e) => updateField('cost_price', e.target.value)}
              />
            </div>
          </div>

          {!isEdit && (() => {
            const rawCost = parseFloat(form.cost_price)
            const rate = parseFloat(taxRatePercent)
            const rateDecimal = isNaN(rate) ? 0 : rate / 100
            const preview =
              !isNaN(rawCost) && rawCost > 0
                ? applyTaxIfNeeded(rawCost, includesTax, rateDecimal)
                : null
            const previewText = preview !== null
              ? includesTax
                ? `Se guardará: $${preview.toFixed(2)} (IEPS ya incluido)`
                : `Se guardará: $${preview.toFixed(2)} (costo $${rawCost.toFixed(2)} + ${isNaN(rate) ? 0 : rate}%)`
              : null

            return (
              <div className="p-3 rounded-lg bg-muted/40 border space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includesTax}
                    onChange={(e) => setIncludesTax(e.target.checked)}
                    className="w-4 h-4"
                  />
                  ¿Incluye IEPS?
                </label>
                <div className="flex items-center gap-2 text-sm">
                  <span>Tasa %:</span>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={taxRatePercent}
                    onChange={(e) => setTaxRatePercent(e.target.value)}
                    disabled={includesTax}
                    className="w-24"
                  />
                  <span className="text-xs text-muted-foreground">(8% por frontera)</span>
                </div>
                {previewText && (
                  <p className="text-xs text-muted-foreground italic">{previewText}</p>
                )}
              </div>
            )
          })()}

          <div className="p-3 rounded-lg bg-muted/40 border">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.track_stock}
                onChange={(e) => setForm((prev) => ({ ...prev, track_stock: e.target.checked }))}
                className="w-4 h-4"
              />
              Rastrear inventario
            </label>
            <p className="text-xs text-muted-foreground mt-1 ml-6">
              Desactiva esta opción para alimentos preparados al momento u otros productos sin stock.
            </p>
          </div>

          {form.track_stock && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Stock</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) => updateField('stock', e.target.value)}
                />
              </div>
              <div>
                <Label>Stock mínimo</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.min_stock}
                  onChange={(e) => updateField('min_stock', e.target.value)}
                />
              </div>
            </div>
          )}

          <div>
            <Label>URL de imagen</Label>
            <Input
              value={form.image_url}
              onChange={(e) => updateField('image_url', e.target.value)}
              placeholder="https://..."
            />
          </div>

          {error && <p className="text-danger text-sm">{error}</p>}

          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Agregar Producto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
