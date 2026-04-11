-- Permitir a cajeros (authenticated) insertar y editar productos
DROP POLICY "Admin can insert products" ON public.products;
CREATE POLICY "Authenticated can insert products" ON public.products
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY "Admin can update products" ON public.products;
CREATE POLICY "Authenticated can update products" ON public.products
  FOR UPDATE TO authenticated USING (true);

-- Permitir a cajeros insertar stock_adjustments
DROP POLICY "Admin can insert stock adjustments" ON public.stock_adjustments;
CREATE POLICY "Authenticated can insert stock adjustments" ON public.stock_adjustments
  FOR INSERT TO authenticated WITH CHECK (true);

-- Cajeros pueden ver sus propios ajustes de stock
CREATE POLICY "Users can view own stock adjustments" ON public.stock_adjustments
  FOR SELECT USING (auth.uid() = user_id);
