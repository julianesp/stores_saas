-- ============================================================
-- TIENDA POS - CLOUDFLARE D1 SCHEMA (SHARED DATABASE)
-- Una base de datos compartida con aislamiento por tenant_id
-- Opción B: DB Compartida con tenant_id
-- ============================================================

-- User Profile (información del dueño de la tienda - ES EL TENANT)
-- Esta tabla NO tiene tenant_id porque representa los tenants
CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,
  clerk_user_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'cajero', 'cliente')),
  full_name TEXT,
  phone TEXT,
  is_superadmin INTEGER DEFAULT 0,

  -- Subscription fields
  subscription_status TEXT NOT NULL DEFAULT 'trial' CHECK(subscription_status IN ('trial', 'active', 'expired', 'canceled')),
  trial_start_date TEXT,
  trial_end_date TEXT,
  subscription_id TEXT,
  last_payment_date TEXT,
  next_billing_date TEXT,
  wompi_customer_id TEXT,
  plan_id TEXT,

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_user_profiles_clerk ON user_profiles(clerk_user_id);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,  -- ⬅️ AISLAMIENTO POR TENANT
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (tenant_id) REFERENCES user_profiles(id) ON DELETE CASCADE
);

CREATE INDEX idx_categories_tenant ON categories(tenant_id);
CREATE INDEX idx_categories_name ON categories(name);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,  -- ⬅️ AISLAMIENTO POR TENANT
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (tenant_id) REFERENCES user_profiles(id) ON DELETE CASCADE
);

CREATE INDEX idx_suppliers_tenant ON suppliers(tenant_id);
CREATE INDEX idx_suppliers_name ON suppliers(name);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,  -- ⬅️ AISLAMIENTO POR TENANT
  barcode TEXT,
  name TEXT NOT NULL,
  description TEXT,
  category_id TEXT,
  supplier_id TEXT,
  cost_price REAL NOT NULL DEFAULT 0,
  sale_price REAL NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 0,
  expiration_date TEXT,
  image_url TEXT,
  images TEXT, -- JSON array de URLs
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (tenant_id) REFERENCES user_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

CREATE INDEX idx_products_tenant ON products(tenant_id);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_supplier ON products(supplier_id);
CREATE INDEX idx_products_stock ON products(stock);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,  -- ⬅️ AISLAMIENTO POR TENANT
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  id_number TEXT,
  loyalty_points INTEGER NOT NULL DEFAULT 0,

  -- Credit/Debit fields
  credit_limit REAL DEFAULT 0,
  current_debt REAL DEFAULT 0,

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (tenant_id) REFERENCES user_profiles(id) ON DELETE CASCADE
);

CREATE INDEX idx_customers_tenant ON customers(tenant_id);
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_debt ON customers(current_debt);

-- Sales
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,  -- ⬅️ AISLAMIENTO POR TENANT
  sale_number TEXT NOT NULL,
  customer_id TEXT,
  cashier_id TEXT NOT NULL,
  subtotal REAL NOT NULL DEFAULT 0,
  tax REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL CHECK(payment_method IN ('efectivo', 'tarjeta', 'transferencia', 'credito')),
  status TEXT NOT NULL DEFAULT 'completada' CHECK(status IN ('completada', 'cancelada', 'pendiente')),
  notes TEXT,
  points_earned INTEGER DEFAULT 0,

  -- Credit sale fields
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

CREATE INDEX idx_sales_tenant ON sales(tenant_id);
CREATE INDEX idx_sales_number ON sales(sale_number);
CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_sales_cashier ON sales(cashier_id);
CREATE INDEX idx_sales_date ON sales(created_at);
CREATE INDEX idx_sales_payment_method ON sales(payment_method);
CREATE INDEX idx_sales_status ON sales(status);
CREATE INDEX idx_sales_payment_status ON sales(payment_status);

-- Sale Items
CREATE TABLE IF NOT EXISTS sale_items (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,  -- ⬅️ AISLAMIENTO POR TENANT
  sale_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  subtotal REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (tenant_id) REFERENCES user_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

CREATE INDEX idx_sale_items_tenant ON sale_items(tenant_id);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);

-- Credit Payments (pagos parciales de crédito)
CREATE TABLE IF NOT EXISTS credit_payments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,  -- ⬅️ AISLAMIENTO POR TENANT
  sale_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL CHECK(payment_method IN ('efectivo', 'tarjeta', 'transferencia')),
  notes TEXT,
  cashier_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (tenant_id) REFERENCES user_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  FOREIGN KEY (cashier_id) REFERENCES user_profiles(id) ON DELETE RESTRICT
);

