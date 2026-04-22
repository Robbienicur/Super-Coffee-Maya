#!/usr/bin/env python3
"""Normaliza un export TSV (latin-1) del inventario del sistema anterior
y genera una migración SQL con INSERT de los productos limpios.

Uso:  python scripts/normalize_inventory.py <ruta-al-tsv>
"""
import os, re, sys
from collections import defaultdict

SRC = sys.argv[1] if len(sys.argv) > 1 else os.environ.get('INVENTORY_TSV', '')
if not SRC:
    print('Uso: python scripts/normalize_inventory.py <ruta-al-tsv>', file=sys.stderr)
    sys.exit(1)

OUT_SQL = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    'supabase', 'migrations', '20260422160000_import_inventario_tienda.sql',
)

# Erratas detectadas → corrección
SPELLING_FIXES = [
    (r'\bMenbers\b',    'Members'),
    (r'\bMosnter\b',    'Monster'),
    (r'\bNisssin\b',    'Nissin'),
    (r'\bPicantante\b', 'Picante'),
    (r'\bTawazula\b',   'Tamazula'),
    (r'\bGayaba\b',     'Guayaba'),
    (r'\bPeafiel\b',    'Peñafiel'),
    (r'\bHolandaa\b',   'Holanda'),
    (r'\bManzanda\b',   'Manzana'),
    (r'\bcCocolate\b',  'Chocolate'),
    (r'\bcChocolate\b', 'Chocolate'),
    (r'\bChocolote\b',  'Chocolate'),
    (r'\bOrigininal\b', 'Original'),
    (r'\bOriginial\b',  'Original'),
    (r'\bCacahute\b',   'Cacahuate'),
    (r'\bCacahutes\b',  'Cacahuates'),
    (r'\bPastlla\b',    'Pastilla'),
    (r'\bPolvores\b',   'Polvorones'),
    (r'\bTriden\b',     'Trident'),
    (r'\bYerbabuen\b',  'Yerbabuena'),
    (r'\bPltano\b',     'Plátano'),
    (r'\bBubuLubu\b',   'Bubulubu'),
    (r'\bMalboro\b',    'Marlboro'),
]

# Mapeo de departamentos → categoría final
CATEGORY_MAP = {
    'Abarrotera BELEN':      'Abarrotes',
    'Coca Cola':             'Bebidas',
    'PEPSI COLA':            'Bebidas',
    'PEÑAFIEL':              'Bebidas',
    'JUMEX':                 'Bebidas',
    'BOING':                 'Bebidas',
    'RICOLINO':              'Dulces',
    'MARINELA':              'Pan y Pastelitos',
    'SABRITAS':              'Botanas',
    'BARCEL':                'Botanas',
    'GAMESA':                'Galletas',
    'BIMBO':                 'Pan y Pastelitos',
    'SIGMA ALIMENTOS':       'Lácteos y Embutidos',
    'HOLANDA':               'Helados',
    'SUPER SANCHEZ':         'Abarrotes',
    'KINDER':                'Dulces',
    'PEDIGREE':              'Mascotas',
    'MANA':                  'Botanas',
    'Farmacia':              'Farmacia',
    'TOSTADAS':              'Abarrotes',
    'RICA TANA':             'Botanas',
    'SAMS CLUB':             'Abarrotes',
    'COFFEE MAYA':           'Cafetería',
    'ALIMENTOS Y BEBIDAS':   'Cafetería',
    'PAPELERIA':             'Papelería',
    'NAPOLEON':              'Abarrotes',
    '- Sin Departamento -':  'General',
    '':                      'General',
}

def parse_money(s):
    s = re.sub(r'[^\d.]', '', s or '')
    try: return float(s) if s else 0.0
    except: return 0.0

def parse_stock(s):
    s = (s or '').strip()
    if not s or s.upper() == 'N/A': return None
    try: return int(float(s))
    except: return None

def normalize_name(s):
    s = s.strip()
    s = re.sub(r'\s+', ' ', s)
    for pat, rep in SPELLING_FIXES:
        s = re.sub(pat, rep, s, flags=re.I)
    # Title case conservador (preservando minúsculas de medidas como "ml", "g", "kg")
    return s

