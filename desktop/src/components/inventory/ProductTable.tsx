import type { Product } from '../../types/database'

const formatMXN = (amount: number) =>
  amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

interface ProductTableProps {
  products: Product[]
  isAdmin: boolean
  onEdit: (product: Product) => void
  onAdjustStock: (product: Product) => void
  onDeactivate: (product: Product) => void
}

export default function ProductTable({
  products,
  isAdmin,
  onEdit,
  onAdjustStock,
  onDeactivate,
}: ProductTableProps) {
  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-coffee-300 text-sm">
        No se encontraron productos
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-coffee-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-coffee-900 text-coffee-100 text-left">
            <th className="px-4 py-3 font-semibold">Nombre</th>
            <th className="px-4 py-3 font-semibold">Barcode</th>
            <th className="px-4 py-3 font-semibold">Categoría</th>
            <th className="px-4 py-3 font-semibold text-right">Precio</th>
            <th className="px-4 py-3 font-semibold text-right">Costo</th>
            <th className="px-4 py-3 font-semibold text-right">Stock</th>
            <th className="px-4 py-3 font-semibold text-right">Mín.</th>
            <th className="px-4 py-3 font-semibold">Estado</th>
            <th className="px-4 py-3 font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const isLowStock = product.stock <= product.min_stock
            const rowClass = !product.is_active
              ? 'bg-gray-50 opacity-40'
              : isLowStock
              ? 'bg-red-50/50'
              : 'bg-white'

            return (
              <tr
                key={product.id}
                className={`border-t border-coffee-100 ${rowClass}`}
              >
                <td className="px-4 py-3 font-medium text-coffee-900">
                  {product.name}
                </td>
                <td className="px-4 py-3 text-coffee-500 font-mono text-xs">
                  {product.barcode ?? '—'}
                </td>
                <td className="px-4 py-3 text-coffee-700">{product.category}</td>
                <td className="px-4 py-3 text-right text-coffee-900">
                  {formatMXN(product.price)}
                </td>
                <td className="px-4 py-3 text-right text-coffee-500">
                  {formatMXN(product.cost_price)}
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-xs font-semibold ${
                      isLowStock
                        ? 'bg-red-100 text-red-700'
                        : 'text-coffee-900'
                    }`}
                  >
                    {product.stock}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-coffee-500">
                  {product.min_stock}
                </td>
                <td className="px-4 py-3">
                  {product.is_active ? (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      Activo
                    </span>
                  ) : (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-500">
                      Inactivo
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEdit(product)}
                      className="text-xs px-2.5 py-1 rounded bg-coffee-100 text-coffee-700 hover:bg-coffee-200 transition-colors"
                    >
                      Editar
                    </button>
                    {product.is_active && (
                      <button
                        onClick={() => onAdjustStock(product)}
                        className="text-xs px-2.5 py-1 rounded bg-coffee-100 text-coffee-700 hover:bg-coffee-200 transition-colors"
                      >
                        Stock
                      </button>
                    )}
                    {isAdmin && product.is_active && (
                      <button
                        onClick={() => onDeactivate(product)}
                        className="text-xs px-2.5 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                      >
                        Desactivar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
