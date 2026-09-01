/**
 * Offers API Routes
 * Todas las ofertas están aisladas por tenant automáticamente
 */

import { Hono } from 'hono';
import type { Env, Tenant, APIResponse } from '../types';
import { TenantDB, generateId } from '../utils/db-helpers';
import { sendEmail, logEmail } from '../utils/email';
import { offerTemplate } from '../utils/email-templates';

const app = new Hono<{ Bindings: Env }>();

/**
 * Envía un email de promoción a todos los clientes con correo de la tienda.
 * Se ejecuta en segundo plano (ctx.waitUntil) para no bloquear la creación de
 * la oferta. Respeta la preferencia offers_emails_enabled del tenant.
 */
async function enviarEmailsOferta(
  db: D1Database,
  tenantId: string,
  offer: { id: string; product_id: string; discount_percentage: number; end_date: string },
  product: { name: string; sale_price: number; image_url?: string | null },
  resendApiKey?: string
): Promise<void> {
  try {
    // Datos de la tienda + preferencia de ofertas
    const store = await db
      .prepare(
        `SELECT store_name, store_slug, from_name_pref.from_name AS pref_from_name,
                from_name_pref.from_email AS pref_from_email,
                from_name_pref.offers_emails_enabled AS offers_enabled
         FROM user_profiles up
         LEFT JOIN email_preferences from_name_pref
           ON from_name_pref.user_profile_id = up.id
         WHERE up.id = ?`
      )
      .bind(tenantId)
      .first<{
        store_name: string | null;
        store_slug: string | null;
        pref_from_name: string | null;
        pref_from_email: string | null;
        offers_enabled: number | null;
      }>();

    // Si la tienda desactivó los avisos de ofertas, no enviar.
    // (offers_enabled null = sin fila de preferencias => se asume activo)
    if (store && store.offers_enabled === 0) {
      return;
    }

    const storeName = store?.store_name || 'Tu tienda';
    const storeSlug = store?.store_slug || null;

    // Clientes con email de la tienda
    const clientes = await db
      .prepare(
        `SELECT email, name FROM customers
         WHERE tenant_id = ? AND email IS NOT NULL AND email != ''`
      )
      .bind(tenantId)
      .all<{ email: string; name: string | null }>();

    if (!clientes.results || clientes.results.length === 0) return;

    const finalPrice = Math.max(
      0,
      product.sale_price * (1 - offer.discount_percentage / 100)
    );
    const productUrl = storeSlug
      ? `https://posib.dev/store/${storeSlug}/product/${offer.product_id}`
      : null;

    const html = offerTemplate({
      product_name: product.name,
      product_image: product.image_url,
      store_name: storeName,
      discount_percentage: offer.discount_percentage,
      original_price: product.sale_price,
      final_price: finalPrice,
      end_date: offer.end_date,
      product_url: productUrl,
    });

    for (const cliente of clientes.results) {
      try {
        const result = await sendEmail(
          {
            to: cliente.email,
            toName: cliente.name || undefined,
            from: store?.pref_from_email || 'noreply@posib.dev',
            fromName: store?.pref_from_name || storeName,
            subject: `🔥 ${offer.discount_percentage}% de descuento en ${product.name}`,
            html,
          },
          resendApiKey
        );

        await logEmail(
          db,
          tenantId,
          'offer_alert',
          cliente.email,
          `Oferta: ${product.name}`,
          result.success ? 'sent' : 'failed',
          result.success ? undefined : result.error,
          {
            offer_id: offer.id,
            product_id: offer.product_id,
            discount_percentage: offer.discount_percentage,
          }
        );
      } catch (err) {
        console.error('Error enviando email de oferta a', cliente.email, err);
      }
    }
  } catch (error) {
    console.error('Error en enviarEmailsOferta:', error);
  }
}

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

    // Solo promociones reales avisan a los clientes (no las ofertas automáticas
    // de "próximo a vencer"). El envío va en segundo plano para no demorar la
    // respuesta de crear la oferta.
    if (reason === 'promocion' || reason === 'liquidacion') {
      c.executionCtx.waitUntil(
        enviarEmailsOferta(
          c.env.DB,
          tenant.id,
          {
            id: offer.id,
            product_id: offer.product_id,
            discount_percentage: offer.discount_percentage,
            end_date: offer.end_date,
          },
          {
            name: (product as any).name,
            sale_price: (product as any).sale_price,
            image_url: (product as any).image_url,
          },
          c.env.RESEND_API_KEY
        )
      );
    }

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
