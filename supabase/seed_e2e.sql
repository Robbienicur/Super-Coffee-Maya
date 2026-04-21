-- Productos deterministas para tests automatizados.
-- Se aplica después de seed.sql durante `supabase db reset`.

INSERT INTO public.products (barcode, name, description, price, cost_price, stock, min_stock, category, is_active) VALUES
('E2E00001', 'Producto E2E Café',    'Producto determinista para pruebas: categoría Café',      50.00, 20.00, 100, 10, 'Café',      true),
('E2E00002', 'Producto E2E Bebida',  'Producto determinista para pruebas: categoría Bebidas',   25.00, 10.00, 100, 10, 'Bebidas',   true),
('E2E00003', 'Producto E2E Galletas','Producto determinista para pruebas: categoría Snacks',    15.00,  8.00, 100, 10, 'Snacks',    true),
('E2E00004', 'Producto E2E Pan',     'Producto determinista para pruebas: categoría Panadería', 30.00, 12.00, 100, 10, 'Panadería', true),
('E2E00005', 'Producto E2E Inactivo','Producto inactivo para probar filtros',                   10.00,  5.00, 100, 10, 'General',   false)
ON CONFLICT (barcode) DO NOTHING;
