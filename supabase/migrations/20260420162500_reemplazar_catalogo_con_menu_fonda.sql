-- Reemplaza los productos de ejemplo con el menú real de la fonda.
-- Los alimentos se preparan al momento: sin barcode, sin cost_price y sin tracking de stock.
-- El schema requiere stock NOT NULL y el POS bloquea venta si stock <= 0, así que se fija en 999.

DELETE FROM public.sale_items;
DELETE FROM public.stock_adjustments;
DELETE FROM public.sales;
DELETE FROM public.products;

INSERT INTO public.products (name, price, stock, min_stock, category) VALUES
('Empanadas',                    25.00, 999, 0, 'Antojitos'),
('Tacos',                        12.00, 999, 0, 'Antojitos'),
('Quesadillas',                  17.00, 999, 0, 'Antojitos'),
('Tostadas',                     15.00, 999, 0, 'Antojitos'),
('Gorditas',                     20.00, 999, 0, 'Antojitos'),

('Huevos al Gusto',              55.00, 999, 0, 'Platillos'),
('Enchiladas',                   60.00, 999, 0, 'Platillos'),
('Chilaquiles',                  60.00, 999, 0, 'Platillos'),
('Carne Asada',                  75.00, 999, 0, 'Platillos'),
('Carne a la Mexicana',          75.00, 999, 0, 'Platillos'),
('Caldo de Pollo',               75.00, 999, 0, 'Platillos'),
('Pollo Frito',                  75.00, 999, 0, 'Platillos'),
('Guisado de Pollo',             75.00, 999, 0, 'Platillos'),
('Pollo a la Coca',              80.00, 999, 0, 'Platillos'),
('Pollo en Salsa de Cacahuate',  80.00, 999, 0, 'Platillos'),
('Carne Adobada',                75.00, 999, 0, 'Platillos'),
('Camarones',                    90.00, 999, 0, 'Platillos'),
('Costillas de Puerco',          75.00, 999, 0, 'Platillos'),

('Licuado de Melón',             25.00, 999, 0, 'Licuados'),
('Licuado de Plátano',           25.00, 999, 0, 'Licuados');
