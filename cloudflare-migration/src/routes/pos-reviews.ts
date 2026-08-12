/**
 * POS Reviews API Routes
 *
 * Reseñas de los tenderos sobre el sistema POS de posib.dev.
 * Una reseña por tienda (user_profile). Estas rutas requieren autenticación
 * (authMiddleware). El promedio y las reseñas públicas se sirven desde stats.ts
 * (sin autenticación) para mostrarse en la landing.
 */

import { Hono } from 'hono';
import type { Env, Tenant, APIResponse } from '../types';

const app = new Hono<{ Bindings: Env }>();

interface ReviewRow {
  user_profile_id: string;
  rating: number;
  comment: string | null;
  store_name: string | null;
  store_city: string | null;
  is_approved: number;
  created_at: string;
  updated_at: string;
}

function serialize(row: ReviewRow) {
  return {
    rating: row.rating,
    comment: row.comment || '',
    storeName: row.store_name || '',
    storeCity: row.store_city || '',
    isApproved: row.is_approved === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * GET /api/pos-reviews/me
 * Devuelve la reseña de la tienda autenticada (o null si aún no ha reseñado).
 */
app.get('/me', async (c) => {
  const tenant: Tenant = c.get('tenant');

  const row = await c.env.DB.prepare(
    'SELECT * FROM pos_reviews WHERE user_profile_id = ?'
  )
    .bind(tenant.id)
    .first<ReviewRow>();

  return c.json<APIResponse<any>>({
    success: true,
    data: row ? serialize(row) : null,
  });
});

/**
 * PUT /api/pos-reviews/me
 * Crea o actualiza la reseña de la tienda autenticada.
 */
app.put('/me', async (c) => {
  const tenant: Tenant = c.get('tenant');

  const body = await c.req.json<{ rating?: number; comment?: string }>();
  const rating = Number(body.rating);

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return c.json<APIResponse<null>>(
      { success: false, error: 'La calificación debe ser entre 1 y 5 estrellas', data: null },
      400
    );
  }

  const comment = body.comment?.trim() || null;

  // Datos de la tienda para mostrarlos junto a la reseña pública.
  const profile = await c.env.DB.prepare(
    'SELECT store_name, full_name, store_city FROM user_profiles WHERE id = ?'
  )
    .bind(tenant.id)
    .first<{ store_name: string | null; full_name: string | null; store_city: string | null }>();

  const storeName = profile?.store_name || profile?.full_name || 'Tienda';
  const storeCity = profile?.store_city || null;
  const now = new Date().toISOString();

  // Upsert: una reseña por tienda.
  await c.env.DB.prepare(
    `INSERT INTO pos_reviews
       (user_profile_id, rating, comment, store_name, store_city, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_profile_id) DO UPDATE SET
       rating = excluded.rating,
       comment = excluded.comment,
       store_name = excluded.store_name,
       store_city = excluded.store_city,
       updated_at = excluded.updated_at`
  )
    .bind(tenant.id, rating, comment, storeName, storeCity, now, now)
    .run();

  const saved = await c.env.DB.prepare(
    'SELECT * FROM pos_reviews WHERE user_profile_id = ?'
  )
    .bind(tenant.id)
    .first<ReviewRow>();

  return c.json<APIResponse<any>>({ success: true, data: serialize(saved!) });
});

/**
 * DELETE /api/pos-reviews/me
 * Elimina la reseña de la tienda autenticada.
 */
app.delete('/me', async (c) => {
  const tenant: Tenant = c.get('tenant');

  await c.env.DB.prepare('DELETE FROM pos_reviews WHERE user_profile_id = ?')
    .bind(tenant.id)
    .run();

  return c.json<APIResponse<null>>({ success: true, data: null });
});

export default app;
