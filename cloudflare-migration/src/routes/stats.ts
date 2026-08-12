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

/**
 * GET /stats/reviews
 * Promedio global de estrellas + reseñas aprobadas para mostrar en la landing.
 */
app.get('/reviews', async (c) => {
  try {
    const db = c.env.DB;

    // Promedio y conteo global (solo reseñas aprobadas).
    const agg = await db
      .prepare(
        `SELECT COUNT(*) as count, AVG(rating) as average
         FROM pos_reviews
         WHERE is_approved = 1`
      )
      .first<{ count: number; average: number | null }>();

    // Reseñas con comentario para mostrar como destacadas (máx. 12, recientes).
    const list = await db
      .prepare(
        `SELECT rating, comment, store_name, store_city, updated_at
         FROM pos_reviews
         WHERE is_approved = 1 AND comment IS NOT NULL AND TRIM(comment) != ''
         ORDER BY updated_at DESC
         LIMIT 12`
      )
      .all<{
        rating: number;
        comment: string;
        store_name: string | null;
        store_city: string | null;
        updated_at: string;
      }>();

    const count = agg?.count || 0;
    const average = agg?.average ? Math.round(agg.average * 10) / 10 : 0;

    const reviews = (list.results || []).map((r) => ({
      rating: r.rating,
      comment: r.comment,
      storeName: r.store_name || 'Tienda',
      storeCity: r.store_city || '',
      date: r.updated_at,
    }));

    return c.json({ success: true, average, count, reviews });
  } catch (error) {
    console.error('Error getting reviews:', error);
    return c.json({ success: true, average: 0, count: 0, reviews: [] });
  }
});

export default app;
