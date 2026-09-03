/**
 * Business Type Prices API Routes
 *
 * Precios mensuales por tipo de negocio, editables desde el panel superadmin.
 * GET es de lectura para cualquier usuario autenticado (el front la usa para
 * mostrar precios en vivo). PUT está restringido a superadmin.
 */

import { Hono } from 'hono';
import type { Env, Tenant, APIResponse } from '../types';

const app = new Hono<{ Bindings: Env }>();

interface PriceRow {
  business_type: string;
  price: number;
  updated_at: string;
}

/** Verifica que el usuario autenticado sea superadmin. */
async function ensureSuperAdmin(c: any): Promise<Response | null> {
  const tenant: Tenant = c.get('tenant');
  const clerkUserId = (tenant as any).clerk_user_id;

  const profile = await c.env.DB.prepare(
    'SELECT is_superadmin FROM user_profiles WHERE clerk_user_id = ?'
  )
    .bind(clerkUserId)
    .first<{ is_superadmin: number }>();

  if (!profile?.is_superadmin) {
    return c.json<APIResponse<null>>(
      { success: false, error: 'No tienes permisos para modificar precios', data: null },
      403
    );
  }
  return null;
}

/**
 * GET /api/business-type-prices
 * Lista los precios actuales por tipo de negocio.
 */
app.get('/', async (c) => {
  const result = await c.env.DB.prepare(
    'SELECT * FROM business_type_prices ORDER BY business_type ASC'
  ).all<PriceRow>();

  const prices = (result.results || []).map((r) => ({
    businessType: r.business_type,
    price: r.price,
    updatedAt: r.updated_at,
  }));

  return c.json<APIResponse<typeof prices>>({ success: true, data: prices });
});

/**
 * PUT /api/business-type-prices/:businessType
 * Actualiza el precio de un tipo de negocio. Body: { price: number }.
 * Solo superadmin.
 */
app.put('/:businessType', async (c) => {
  const denied = await ensureSuperAdmin(c);
  if (denied) return denied;

  const businessType = c.req.param('businessType');
  const body = await c.req.json<{ price?: number }>();
  const price = Number(body.price);

  if (!Number.isInteger(price) || price < 0) {
    return c.json<APIResponse<null>>(
      { success: false, error: 'El precio debe ser un número entero positivo', data: null },
      400
    );
  }

  const now = new Date().toISOString();

  await c.env.DB.prepare(
    `INSERT INTO business_type_prices (business_type, price, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(business_type) DO UPDATE SET
       price = excluded.price,
       updated_at = excluded.updated_at`
  )
    .bind(businessType, price, now)
    .run();

  return c.json<APIResponse<null>>({ success: true, data: null });
});

export default app;
