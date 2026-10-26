-- ============================================================
-- MIGRACIÓN: Sistema de Gestión de Equipo
-- Fecha: 2026-01-30
-- Descripción: Tablas para invitar usuarios colaboradores y gestionar permisos
-- ============================================================

-- Tabla de miembros del equipo
CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  owner_id TEXT NOT NULL, -- ID del usuario_profile que es dueño de la tienda
  clerk_user_id TEXT, -- ID de Clerk una vez que acepta la invitación
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT NOT NULL CHECK(role IN ('admin', 'cajero', 'custom')),
  permissions TEXT NOT NULL, -- JSON array de permisos
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'suspended')),
  invitation_status TEXT NOT NULL DEFAULT 'pending' CHECK(invitation_status IN ('pending', 'accepted', 'expired', 'revoked')),
  invitation_token TEXT UNIQUE,
  invitation_sent_at TEXT,
  invitation_expires_at TEXT,
  invitation_accepted_at TEXT,
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (owner_id) REFERENCES user_profiles(id) ON DELETE CASCADE
);

-- Índices para team_members
CREATE INDEX IF NOT EXISTS idx_team_members_tenant ON team_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_team_members_owner ON team_members(owner_id);
CREATE INDEX IF NOT EXISTS idx_team_members_clerk_user ON team_members(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(email);
CREATE INDEX IF NOT EXISTS idx_team_members_invitation_token ON team_members(invitation_token);

-- Tabla de log de actividades de usuarios
CREATE TABLE IF NOT EXISTS user_activity_log (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL, -- Puede ser user_profile_id o team_member_id
  owner_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details TEXT, -- JSON con detalles adicionales
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Índices para user_activity_log
CREATE INDEX IF NOT EXISTS idx_activity_log_tenant ON user_activity_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_owner ON user_activity_log(owner_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON user_activity_log(created_at);
