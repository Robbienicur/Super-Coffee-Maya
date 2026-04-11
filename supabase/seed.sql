-- ============================================================
-- Coffe Maya - Datos de prueba
-- ============================================================
-- NOTA: El usuario admin se crea via Supabase Auth (Dashboard o CLI).
-- Este seed solo carga productos de ejemplo.

-- Productos de ejemplo para una miscelánea/cafetería
INSERT INTO public.products (barcode, name, description, price, cost_price, stock, min_stock, category) VALUES
-- Café y bebidas
('7501001100101', 'Café Americano', 'Café americano 12oz', 35.00, 8.00, 100, 10, 'Café'),
('7501001100102', 'Café Latte', 'Café latte con leche 12oz', 45.00, 12.00, 80, 10, 'Café'),
('7501001100103', 'Cappuccino', 'Cappuccino 12oz', 45.00, 12.00, 80, 10, 'Café'),
('7501001100104', 'Café Mocha', 'Café mocha con chocolate 12oz', 50.00, 15.00, 60, 10, 'Café'),
('7501001100105', 'Té Verde', 'Té verde caliente', 30.00, 5.00, 50, 10, 'Bebidas'),
('7501001100106', 'Chocolate Caliente', 'Chocolate caliente 12oz', 40.00, 10.00, 50, 10, 'Bebidas'),
('7501055100106', 'Coca-Cola 600ml', 'Refresco Coca-Cola 600ml', 22.00, 14.00, 48, 12, 'Bebidas'),
('7501055100207', 'Coca-Cola 1L', 'Refresco Coca-Cola 1 litro', 30.00, 20.00, 24, 6, 'Bebidas'),
('7501055100308', 'Agua Ciel 600ml', 'Agua purificada 600ml', 12.00, 5.00, 60, 15, 'Bebidas'),
('7501055100409', 'Jugo Del Valle 1L', 'Jugo de naranja 1 litro', 28.00, 18.00, 20, 5, 'Bebidas'),

-- Panadería y repostería
('7501001200201', 'Croissant', 'Croissant de mantequilla', 30.00, 10.00, 40, 8, 'Panadería'),
('7501001200202', 'Muffin de Arándano', 'Muffin de arándano fresco', 35.00, 12.00, 30, 8, 'Panadería'),
('7501001200203', 'Pan de Chocolate', 'Pan relleno de chocolate', 25.00, 8.00, 40, 8, 'Panadería'),
('7501001200204', 'Galleta Choco-Chip', 'Galleta con chispas de chocolate', 20.00, 6.00, 50, 10, 'Panadería'),
('7502215100109', 'Bimbo Pan Blanco', 'Pan blanco grande 680g', 62.00, 48.00, 15, 5, 'Panadería'),

-- Snacks
('7501000911103', 'Sabritas Original 45g', 'Papas fritas original', 18.00, 12.00, 36, 10, 'Snacks'),
('7501000911204', 'Doritos Nacho 62g', 'Tortilla chips sabor nacho', 22.00, 14.00, 30, 8, 'Snacks'),
('7501000911305', 'Cheetos Flamin Hot', 'Frituras sabor picante', 18.00, 12.00, 30, 8, 'Snacks'),
('7622300100106', 'Oreo Original', 'Galletas Oreo 117g', 24.00, 16.00, 24, 6, 'Snacks'),

-- Lácteos
('7501055200107', 'Leche Lala 1L', 'Leche entera 1 litro', 28.00, 22.00, 20, 5, 'Lácteos'),
('7501055200208', 'Yogurt Danone Natural', 'Yogurt natural 900g', 42.00, 32.00, 15, 5, 'Lácteos'),

-- Abarrotes
('7501001300302', 'Azúcar 1kg', 'Azúcar estándar 1 kilogramo', 32.00, 24.00, 20, 5, 'Abarrotes'),
('7501001300403', 'Aceite Nutrioli 1L', 'Aceite vegetal 1 litro', 45.00, 35.00, 15, 5, 'Abarrotes'),
('7501001300504', 'Arroz SOS 1kg', 'Arroz grano largo 1kg', 30.00, 22.00, 20, 5, 'Abarrotes'),
('7501001300605', 'Frijol Negro 1kg', 'Frijol negro seco 1kg', 35.00, 25.00, 18, 5, 'Abarrotes'),
('7501001300706', 'Atún Dolores', 'Lata de atún en agua 140g', 22.00, 16.00, 30, 8, 'Abarrotes'),

-- Higiene
('7501001400401', 'Papel Higiénico Pétalo 4p', 'Paquete 4 rollos', 38.00, 28.00, 20, 5, 'Higiene'),
('7501001400502', 'Jabón Zote', 'Jabón de lavandería 400g', 18.00, 12.00, 25, 5, 'Higiene');
