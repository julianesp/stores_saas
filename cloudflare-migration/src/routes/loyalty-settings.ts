import { Hono } from 'hono';
import type { Env } from '../types';

const app = new Hono<{ Bindings: Env }>();

// Niveles por defecto
const DEFAULT_TIERS = [
  { min_amount: 0, max_amount: 19999, points: 0, name: 'Sin puntos' },
  { min_amount: 20000, max_amount: 49999, points: 5, name: 'Compra pequeña' },
  { min_amount: 50000, max_amount: 99999, points: 10, name: 'Compra mediana' },
  { min_amount: 100000, max_amount: 199999, points: 25, name: 'Compra grande' },
  { min_amount: 200000, max_amount: 499999, points: 50, name: 'Compra muy grande' },
  { min_amount: 500000, max_amount: Infinity, points: 100, name: 'Compra premium' },
];

/**
 * GET /?clerk_user_id=xxx
 * Obtiene la configuración de loyalty settings de un usuario
 */
app.get('/', async (c) => {
  try {
    const clerkUserId = c.req.query('clerk_user_id');

    if (!clerkUserId) {
      return c.json({ error: 'clerk_user_id es requerido' }, 400);
    }

    // Obtener el user_profile_id desde la base de datos
    const userProfile = await c.env.DB.prepare(
      'SELECT id FROM user_profiles WHERE clerk_user_id = ?'
    )
      .bind(clerkUserId)
      .first<{ id: string }>();

    if (!userProfile) {
      return c.json({ error: 'Usuario no encontrado' }, 404);
    }

    // Buscar configuración existente
    const settings = await c.env.DB.prepare(
      'SELECT * FROM loyalty_settings WHERE user_profile_id = ?'
    )
      .bind(userProfile.id)
      .first();

    if (!settings) {
      // No existe configuración, retornar 404
      return c.json({ error: 'Configuración no encontrada' }, 404);
    }

    // Parsear los tiers desde JSON
    const tiersData = JSON.parse(settings.tiers as string);

    const response = {
      id: settings.id,
      user_profile_id: settings.user_profile_id,
      enabled: settings.enabled === 1,
      tiers: tiersData.map((tier: any) => ({
        ...tier,
        max_amount: tier.max_amount === 999999999 ? Infinity : tier.max_amount,
      })),
      created_at: settings.created_at,
      updated_at: settings.updated_at,
    };

    return c.json(response);
  } catch (error: any) {
    console.error('Error getting loyalty settings:', error);
    return c.json({ error: error.message || 'Error interno del servidor' }, 500);
  }
});

/**
 * POST /
 * Crea o actualiza la configuración de loyalty settings
 */
app.post('/', async (c) => {
  try {
    const body: any = await c.req.json();
    const { clerk_user_id, enabled, tiers } = body;

    if (!clerk_user_id) {
      return c.json({ error: 'clerk_user_id es requerido' }, 400);
    }

    if (typeof enabled !== 'boolean') {
      return c.json({ error: 'enabled debe ser boolean' }, 400);
    }

    if (!Array.isArray(tiers) || tiers.length === 0) {
      return c.json({ error: 'tiers debe ser un array con al menos un elemento' }, 400);
    }

    // Obtener el user_profile_id desde la base de datos
    const userProfile = await c.env.DB.prepare(
      'SELECT id FROM user_profiles WHERE clerk_user_id = ?'
    )
      .bind(clerk_user_id)
      .first<{ id: string }>();

    if (!userProfile) {
      return c.json({ error: 'Usuario no encontrado' }, 404);
    }

    // Convertir Infinity a un valor muy grande para JSON
    const tiersForDb = tiers.map((tier: any) => ({
      ...tier,
      max_amount: tier.max_amount === Infinity ? 999999999 : tier.max_amount,
    }));

    const tiersJson = JSON.stringify(tiersForDb);

    // Verificar si ya existe configuración
    const existingSettings = await c.env.DB.prepare(
      'SELECT id FROM loyalty_settings WHERE user_profile_id = ?'
    )
      .bind(userProfile.id)
      .first();

    if (existingSettings) {
      // Actualizar configuración existente
      await c.env.DB.prepare(
        `UPDATE loyalty_settings
         SET enabled = ?, tiers = ?, updated_at = datetime('now')
         WHERE user_profile_id = ?`
      )
        .bind(enabled ? 1 : 0, tiersJson, userProfile.id)
        .run();

      // Obtener la configuración actualizada
      const updated = await c.env.DB.prepare(
        'SELECT * FROM loyalty_settings WHERE user_profile_id = ?'
      )
        .bind(userProfile.id)
        .first();

      const response = {
        id: updated!.id,
        user_profile_id: updated!.user_profile_id,
        enabled: updated!.enabled === 1,
        tiers: JSON.parse(updated!.tiers as string).map((tier: any) => ({
          ...tier,
          max_amount: tier.max_amount === 999999999 ? Infinity : tier.max_amount,
        })),
        created_at: updated!.created_at,
        updated_at: updated!.updated_at,
      };

      return c.json(response);
    } else {
      // Crear nueva configuración
      const id = crypto.randomUUID();

      await c.env.DB.prepare(
        `INSERT INTO loyalty_settings (id, user_profile_id, enabled, tiers, created_at, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`
      )
        .bind(id, userProfile.id, enabled ? 1 : 0, tiersJson)
        .run();

      // Obtener la configuración creada
      const created = await c.env.DB.prepare(
        'SELECT * FROM loyalty_settings WHERE id = ?'
      )
        .bind(id)
        .first();

      const response = {
        id: created!.id,
        user_profile_id: created!.user_profile_id,
        enabled: created!.enabled === 1,
        tiers: JSON.parse(created!.tiers as string).map((tier: any) => ({
          ...tier,
          max_amount: tier.max_amount === 999999999 ? Infinity : tier.max_amount,
        })),
        created_at: created!.created_at,
        updated_at: created!.updated_at,
      };

      return c.json(response, 201);
    }
  } catch (error: any) {
    console.error('Error saving loyalty settings:', error);
    return c.json({ error: error.message || 'Error interno del servidor' }, 500);
  }
});

export default app;
