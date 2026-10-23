-- Pedidos de la tienda online pagados por Nequi con código de referencia.
--
-- Nequi no tiene API de cobro automático, así que el cliente escribe la
-- referencia de su pago y el tendero la contrasta con su app antes de
-- confirmar. Estas columnas guardan esa referencia, el costo de envío del
-- pedido y un token secreto que solo conoce quien hizo el pedido.
--
-- "Por verificar" = payment_status 'pendiente' con payment_reference no nulo
-- (el CHECK de payment_status no se puede ampliar sin recrear la tabla).

ALTER TABLE sales ADD COLUMN shipping_cost REAL DEFAULT 0;
ALTER TABLE sales ADD COLUMN payment_reference TEXT;
ALTER TABLE sales ADD COLUMN payment_reference_at TEXT;
ALTER TABLE sales ADD COLUMN order_token TEXT;

-- Una misma referencia de Nequi no puede justificar dos pedidos de la misma tienda.
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_tenant_payment_reference
  ON sales(tenant_id, payment_reference)
  WHERE payment_reference IS NOT NULL;
