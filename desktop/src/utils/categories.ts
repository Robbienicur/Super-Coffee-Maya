export const CATEGORIES = [
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

export type Category = (typeof CATEGORIES)[number]
