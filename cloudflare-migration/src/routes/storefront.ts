/**
 * Storefront API Routes
 * Gestiona la configuración pública de tiendas y catálogo de productos
 */

import { Hono } from 'hono';
import type { Env, Tenant, APIResponse } from '../types';
import { TenantDB, generateId } from '../utils/db-helpers';
import { findActiveStore, type StoreAccessRow } from '../utils/storefront-access';
import { escapeTelegramHtml, getTenantChatIds, sendToChats } from '../utils/telegram';

const app = new Hono<{ Bindings: Env }>();

interface StoreConfig {
  id: string;
  store_slug?: string;
  store_name?: string;
  store_description?: string;
  store_logo_url?: string;
  store_banner_url?: string;
  store_banner_images?: string;
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
  payment_qr_url?: string;
  store_maps_url?: string;
}

// GET /api/storefront/config/:slug - Obtener configuración pública de una tienda por slug
app.get('/config/:slug', async (c) => {
  const slug = c.req.param('slug');

  try {
    // Buscar tienda por slug (validando suscripción/addon)
    const store = await findActiveStore<StoreAccessRow & StoreConfig>(
      c.env.DB,
      slug,
      `store_slug, store_name, store_description,
       store_logo_url, store_banner_url, store_banner_images,
       store_primary_color, store_secondary_color,
       store_whatsapp, store_facebook, store_instagram,
       store_address, store_city, store_phone, store_email,
       store_enabled, store_terms,
       store_shipping_enabled, store_pickup_enabled, store_min_order,
       store_nequi_number, payment_qr_url, store_maps_url`
    );

    if (!store) {
      return c.json<APIResponse>({
        success: false,
        error: 'Store not found or disabled',
      }, 404);
    }

    // No exponer los campos de suscripción en la respuesta pública
    const {
      is_superadmin: _sa,
      subscription_status: _ss,
      trial_end_date: _te,
      has_store_addon: _ha,
      store_addon_expires_at: _ae,
      ...config
    } = store;

    return c.json<APIResponse<StoreConfig>>({
      success: true,
      data: config as StoreConfig,
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
    const store = await findActiveStore(c.env.DB, slug);

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

    if (category === '__uncategorized__') {
      // Productos sin categoría real (nula o apuntando a una inexistente).
      query += ` AND (
        p.category_id IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM categories c2
          WHERE c2.id = p.category_id AND c2.tenant_id = p.tenant_id
        )
      )`;
    } else if (category) {
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
    const store = await findActiveStore(c.env.DB, slug);

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
    const store = await findActiveStore(c.env.DB, slug);

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

    const categories = (result.results || []) as any[];

    // Categoría virtual "Sin categoría": agrupa los productos disponibles que
    // no tienen category_id (o apuntan a una categoría inexistente). Sin esto,
    // esos productos aparecen en "Todos los productos" pero no suman en ninguna
    // categoría, dejando el conteo total incoherente con la barra lateral.
    const uncategorized = await c.env.DB.prepare(
      `SELECT COUNT(*) as product_count
       FROM products p
       WHERE p.tenant_id = ?
         AND p.stock > 0
         AND (
           p.category_id IS NULL
           OR NOT EXISTS (
             SELECT 1 FROM categories c
             WHERE c.id = p.category_id AND c.tenant_id = p.tenant_id
           )
         )`
    )
      .bind(store.id)
      .first<{ product_count: number }>();

    const uncategorizedCount = uncategorized?.product_count ?? 0;
    if (uncategorizedCount > 0) {
      categories.push({
        id: '__uncategorized__',
        name: 'Sin categoría',
        description: null,
        product_count: uncategorizedCount,
      });
    }

    return c.json<APIResponse>({
      success: true,
      data: categories,
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
    const store = await findActiveStore<
      StoreAccessRow & {
        store_name?: string;
        store_whatsapp?: string;
        epayco_enabled: number;
        telegram_chat_id?: string | null;
        telegram_enabled?: number;
      }
    >(c.env.DB, slug, 'store_name, store_whatsapp, epayco_enabled, telegram_chat_id, telegram_enabled');

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

    // Avisar al tendero (y destinatarios adicionales) por Telegram del pedido
    // nuevo. No bloquea la respuesta: si Telegram falla, el pedido igual queda
    // creado. El pago sigue siendo manual — este aviso solo evita el punto
    // ciego de no enterarse de que entró un pedido.
    if (store.telegram_enabled && c.env.TELEGRAM_BOT_TOKEN) {
      const deliveryText =
        body.delivery_method === 'pickup'
          ? '🏪 Recogida en tienda'
          : `🛵 Envío a domicilio${body.delivery_address ? `\n📍 ${escapeTelegramHtml(body.delivery_address)}` : ''}`;

      const itemsText = body.items
        .map((it: any) => `• ${escapeTelegramHtml(it.product_name)} x${it.quantity}`)
        .join('\n');

      const msg =
        `🛒 <b>Nuevo pedido web</b>\n\n` +
        `<b>Pedido:</b> ${orderNumber}\n` +
        `<b>Cliente:</b> ${escapeTelegramHtml(body.customer_name)}\n` +
        `<b>Teléfono:</b> ${escapeTelegramHtml(body.customer_phone)}\n\n` +
        `${itemsText}\n\n` +
        `${deliveryText}\n` +
        `<b>Total:</b> $${Math.round(total).toLocaleString('es-CO')}\n\n` +
        `⚠️ Pendiente de pago. El cliente enviará su comprobante de Nequi por WhatsApp.`;

      const chatIds = await getTenantChatIds(c.env.DB, store.id, store.telegram_chat_id ?? null);
      c.executionCtx.waitUntil(sendToChats(chatIds, msg, c.env.TELEGRAM_BOT_TOKEN));
    }

    // Retornar pedido creado
    return c.json<APIResponse>({
      success: true,
      data: {
        order_id: saleData.id,
        order_number: orderNumber,
        total: total,
        store_whatsapp: store.store_whatsapp,
        epayco_enabled: !!store.epayco_enabled,
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
    const store = await findActiveStore(c.env.DB, slug);

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
    const store = await findActiveStore<
      StoreAccessRow & { wompi_public_key?: string; wompi_private_key?: string; wompi_enabled: number }
    >(c.env.DB, slug, 'wompi_public_key, wompi_private_key, wompi_enabled');

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
    const redirectUrl = `https://posib.dev/store/${slug}/payment-confirmation`;

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

// POST /api/storefront/auth/register/:slug - Registrar usuario en tienda
app.post('/auth/register/:slug', async (c) => {
  const slug = c.req.param('slug');

  try {
    const body = await c.req.json<{
      name: string;
      email: string;
      password: string;
      phone?: string;
    }>();

    const { name, email, password, phone } = body;

    // Validar campos requeridos
    if (!slug || !name || !email || !password) {
      return c.json<APIResponse>({
        success: false,
        error: 'Faltan campos requeridos',
      }, 400);
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return c.json<APIResponse>({
        success: false,
        error: 'Correo electrónico inválido',
      }, 400);
    }

    // Validar contraseña
    if (password.length < 6) {
      return c.json<APIResponse>({
        success: false,
        error: 'La contraseña debe tener al menos 6 caracteres',
      }, 400);
    }

    // Verificar que la tienda existe y está activa
    const store = await findActiveStore(c.env.DB, slug);
    if (!store) {
      return c.json<APIResponse>({
        success: false,
        error: 'Tienda no encontrada',
      }, 404);
    }

    // Verificar que el email no esté ya registrado en esta tienda
    const existing = await c.env.DB.prepare(
      `SELECT id FROM storefront_users WHERE tenant_id = ? AND email = ?`
    )
      .bind(store.id, email)
      .first();

    if (existing) {
      return c.json<APIResponse>({
        success: false,
        error: 'Este correo ya está registrado en la tienda',
      }, 400);
    }

    // Hash de la contraseña usando SubtleCrypto (Web Crypto API)
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 10000,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );

    const hashArray = Array.from(new Uint8Array(derivedBits));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    const passwordHash = `${saltHex}:${hashHex}`;

    const userId = generateId('storefront_user');

    // Insertar usuario
    await c.env.DB.prepare(
      `INSERT INTO storefront_users (id, tenant_id, email, name, phone, password_hash, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    )
      .bind(userId, store.id, email, name, phone || null, passwordHash)
      .run();

    return c.json<APIResponse>({
      success: true,
      data: {
        id: userId,
        email,
        name,
        createdAt: new Date().toISOString(),
      },
    }, 201);
  } catch (error: any) {
    console.error('Register error:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Error al registrarse',
    }, 500);
  }
});

// POST /api/storefront/auth/login/:slug - Iniciar sesión en tienda
app.post('/auth/login/:slug', async (c) => {
  const slug = c.req.param('slug');

  try {
    const body = await c.req.json<{
      email: string;
      password: string;
    }>();

    const { email, password } = body;

    // Validar campos requeridos
    if (!slug || !email || !password) {
      return c.json<APIResponse>({
        success: false,
        error: 'Faltan campos requeridos',
      }, 400);
    }

    // Verificar que la tienda existe y está activa
    const store = await findActiveStore(c.env.DB, slug);
    if (!store) {
      return c.json<APIResponse>({
        success: false,
        error: 'Tienda no encontrada',
      }, 404);
    }

    // Buscar usuario
    const user = await c.env.DB.prepare(
      `SELECT id, email, name, phone, password_hash, created_at FROM storefront_users WHERE tenant_id = ? AND email = ?`
    )
      .bind(store.id, email)
      .first<{
        id: string;
        email: string;
        name: string;
        phone?: string;
        password_hash: string;
        created_at: string;
      }>();

    if (!user) {
      return c.json<APIResponse>({
        success: false,
        error: 'Correo o contraseña incorrectos',
      }, 401);
    }

    // Verificar contraseña
    const [saltHex, hash] = user.password_hash.split(':');
    const salt = new Uint8Array(
      saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );

    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 10000,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );

    const hashArray = Array.from(new Uint8Array(derivedBits));
    const verifyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (hash !== verifyHash) {
      return c.json<APIResponse>({
        success: false,
        error: 'Correo o contraseña incorrectos',
      }, 401);
    }

    return c.json<APIResponse>({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.created_at,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Error al iniciar sesión',
    }, 500);
  }
});

// GET /api/storefront/stats/:slug/users - Obtener estadísticas de usuarios registrados
app.get('/stats/:slug/users', async (c) => {
  const slug = c.req.param('slug');

  try {
    // Verificar que la tienda existe y está activa
    const store = await findActiveStore(c.env.DB, slug);
    if (!store) {
      return c.json<APIResponse>({
        success: false,
        error: 'Tienda no encontrada',
      }, 404);
    }

    // Obtener estadísticas de usuarios
    const stats = await c.env.DB.prepare(
      `SELECT
        COUNT(*) as total_users,
        COUNT(CASE WHEN DATE(created_at) = DATE('now') THEN 1 END) as today_users,
        COUNT(CASE WHEN DATE(created_at) >= DATE('now', '-7 days') THEN 1 END) as week_users,
        COUNT(CASE WHEN DATE(created_at) >= DATE('now', '-30 days') THEN 1 END) as month_users
       FROM storefront_users
       WHERE tenant_id = ?`
    )
      .bind(store.id)
      .first<{
        total_users: number;
        today_users: number;
        week_users: number;
        month_users: number;
      }>();

    // Obtener registros por día en los últimos 30 días
    const registrationsByDay = await c.env.DB.prepare(
      `SELECT
        DATE(created_at) as date,
        COUNT(*) as count
       FROM storefront_users
       WHERE tenant_id = ? AND DATE(created_at) >= DATE('now', '-30 days')
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    )
      .bind(store.id)
      .all<{ date: string; count: number }>();

    return c.json<APIResponse>({
      success: true,
      data: {
        total_users: stats?.total_users || 0,
        today_users: stats?.today_users || 0,
        week_users: stats?.week_users || 0,
        month_users: stats?.month_users || 0,
        registrations_by_day: registrationsByDay.results || [],
      },
    });
  } catch (error: any) {
    console.error('Error fetching user stats:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Error al obtener estadísticas',
    }, 500);
  }
});

export default app;
