-- Corrige el CHECK constraint de sales.payment_method para aceptar 'nequi'
-- y 'daviplata' (antes solo permitía efectivo/tarjeta/transferencia/credito,
-- lo que hacía fallar TODA venta con Nequi).
--
-- SQLite no permite modificar un CHECK con ALTER TABLE, así que se recrea la
-- tabla con el patrón oficial de SQLite (crear nueva -> copiar -> borrar vieja
-- -> renombrar -> recrear índices). Las FK de sale_items y credit_payments
-- apuntan a sales(id) por valor; como conservamos los mismos id, siguen válidas.

PRAGMA foreign_keys=OFF;

CREATE TABLE sales_new (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  sale_number TEXT NOT NULL,
  customer_id TEXT,
  cashier_id TEXT NOT NULL,
  subtotal REAL NOT NULL DEFAULT 0,
  tax REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL CHECK(payment_method IN ('efectivo', 'nequi', 'daviplata', 'tarjeta', 'transferencia', 'credito')),
  status TEXT NOT NULL DEFAULT 'completada' CHECK(status IN ('completada', 'cancelada', 'pendiente')),
  notes TEXT,
  points_earned INTEGER DEFAULT 0,
  payment_status TEXT CHECK(payment_status IN ('pagado', 'pendiente', 'parcial')),
  amount_paid REAL DEFAULT 0,
  amount_pending REAL DEFAULT 0,
  due_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES user_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (cashier_id) REFERENCES user_profiles(id) ON DELETE RESTRICT
);

INSERT INTO sales_new SELECT
  id, tenant_id, sale_number, customer_id, cashier_id, subtotal, tax, discount,
  total, payment_method, status, notes, points_earned, payment_status,
  amount_paid, amount_pending, due_date, created_at, updated_at
FROM sales;

DROP TABLE sales;
ALTER TABLE sales_new RENAME TO sales;

CREATE INDEX idx_sales_tenant ON sales(tenant_id);
CREATE INDEX idx_sales_number ON sales(sale_number);
CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_sales_cashier ON sales(cashier_id);
CREATE INDEX idx_sales_date ON sales(created_at);
CREATE INDEX idx_sales_payment_method ON sales(payment_method);
CREATE INDEX idx_sales_status ON sales(status);
CREATE INDEX idx_sales_payment_status ON sales(payment_status);

PRAGMA foreign_keys=ON;
