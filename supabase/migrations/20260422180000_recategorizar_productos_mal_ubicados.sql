-- Corrige productos mal categorizados (ej. Chiva Cola terminó en "Menú" porque
-- venía del departamento COFFEE MAYA en el archivo original) y desactiva
-- duplicados sin barcode que quedaron de la mezcla seed-fonda + import-tienda.

ALTER TABLE public.products DISABLE TRIGGER enforce_admin_columns;

-- Bebidas
UPDATE public.products SET category = 'Bebidas'
 WHERE name ~* '\m(coca\s?cola|pepsi|chiva\s?cola|cerveza|tehuacan|cifrut)\M'
    OR lower(name) = 'hielo';

-- Lácteos
UPDATE public.products SET category = 'Lácteos'
 WHERE name ~* '\m(yogurt|leche nito|santa clara chocolate)\M';

-- Dulces
UPDATE public.products SET category = 'Dulces'
 WHERE name ~* '\m(milkyway|carlos v|bubli dulce|vuala|milch chocolate)\M'
    OR name ~* 'chicle \d';

-- Pan y Galletas
UPDATE public.products SET category = 'Pan y Galletas'
 WHERE name ~* '\m(oreo galleta|choco galleta)\M';

-- Abarrotes (empaquetados que estaban en Menú u otras)
UPDATE public.products SET category = 'Abarrotes'
 WHERE name ~* '\m(cafe tur|cappuccino don vazco|sopa nissin|quaker chocolate)\M';

-- Otros (pilas)
UPDATE public.products SET category = 'Otros'
 WHERE name ~* '\mpilas aa duracell\M';

-- Desactivar duplicados sin barcode: conservamos el que se creó primero (menor created_at),
-- desactivamos el resto.
WITH dupes AS (
  SELECT id, name,
         ROW_NUMBER() OVER (PARTITION BY lower(trim(name)) ORDER BY created_at) AS rn
    FROM public.products
   WHERE barcode IS NULL
     AND is_active = true
)
UPDATE public.products
   SET is_active = false
  WHERE id IN (SELECT id FROM dupes WHERE rn > 1);

ALTER TABLE public.products ENABLE TRIGGER enforce_admin_columns;
