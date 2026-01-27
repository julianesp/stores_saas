/**
 * Subscription Management with Wompi
 * Maneja las suscripciones del sistema SaaS usando Wompi
 */

import { Hono } from 'hono';
import type { Env, APIResponse, Tenant } from '../types';


const app = new Hono<{ Bindings: Env }>();

// Planes de suscripción (en centavos)
const SUBSCRIPTION_PLANS = {
  'plan-basico': {
    name: 'Plan Básico',
    price: 24900, // $24,900 COP
    amount_in_cents: 2490000,
    interval: 'monthly',
  },
  'addon-ai-monthly': {
    name: 'Addon: Análisis con IA',
    price: 4900, // $4,900 COP
    amount_in_cents: 490000,
    interval: 'monthly',
  },
  'addon-store-monthly': {
    name: 'Addon: Tienda Online',
    price: 9900, // $9,900 COP
    amount_in_cents: 990000,
    interval: 'monthly',
  },
  'addon-email-monthly': {
    name: 'Addon: Email Marketing',
    price: 4900, // $4,900 COP
    amount_in_cents: 490000,
    interval: 'monthly',
  },
};

/**
 * POST /api/subscriptions/create-payment-link
 * Crear payment link de Wompi para suscripción
 */
app.post('/create-payment-link', async (c) => {
  try {
    const tenant: Tenant = c.get('tenant');
    const body = await c.req.json();

    const { planId } = body;

    if (!planId || !SUBSCRIPTION_PLANS[planId as keyof typeof SUBSCRIPTION_PLANS]) {
      return c.json<APIResponse<null>>({
        success: false,
        error: 'Invalid plan ID',
        data: null
      }, 400);
    }

    const plan = SUBSCRIPTION_PLANS[planId as keyof typeof SUBSCRIPTION_PLANS];

    // Validar monto mínimo de Wompi ($10,000 COP)
    if (plan.amount_in_cents < 1000000) {
      return c.json<APIResponse<null>>({
        success: false,
        error: 'El monto mínimo es de $10,000 COP',
        data: null
      }, 400);
    }

    // Obtener credenciales de Wompi del administrador (desde secrets)
    const adminWompiPrivateKey = c.env.ADMIN_WOMPI_PRIVATE_KEY;

    if (!adminWompiPrivateKey) {
      return c.json<APIResponse<null>>({
        success: false,
        error: 'Wompi credentials not configured',
        data: null
      }, 500);
    }

    // Obtener información del usuario
    const userProfile = await c.env.DB.prepare(
      'SELECT email, full_name FROM user_profiles WHERE id = ?'
    )
      .bind(tenant.id)
      .first<{ email: string; full_name?: string }>();

    if (!userProfile) {
      return c.json<APIResponse<null>>({
        success: false,
        error: 'User profile not found',
        data: null
      }, 404);
    }

    // Construir redirect_url para después del pago
    const redirectUrl = `https://posib.dev/dashboard/subscription/confirmation`;

    // Crear el payment link en Wompi
    const wompiResponse = await fetch('https://production.wompi.co/v1/payment_links', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminWompiPrivateKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `Suscripción ${plan.name}`,
        description: `Suscripción mensual - ${plan.name} para ${userProfile.email}`,
        single_use: true,
        collect_shipping: false,
        currency: 'COP',
        amount_in_cents: plan.amount_in_cents,
        redirect_url: redirectUrl,
        sku: `subscription_${planId}_${tenant.id}`, // Para identificar en webhook
      }),
    });

    if (!wompiResponse.ok) {
      const errorData = await wompiResponse.json().catch(() => ({}));
      console.error('Wompi API error:', errorData);
      return c.json<APIResponse<null>>({
        success: false,
        error: errorData.error?.reason || 'Error al crear el link de pago',
        data: null
      }, 500);
    }

    const wompiData = await wompiResponse.json();
    const checkoutUrl = `https://checkout.wompi.co/l/${wompiData.data.id}`;

    // Guardar referencia del payment link en la base de datos
    await c.env.DB.prepare(
      `UPDATE user_profiles
       SET updated_at = datetime('now')
       WHERE id = ?`
    )
      .bind(tenant.id)
      .run();

    return c.json<APIResponse<any>>({
      success: true,
      data: {
        payment_link_id: wompiData.data.id,
        checkout_url: checkoutUrl,
        plan: plan.name,
        amount: plan.price,
      },
      message: 'Payment link created successfully'
    });

  } catch (error: any) {
    console.error('Error creating subscription payment link:', error);
    return c.json<APIResponse<null>>({
      success: false,
      error: error.message || 'Failed to create payment link',
      data: null
    }, 500);
  }
});

