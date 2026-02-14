/**
 * User Stores API Routes
 * Lista las tiendas a las que un usuario tiene acceso (como owner o team member)
 */

import { Hono } from 'hono';
import type { Env, Tenant } from '../types';

const app = new Hono<{ Bindings: Env }>();

interface AccessibleStore {
  id: string;
  store_name: string;
  store_slug?: string;
  role: 'owner' | 'admin' | 'cajero' | 'custom';
  access_type: 'owner' | 'team_member';
  permissions?: string[];
  subscription_status?: string;
}

/**
 * GET /api/user-stores
 * Lista todas las tiendas a las que el usuario tiene acceso
 */
app.get('/', async (c) => {
  const clerkUserId: string = c.get('clerkUserId');

  try {
    const stores: AccessibleStore[] = [];

    // 1. Get user's own store (as owner)
    // Solo incluir como owner si tiene store_name configurado
    const ownProfile = await c.env.DB
      .prepare(`
        SELECT id, store_name, store_slug, subscription_status, role
        FROM user_profiles
        WHERE clerk_user_id = ?
      `)
      .bind(clerkUserId)
      .first<any>();

    // Solo agregar como "owner" si tiene un store_name configurado
    // Esto evita que usuarios que solo son team members tengan una tienda propia
    if (ownProfile && ownProfile.store_name) {
      stores.push({
        id: ownProfile.id,
        store_name: ownProfile.store_name,
        store_slug: ownProfile.store_slug,
        role: 'owner',
        access_type: 'owner',
        subscription_status: ownProfile.subscription_status,
      });
    }

    // 2. Get stores where user is a team member
    const teamMemberships = await c.env.DB
      .prepare(`
        SELECT
          tm.owner_id,
          tm.role,
          tm.permissions,
          up.store_name,
          up.store_slug,
          up.subscription_status
        FROM team_members tm
        JOIN user_profiles up ON up.id = tm.owner_id
        WHERE tm.clerk_user_id = ?
          AND tm.status = 'active'
          AND tm.invitation_status = 'accepted'
      `)
      .bind(clerkUserId)
      .all<any>();

    if (teamMemberships.results) {
      for (const membership of teamMemberships.results) {
        stores.push({
          id: membership.owner_id,
          store_name: membership.store_name || 'Tienda',
          store_slug: membership.store_slug,
          role: membership.role,
          access_type: 'team_member',
          permissions: membership.permissions ? JSON.parse(membership.permissions) : [],
          subscription_status: membership.subscription_status,
        });
      }
    }

    return c.json({
      success: true,
      data: stores,
    });
  } catch (error: any) {
    console.error('Error obteniendo tiendas accesibles:', error);
    return c.json({
      success: false,
      error: error.message || 'Error al obtener tiendas accesibles',
    }, 500);
  }
});

export default app;
