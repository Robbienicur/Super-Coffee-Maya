import { useState, useRef } from 'react'
import supabase from '../../lib/supabaseClient'
import { logAction } from '../../lib/auditLogger'

const CATEGORIES = ['Bebidas', 'Snacks', 'Lácteos', 'Abarrotes', 'Limpieza', 'Otros'] as const

interface CsvImportModalProps {
  onClose: () => void
  onImported: () => void
}

type RowStatus = 'nuevo' | 'actualizar' | 'error'

interface ParsedRow {
  rowIndex: number
  name: string
  barcode: string
  category: string
  price: number
  cost_price: number
  stock: number
  min_stock: number
  description: string
  status: RowStatus
  errors: string[]
  existingId?: string
}

type ImportResult = { created: number; updated: number; errors: number } | null

function parseNumber(val: string): number {
  return parseFloat(val.trim())
}

function parseInteger(val: string): number {
  return Math.floor(parseFloat(val.trim()))
}

function validateRow(cols: string[], rowIndex: number): Omit<ParsedRow, 'status' | 'existingId'> {
  const [
    rawName = '',
    rawBarcode = '',
    rawCategory = '',
    rawPrice = '',
    rawCost = '',
    rawStock = '',
    rawMinStock = '',
    rawDescription = '',
  ] = cols.map((c) => c.trim())

  const errors: string[] = []

  const name = rawName.trim()
  if (!name) errors.push('Nombre requerido')

  const price = parseNumber(rawPrice)
  if (isNaN(price) || price < 0) errors.push('Precio inválido')

  const cost_price = parseNumber(rawCost)
  if (isNaN(cost_price) || cost_price < 0) errors.push('Costo inválido')

  const stock = parseInteger(rawStock)
  if (isNaN(stock) || stock < 0) errors.push('Stock inválido')

  const min_stock = parseInteger(rawMinStock)
  const parsedMinStock = isNaN(min_stock) || min_stock < 0 ? 0 : min_stock

  const category = rawCategory.trim()
  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    errors.push(`Categoría inválida: "${category}"`)
  }

  return {
    rowIndex,
    name,
    barcode: rawBarcode.trim(),
    category,
    price: isNaN(price) ? 0 : price,
    cost_price: isNaN(cost_price) ? 0 : cost_price,
    stock: isNaN(stock) ? 0 : stock,
    min_stock: parsedMinStock,
    description: rawDescription.trim(),
    errors,
  }
}

function parseCsv(text: string): Array<Omit<ParsedRow, 'status' | 'existingId'>> {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  // skip header row
  const dataLines = lines.slice(1)
  return dataLines.map((line, i) => {
    const cols = line.split(',')
    return validateRow(cols, i + 2) // +2: 1-based + skip header
  })
}