CREATE INDEX idx_credit_payments_tenant ON credit_payments(tenant_id);
CREATE INDEX idx_credit_payments_sale ON credit_payments(sale_id);
CREATE INDEX idx_credit_payments_customer ON credit_payments(customer_id);
CREATE INDEX idx_credit_payments_date ON credit_payments(created_at);

-- Inventory Movements
CREATE TABLE IF NOT EXISTS inventory_movements (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,  -- ⬅️ AISLAMIENTO POR TENANT
  product_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('entrada', 'salida', 'ajuste')),
  quantity INTEGER NOT NULL,
  previous_stock INTEGER,
  new_stock INTEGER,
  reason TEXT,
  reference_type TEXT,
  reference_id TEXT,
  notes TEXT,
  user_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (tenant_id) REFERENCES user_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_inventory_movements_tenant ON inventory_movements(tenant_id);
CREATE INDEX idx_inventory_movements_product ON inventory_movements(product_id);
CREATE INDEX idx_inventory_movements_type ON inventory_movements(type);
CREATE INDEX idx_inventory_movements_date ON inventory_movements(created_at);

-- Offers
CREATE TABLE IF NOT EXISTS offers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,  -- ⬅️ AISLAMIENTO POR TENANT
  product_id TEXT NOT NULL,
  discount_percentage REAL NOT NULL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  reason TEXT CHECK(reason IN ('proximoAVencer', 'promocion', 'liquidacion')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (tenant_id) REFERENCES user_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX idx_offers_tenant ON offers(tenant_id);
CREATE INDEX idx_offers_product ON offers(product_id);
CREATE INDEX idx_offers_active ON offers(is_active);
CREATE INDEX idx_offers_dates ON offers(start_date, end_date);

-- Shopping Carts
CREATE TABLE IF NOT EXISTS shopping_carts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,  -- ⬅️ AISLAMIENTO POR TENANT
  customer_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'activo' CHECK(status IN ('activo', 'completado', 'abandonado')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (tenant_id) REFERENCES user_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE INDEX idx_shopping_carts_tenant ON shopping_carts(tenant_id);
CREATE INDEX idx_shopping_carts_customer ON shopping_carts(customer_id);
CREATE INDEX idx_shopping_carts_status ON shopping_carts(status);

-- Cart Items
CREATE TABLE IF NOT EXISTS cart_items (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,  -- ⬅️ AISLAMIENTO POR TENANT
  cart_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (tenant_id) REFERENCES user_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (cart_id) REFERENCES shopping_carts(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

CREATE INDEX idx_cart_items_tenant ON cart_items(tenant_id);
CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX idx_cart_items_product ON cart_items(product_id);

-- Payment Transactions (NO necesita tenant_id - ya está ligado a user_profile_id)
CREATE TABLE IF NOT EXISTS payment_transactions (
  id TEXT PRIMARY KEY,
  user_profile_id TEXT NOT NULL,
  wompi_transaction_id TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'COP',
  status TEXT NOT NULL CHECK(status IN ('APPROVED', 'DECLINED', 'PENDING', 'ERROR')),
  payment_method_type TEXT,
  reference TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (user_profile_id) REFERENCES user_profiles(id) ON DELETE CASCADE
);

CREATE INDEX idx_payment_transactions_profile ON payment_transactions(user_profile_id);
CREATE INDEX idx_payment_transactions_wompi ON payment_transactions(wompi_transaction_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);

-- Loyalty Settings (NO necesita tenant_id - ya tiene user_profile_id único)
CREATE TABLE IF NOT EXISTS loyalty_settings (
  id TEXT PRIMARY KEY,
  user_profile_id TEXT NOT NULL UNIQUE,
  enabled INTEGER NOT NULL DEFAULT 1,
  tiers TEXT NOT NULL, -- JSON array
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (user_profile_id) REFERENCES user_profiles(id) ON DELETE CASCADE
);

CREATE INDEX idx_loyalty_settings_profile ON loyalty_settings(user_profile_id);

-- Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,  -- ⬅️ AISLAMIENTO POR TENANT (redundante con user_profile_id pero por consistencia)
  user_profile_id TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  order_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK(status IN ('pendiente', 'recibida', 'cancelada')),
  order_date TEXT NOT NULL,
  expected_date TEXT,
  received_date TEXT,
  subtotal REAL NOT NULL DEFAULT 0,
  tax REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (tenant_id) REFERENCES user_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (user_profile_id) REFERENCES user_profiles(id) ON DELETE RESTRICT,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT
);

CREATE INDEX idx_purchase_orders_tenant ON purchase_orders(tenant_id);
CREATE INDEX idx_purchase_orders_profile ON purchase_orders(user_profile_id);
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_number ON purchase_orders(order_number);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);

-- Purchase Order Items
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,  -- ⬅️ AISLAMIENTO POR TENANT
  purchase_order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_cost REAL NOT NULL DEFAULT 0,
  subtotal REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (tenant_id) REFERENCES user_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

CREATE INDEX idx_purchase_order_items_tenant ON purchase_order_items(tenant_id);
CREATE INDEX idx_purchase_order_items_order ON purchase_order_items(purchase_order_id);
CREATE INDEX idx_purchase_order_items_product ON purchase_order_items(product_id);

-- ============================================================
-- TRIGGERS PARA AUTO-UPDATE DE TIMESTAMPS
-- ============================================================

CREATE TRIGGER IF NOT EXISTS update_user_profiles_timestamp
AFTER UPDATE ON user_profiles
BEGIN
  UPDATE user_profiles SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_categories_timestamp
AFTER UPDATE ON categories
BEGIN
  UPDATE categories SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_suppliers_timestamp
AFTER UPDATE ON suppliers
BEGIN
  UPDATE suppliers SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_products_timestamp
AFTER UPDATE ON products
BEGIN
  UPDATE products SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_customers_timestamp
AFTER UPDATE ON customers
BEGIN
  UPDATE customers SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_sales_timestamp
AFTER UPDATE ON sales
BEGIN
  UPDATE sales SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_offers_timestamp
AFTER UPDATE ON offers
BEGIN
  UPDATE offers SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_shopping_carts_timestamp
AFTER UPDATE ON shopping_carts
BEGIN
  UPDATE shopping_carts SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_cart_items_timestamp
AFTER UPDATE ON cart_items
BEGIN
  UPDATE cart_items SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_loyalty_settings_timestamp
AFTER UPDATE ON loyalty_settings
BEGIN
  UPDATE loyalty_settings SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_purchase_orders_timestamp
AFTER UPDATE ON purchase_orders
BEGIN
  UPDATE purchase_orders SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- ============================================================
-- VIEWS ÚTILES (con tenant_id)
-- ============================================================

-- Vista de productos con categoría y proveedor (filtrada por tenant)
CREATE VIEW IF NOT EXISTS v_products_full AS
SELECT
  p.*,
  c.name AS category_name,
  s.name AS supplier_name
FROM products p
LEFT JOIN categories c ON p.category_id = c.id AND p.tenant_id = c.tenant_id
LEFT JOIN suppliers s ON p.supplier_id = s.id AND p.tenant_id = s.tenant_id;

-- Vista de ventas con cliente y cajero (filtrada por tenant)
CREATE VIEW IF NOT EXISTS v_sales_full AS
SELECT
  s.*,
  c.name AS customer_name,
  c.phone AS customer_phone,
  u.full_name AS cashier_name
FROM sales s
LEFT JOIN customers c ON s.customer_id = c.id AND s.tenant_id = c.tenant_id
LEFT JOIN user_profiles u ON s.cashier_id = u.id;

-- Vista de clientes con deuda (POR TENANT)
-- NOTA: Esta view NO filtra por tenant automáticamente
-- Debes agregar WHERE tenant_id = ? en tus queries
CREATE VIEW IF NOT EXISTS v_debtors AS
SELECT
  tenant_id,
  id,
  name,
  email,
  phone,
  credit_limit,
  current_debt,
  (credit_limit - current_debt) AS available_credit,
  CASE
    WHEN credit_limit > 0 THEN ROUND((current_debt * 100.0) / credit_limit, 2)
    ELSE 0
  END AS debt_percentage
FROM customers
WHERE current_debt > 0
ORDER BY current_debt DESC;

-- Vista de productos con bajo stock (POR TENANT)
CREATE VIEW IF NOT EXISTS v_low_stock_products AS
SELECT
  p.tenant_id,
  p.id,
  p.name,
  p.stock,
  p.min_stock,
  c.name AS category_name,
  s.name AS supplier_name
FROM products p
LEFT JOIN categories c ON p.category_id = c.id AND p.tenant_id = c.tenant_id
LEFT JOIN suppliers s ON p.supplier_id = s.id AND p.tenant_id = s.tenant_id
WHERE p.stock <= p.min_stock
ORDER BY (p.stock - p.min_stock) ASC;