def clean_barcode(code):
    """Devuelve barcode limpio o None si no es real."""
    c = (code or '').strip()
    if not c.isdigit(): return None
    L = len(c)
    if L < 8: return None              # IDs internos, no son barcodes
    if L == 11: return '0' + c         # UPC-A sin cero a la izquierda
    if L == 12: return c               # UPC-A
    if L == 13: return c               # EAN-13
    if L == 14: return c               # ITF-14 (aunque raro en retail)
    if L == 8:  return c               # EAN-8
    return None                        # Longitudes raras (9, 10, 15+) → mejor dejar nulo

def esc(s):
    return s.replace("'", "''") if s else ''

# ─── LEER ─────────────────────────────────────────────────────────────
with open(SRC, 'rb') as f:
    text = f.read().decode('latin-1')

raw_rows = [l.split('\t') for l in text.splitlines()[1:] if l.strip()]
print(f'Entradas crudas: {len(raw_rows)}')

# ─── NORMALIZAR ──────────────────────────────────────────────────────
products = []
for r in raw_rows:
    if len(r) < 8: continue
    name      = normalize_name(r[1])
    cost      = parse_money(r[2])
    price     = parse_money(r[3])
    stock     = parse_stock(r[5])
    min_stock = parse_stock(r[6]) or 0
    dept      = r[7].strip()
    barcode   = clean_barcode(r[0])
    category  = CATEGORY_MAP.get(dept, 'General')
    if price <= 0: price = max(cost * 1.3, 1.0)   # protección
    products.append({
        'barcode': barcode,
        'name': name,
        'cost_price': cost,
        'price': price,
        'stock': stock if stock is not None else 0,
        'min_stock': min_stock,
        'category': category,
        'needs_stock': stock is None,
        'dept_original': dept,
    })

# ─── DEDUPE ──────────────────────────────────────────────────────────
# Colapsar entradas con mismo nombre normalizado (preferir barcode EAN-13)
by_name = defaultdict(list)
for p in products:
    by_name[p['name'].lower()].append(p)

deduped = []
merged_count = 0
for name_key, plist in by_name.items():
    if len(plist) == 1:
        deduped.append(plist[0])
        continue
    # Múltiples: preferir el que tenga barcode de 13 dígitos, si no el más largo
    best = max(plist, key=lambda p: (
        len(p['barcode']) == 13 if p['barcode'] else 0,
        len(p['barcode']) if p['barcode'] else 0,
        p['stock'] > 0,
    ))
    deduped.append(best)
    merged_count += len(plist) - 1

print(f'Tras dedupe por nombre: {len(deduped)}  (fusionados: {merged_count})')

# Validar unicidad de barcode (UNIQUE en schema)
seen = set()
final = []
for p in deduped:
    b = p['barcode']
    if b and b in seen:
        p['barcode'] = None              # colisión residual → null
    else:
        if b: seen.add(b)
    final.append(p)

needs_barcode = sum(1 for p in final if not p['barcode'])
needs_stock   = sum(1 for p in final if p['needs_stock'])
print(f'Productos finales: {len(final)}')
print(f'  sin barcode (botón azul): {needs_barcode}')
print(f'  sin stock definido (botón azul): {needs_stock}')

# ─── EMITIR SQL ──────────────────────────────────────────────────────
lines = [
    '-- Importación de inventario real de la tienda (~1500 productos).',
    '-- Fuente: /Users/robbiecdesalazar/Downloads/invetario.xls (TSV latin-1).',
    '-- Normalizado: erratas corregidas, espacios colapsados, barcodes inválidos → NULL,',
    '-- UPC-A de 11 dígitos padeados a 12, duplicados por nombre fusionados.',
    '',
    'BEGIN;',
    '',
]
BATCH = 200
for i in range(0, len(final), BATCH):
    chunk = final[i:i+BATCH]
    lines.append('INSERT INTO public.products '
                 '(barcode, name, price, cost_price, stock, min_stock, category, track_stock) VALUES')
    parts = []
    for p in chunk:
        b = f"'{p['barcode']}'" if p['barcode'] else 'NULL'
        parts.append(
            f"  ({b}, '{esc(p['name'])}', {p['price']:.2f}, {p['cost_price']:.2f}, "
            f"{p['stock']}, {p['min_stock']}, '{esc(p['category'])}', true)"
        )
    lines.append(',\n'.join(parts))
    lines.append('ON CONFLICT (barcode) DO NOTHING;')
    lines.append('')

lines.append('COMMIT;')
with open(OUT_SQL, 'w') as f:
    f.write('\n'.join(lines))

print(f'\nMigración escrita: {OUT_SQL}')