export default function CsvImportModal({ onClose, onImported }: CsvImportModalProps) {
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const validRows = rows.filter((r) => r.status !== 'error')
  const errorRows = rows.filter((r) => r.status === 'error')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const text = await file.text()
    const parsed = parseCsv(text)

    if (parsed.length === 0) {
      setRows([])
      return
    }

    // Fetch existing products by barcode to detect updates vs new
    const barcodes = parsed.map((r) => r.barcode).filter(Boolean)
    let existingMap: Record<string, string> = {}

    if (barcodes.length > 0) {
      const { data } = await supabase
        .from('products')
        .select('id, barcode')
        .in('barcode', barcodes)
        .eq('is_active', true)

      for (const p of data ?? []) {
        if (p.barcode) existingMap[p.barcode] = p.id
      }
    }

    const enriched: ParsedRow[] = parsed.map((row) => {
      if (row.errors.length > 0) return { ...row, status: 'error' }
      const existingId = row.barcode ? existingMap[row.barcode] : undefined
      return {
        ...row,
        status: existingId ? 'actualizar' : 'nuevo',
        existingId,
      }
    })

    setRows(enriched)
    setResult(null)
  }

  async function handleImport() {
    if (validRows.length === 0) return
    setLoading(true)

    let created = 0
    let updated = 0
    let errors = 0

    for (const row of validRows) {
      const productData = {
        name: row.name,
        barcode: row.barcode || null,
        category: row.category,
        price: row.price,
        cost_price: row.cost_price,
        stock: row.stock,
        min_stock: row.min_stock,
        description: row.description,
        is_active: true,
        image_url: null,
      }

      if (row.status === 'actualizar' && row.existingId) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', row.existingId)

        if (error) {
          errors++
        } else {
          await logAction('PRODUCT_UPDATED', 'product', row.existingId, undefined, {
            ...productData,
            source: 'csv_import',
          })
          updated++
        }
      } else {
        const { data: inserted, error } = await supabase
          .from('products')
          .insert(productData)
          .select('id')
          .single()

        if (error || !inserted) {
          errors++
        } else {
          await logAction('PRODUCT_CREATED', 'product', inserted.id, undefined, {
            ...productData,
            source: 'csv_import',
          })
          created++
        }
      }
    }

    setLoading(false)
    setResult({ created, updated, errors })

    if (errors === 0) {
      setTimeout(() => {
        onImported()
        onClose()
      }, 1500)
    } else {
      onImported()
    }
  }

  function rowBg(status: RowStatus) {
    if (status === 'error') return 'bg-red-50'
    if (status === 'actualizar') return 'bg-yellow-50'
    return 'bg-white'
  }

  function statusBadge(status: RowStatus) {
    if (status === 'nuevo') return <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Nuevo</span>
    if (status === 'actualizar') return <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">Actualizar</span>
    return <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">Error</span>
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-[fade-in_200ms_ease-out]">
      <div className="bg-cream rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-[scale-in_200ms_ease-out]">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-coffee-200 shrink-0">
          <h2 className="text-lg font-bold text-coffee-900">Importar productos desde CSV</h2>
          <p className="text-xs text-coffee-500 mt-1">
            Formato: nombre,barcode,categoría,precio,costo,stock,min_stock,descripción
          </p>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* File input */}
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFile}
              className="hidden"
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="px-4 py-2 rounded-lg border border-coffee-300 text-coffee-700 text-sm hover:bg-coffee-100 transition-colors"
            >
              Seleccionar archivo (.csv / .txt)
            </button>
          </div>

          {/* Preview table */}
          {rows.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-coffee-200">
              <table className="w-full text-xs">
                <thead className="bg-coffee-100 text-coffee-700">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Fila</th>
                    <th className="px-3 py-2 text-left font-medium">Estado</th>
                    <th className="px-3 py-2 text-left font-medium">Nombre</th>
                    <th className="px-3 py-2 text-left font-medium">Código</th>
                    <th className="px-3 py-2 text-left font-medium">Categoría</th>
                    <th className="px-3 py-2 text-right font-medium">Precio</th>
                    <th className="px-3 py-2 text-right font-medium">Existencias</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-coffee-100">
                  {rows.map((row) => (
                    <tr key={row.rowIndex} className={rowBg(row.status)}>
                      <td className="px-3 py-2 text-coffee-500">{row.rowIndex}</td>
                      <td className="px-3 py-2">{statusBadge(row.status)}</td>
                      <td className="px-3 py-2 text-coffee-900 max-w-[140px] truncate">{row.name || '—'}</td>
                      <td className="px-3 py-2 text-coffee-600 font-mono">{row.barcode || '—'}</td>
                      <td className="px-3 py-2 text-coffee-700">{row.category || '—'}</td>
                      <td className="px-3 py-2 text-coffee-900 text-right">
                        {row.status !== 'error' ? `$${row.price.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-3 py-2 text-coffee-900 text-right">
                        {row.status !== 'error' ? row.stock : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Error summary */}
          {errorRows.length > 0 && (
            <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-xs text-red-700 space-y-1">
              <p className="font-semibold mb-1">Errores encontrados ({errorRows.length} filas):</p>
              {errorRows.map((row) => (
                <p key={row.rowIndex}>
                  <span className="font-medium">Fila {row.rowIndex}:</span> {row.errors.join(', ')}
                </p>
              ))}
            </div>
          )}

          {/* Import result */}
          {result && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200 text-sm text-green-800">
              {result.created} creado{result.created !== 1 ? 's' : ''},&nbsp;
              {result.updated} actualizado{result.updated !== 1 ? 's' : ''},&nbsp;
              {result.errors} error{result.errors !== 1 ? 'es' : ''}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-4 border-t border-coffee-200 flex gap-3 shrink-0">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg border border-coffee-200 text-coffee-700 text-sm hover:bg-coffee-100 disabled:opacity-40 transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={handleImport}
            disabled={loading || validRows.length === 0}
            className="flex-1 py-2.5 rounded-lg bg-coffee-900 text-white font-semibold text-sm hover:bg-coffee-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading
              ? 'Importando...'
              : `Importar ${validRows.length} producto${validRows.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
