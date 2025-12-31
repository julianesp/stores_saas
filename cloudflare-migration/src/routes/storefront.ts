/**
 * Storefront API Routes
 * Gestiona la configuración pública de tiendas y catálogo de productos
 */

import { Hono } from 'hono';
import type { Env, Tenant, APIResponse } from '../types';
import { TenantDB, generateId } from '../utils/db-helpers';

const app = new Hono<{ Bindings: Env }>();

interface StoreConfig {
  id: string;
  store_slug?: string;
  store_name?: string;
  store_description?: string;
  store_logo_url?: string;
  store_banner_url?: string;
  store_primary_color?: string;
  store_secondary_color?: string;
  store_whatsapp?: string;
  store_facebook?: string;
  store_instagram?: string;
  store_address?: string;
  store_city?: string;
  store_phone?: string;
  store_email?: string;
  store_enabled?: number;
  store_terms?: string;
  store_shipping_enabled?: number;
  store_pickup_enabled?: number;
  store_min_order?: number;
  store_nequi_number?: string;
}

// GET /api/storefront/config/:slug - Obtener configuración pública de una tienda por slug
app.get('/config/:slug', async (c) => {
  const slug = c.req.param('slug');

  try {
    // Buscar tienda por slug
    const result = await c.env.DB.prepare(
      `SELECT
        id, store_slug, store_name, store_description,
        store_logo_url, store_banner_url,
        store_primary_color, store_secondary_color,
        store_whatsapp, store_facebook, store_instagram,
        store_address, store_city, store_phone, store_email,
        store_enabled, store_terms,
        store_shipping_enabled, store_pickup_enabled, store_min_order,
        store_nequi_number
      FROM user_profiles
      WHERE store_slug = ? AND store_enabled = 1`
    )
      .bind(slug)
      .first();

    if (!result) {
      return c.json<APIResponse>({
        success: false,
        error: 'Store not found or disabled',
      }, 404);
    }

    return c.json<APIResponse<StoreConfig>>({
      success: true,
      data: result as StoreConfig,
    });
  } catch (error) {
    console.error('Error fetching store config:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to fetch store configuration',
    }, 500);
  }
});

// GET /api/storefront/products/:slug - Obtener productos públicos de una tienda
app.get('/products/:slug', async (c) => {
  const slug = c.req.param('slug');
  const category = c.req.query('category'); // Filtro opcional por categoría

  try {
    // Primero obtener el tenant_id de la tienda
    const store = await c.env.DB.prepare(
      'SELECT id FROM user_profiles WHERE store_slug = ? AND store_enabled = 1'
    )
      .bind(slug)
      .first<{ id: string }>();

    if (!store) {
      return c.json<APIResponse>({
        success: false,
        error: 'Store not found or disabled',
      }, 404);
    }

    // Construir query con filtro opcional de categoría
    let query = `
      SELECT
        p.id, p.name, p.description, p.sale_price, p.stock,
        p.images, p.category_id,
        c.name as category_name,
        o.discount_percentage, o.id as offer_id
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id AND p.tenant_id = c.tenant_id
      LEFT JOIN offers o ON p.id = o.product_id
        AND o.is_active = 1
        AND datetime(o.start_date) <= datetime('now')
        AND datetime(o.end_date) >= datetime('now')
      WHERE p.tenant_id = ? AND p.stock > 0
    `;

    const bindings: any[] = [store.id];

    if (category) {
      query += ' AND p.category_id = ?';
      bindings.push(category);
    }

    query += ' ORDER BY p.name ASC';

    const result = await c.env.DB.prepare(query)
      .bind(...bindings)
      .all();

    return c.json<APIResponse>({
      success: true,
      data: result.results,
    });
  } catch (error) {
    console.error('Error fetching store products:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to fetch products',
    }, 500);
  }
});

