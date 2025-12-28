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
        store_shipping_enabled, store_pickup_enabled, store_min_order
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
      'SELECT id, store_name, store_whatsapp FROM user_profiles WHERE store_slug = ? AND store_enabled = 1'
    )
      .bind(slug)
      .first<{ id: string; store_name?: string; store_whatsapp?: string }>();

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

    const total = subtotal - discount;

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
      payment_method: 'pendiente', // El pago se coordinará por WhatsApp
      status: 'pendiente', // Estado inicial del pedido
      points_earned: 0,
      notes: `Pedido web - Cliente: ${body.customer_name}\nTeléfono: ${body.customer_phone}\n${body.customer_email ? `Email: ${body.customer_email}\n` : ''}Entrega: ${body.delivery_method === 'pickup' ? 'Recogida en tienda' : 'Envío a domicilio'}\n${body.delivery_address ? `Dirección: ${body.delivery_address}\n` : ''}${body.notes ? `Notas: ${body.notes}` : ''}`,
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

    // Actualizar stock de productos
    for (const item of body.items) {
      const product = await tenantDB.getById<any>('products', item.product_id);
      if (product) {
        const newStock = product.stock - item.quantity;
        await tenantDB.update('products', item.product_id, {
          stock: newStock
        });
      }
    }

    // Retornar pedido creado
    return c.json<APIResponse>({
      success: true,
      data: {
        order_id: saleData.id,
        order_number: orderNumber,
        total: total,
        store_whatsapp: store.store_whatsapp,
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

export default app;
