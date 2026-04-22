-- Consolida las categorías a un conjunto más compacto (10 totales) y agrega
-- una RPC para obtener los productos más vendidos en una ventana de tiempo,
-- usada por el POS para ordenar los más populares arriba.

-- ── 1. Consolidación de categorías ────────────────────────────────────
-- El trigger enforce_admin_columns bloquea cambios de categoría por no-admin.
-- Durante la migración corre como owner, pero el trigger igual verifica auth.uid()
-- (NULL en contexto de migración) — así que lo desactivamos solo para este paso.
ALTER TABLE public.products DISABLE TRIGGER enforce_admin_columns;

-- Toda la comida preparada (antojitos, platillos, licuados, cafetería) → "Menú"
UPDATE public.products SET category = 'Menú'
 WHERE category IN ('Antojitos', 'Platillos', 'Licuados', 'Cafetería');

UPDATE public.products SET category = 'Pan y Galletas'
 WHERE category IN ('Pan y Pastelitos', 'Galletas');

UPDATE public.products SET category = 'Lácteos'
 WHERE category IN ('Lácteos y Embutidos');

UPDATE public.products SET category = 'Botanas'
 WHERE category IN ('Snacks');

UPDATE public.products SET category = 'Otros'
 WHERE category IN ('Papelería', 'Mascotas', 'General', 'Limpieza');

ALTER TABLE public.products ENABLE TRIGGER enforce_admin_columns;

-- ── 2. RPC: productos más vendidos en los últimos N días ──────────────
CREATE OR REPLACE FUNCTION public.top_selling_products(window_days INT DEFAULT 30)
RETURNS TABLE (product_id UUID, total_qty BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT si.product_id, SUM(si.quantity)::BIGINT AS total_qty
    FROM public.sale_items si
    JOIN public.sales s ON s.id = si.sale_id
   WHERE s.status = 'completed'
     AND s.created_at > now() - (window_days || ' days')::INTERVAL
   GROUP BY si.product_id
$$;

GRANT EXECUTE ON FUNCTION public.top_selling_products(INT) TO authenticated;
