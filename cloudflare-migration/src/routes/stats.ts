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
 * Lista pública de tiendas clientes activas para mostrar en la landing.
 */
app.get('/client-stores', async (c) => {
  try {
    const db = c.env.DB;

    const result = await db
      .prepare(
        `SELECT id, name, location, image_url, slug, profile_enabled
         FROM client_stores
         WHERE is_active = 1
         ORDER BY sort_order ASC, created_at ASC`
      )
      .all<{
        id: string;
        name: string;
        location: string;
        image_url: string | null;
        slug: string | null;
        profile_enabled: number;
      }>();

    const stores = (result.results || []).map((s) => ({
      id: s.id,
      name: s.name,
      location: s.location,
      image: s.image_url || '',
      // Solo exponemos slug si el perfil público está habilitado, para que la
      // tarjeta de la landing enlace únicamente a los perfiles activados.
      slug: s.profile_enabled === 1 && s.slug ? s.slug : '',
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
 * Perfil público de una tienda cliente (imagen + contacto + Google Maps).
 * Solo responde si el perfil está habilitado (profile_enabled = 1).
 */
app.get('/client-stores/:slug', async (c) => {
  try {
    const slug = c.req.param('slug');
    const db = c.env.DB;

    const row = await db
      .prepare(
        `SELECT name, location, image_url, description, address, phone, whatsapp,
                email, facebook, instagram, maps_url
         FROM client_stores
         WHERE slug = ? AND is_active = 1 AND profile_enabled = 1`
      )
      .bind(slug)
      .first<{
        name: string;
        location: string;
        image_url: string | null;
        description: string | null;
        address: string | null;
        phone: string | null;
        whatsapp: string | null;
        email: string | null;
        facebook: string | null;
        instagram: string | null;
        maps_url: string | null;
      }>();

    if (!row) {
      return c.json({ success: false, error: 'Perfil no encontrado' }, 404);
    }

    return c.json({
      success: true,
      store: {
        name: row.name,
        location: row.location,
        image: row.image_url || '',
        description: row.description || '',
        address: row.address || '',
        phone: row.phone || '',
        whatsapp: row.whatsapp || '',
        email: row.email || '',
        facebook: row.facebook || '',
        instagram: row.instagram || '',
        mapsUrl: row.maps_url || '',
      },
    });
  } catch (error) {
    console.error('Error getting client store profile:', error);
    return c.json({ success: false, error: 'Error al cargar el perfil' }, 500);
  }
});

export default app;
