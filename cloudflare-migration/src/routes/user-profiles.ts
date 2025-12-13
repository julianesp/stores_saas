import { Hono } from 'hono';
import type { Env, APIResponse, Tenant } from '../types';
import type { UserProfile } from '../../../lib/types';

const app = new Hono<{ Bindings: Env }>();

/**
 * GET /api/user-profiles
 * Obtener el perfil del usuario actual
 */
app.get('/', async (c) => {
  try {
    const tenant: Tenant = c.get('tenant');

    // Obtener el perfil del usuario actual (basado en el tenant)
    const result = await c.env.DB.prepare(
      'SELECT * FROM user_profiles WHERE clerk_user_id = ?'
    )
      .bind(tenant.clerk_user_id)
      .first<UserProfile>();

    if (!result) {
      return c.json<APIResponse<null>>({
        success: false,
        error: 'User profile not found',
        data: null
      }, 404);
    }

    return c.json<APIResponse<UserProfile>>({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    return c.json<APIResponse<null>>({
      success: false,
      error: error.message || 'Failed to fetch user profile',
      data: null
    }, 500);
  }
});

/**
 * GET /api/user-profiles/all
 * Obtener todos los perfiles de usuario (solo para admins)
 * Nota: Esta ruta es diferente porque user_profiles es una tabla global
 */
app.get('/all', async (c) => {
  try {
    const result = await c.env.DB.prepare(
      'SELECT * FROM user_profiles ORDER BY created_at DESC'
    ).all<UserProfile>();

    return c.json<APIResponse<UserProfile[]>>({
      success: true,
      data: result.results || []
    });
  } catch (error: any) {
    console.error('Error fetching user profiles:', error);
    return c.json<APIResponse<null>>({
      success: false,
      error: error.message || 'Failed to fetch user profiles',
      data: null
    }, 500);
  }
});

/**
 * PUT /api/user-profiles/:id
 * Actualizar perfil de usuario
 */
app.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const tenant: Tenant = c.get('tenant');

    // Verificar que el usuario solo pueda actualizar su propio perfil
    // (a menos que sea superadmin)
    const currentProfile = await c.env.DB.prepare(
      'SELECT * FROM user_profiles WHERE id = ?'
    )
      .bind(id)
      .first<UserProfile>();

    if (!currentProfile) {
      return c.json<APIResponse<null>>({
        success: false,
        error: 'User profile not found',
        data: null
      }, 404);
    }

    if (currentProfile.clerk_user_id !== tenant.clerk_user_id && !currentProfile.is_superadmin) {
      return c.json<APIResponse<null>>({
        success: false,
        error: 'Unauthorized',
        data: null
      }, 403);
    }

    // Actualizar solo campos permitidos
    const allowedFields = [
      'full_name',
      'phone',
      'subscription_status',
      'trial_start_date',
      'trial_end_date',
      'subscription_id',
      'last_payment_date',
      'next_billing_date',
      'loyalty_points',
      'loyalty_tier'
    ];

    const updates: string[] = [];
    const values: any[] = [];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(body[field]);
      }
    }

    if (updates.length === 0) {
      return c.json<APIResponse<null>>({
        success: false,
        error: 'No fields to update',
        data: null
      }, 400);
    }

    // Agregar updated_at
    updates.push('updated_at = datetime(\'now\')');
    values.push(id);

    await c.env.DB.prepare(
      `UPDATE user_profiles SET ${updates.join(', ')} WHERE id = ?`
    )
      .bind(...values)
      .run();

    // Obtener el perfil actualizado
    const updated = await c.env.DB.prepare(
      'SELECT * FROM user_profiles WHERE id = ?'
    )
      .bind(id)
      .first<UserProfile>();

    return c.json<APIResponse<UserProfile>>({
      success: true,
      data: updated!,
      message: 'User profile updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    return c.json<APIResponse<null>>({
      success: false,
      error: error.message || 'Failed to update user profile',
      data: null
    }, 500);
  }
});

export default app;
