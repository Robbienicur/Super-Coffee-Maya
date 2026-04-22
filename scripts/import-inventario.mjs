// Importa los productos normalizados al proyecto Supabase remoto.
// Uso:  INVENTORY_TSV=ruta/al/export.tsv node --env-file=.env scripts/import-inventario.mjs
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const src = process.env.INVENTORY_TSV
if (!url || !key) {
  console.error('Faltan VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno')
  process.exit(1)
}
if (!src) {
  console.error('Falta INVENTORY_TSV con la ruta al export del sistema anterior')
  process.exit(1)
}

const sb = createClient(url, key, { auth: { persistSession: false } })
const raw = readFileSync(src, 'latin1')

const SPELLING = [
  [/\bMenbers\b/gi, 'Members'],
  [/\bMosnter\b/gi, 'Monster'],
  [/\bNisssin\b/gi, 'Nissin'],
  [/\bPicantante\b/gi, 'Picante'],
  [/\bTawazula\b/gi, 'Tamazula'],
  [/\bGayaba\b/gi, 'Guayaba'],
  [/\bPeafiel\b/gi, 'Peñafiel'],
  [/\bHolandaa\b/gi, 'Holanda'],
  [/\bManzanda\b/gi, 'Manzana'],
  [/\bcChocolate\b/gi, 'Chocolate'],
  [/\bChocolote\b/gi, 'Chocolate'],
  [/\bOriginial\b/gi, 'Original'],
  [/\bCacahute\b/gi, 'Cacahuate'],
  [/\bCacahutes\b/gi, 'Cacahuates'],
  [/\bPastlla\b/gi, 'Pastilla'],
  [/\bPolvores\b/gi, 'Polvorones'],
  [/\bTriden\b/gi, 'Trident'],
  [/\bYerbabuen\b/gi, 'Yerbabuena'],
  [/\bPltano\b/gi, 'Plátano'],
  [/\bBubuLubu\b/gi, 'Bubulubu'],
  [/\bMalboro\b/gi, 'Marlboro'],
]

const CAT = {
  'Abarrotera BELEN':'Abarrotes','Coca Cola':'Bebidas','PEPSI COLA':'Bebidas',
  'PEÑAFIEL':'Bebidas','JUMEX':'Bebidas','BOING':'Bebidas',
  'RICOLINO':'Dulces','MARINELA':'Pan y Pastelitos','SABRITAS':'Botanas',
  'BARCEL':'Botanas','GAMESA':'Galletas','BIMBO':'Pan y Pastelitos',
  'SIGMA ALIMENTOS':'Lácteos y Embutidos','HOLANDA':'Helados',
  'SUPER SANCHEZ':'Abarrotes','KINDER':'Dulces','PEDIGREE':'Mascotas',
  'MANA':'Botanas','Farmacia':'Farmacia','TOSTADAS':'Abarrotes',
  'RICA TANA':'Botanas','SAMS CLUB':'Abarrotes','COFFEE MAYA':'Cafetería',
  'ALIMENTOS Y BEBIDAS':'Cafetería','PAPELERIA':'Papelería',
  'NAPOLEON':'Abarrotes','- Sin Departamento -':'General','':'General',
}

function money(s) { const n = parseFloat((s||'').replace(/[^0-9.]/g,'')); return isFinite(n)?n:0 }
function stock(s) { const t=(s||'').trim(); if(!t||t.toUpperCase()==='N/A') return null; const n=parseInt(parseFloat(t)); return isFinite(n)?n:null }
function normName(s) {
  let x = s.trim().replace(/\s+/g,' ')
  for (const [re, rep] of SPELLING) x = x.replace(re, rep)
  return x
}
function cleanBarcode(c) {
  c = (c||'').trim()
  if (!/^\d+$/.test(c)) return null
  const L = c.length
  if (L < 8) return null
  if (L === 11) return '0' + c
  if ([8,12,13,14].includes(L)) return c
  return null
}

const lines = raw.split('\n').slice(1).filter(l => l.trim())
const rows = lines.map(l => l.split('\t'))
const items = []
for (const r of rows) {
  if (r.length < 8) continue
  const name = normName(r[1])
  const cost = money(r[2])
  let price = money(r[3])
  if (price <= 0) price = Math.max(cost * 1.3, 1)
  const st = stock(r[5])
  const mn = stock(r[6]) || 0
  const dept = r[7].trim()
  items.push({
    barcode: cleanBarcode(r[0]),
    name,
    price: Number(price.toFixed(2)),
    cost_price: Number(cost.toFixed(2)),
    stock: st ?? 0,
    min_stock: mn,
    category: CAT[dept] ?? 'General',
    track_stock: true,
    is_active: true,
  })
}

// Dedupe por nombre (preferir EAN-13)
const byName = new Map()
for (const p of items) {
  const k = p.name.toLowerCase()
  const cur = byName.get(k)
  if (!cur) { byName.set(k, p); continue }
  const betterNew = (p.barcode?.length === 13) && (cur.barcode?.length !== 13)
  if (betterNew) byName.set(k, p)
}
let final = [...byName.values()]

// Dedupe por barcode (unique en DB)
const seen = new Set()
final = final.map(p => {
  if (p.barcode && seen.has(p.barcode)) return { ...p, barcode: null }
  if (p.barcode) seen.add(p.barcode)
  return p
})

console.log(`Listos para insertar: ${final.length}`)
console.log(`  sin barcode: ${final.filter(p=>!p.barcode).length}`)

// Insertar por lotes de 500
const BATCH = 500
let inserted = 0, errored = 0
for (let i = 0; i < final.length; i += BATCH) {
  const chunk = final.slice(i, i+BATCH)
  const { error } = await sb.from('products').upsert(chunk, { onConflict: 'barcode', ignoreDuplicates: false })
  if (error) {
    console.error(`Lote ${i}-${i+chunk.length}: ERROR`, error.message)
    errored += chunk.length
  } else {
    inserted += chunk.length
    process.stdout.write(`\rInsertados ${inserted}/${final.length}`)
  }
}
console.log(`\nTerminado. Insertados: ${inserted}  errores: ${errored}`)
