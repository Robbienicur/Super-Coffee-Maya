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
        category: product.category,
        image_url: product.image_url ?? '',
      })
    } else {
      setForm(EMPTY_FORM)
    }
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

    setLoading(true)
    setError('')
    const supabase = createClient()

    const payload = {
      barcode: form.barcode || null,
      name: form.name,
      description: form.description,
      price: parseFloat(form.price),
      cost_price: parseFloat(form.cost_price) || 0,
      stock: parseInt(form.stock) || 0,
      min_stock: parseInt(form.min_stock) || 5,
      category: form.category,
      image_url: form.image_url || null,
    }

    if (isEdit && product) {
      const oldValues: Record<string, unknown> = {}
      const newValues: Record<string, unknown> = {}

      if (product.price !== payload.price) {
        oldValues.price = product.price
        newValues.price = payload.price
      }
      if (product.stock !== payload.stock) {
        oldValues.stock = product.stock
        newValues.stock = payload.stock
      }
      if (product.name !== payload.name) {
        oldValues.name = product.name
        newValues.name = payload.name
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

      if (oldValues.price !== undefined) {
        await insertAuditLog('PRICE_CHANGED', 'product', product.id, oldValues, newValues)
      } else if (oldValues.stock !== undefined) {
        await insertAuditLog('STOCK_ADJUSTED', 'product', product.id, oldValues, newValues)
      } else if (Object.keys(oldValues).length > 0) {
        await insertAuditLog('PRODUCT_UPDATED', 'product', product.id, oldValues, newValues)
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
      <DialogContent className="max-w-lg">
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
              <Input
                value={form.category}
                onChange={(e) => updateField('category', e.target.value)}
                placeholder="Ej: Bebidas"
                required
              />
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
