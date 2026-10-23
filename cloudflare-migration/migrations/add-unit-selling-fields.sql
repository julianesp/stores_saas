-- ============================================================
-- MIGRACIÓN: Agregar campos para venta por unidades
-- Fecha: 2026-01-30
-- Descripción: Permite vender productos en unidades fraccionadas
--              Ejemplo: Cubetas de 30 huevos, vender huevos sueltos
-- ============================================================

-- Agregar campos para venta por unidades a la tabla products
ALTER TABLE products ADD COLUMN sell_by_unit INTEGER DEFAULT 0;  -- 1 = permite venta por unidad, 0 = no
ALTER TABLE products ADD COLUMN units_per_package INTEGER DEFAULT 1;  -- Cuántas unidades tiene el paquete completo (ej: 30 huevos)
ALTER TABLE products ADD COLUMN unit_name TEXT DEFAULT 'unidad';  -- Nombre de la unidad (ej: 'huevo', 'gramo', 'litro')
ALTER TABLE products ADD COLUMN package_name TEXT DEFAULT 'paquete';  -- Nombre del paquete (ej: 'cubeta', 'caja', 'bolsa')
ALTER TABLE products ADD COLUMN price_per_unit REAL DEFAULT 0;  -- Precio por unidad suelta (calculado o manual)

-- Índice para buscar productos que se venden por unidad
CREATE INDEX IF NOT EXISTS idx_products_sell_by_unit ON products(sell_by_unit);