// GET /api/storefront/product/:slug/:productId - Obtener detalle de un producto
app.get('/product/:slug/:productId', async (c) => {
  const slug = c.req.param('slug');
  const productId = c.req.param('productId');

  try {
    // Verificar que la tienda existe y está activa
    const store = await c.env.DB.prepare(
      'SELECT id FROM user_profiles WHERE store_slug = ? AND store_enabled = 1'
    )
      .bind(slug)
      .first<{ id: string }>();

    if (!store) {
      return c.json<APIResponse>({
        success: false,
        error: 'Store not found or disabled',
      }, 404);
    }

    // Obtener producto con toda su información
    const product = await c.env.DB.prepare(
      `SELECT
        p.*,
        c.name as category_name,
        o.discount_percentage, o.id as offer_id, o.reason as offer_reason
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id AND p.tenant_id = c.tenant_id
      LEFT JOIN offers o ON p.id = o.product_id
        AND o.is_active = 1
        AND datetime(o.start_date) <= datetime('now')
        AND datetime(o.end_date) >= datetime('now')
      WHERE p.id = ? AND p.tenant_id = ?`
    )
      .bind(productId, store.id)
      .first();

    if (!product) {
      return c.json<APIResponse>({
        success: false,
        error: 'Product not found',
      }, 404);
    }

    return c.json<APIResponse>({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to fetch product',
    }, 500);
  }
});

// GET /api/storefront/categories/:slug - Obtener categorías de una tienda
app.get('/categories/:slug', async (c) => {
  const slug = c.req.param('slug');

  try {
    // Verificar que la tienda existe y está activa
    const store = await c.env.DB.prepare(
      'SELECT id FROM user_profiles WHERE store_slug = ? AND store_enabled = 1'
    )
      .bind(slug)
      .first<{ id: string }>();

    if (!store) {
      return c.json<APIResponse>({
        success: false,
        error: 'Store not found or disabled',
      }, 404);
    }

    // Obtener categorías con count de productos
    const result = await c.env.DB.prepare(
      `SELECT
        c.id, c.name, c.description,
        COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND c.tenant_id = p.tenant_id AND p.stock > 0
      WHERE c.tenant_id = ?
      GROUP BY c.id, c.name, c.description
      HAVING product_count > 0
      ORDER BY c.name ASC`
    )
      .bind(store.id)
      .all();

    return c.json<APIResponse>({
      success: true,
      data: result.results,
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to fetch categories',
    }, 500);
  }
});

// POST /api/storefront/orders/:slug - Crear pedido desde storefront (sin autenticación)
app.post('/orders/:slug', async (c) => {
  const slug = c.req.param('slug');

  try {
    const body = await c.req.json();

    // Validar campos requeridos
    if (!body.customer_name || !body.customer_phone || !body.items || body.items.length === 0 || !body.delivery_method) {
      return c.json<APIResponse>({
        success: false,
        error: 'Missing required fields: customer_name, customer_phone, items, delivery_method',
      }, 400);
    }

    // Verificar que la tienda existe y está activa
    const store = await c.env.DB.prepare(
      'SELECT id, store_name, store_whatsapp, wompi_enabled FROM user_profiles WHERE store_slug = ? AND store_enabled = 1'
    )
      .bind(slug)
      .first<{ id: string; store_name?: string; store_whatsapp?: string; wompi_enabled: number }>();

    if (!store) {
      return c.json<APIResponse>({
        success: false,
        error: 'Store not found or disabled',
      }, 404);
    }

    const tenantDB = new TenantDB(c.env.DB, store.id);

    // Generar número de pedido
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const saleCount = await tenantDB.count('sales');
    const orderNumber = `WEB-${dateStr}-${String(saleCount + 1).padStart(6, '0')}`;

    // Calcular totales
    const subtotal = body.items.reduce((sum: number, item: any) => {
      return sum + (item.unit_price * item.quantity);
    }, 0);

    const discount = body.items.reduce((sum: number, item: any) => {
      if (item.discount_percentage && item.discount_percentage > 0) {
        const itemTotal = item.unit_price * item.quantity;
        const discountAmount = itemTotal * (item.discount_percentage / 100);
        return sum + discountAmount;
      }
      return sum;
    }, 0);

    const shippingCost = body.shipping_cost ? parseFloat(body.shipping_cost) : 0;
    const total = subtotal - discount + shippingCost;

    // Crear venta/pedido
    const saleData: any = {
      id: generateId('sale'),
      sale_number: orderNumber,
      cashier_id: store.id, // El dueño de la tienda como "cajero"
      customer_id: null, // Sin customer_id porque no está registrado
      subtotal: subtotal,
      tax: 0,
      discount: discount,
      total: total,
      payment_method: 'transferencia', // Pago por transferencia (Nequi, etc.)
      status: 'pendiente', // Estado inicial del pedido
      points_earned: 0,
      notes: `Pedido web - Cliente: ${body.customer_name}\nTeléfono: ${body.customer_phone}\n${body.customer_email ? `Email: ${body.customer_email}\n` : ''}Entrega: ${body.delivery_method === 'pickup' ? 'Recogida en tienda' : 'Envío a domicilio'}\n${body.delivery_address ? `Dirección: ${body.delivery_address}\n` : ''}${shippingCost > 0 ? `Costo de envío: $${shippingCost.toFixed(0)}\n` : ''}${body.notes ? `Notas: ${body.notes}` : ''}`,
      payment_status: 'pendiente',
      amount_paid: 0,
      amount_pending: total,
      due_date: null,
    };

    // Insertar venta
    await tenantDB.insert('sales', saleData);

    // Insertar items del pedido
    const itemsToInsert = body.items.map((item: any) => ({
      id: generateId('item'),
      sale_id: saleData.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount: item.discount_percentage ? (item.unit_price * item.quantity * item.discount_percentage / 100) : 0,
      subtotal: item.unit_price * item.quantity - (item.discount_percentage ? (item.unit_price * item.quantity * item.discount_percentage / 100) : 0),
    }));

    await tenantDB.batchInsert('sale_items', itemsToInsert);

    // NO descontar inventario todavía - esperamos confirmación de pago del dueño
    // El inventario se descontará cuando el dueño confirme el pago en el dashboard

    // Retornar pedido creado
    return c.json<APIResponse>({
      success: true,
      data: {
        order_id: saleData.id,
        order_number: orderNumber,
        total: total,
        store_whatsapp: store.store_whatsapp,
        wompi_enabled: !!store.wompi_enabled,
      },
      message: 'Order created successfully',
    }, 201);
  } catch (error: any) {
    console.error('Error creating order:', error);
    return c.json<APIResponse>({
      success: false,
      error: error.message || 'Failed to create order',
    }, 500);
  }
});

