/**
 * Wompi Payment Integration Routes
 * Maneja la creación de payment links y webhooks para cada tenant
 */

import { Hono } from 'hono';
import type { Env, APIResponse, Tenant } from '../types';

const app = new Hono<{ Bindings: Env }>();

/**
 * POST /api/wompi/create-payment-link
 * Crear un payment link de Wompi para un pedido
 */
app.post('/create-payment-link', async (c) => {
  try {
    const tenant: Tenant = c.get('tenant');
    const body = await c.req.json();

    // Validar campos requeridos
    const { order_id, order_number, amount_in_cents, customer_email, customer_name } = body;

    if (!order_id || !order_number || !amount_in_cents) {
      return c.json<APIResponse<null>>({
        success: false,
        error: 'Missing required fields: order_id, order_number, amount_in_cents',
        data: null
      }, 400);
    }

    // Validar monto mínimo de Wompi (10,000 COP = 1,000,000 centavos)
    if (amount_in_cents < 1000000) {
      return c.json<APIResponse<null>>({
        success: false,
        error: 'El monto mínimo para pagos con Wompi es de $10,000 COP',
        data: null
      }, 400);
    }

    // Obtener credenciales de Wompi del perfil del usuario
    const userProfile = await c.env.DB.prepare(
      'SELECT wompi_public_key, wompi_private_key, wompi_enabled FROM user_profiles WHERE id = ?'
    )
      .bind(tenant.id)
      .first<{ wompi_public_key?: string; wompi_private_key?: string; wompi_enabled: number }>();

    if (!userProfile || !userProfile.wompi_enabled) {
      return c.json<APIResponse<null>>({
        success: false,
        error: 'Wompi no está activado para esta tienda',
        data: null
      }, 400);
    }

    if (!userProfile.wompi_private_key) {
      return c.json<APIResponse<null>>({
        success: false,
        error: 'Credenciales de Wompi no configuradas',
        data: null
      }, 400);
    }

    // Crear el payment link en Wompi
    const wompiResponse = await fetch('https://production.wompi.co/v1/payment_links', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userProfile.wompi_private_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `Pedido ${order_number}`,
        description: `Pago del pedido ${order_number}`,
        single_use: true, // Solo un pago por link
        collect_shipping: false, // Ya tenemos la info de envío
        currency: 'COP',
        amount_in_cents: amount_in_cents,
        redirect_url: body.redirect_url || undefined,
        expires_at: body.expires_at || undefined,
        sku: order_id, // Usamos el order_id como SKU para rastreo
      }),
    });

    if (!wompiResponse.ok) {
      const errorData = await wompiResponse.json().catch(() => ({}));
      console.error('Wompi API error:', errorData);
      return c.json<APIResponse<null>>({
        success: false,
        error: errorData.error?.reason || 'Error al crear el link de pago en Wompi',
        data: null
      }, 500);
    }

    const wompiData = await wompiResponse.json();

    // Construir la URL del checkout
    const checkoutUrl = `https://checkout.wompi.co/l/${wompiData.data.id}`;

    // Guardar la relación order -> payment_link en la base de datos
    // (Podrías crear una tabla payment_links si necesitas rastrear esto)
    await c.env.DB.prepare(
      `UPDATE sales
       SET notes = COALESCE(notes, '') || '\nWompi Payment Link ID: ' || ?
       WHERE id = ? AND tenant_id = ?`
    )
      .bind(wompiData.data.id, order_id, tenant.id)
      .run();

    return c.json<APIResponse<any>>({
      success: true,
      data: {
        payment_link_id: wompiData.data.id,
        checkout_url: checkoutUrl,
        expires_at: wompiData.data.expires_at,
      },
      message: 'Payment link created successfully'
    });

  } catch (error: any) {
    console.error('Error creating Wompi payment link:', error);
    return c.json<APIResponse<null>>({
      success: false,
      error: error.message || 'Failed to create payment link',
      data: null
    }, 500);
  }
});

/**
 * POST /api/wompi/webhook
 * Recibir notificaciones de Wompi sobre transacciones completadas
 * Documentación: https://docs.wompi.co/docs/en/eventos-webhook
 */
app.post('/webhook', async (c) => {
  try {
    const body = await c.req.json();

    console.log('Wompi webhook received:', JSON.stringify(body, null, 2));

    // Wompi envía eventos en el formato:
    // { event: 'transaction.updated', data: { ... }, sent_at: '...' }
    const { event, data, signature } = body;

    // TODO: Verificar signature del webhook para seguridad
    // https://docs.wompi.co/docs/en/eventos-webhook#verificar-integridad

    if (event === 'transaction.updated') {
      const transaction = data.transaction;

      // Solo procesar si el pago fue aprobado
      if (transaction.status === 'APPROVED') {
        // Buscar el pedido por el SKU (que es el order_id)
        const reference = transaction.reference;

        // Buscar venta por el payment_link_id en las notas
        const sale = await c.env.DB.prepare(
          `SELECT * FROM sales WHERE notes LIKE ?`
        )
          .bind(`%${reference}%`)
          .first<any>();

        if (sale) {
          // Actualizar el estado del pedido a "completada" y "pagado"
          await c.env.DB.prepare(
            `UPDATE sales
             SET status = 'completada',
                 payment_status = 'pagado',
                 amount_paid = total,
                 amount_pending = 0,
                 updated_at = datetime('now')
             WHERE id = ?`
          )
            .bind(sale.id)
            .run();

          console.log(`Order ${sale.id} marked as paid via Wompi webhook`);
        }
      }
    }

    // Wompi espera una respuesta 200 OK
    return c.json({ received: true });

  } catch (error: any) {
    console.error('Error processing Wompi webhook:', error);
    // Aún así retornar 200 para que Wompi no reintente
    return c.json({ received: true, error: error.message });
  }
});

export default app;
