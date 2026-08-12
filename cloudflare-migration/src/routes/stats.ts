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
 * GET /stats/client-stores
 * Lista pública de tiendas reales marcadas por el superadmin para la landing
 * (landing_enabled = 1). Los datos salen de user_profiles.
 */
app.get('/client-stores', async (c) => {
  try {
    const db = c.env.DB;

    const result = await db
      .prepare(
        `SELECT id, store_name, full_name, landing_location, store_city,
                landing_image_url, store_slug, landing_profile_enabled
         FROM user_profiles
         WHERE landing_enabled = 1 AND deleted_at IS NULL
         ORDER BY store_name ASC, full_name ASC`
      )
      .all<{
        id: string;
        store_name: string | null;
        full_name: string | null;
        landing_location: string | null;
        store_city: string | null;
        landing_image_url: string | null;
        store_slug: string | null;
        landing_profile_enabled: number;
      }>();

    const stores = (result.results || []).map((s) => ({
      id: s.id,
      name: s.store_name || s.full_name || 'Tienda',
      location: s.landing_location || s.store_city || '',
      image: s.landing_image_url || '',
      // Solo exponemos slug si el perfil público está habilitado, para que la
      // tarjeta de la landing enlace únicamente a los perfiles activados.
      slug:
        s.landing_profile_enabled === 1 && s.store_slug ? s.store_slug : '',
    }));

    return c.json({ success: true, stores });
  } catch (error) {
    console.error('Error getting client stores:', error);
    // Fallback vacío para no romper la landing.
    return c.json({ success: true, stores: [] });
  }
});

/**
 * GET /stats/client-stores/:slug
 * Perfil público de una tienda real (imagen + contacto + Google Maps).
 * Solo responde si el perfil está habilitado (landing_profile_enabled = 1).
 * Reutiliza los datos de contacto que la tienda ya tiene (store_*).
 */
app.get('/client-stores/:slug', async (c) => {
  try {
    const slug = c.req.param('slug');
    const db = c.env.DB;

    const row = await db
      .prepare(
        `SELECT store_name, full_name, landing_location, store_city,
                landing_image_url, store_description, store_address,
                store_phone, phone, store_whatsapp, store_email, email,
                store_facebook, store_instagram, landing_maps_url
         FROM user_profiles
         WHERE store_slug = ? AND landing_enabled = 1
           AND landing_profile_enabled = 1 AND deleted_at IS NULL`
      )
      .bind(slug)
      .first<{
        store_name: string | null;
        full_name: string | null;
        landing_location: string | null;
        store_city: string | null;
        landing_image_url: string | null;
        store_description: string | null;
        store_address: string | null;
        store_phone: string | null;
        phone: string | null;
        store_whatsapp: string | null;
        store_email: string | null;
        email: string | null;
        store_facebook: string | null;
        store_instagram: string | null;
        landing_maps_url: string | null;
      }>();

    if (!row) {
      return c.json({ success: false, error: 'Perfil no encontrado' }, 404);
    }

    return c.json({
      success: true,
      store: {
        name: row.store_name || row.full_name || 'Tienda',
        location: row.landing_location || row.store_city || '',
        image: row.landing_image_url || '',
        description: row.store_description || '',
        address: row.store_address || '',
        phone: row.store_phone || row.phone || '',
        whatsapp: row.store_whatsapp || '',
        email: row.store_email || row.email || '',
        facebook: row.store_facebook || '',
        instagram: row.store_instagram || '',
        mapsUrl: row.landing_maps_url || '',
      },
    });
  } catch (error) {
    console.error('Error getting client store profile:', error);
    return c.json({ success: false, error: 'Error al cargar el perfil' }, 500);
  }
});

export default app;
