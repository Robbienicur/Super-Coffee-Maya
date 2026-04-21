export const CATEGORIES = [
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

export type Category = (typeof CATEGORIES)[number]
