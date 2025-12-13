-- Schema para la base de datos de gestión de tenants
-- Esta DB central almacena metadata de todos los tenants

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  clerk_user_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  database_name TEXT NOT NULL,
  database_id TEXT NOT NULL,
  subscription_status TEXT NOT NULL DEFAULT 'trial' CHECK(subscription_status IN ('trial', 'active', 'expired', 'canceled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_tenants_clerk ON tenants(clerk_user_id);
CREATE INDEX idx_tenants_email ON tenants(email);
CREATE INDEX idx_tenants_status ON tenants(subscription_status);

-- Trigger para auto-update de timestamp
CREATE TRIGGER IF NOT EXISTS update_tenants_timestamp
AFTER UPDATE ON tenants
BEGIN
  UPDATE tenants SET updated_at = datetime('now') WHERE id = NEW.id;
END;
