/**
 * Offers API Routes
 * Todas las ofertas están aisladas por tenant automáticamente
 */

import { Hono } from 'hono';
import type { Env, Tenant, APIResponse } from '../types';
import { TenantDB, generateId } from '../utils/db-helpers';

const app = new Hono<{ Bindings: Env }>();

interface Offer {
  id: string;
  tenant_id: string;
  product_id: string;
  discount_percentage: number;
  discount_amount?: number;
  start_date: string;
  end_date: string;
  is_active: number;
  reason?: 'proximoAVencer' | 'promocion' | 'liquidacion';
  created_at: string;
  updated_at: string;
}

// GET /api/offers - Get all offers for the tenant
app.get('/', async (c) => {
  const tenant: Tenant = c.get('tenant');

  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const offers = await tenantDB.getAll<Offer>('offers');

    return c.json<APIResponse<Offer[]>>({
      success: true,
      data: offers,
    });
  } catch (error) {
    console.error('Error fetching offers:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to fetch offers',
    }, 500);
  }
});

// GET /api/offers/active - Get all active offers (DEBE IR ANTES DE /:id)
app.get('/active', async (c) => {
  const tenant: Tenant = c.get('tenant');
  const now = new Date().toISOString();

  try {
    const result = await c.env.DB.prepare(
      `SELECT * FROM offers
       WHERE tenant_id = ?
         AND is_active = 1
         AND start_date <= ?
         AND end_date >= ?
       ORDER BY created_at DESC`
    )
      .bind(tenant.id, now, now)
      .all();

    return c.json<APIResponse<Offer[]>>({
      success: true,
      data: result.results as Offer[],
    });
  } catch (error) {
    console.error('Error fetching active offers:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to fetch active offers',
    }, 500);
  }
});

// GET /api/offers/product/:productId - Get all offers for a product (DEBE IR ANTES DE /:id)
app.get('/product/:productId', async (c) => {
  const tenant: Tenant = c.get('tenant');
  const productId = c.req.param('productId');

  try {
    const result = await c.env.DB.prepare(
      `SELECT * FROM offers
       WHERE tenant_id = ? AND product_id = ?
       ORDER BY created_at DESC`
    )
      .bind(tenant.id, productId)
      .all();

    return c.json<APIResponse<Offer[]>>({
      success: true,
      data: result.results as Offer[],
    });
  } catch (error) {
    console.error('Error fetching product offers:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to fetch product offers',
    }, 500);
  }
});

// GET /api/offers/:id - Get single offer
app.get('/:id', async (c) => {
  const tenant: Tenant = c.get('tenant');
  const offerId = c.req.param('id');

  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const offer = await tenantDB.getById<Offer>('offers', offerId);

    if (!offer) {
      return c.json<APIResponse>({
        success: false,
        error: 'Offer not found',
      }, 404);
    }

    return c.json<APIResponse<Offer>>({
      success: true,
      data: offer,
    });
  } catch (error) {
    console.error('Error fetching offer:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to fetch offer',
    }, 500);
  }
});

// POST /api/offers - Create new offer
app.post('/', async (c) => {
  const tenant: Tenant = c.get('tenant');

  try {
    const body = await c.req.json();
    const {
      product_id,
      discount_percentage,
      discount_amount,
      start_date,
      end_date,
      is_active = 1,
      reason
    } = body;

    // Validar campos requeridos
    if (!product_id || !discount_percentage || !start_date || !end_date) {
      return c.json<APIResponse>({
        success: false,
        error: 'Missing required fields: product_id, discount_percentage, start_date, end_date',
      }, 400);
    }

    const offerId = generateId('off');
    const now = new Date().toISOString();

    const tenantDB = new TenantDB(c.env.DB, tenant.id);

    // Verificar que el producto exista
    const product = await tenantDB.getById('products', product_id);
    if (!product) {
      return c.json<APIResponse>({
        success: false,
        error: 'Product not found',
      }, 404);
    }

    // Crear oferta
    const offer: Offer = {
      id: offerId,
      tenant_id: tenant.id,
      product_id,
      discount_percentage,
      discount_amount: discount_amount || 0,
      start_date,
      end_date,
      is_active: is_active ? 1 : 0,
      reason: reason || null,
      created_at: now,
      updated_at: now,
    };

    await c.env.DB.prepare(
      `INSERT INTO offers (
        id, tenant_id, product_id, discount_percentage, discount_amount,
        start_date, end_date, is_active, reason, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        offer.id,
        offer.tenant_id,
        offer.product_id,
        offer.discount_percentage,
        offer.discount_amount,
        offer.start_date,
        offer.end_date,
        offer.is_active,
        offer.reason,
        offer.created_at,
        offer.updated_at
      )
      .run();

    return c.json<APIResponse<Offer>>({
      success: true,
      data: offer,
    }, 201);
  } catch (error) {
    console.error('Error creating offer:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to create offer',
    }, 500);
  }
});

// PUT /api/offers/:id - Update offer
app.put('/:id', async (c) => {
  const tenant: Tenant = c.get('tenant');
  const offerId = c.req.param('id');

  try {
    const body = await c.req.json();
    const tenantDB = new TenantDB(c.env.DB, tenant.id);

    // Verificar que la oferta exista
    const existingOffer = await tenantDB.getById<Offer>('offers', offerId);
    if (!existingOffer) {
      return c.json<APIResponse>({
        success: false,
        error: 'Offer not found',
      }, 404);
    }

    const now = new Date().toISOString();

    // Construir query de actualización dinámica
    const updates = [];
    const values = [];

    if (body.product_id !== undefined) {
      updates.push('product_id = ?');
      values.push(body.product_id);
    }
    if (body.discount_percentage !== undefined) {
      updates.push('discount_percentage = ?');
      values.push(body.discount_percentage);
    }
    if (body.discount_amount !== undefined) {
      updates.push('discount_amount = ?');
      values.push(body.discount_amount);
    }
    if (body.start_date !== undefined) {
      updates.push('start_date = ?');
      values.push(body.start_date);
    }
    if (body.end_date !== undefined) {
      updates.push('end_date = ?');
      values.push(body.end_date);
    }
    if (body.is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(body.is_active ? 1 : 0);
    }
    if (body.reason !== undefined) {
      updates.push('reason = ?');
      values.push(body.reason);
    }

    updates.push('updated_at = ?');
    values.push(now);

    values.push(offerId, tenant.id);

    await c.env.DB.prepare(
      `UPDATE offers SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`
    )
      .bind(...values)
      .run();

    // Obtener la oferta actualizada
    const updatedOffer = await tenantDB.getById<Offer>('offers', offerId);

    return c.json<APIResponse<Offer>>({
      success: true,
      data: updatedOffer!,
    });
  } catch (error) {
    console.error('Error updating offer:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to update offer',
    }, 500);
  }
});

// DELETE /api/offers/:id - Delete offer
app.delete('/:id', async (c) => {
  const tenant: Tenant = c.get('tenant');
  const offerId = c.req.param('id');

  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);

    // Verificar que la oferta exista
    const offer = await tenantDB.getById<Offer>('offers', offerId);
    if (!offer) {
      return c.json<APIResponse>({
        success: false,
        error: 'Offer not found',
      }, 404);
    }

    await c.env.DB.prepare('DELETE FROM offers WHERE id = ? AND tenant_id = ?')
      .bind(offerId, tenant.id)
      .run();

    return c.json<APIResponse>({
      success: true,
      message: 'Offer deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting offer:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to delete offer',
    }, 500);
  }
});

export default app;
