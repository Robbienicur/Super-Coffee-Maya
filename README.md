# Coffe Maya - Punto de Venta

Sistema POS completo para miscelánea/cafetería. Incluye app de escritorio para uso en tienda y panel web administrativo para monitoreo remoto.

## Stack Tecnológico

- **Desktop:** Electron + React + Vite + TailwindCSS
- **Web Admin:** Next.js 14 + shadcn/ui + Recharts
- **Base de datos:** Supabase (PostgreSQL + Auth + REST API)
- **Offline:** SQLite local con sincronización automática

## Setup

### 1. Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ve a **SQL Editor** y ejecuta el archivo `supabase/migrations/00001_initial_schema.sql`
3. Ejecuta `supabase/seed.sql` para cargar productos de ejemplo
4. Copia tu URL y keys a un archivo `.env` (ver `.env.example`)

### 2. Crear usuario admin

En el SQL Editor de Supabase, después de crear un usuario via Auth:

```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'tu-email@ejemplo.com';
```

### 3. Desktop (desarrollo)

```bash
cd desktop
npm install
npm run dev
```

### 4. Web Admin (desarrollo)

```bash
cd web-admin
npm install
npm run dev
```

### 5. Build Desktop (.exe)

```bash
cd desktop
npm run build
```

El instalador se genera en `desktop/release/`.

### 6. Deploy Web Admin

El `web-admin/vercel.json` ya tiene la configuración lista. El deploy se
automatiza conectando el repo a Vercel una sola vez:

1. Entra a [vercel.com/new](https://vercel.com/new) e importa el repo.
2. **Root Directory:** `web-admin`.
3. **Framework:** Next.js (auto-detectado).
4. **Environment Variables** (Production y Preview):
   - `NEXT_PUBLIC_SUPABASE_URL` — URL de Supabase producción
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon key
   - `SUPABASE_SERVICE_ROLE_KEY` — service role (marcar como sensible, no exponer al cliente)
5. Deploy.

A partir de ahí:

- `git push origin main` → deploy a producción
- Apertura de PR → preview URL comentada automáticamente en el PR

Para un deploy puntual desde la terminal (después del setup):

```bash
cd web-admin
vercel --prod
```

## Entorno de testing local

Para correr los tests E2E se necesita un Supabase local aislado del proyecto
de producción. Requisitos:

- Docker Desktop corriendo
- Supabase CLI instalado (`brew install supabase/tap/supabase` o equivalente)

### Arranque

```bash
pnpm db:start       # levanta Postgres + Auth + Studio en Docker
pnpm db:reset       # aplica migrations, seeds y crea usuarios E2E
pnpm db:stop        # apaga los contenedores cuando termines
```

Después de `db:reset`, la base local contiene:

- Productos deterministas con barcodes `E2E00001` a `E2E00005` (stock 100 cada uno)
- Usuario admin: `admin.e2e@coffemaya.test` / `e2e-admin-pass`
- Usuario cajera: `cajera.e2e@coffemaya.test` / `e2e-cajera-pass`

### Variables de entorno

Copia `.env.test.example` a `.env.test` en cada app que vaya a correr E2E
(desktop y web-admin). Las URLs y keys por defecto coinciden con el proyecto
local estándar de Supabase CLI, que expone:

- API: http://127.0.0.1:54321
- Studio: http://127.0.0.1:54323
- Postgres: postgresql://postgres:postgres@127.0.0.1:54322/postgres

### Troubleshooting

- **"Docker daemon not running"**: arrancar Docker Desktop antes de `db:start`.
- **Puerto 54321 ocupado**: otro proyecto Supabase corriendo. `supabase stop --project-id <otro>` o ajustar `supabase/config.toml`.
- **`db:reset` tarda mucho**: re-aplica todas las migrations (~15s es normal).

## Licencia

Proyecto privado.