// GET /api/storefront/shipping-zones/:slug - Obtener zonas de envío activas de una tienda
app.get('/shipping-zones/:slug', async (c) => {
  const slug = c.req.param('slug');

  try {
    // Verificar que la tienda existe y está activa
    const store = await c.env.DB.prepare(
      'SELECT id FROM user_profiles WHERE store_slug = ? AND store_enabled = 1'
    )
      .bind(slug)
      .first<{ id: string }>();

    if (!store) {
      return c.json<APIResponse>({
        success: false,
        error: 'Store not found or disabled',
      }, 404);
    }

    // Obtener zonas de envío activas
    const result = await c.env.DB.prepare(
      `SELECT id, zone_name, shipping_cost
       FROM shipping_zones
       WHERE tenant_id = ? AND is_active = 1
       ORDER BY zone_name ASC`
    )
      .bind(store.id)
      .all();

    return c.json<APIResponse>({
      success: true,
      data: result.results,
    });
  } catch (error) {
    console.error('Error fetching shipping zones:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to fetch shipping zones',
    }, 500);
  }
});

// POST /api/storefront/wompi/create-payment-link/:slug - Crear payment link de Wompi (público)
app.post('/wompi/create-payment-link/:slug', async (c) => {
  const slug = c.req.param('slug');

  try {
    const body = await c.req.json();
    const { order_id, order_number, amount_in_cents, customer_email, customer_name } = body;

    if (!order_id || !order_number || !amount_in_cents) {
      return c.json<APIResponse>({
        success: false,
        error: 'Missing required fields: order_id, order_number, amount_in_cents',
      }, 400);
    }

    // Verificar que la tienda existe, está activa y tiene Wompi habilitado
    const store = await c.env.DB.prepare(
      'SELECT id, wompi_public_key, wompi_private_key, wompi_enabled FROM user_profiles WHERE store_slug = ? AND store_enabled = 1'
    )
      .bind(slug)
      .first<{ id: string; wompi_public_key?: string; wompi_private_key?: string; wompi_enabled: number }>();

    if (!store) {
      return c.json<APIResponse>({
        success: false,
        error: 'Store not found or disabled',
      }, 404);
    }

    if (!store.wompi_enabled) {
      return c.json<APIResponse>({
        success: false,
        error: 'Wompi payments not enabled for this store',
      }, 400);
    }

    if (!store.wompi_private_key) {
      return c.json<APIResponse>({
        success: false,
        error: 'Wompi credentials not configured',
      }, 400);
    }

    // Validar monto mínimo (2,000 COP = 200,000 centavos)
    if (amount_in_cents < 200000) {
      return c.json<APIResponse>({
        success: false,
        error: 'El monto mínimo para pagos con Wompi es de $2,000 COP',
      }, 400);
    }

    // Construir redirect_url para después del pago
    // Wompi redirigirá aquí después de que el cliente complete el pago
    const redirectUrl = `https://tienda-pos.vercel.app/store/${slug}/payment-confirmation`;

    // Crear el payment link en Wompi
    const wompiResponse = await fetch('https://production.wompi.co/v1/payment_links', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${store.wompi_private_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `Pedido ${order_number}`,
        description: `Pago del pedido ${order_number}${customer_name ? ` - ${customer_name}` : ''}`,
        single_use: true,
        collect_shipping: false,
        currency: 'COP',
        amount_in_cents: amount_in_cents,
        reference: order_number, // CLAVE: Usar order_number como referencia para identificar en webhook
        sku: order_id,
        redirect_url: redirectUrl,
      }),
    });

    if (!wompiResponse.ok) {
      const errorData = await wompiResponse.json().catch(() => ({}));
      console.error('Wompi API error:', errorData);
      return c.json<APIResponse>({
        success: false,
        error: errorData.error?.reason || 'Error al crear el link de pago en Wompi',
      }, 500);
    }

    const wompiData = await wompiResponse.json();
    const checkoutUrl = `https://checkout.wompi.co/l/${wompiData.data.id}`;

    // Guardar referencia del payment link en las notas del pedido
    await c.env.DB.prepare(
      `UPDATE sales
       SET notes = COALESCE(notes, '') || '\nWompi Payment Link ID: ' || ?
       WHERE id = ? AND tenant_id = ?`
    )
      .bind(wompiData.data.id, order_id, store.id)
      .run();

    return c.json<APIResponse>({
      success: true,
      data: {
        payment_link_id: wompiData.data.id,
        checkout_url: checkoutUrl,
        expires_at: wompiData.data.expires_at,
      },
    });

  } catch (error: any) {
    console.error('Error creating Wompi payment link:', error);
    return c.json<APIResponse>({
      success: false,
      error: error.message || 'Failed to create payment link',
    }, 500);
  }
});

