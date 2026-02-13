/**
 * Team Invitations API Routes
 * Gestión de invitaciones para miembros del equipo
 */

import { Hono } from 'hono';
import type { Env, Tenant } from '../types';
import { TenantDB, generateId } from '../utils/db-helpers';

const app = new Hono<{ Bindings: Env }>();

interface TeamMember {
  id: string;
  tenant_id: string;
  owner_id: string;
  clerk_user_id?: string;
  email: string;
  full_name?: string;
  phone?: string;
  role: 'admin' | 'cajero' | 'custom';
  permissions: string; // JSON array
  status: 'active' | 'inactive' | 'suspended';
  invitation_status: 'pending' | 'accepted' | 'expired' | 'revoked';
  invitation_token?: string;
  invitation_sent_at?: string;
  invitation_expires_at?: string;
  invitation_accepted_at?: string;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

// POST /api/team-invitations - Crear invitación
app.post('/', async (c) => {
  const tenant: Tenant = c.get('tenant');
  const userProfileId: string = c.get('userProfileId');

  try {
    const body = await c.req.json();
    const { email, full_name, role, permissions, token } = body;

    // Validaciones
    if (!email || !role || !token) {
      return c.json({
        success: false,
        error: 'Email, rol y token son requeridos',
      }, 400);
    }

    // Verificar si ya existe una invitación pendiente para este email
    const existing = await c.env.DB
      .prepare('SELECT id FROM team_members WHERE tenant_id = ? AND email = ? AND owner_id = ?')
      .bind(tenant.id, email, userProfileId)
      .first();

    if (existing) {
      return c.json({
        success: false,
        error: 'Ya existe una invitación para este email',
      }, 400);
    }

    // Calcular fecha de expiración (7 días)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Crear la invitación
    const id = generateId('inv');
    const now = new Date().toISOString();

    await c.env.DB
      .prepare(`
        INSERT INTO team_members (
          id, tenant_id, owner_id, email, full_name, role, permissions,
          status, invitation_status, invitation_token, invitation_sent_at,
          invitation_expires_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        tenant.id,
        userProfileId,
        email,
        full_name || null,
        role,
        JSON.stringify(permissions || []),
        'inactive', // El usuario estará inactivo hasta que acepte la invitación
        'pending',
        token,
        now,
        expiresAt.toISOString(),
        now,
        now
      )
      .run();

    const member = await c.env.DB
      .prepare('SELECT * FROM team_members WHERE id = ?')
      .bind(id)
      .first<TeamMember>();

    return c.json({
      success: true,
      data: member,
      message: 'Invitación creada exitosamente',
    });
  } catch (error: any) {
    console.error('Error creando invitación:', error);
    return c.json({
      success: false,
      error: error.message || 'Error al crear la invitación',
    }, 500);
  }
});

// GET /api/team-invitations - Listar todas las invitaciones del owner
app.get('/', async (c) => {
  const tenant: Tenant = c.get('tenant');
  const userProfileId: string = c.get('userProfileId');

  try {
    const members = await c.env.DB
      .prepare('SELECT * FROM team_members WHERE tenant_id = ? AND owner_id = ? ORDER BY created_at DESC')
      .bind(tenant.id, userProfileId)
      .all();

    return c.json({
      success: true,
      data: members.results || [],
    });
  } catch (error: any) {
    console.error('Error obteniendo invitaciones:', error);
    return c.json({
      success: false,
      error: error.message || 'Error al obtener invitaciones',
    }, 500);
  }
});

// GET /api/team-invitations/:id - Obtener una invitación específica
app.get('/:id', async (c) => {
  const tenant: Tenant = c.get('tenant');
  const userProfileId: string = c.get('userProfileId');
  const memberId = c.req.param('id');

  try {
    const member = await c.env.DB
      .prepare('SELECT * FROM team_members WHERE id = ? AND tenant_id = ? AND owner_id = ?')
      .bind(memberId, tenant.id, userProfileId)
      .first<TeamMember>();

    if (!member) {
      return c.json({
        success: false,
        error: 'Invitación no encontrada',
      }, 404);
    }

    return c.json({
      success: true,
      data: member,
    });
  } catch (error: any) {
    console.error('Error obteniendo invitación:', error);
    return c.json({
      success: false,
      error: error.message || 'Error al obtener invitación',
    }, 500);
  }
});

// PUT /api/team-invitations/:id - Actualizar miembro
app.put('/:id', async (c) => {
  const tenant: Tenant = c.get('tenant');
  const userProfileId: string = c.get('userProfileId');
  const memberId = c.req.param('id');

  try {
    const body = await c.req.json();
    const { role, permissions, status, full_name, phone } = body;

    // Verificar que el miembro existe y pertenece al owner
    const existing = await c.env.DB
      .prepare('SELECT id FROM team_members WHERE id = ? AND tenant_id = ? AND owner_id = ?')
      .bind(memberId, tenant.id, userProfileId)
      .first();

    if (!existing) {
      return c.json({
        success: false,
        error: 'Miembro no encontrado',
      }, 404);
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (role) {
      updates.push('role = ?');
      values.push(role);
    }
    if (permissions) {
      updates.push('permissions = ?');
      values.push(JSON.stringify(permissions));
    }
    if (status) {
      updates.push('status = ?');
      values.push(status);
    }
    if (full_name !== undefined) {
      updates.push('full_name = ?');
      values.push(full_name);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone);
    }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());

    values.push(memberId, tenant.id, userProfileId);

    await c.env.DB
      .prepare(`
        UPDATE team_members
        SET ${updates.join(', ')}
        WHERE id = ? AND tenant_id = ? AND owner_id = ?
      `)
      .bind(...values)
      .run();

    const member = await c.env.DB
      .prepare('SELECT * FROM team_members WHERE id = ?')
      .bind(memberId)
      .first<TeamMember>();

    return c.json({
      success: true,
      data: member,
      message: 'Miembro actualizado exitosamente',
    });
  } catch (error: any) {
    console.error('Error actualizando miembro:', error);
    return c.json({
      success: false,
      error: error.message || 'Error al actualizar miembro',
    }, 500);
  }
});

// DELETE /api/team-invitations/:id - Eliminar miembro
app.delete('/:id', async (c) => {
  const tenant: Tenant = c.get('tenant');
  const userProfileId: string = c.get('userProfileId');
  const memberId = c.req.param('id');

  try {
    // Verificar que el miembro existe y pertenece al owner
    const existing = await c.env.DB
      .prepare('SELECT id FROM team_members WHERE id = ? AND tenant_id = ? AND owner_id = ?')
      .bind(memberId, tenant.id, userProfileId)
      .first();

    if (!existing) {
      return c.json({
        success: false,
        error: 'Miembro no encontrado',
      }, 404);
    }

    await c.env.DB
      .prepare('DELETE FROM team_members WHERE id = ? AND tenant_id = ? AND owner_id = ?')
      .bind(memberId, tenant.id, userProfileId)
      .run();

    return c.json({
      success: true,
      message: 'Miembro eliminado exitosamente',
    });
  } catch (error: any) {
    console.error('Error eliminando miembro:', error);
    return c.json({
      success: false,
      error: error.message || 'Error al eliminar miembro',
    }, 500);
  }
});

// GET /api/team-invitations/validate?token=xxx - Validar invitación por token (sin autenticación)
app.get('/validate', async (c) => {
  try {
    const token = c.req.query('token');

    if (!token) {
      return c.json({
        success: false,
        error: 'Token requerido',
      }, 400);
    }

    // Buscar la invitación por token
    const member = await c.env.DB
      .prepare('SELECT * FROM team_members WHERE invitation_token = ?')
      .bind(token)
      .first<TeamMember>();

    if (!member) {
      return c.json({
        success: false,
        error: 'Invitación no encontrada',
      }, 404);
    }

    // Verificar si la invitación ya fue aceptada
    if (member.invitation_status === 'accepted') {
      return c.json({
        success: false,
        error: 'Esta invitación ya fue aceptada',
      }, 400);
    }

    // Verificar si la invitación expiró
    if (member.invitation_expires_at && new Date(member.invitation_expires_at) < new Date()) {
      return c.json({
        success: false,
        error: 'Esta invitación ha expirado',
      }, 400);
    }

    // Verificar si la invitación fue revocada
    if (member.invitation_status === 'revoked') {
      return c.json({
        success: false,
        error: 'Esta invitación ha sido revocada',
      }, 400);
    }

    // Obtener información del owner (dueño de la tienda)
    const owner = await c.env.DB
      .prepare('SELECT * FROM user_profiles WHERE id = ?')
      .bind(member.owner_id)
      .first<any>();

    return c.json({
      success: true,
      email: member.email,
      role: member.role,
      store_name: owner?.store_name || 'Sistema POS',
      inviter_name: owner?.full_name || owner?.email,
      expires_at: member.invitation_expires_at,
    });
  } catch (error: any) {
    console.error('Error validando invitación:', error);
    return c.json({
      success: false,
      error: error.message || 'Error al validar invitación',
    }, 500);
  }
});

// NOTE: POST /accept endpoint is now handled directly in index.ts as a public route
// This is to avoid auth middleware conflicts when users already have accounts

export default app;
