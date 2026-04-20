-- Diferencia productos inventariables (refrescos, snacks) de alimentos preparados
-- al momento (Antojitos/Platillos/Licuados). Cuando track_stock = false, la venta
-- no descuenta stock, la cancelación no restaura, y la UI omite mostrar existencias.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS track_stock BOOLEAN NOT NULL DEFAULT true;

-- Trigger de venta: sólo descuenta cuando hay tracking
CREATE OR REPLACE FUNCTION public.update_stock_on_sale()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    UPDATE public.products
       SET stock = stock - NEW.quantity
     WHERE id = NEW.product_id
       AND track_stock = true;

    IF (SELECT stock FROM public.products WHERE id = NEW.product_id AND track_stock = true) < 0 THEN
        RAISE EXCEPTION 'Stock insuficiente para el producto %', NEW.product_id;
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger de cancelación/reembolso: sólo restaura los items con tracking
CREATE OR REPLACE FUNCTION public.restore_stock_on_cancel()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    IF OLD.status = 'completed' AND NEW.status IN ('cancelled', 'refunded') THEN
        UPDATE public.products p
           SET stock = p.stock + si.quantity
          FROM public.sale_items si
         WHERE si.sale_id = NEW.id
           AND si.product_id = p.id
           AND p.track_stock = true;
    END IF;
    RETURN NEW;
END;
$$;

-- Backfill: los alimentos actuales no inventarían stock
UPDATE public.products
   SET track_stock = false,
       stock = 0,
       min_stock = 0
 WHERE category IN ('Antojitos', 'Platillos', 'Licuados');
