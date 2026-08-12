/**
 * Stats Routes - Endpoints públicos para estadísticas
 * NO requieren autenticación
 */

import { Hono } from 'hono';
import type { Env } from '../types';

const app = new Hono<{ Bindings: Env }>();

/**
 * GET /stats/active-stores
 * Obtiene el conteo de tiendas activas
 */
app.get('/active-stores', async (c) => {
  try {
    const db = c.env.DB;

    // Contar perfiles de usuario con suscripción activa o en trial
    const result = await db
      .prepare(
        `SELECT COUNT(*) as count
         FROM user_profiles
         WHERE subscription_status IN ('active', 'trial')
         AND deleted_at IS NULL`
      )
      .first<{ count: number }>();

    const count = result?.count || 1; // Mínimo 1 para mostrar

    return c.json({
      success: true,
      count,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting active stores count:', error);

    // Devolver 1 como fallback
    return c.json({
      success: true,
      count: 1,
      timestamp: new Date().toISOString(),
    });
  }
});

export default app;
