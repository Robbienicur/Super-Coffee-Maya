-- Permite vender productos con stock = 0 (o incluso dejar stock negativo).
-- Caso real: llegó mercancía pero aún no se registró; si el cliente la pide,
-- la cajera debe poder cobrarla. Luego, con el stock negativo visible, el
-- admin/cajera actualiza el inventario manualmente desde la pantalla de Inventario.
--
-- Cambios:
-- 1. Quitar CHECK (stock >= 0) en products.stock.
-- 2. Dejar de lanzar excepción en update_stock_on_sale cuando stock resulta negativo.

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_stock_check;

CREATE OR REPLACE FUNCTION public.update_stock_on_sale()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_track_stock BOOLEAN;
BEGIN
  SELECT track_stock INTO v_track_stock
    FROM public.products
   WHERE id = NEW.product_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Producto % no existe', NEW.product_id;
  END IF;

  IF NOT v_track_stock THEN
    RETURN NEW;
  END IF;

  UPDATE public.products
     SET stock = stock - NEW.quantity
   WHERE id = NEW.product_id;

  RETURN NEW;
END;
$$;
