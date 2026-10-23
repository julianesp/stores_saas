-- Campos de producto que Siigo usa (y que la facturación electrónica DIAN necesita),
-- para que un comercio que viene de Siigo pueda pasar su catálogo completo a posib.
--
-- Mapeo con el "Listado de productos / Servicios" exportado de Siigo:
--   Impuesto cargo ("IVA 19%")  -> tax_label + tax_rate
--   Precio de venta 2           -> sale_price_2
--   Referencia fábrica          -> factory_reference
--   Inventariable (Si/NO)       -> track_inventory
--   Estado (Activo/Inactivo)    -> is_active
--
-- tax_rate es el porcentaje (0, 5, 19, 8 para INC...). En posib el precio de venta
-- SIEMPRE incluye el impuesto (el importador convierte los precios "sin IVA" de Siigo).
-- track_inventory = 0: el producto se vende aunque no tenga unidades (no se controla stock),
-- como hace Siigo cuando el tendero no lleva inventario.

ALTER TABLE products ADD COLUMN tax_rate REAL DEFAULT 0;
ALTER TABLE products ADD COLUMN tax_label TEXT;
ALTER TABLE products ADD COLUMN sale_price_2 REAL;
ALTER TABLE products ADD COLUMN factory_reference TEXT;
ALTER TABLE products ADD COLUMN track_inventory INTEGER DEFAULT 1;
ALTER TABLE products ADD COLUMN is_active INTEGER DEFAULT 1;
