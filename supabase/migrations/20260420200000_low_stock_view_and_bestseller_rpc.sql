-- Vista de stock bajo para evitar traer todo el catálogo al cliente y filtrar ahí.
-- RLS se hereda de la tabla base products.
CREATE OR REPLACE VIEW public.products_low_stock AS
SELECT *
  FROM public.products
 WHERE is_active = true
   AND track_stock = true
   AND stock <= min_stock;

-- RPC para el producto más vendido hoy (zona Mexico_City).
-- Mueve el cálculo al servidor en vez de hacerlo cliente con N+1 queries.
CREATE OR REPLACE FUNCTION public.get_today_best_seller()
RETURNS TABLE(product_id UUID, name TEXT, total_qty INTEGER)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT si.product_id,
         p.name,
         SUM(si.quantity)::INTEGER AS total_qty
    FROM sale_items si
    JOIN products p ON p.id = si.product_id
    JOIN sales s ON s.id = si.sale_id
   WHERE s.created_at >= (now() AT TIME ZONE 'America/Mexico_City')::date
     AND s.status = 'completed'
   GROUP BY si.product_id, p.name
   ORDER BY total_qty DESC
   LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_today_best_seller() TO authenticated;
