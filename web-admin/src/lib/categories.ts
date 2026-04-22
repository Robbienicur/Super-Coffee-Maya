export const PRODUCT_CATEGORIES = [
  'Menú',
  'Bebidas',
  'Botanas',
  'Dulces',
  'Pan y Galletas',
  'Lácteos',
  'Helados',
  'Abarrotes',
  'Farmacia',
  'Otros',
] as const

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number]
