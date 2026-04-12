-- Permitir que cajeras cancelen sus propias ventas
CREATE POLICY "Cashier can cancel own sales"
  ON public.sales FOR UPDATE
  USING (auth.uid() = cashier_id)
  WITH CHECK (status = 'cancelled');
