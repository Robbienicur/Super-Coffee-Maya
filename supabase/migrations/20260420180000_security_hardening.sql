-- Hardening de seguridad: cierra escaladas de privilegio, race conditions
-- y huecos de auditoría detectados en la revisión.
--
-- IMPORTANTE: además de aplicar este SQL, deshabilitar signup público en
-- Supabase Dashboard → Authentication → Providers → Email →
-- "Allow new users to sign up" = OFF. Sin eso, cualquiera con la anon key
-- crea cuenta (será cashier por el trigger, pero igual se llena la tabla).

-- 1. is_admin debe verificar is_active (admin desactivado pierde privilegios)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
$$;

-- 2. handle_new_user: forzar role='cashier'. Promoción a admin se hace
-- manualmente vía service_role (UPDATE profiles SET role='admin' ...).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    'cashier',
    true
  );
  RETURN NEW;
END;
$$;

-- 3. UPDATE profiles: WITH CHECK explícito
DROP POLICY IF EXISTS "Admin can update all profiles" ON public.profiles;
CREATE POLICY "Admin can update all profiles" ON public.profiles
  FOR UPDATE USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4. Impedir que el sistema quede sin admins activos
CREATE OR REPLACE FUNCTION public.prevent_no_active_admin()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF (OLD.role = 'admin' AND OLD.is_active = true)
     AND NOT (NEW.role = 'admin' AND NEW.is_active = true) THEN
    IF (SELECT COUNT(*) FROM public.profiles
        WHERE role = 'admin' AND is_active = true AND id <> OLD.id) = 0 THEN
      RAISE EXCEPTION 'No se puede dejar el sistema sin administradores activos';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_one_active_admin ON public.profiles;
CREATE TRIGGER ensure_one_active_admin BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_no_active_admin();

-- 5. Bloquear que cajera cambie campos sensibles de products
-- Cajera puede modificar: stock, min_stock, description, image_url
-- Sólo admin puede: price, cost_price, is_active, barcode, name, category, track_stock
CREATE OR REPLACE FUNCTION public.enforce_admin_only_product_columns()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    IF NEW.price IS DISTINCT FROM OLD.price THEN
      RAISE EXCEPTION 'Sólo admin puede cambiar el precio';
    END IF;
    IF NEW.cost_price IS DISTINCT FROM OLD.cost_price THEN
      RAISE EXCEPTION 'Sólo admin puede cambiar el costo';
    END IF;
    IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
      RAISE EXCEPTION 'Sólo admin puede activar o desactivar productos';
    END IF;
    IF NEW.barcode IS DISTINCT FROM OLD.barcode THEN
      RAISE EXCEPTION 'Sólo admin puede cambiar el código de barras';
    END IF;
    IF NEW.name IS DISTINCT FROM OLD.name THEN
      RAISE EXCEPTION 'Sólo admin puede cambiar el nombre del producto';
    END IF;
    IF NEW.category IS DISTINCT FROM OLD.category THEN
      RAISE EXCEPTION 'Sólo admin puede cambiar la categoría';
    END IF;
    IF NEW.track_stock IS DISTINCT FROM OLD.track_stock THEN
      RAISE EXCEPTION 'Sólo admin puede cambiar el tracking de inventario';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_admin_columns ON public.products;
CREATE TRIGGER enforce_admin_columns BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.enforce_admin_only_product_columns();

-- 6. INSERT products: sólo admin (cajera no debe crear productos fantasma)
DROP POLICY IF EXISTS "Authenticated can insert products" ON public.products;
DROP POLICY IF EXISTS "Admin can insert products" ON public.products;
CREATE POLICY "Admin can insert products" ON public.products
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

-- 7. Cancelación cajera: ventana 15 min + sólo de 'completed' a 'cancelled'/'refunded'
DROP POLICY IF EXISTS "Cashier can cancel own sales" ON public.sales;
CREATE POLICY "Cashier can cancel own sales" ON public.sales
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = cashier_id
    AND status = 'completed'
    AND created_at > now() - interval '15 minutes'
  )
  WITH CHECK (
    auth.uid() = cashier_id
    AND status IN ('cancelled', 'refunded')
  );

