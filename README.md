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

```bash
cd web-admin
vercel deploy --prod
```

## Licencia

Proyecto privado.