// GET /api/storefront/:slug/order/:orderNumber/status - Debug endpoint para verificar estado de orden
app.get('/:slug/order/:orderNumber/status', async (c) => {
  try {
    const orderNumber = c.req.param('orderNumber');

    // Buscar la orden
    const sale = await c.env.DB.prepare(
      `SELECT
        id, sale_number, total, status, payment_status,
        amount_paid, amount_pending, notes, created_at
       FROM sales
       WHERE sale_number = ?`
    ).bind(orderNumber).first<{
      id: string;
      sale_number: string;
      total: number;
      status: string;
      payment_status: string;
      amount_paid: number;
      amount_pending: number;
      notes: string;
      created_at: string;
    }>();

    if (!sale) {
      return c.json<APIResponse>({
        success: false,
        error: 'Order not found',
      }, 404);
    }

    // Extraer Wompi Payment Link ID de las notas
    const wompiLinkMatch = sale.notes?.match(/Wompi Payment Link ID: (.+)/);
    const wompiLinkId = wompiLinkMatch ? wompiLinkMatch[1].trim() : null;

    return c.json<APIResponse>({
      success: true,
      data: {
        order: {
          id: sale.id,
          sale_number: sale.sale_number,
          total: sale.total,
          status: sale.status,
          payment_status: sale.payment_status,
          amount_paid: sale.amount_paid,
          amount_pending: sale.amount_pending,
          created_at: sale.created_at,
        },
        wompi_link_id: wompiLinkId,
        notes: sale.notes,
      },
    });

  } catch (error: any) {
    console.error('Error checking order status:', error);
    return c.json<APIResponse>({
      success: false,
      error: error.message || 'Failed to check order status',
    }, 500);
  }
});

export default app;