-- 8. sale_items INSERT: la venta debe estar 'completed' y ser del cajero actual
DROP POLICY IF EXISTS "Authenticated users can insert sale items" ON public.sale_items;
CREATE POLICY "Authenticated users can insert sale items" ON public.sale_items
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.sales
    WHERE sales.id = sale_items.sale_id
      AND sales.cashier_id = auth.uid()
      AND sales.status = 'completed'
  ));

-- 9. stock_adjustments INSERT: forzar user_id = auth.uid()
DROP POLICY IF EXISTS "Authenticated can insert stock adjustments" ON public.stock_adjustments;
CREATE POLICY "Authenticated can insert stock adjustments" ON public.stock_adjustments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 10. CHECK constraints de integridad de venta
ALTER TABLE public.sale_items
  DROP CONSTRAINT IF EXISTS subtotal_matches;
ALTER TABLE public.sale_items
  ADD CONSTRAINT subtotal_matches CHECK (subtotal = quantity * unit_price);

ALTER TABLE public.sales
  DROP CONSTRAINT IF EXISTS change_given_valid;
ALTER TABLE public.sales
  ADD CONSTRAINT change_given_valid CHECK (change_given >= 0 AND change_given <= amount_paid);

-- 11. update_stock_on_sale: FOR UPDATE lock + RETURNING. Atómico, sin race
-- y maneja el edge case de producto eliminado (FOUND check).
CREATE OR REPLACE FUNCTION public.update_stock_on_sale()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_track_stock BOOLEAN;
  v_new_stock INTEGER;
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
   WHERE id = NEW.product_id
   RETURNING stock INTO v_new_stock;

  IF v_new_stock < 0 THEN
    RAISE EXCEPTION 'Stock insuficiente para el producto %', NEW.product_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 12. restore_stock_on_cancel idempotente: la columna sales.stock_restored
-- evita restaurar el inventario dos veces si la venta cambia de estado más de una vez.
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS stock_restored BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.restore_stock_on_cancel()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'completed'
     AND NEW.status IN ('cancelled', 'refunded')
     AND COALESCE(OLD.stock_restored, false) = false THEN
    UPDATE public.products p
       SET stock = p.stock + si.quantity
      FROM public.sale_items si
     WHERE si.sale_id = NEW.id
       AND si.product_id = p.id
       AND p.track_stock = true;
    NEW.stock_restored := true;
  END IF;
  RETURN NEW;
END;
$$;

-- BEFORE UPDATE para poder mutar NEW.stock_restored
DROP TRIGGER IF EXISTS on_sale_cancelled ON public.sales;
CREATE TRIGGER on_sale_cancelled
  BEFORE UPDATE OF status ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.restore_stock_on_cancel();

-- 13. REVOKE explícito UPDATE/DELETE en audit_logs (defense-in-depth ante
-- futuras policies permisivas escritas por error).
REVOKE UPDATE, DELETE ON public.audit_logs FROM authenticated, anon;

-- 14. audit_logs.user_id: ON DELETE SET NULL preserva el log si se borra el user
ALTER TABLE public.audit_logs
  DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 15. Trigger consistencia stock: cualquier INSERT en stock_adjustments
-- aplica el new_stock al producto. Único punto de mutación de stock para ajustes.
CREATE OR REPLACE FUNCTION public.apply_stock_adjustment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.products SET stock = NEW.new_stock WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS apply_adjustment_to_stock ON public.stock_adjustments;
CREATE TRIGGER apply_adjustment_to_stock
  AFTER INSERT ON public.stock_adjustments
  FOR EACH ROW EXECUTE FUNCTION public.apply_stock_adjustment();

-- 16. Índice compuesto para "mis ventas, ordenadas por fecha"
CREATE INDEX IF NOT EXISTS idx_sales_cashier_created
  ON public.sales(cashier_id, created_at DESC);

-- 17. Quitar índice redundante (UNIQUE en barcode ya crea índice automático)
DROP INDEX IF EXISTS public.idx_products_barcode;
