export const PRODUCT_CATEGORIES = [
  'Antojitos',
  'Platillos',
  'Licuados',
  'Bebidas',
  'Snacks',
  'Lácteos',
  'Abarrotes',
  'Limpieza',
  'Otros',
] as const

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number]
