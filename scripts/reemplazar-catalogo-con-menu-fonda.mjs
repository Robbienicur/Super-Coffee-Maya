#!/usr/bin/env node
// Reemplaza los productos existentes en Supabase remoto por el menú definitivo de la fonda.
// Ejecutar una sola vez. Usa SUPABASE_SERVICE_ROLE_KEY del .env del root.

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '..', '.env')
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const idx = l.indexOf('=')
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()]
    })
)

const SUPABASE_URL = env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Faltan VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const menu = [
  { name: 'Empanadas',                    price: 25.00, stock: 999, min_stock: 0, category: 'Antojitos' },
  { name: 'Tacos',                        price: 12.00, stock: 999, min_stock: 0, category: 'Antojitos' },
  { name: 'Quesadillas',                  price: 17.00, stock: 999, min_stock: 0, category: 'Antojitos' },
  { name: 'Tostadas',                     price: 15.00, stock: 999, min_stock: 0, category: 'Antojitos' },
  { name: 'Gorditas',                     price: 20.00, stock: 999, min_stock: 0, category: 'Antojitos' },

  { name: 'Huevos al Gusto',              price: 55.00, stock: 999, min_stock: 0, category: 'Platillos' },
  { name: 'Enchiladas',                   price: 60.00, stock: 999, min_stock: 0, category: 'Platillos' },
  { name: 'Chilaquiles',                  price: 60.00, stock: 999, min_stock: 0, category: 'Platillos' },
  { name: 'Carne Asada',                  price: 75.00, stock: 999, min_stock: 0, category: 'Platillos' },
  { name: 'Carne a la Mexicana',          price: 75.00, stock: 999, min_stock: 0, category: 'Platillos' },
  { name: 'Caldo de Pollo',               price: 75.00, stock: 999, min_stock: 0, category: 'Platillos' },
  { name: 'Pollo Frito',                  price: 75.00, stock: 999, min_stock: 0, category: 'Platillos' },
  { name: 'Guisado de Pollo',             price: 75.00, stock: 999, min_stock: 0, category: 'Platillos' },
  { name: 'Pollo a la Coca',              price: 80.00, stock: 999, min_stock: 0, category: 'Platillos' },
  { name: 'Pollo en Salsa de Cacahuate',  price: 80.00, stock: 999, min_stock: 0, category: 'Platillos' },
  { name: 'Carne Adobada',                price: 75.00, stock: 999, min_stock: 0, category: 'Platillos' },
  { name: 'Camarones',                    price: 90.00, stock: 999, min_stock: 0, category: 'Platillos' },
  { name: 'Costillas de Puerco',          price: 75.00, stock: 999, min_stock: 0, category: 'Platillos' },

  { name: 'Licuado de Melón',             price: 25.00, stock: 999, min_stock: 0, category: 'Licuados' },
  { name: 'Licuado de Plátano',           price: 25.00, stock: 999, min_stock: 0, category: 'Licuados' },
]

async function wipe(table) {
  // PostgREST exige un filtro para DELETE; gte created_at muy antiguo matchea todo.
  const { error, count } = await supabase
    .from(table)
    .delete({ count: 'exact' })
    .gte('created_at', '1900-01-01')
  if (error) throw error
  console.log(`- ${table}: ${count ?? 0} filas borradas`)
}

async function main() {
  console.log(`Aplicando menú a ${SUPABASE_URL}`)

  // Orden de borrado respetando FK:
  //   stock_adjustments.product_id → products.id
  //   sale_items.sale_id → sales.id (ON DELETE CASCADE)
  //   sale_items.product_id → products.id
  // Borramos sales primero (cascada limpia sale_items), luego stock_adjustments, luego products.
  await wipe('stock_adjustments')
  await wipe('sales')
  await wipe('products')

  const { data, error } = await supabase.from('products').insert(menu).select('id, name')
  if (error) throw error
  console.log(`- products: ${data.length} items insertados`)
  console.log('Listo.')
}

main().catch((err) => {
  console.error('Error:', err.message ?? err)
  process.exit(1)
})
