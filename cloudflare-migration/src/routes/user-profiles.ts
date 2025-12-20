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

/**
 * DELETE /api/user-profiles/:id
 * Eliminar un usuario y todos sus datos relacionados
 * Solo disponible para superadmins
 */
app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const tenant: Tenant = c.get('tenant');

    // Verificar que el usuario sea superadmin
    const requestingUser = await c.env.DB.prepare(
      'SELECT is_superadmin FROM user_profiles WHERE clerk_user_id = ?'
    )
      .bind(tenant.clerk_user_id)
      .first<{ is_superadmin: number }>();

    if (!requestingUser?.is_superadmin) {
      return c.json<APIResponse<null>>({
        success: false,
        error: 'Unauthorized - Solo superadmins pueden eliminar usuarios',
        data: null
      }, 403);
    }

    // Obtener el usuario a eliminar
    const userToDelete = await c.env.DB.prepare(
      'SELECT * FROM user_profiles WHERE id = ?'
    )
      .bind(id)
      .first<UserProfile>();

    if (!userToDelete) {
      return c.json<APIResponse<null>>({
        success: false,
        error: 'User profile not found',
        data: null
      }, 404);
    }

    // Verificar que no se esté eliminando a sí mismo
    if (userToDelete.clerk_user_id === tenant.clerk_user_id) {
      return c.json<APIResponse<null>>({
        success: false,
        error: 'No puedes eliminar tu propia cuenta',
        data: null
      }, 400);
    }

    // Verificar que no sea otro superadmin
    if (userToDelete.is_superadmin) {
      return c.json<APIResponse<null>>({
        success: false,
        error: 'No se puede eliminar a otro superadmin',
        data: null
      }, 400);
    }

    // Obtener estadísticas antes de eliminar
    const stats = await c.env.DB.batch([
      c.env.DB.prepare('SELECT COUNT(*) as count FROM products WHERE tenant_id = ?').bind(id),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM sales WHERE tenant_id = ?').bind(id),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM customers WHERE tenant_id = ?').bind(id),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM categories WHERE tenant_id = ?').bind(id),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM suppliers WHERE tenant_id = ?').bind(id),
    ]);

    const deletionStats = {
      products: (stats[0].results[0] as any)?.count || 0,
      sales: (stats[1].results[0] as any)?.count || 0,
      customers: (stats[2].results[0] as any)?.count || 0,
      categories: (stats[3].results[0] as any)?.count || 0,
      suppliers: (stats[4].results[0] as any)?.count || 0,
    };

    // Eliminar manualmente en el orden correcto para evitar violaciones de FK
    // Primero eliminar tablas que dependen de otras
    await c.env.DB.batch([
      // 1. Eliminar items de carritos, pagos, items de ventas, items de órdenes
      c.env.DB.prepare('DELETE FROM cart_items WHERE tenant_id = ?').bind(id),
      c.env.DB.prepare('DELETE FROM credit_payments WHERE tenant_id = ?').bind(id),
      c.env.DB.prepare('DELETE FROM sale_items WHERE tenant_id = ?').bind(id),
      c.env.DB.prepare('DELETE FROM purchase_order_items WHERE tenant_id = ?').bind(id),

      // 2. Eliminar carritos, ventas, órdenes de compra
      c.env.DB.prepare('DELETE FROM shopping_carts WHERE tenant_id = ?').bind(id),
      c.env.DB.prepare('DELETE FROM sales WHERE tenant_id = ?').bind(id),
      c.env.DB.prepare('DELETE FROM purchase_orders WHERE tenant_id = ?').bind(id),

      // 3. Eliminar ofertas, movimientos de inventario
      c.env.DB.prepare('DELETE FROM offers WHERE tenant_id = ?').bind(id),
      c.env.DB.prepare('DELETE FROM inventory_movements WHERE tenant_id = ?').bind(id),

      // 4. Eliminar productos
      c.env.DB.prepare('DELETE FROM products WHERE tenant_id = ?').bind(id),

      // 5. Eliminar clientes, categorías, proveedores
      c.env.DB.prepare('DELETE FROM customers WHERE tenant_id = ?').bind(id),
      c.env.DB.prepare('DELETE FROM categories WHERE tenant_id = ?').bind(id),
      c.env.DB.prepare('DELETE FROM suppliers WHERE tenant_id = ?').bind(id),
    ]);

    // Finalmente eliminar el usuario
    await c.env.DB.prepare(
      'DELETE FROM user_profiles WHERE id = ?'
    )
      .bind(id)
      .run();

    // También eliminar el tenant asociado si existe
    try {
      await c.env.DB.prepare(
        'DELETE FROM tenants WHERE clerk_user_id = ?'
      )
        .bind(userToDelete.clerk_user_id)
        .run();
    } catch (error) {
      console.warn('Error deleting tenant (might not exist):', error);
    }

    return c.json<APIResponse<any>>({
      success: true,
      data: {
        deleted_user: {
          id: userToDelete.id,
          email: userToDelete.email,
          full_name: userToDelete.full_name,
        },
        deleted_data: deletionStats,
      },
      message: `Usuario ${userToDelete.email} eliminado correctamente junto con todos sus datos`
    });
  } catch (error: any) {
    console.error('Error deleting user profile:', error);
    return c.json<APIResponse<null>>({
      success: false,
      error: error.message || 'Failed to delete user profile',
      data: null
    }, 500);
  }
});

export default app;