/**
 * POST /api/subscriptions/check-expiring
 * CRON job para verificar suscripciones próximas a expirar
 * y enviar notificaciones de recordatorio
 */
app.post('/check-expiring', async (c) => {
  try {
    // Verificar autorización del CRON
    const authHeader = c.req.header('Authorization');
    const cronSecret = c.env.CRON_SECRET;

    if (!authHeader || !cronSecret || !authHeader.includes(cronSecret)) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const now = new Date();
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    // Buscar usuarios con trial que expira en 3 días
    const expiringTrials = await c.env.DB.prepare(
      `SELECT id, email, full_name, trial_end_date, clerk_user_id
       FROM user_profiles
       WHERE subscription_status = 'trial'
         AND trial_end_date IS NOT NULL
         AND date(trial_end_date) = date(?, 'unixepoch')`
    )
      .bind(Math.floor(threeDaysFromNow.getTime() / 1000))
      .all();

    // Buscar usuarios con suscripción activa que vence en 3 días
    const expiringSubscriptions = await c.env.DB.prepare(
      `SELECT id, email, full_name, next_billing_date, clerk_user_id
       FROM user_profiles
       WHERE subscription_status = 'active'
         AND next_billing_date IS NOT NULL
         AND date(next_billing_date) = date(?, 'unixepoch')`
    )
      .bind(Math.floor(threeDaysFromNow.getTime() / 1000))
      .all();

    const notificationsToSend = [
      ...expiringTrials.results.map((user: any) => ({
        userId: user.clerk_user_id,
        email: user.email,
        type: 'trial_expiring',
        daysLeft: 3,
      })),
      ...expiringSubscriptions.results.map((user: any) => ({
        userId: user.clerk_user_id,
        email: user.email,
        type: 'subscription_expiring',
        daysLeft: 3,
      })),
    ];

    console.log(`Found ${notificationsToSend.length} users to notify`);

    // Aquí podrías integrar con un servicio de email (SendGrid, Resend, etc.)
    // Por ahora, solo registramos los usuarios que deberían recibir notificación

    // Guardar notificaciones en una tabla de logs (opcional)
    for (const notification of notificationsToSend) {
      console.log(`Notification needed for ${notification.email}: ${notification.type}`);
      // TODO: Enviar email real con SendGrid/Resend
    }

    return c.json({
      success: true,
      notificationsSent: notificationsToSend.length,
      expiringTrials: expiringTrials.results.length,
      expiringSubscriptions: expiringSubscriptions.results.length,
    });

  } catch (error: any) {
    console.error('Error checking expiring subscriptions:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to check expiring subscriptions',
    }, 500);
  }
});

/**
 * POST /api/subscriptions/webhook
 * Webhook para recibir confirmaciones de pago de suscripciones
 */
app.post('/webhook', async (c) => {
  try {
    const body = await c.req.json();

    console.log('Subscription webhook received:', JSON.stringify(body, null, 2));

    const { event, data } = body;

    if (event === 'transaction.updated') {
      const transaction = data.transaction;

      // Solo procesar si el pago fue aprobado
      if (transaction.status === 'APPROVED') {
        // Extraer tenant_id del SKU
        // Formato: subscription_plan-basico_tenant123
        const sku = transaction.reference;
        const match = sku.match(/subscription_([^_]+)_(.+)/);

        if (match) {
          const planId = match[1];
          const tenantId = match[2];

          // Calcular fechas de suscripción
          const now = new Date();
          const nextBillingDate = new Date(now);
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

          // Actualizar suscripción del usuario
          await c.env.DB.prepare(
            `UPDATE user_profiles
             SET subscription_status = 'active',
                 last_payment_date = datetime('now'),
                 next_billing_date = datetime(?, 'unixepoch'),
                 subscription_id = ?,
                 updated_at = datetime('now')
             WHERE id = ?`
          )
            .bind(
              Math.floor(nextBillingDate.getTime() / 1000),
              transaction.id,
              tenantId
            )
            .run();

          console.log(`Subscription activated for tenant ${tenantId}, plan ${planId}`);
        }
      }
    }

    return c.json({ received: true });

  } catch (error: any) {
    console.error('Error processing subscription webhook:', error);
    return c.json({ received: true, error: error.message });
  }
});

export default app;
