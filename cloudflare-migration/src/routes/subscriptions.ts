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
      const { id, status, reference, amount_in_cents, payment_method_type } = transaction;

      console.log(`📨 Processing transaction ${id} with status: ${status}`);

      // Extraer tenant_id del SKU
      // Formato: subscription_plan-basico_tenant123
      const sku = reference;
      const match = sku.match(/subscription_([^_]+)_(.+)/);

      if (!match) {
        console.error('❌ Invalid SKU format:', sku);
        return c.json({ received: true, error: 'Invalid SKU format' });
      }

      const planId = match[1];
      const tenantId = match[2];

      console.log(`📦 Plan: ${planId}, Tenant: ${tenantId}`);

      // Verificar si ya existe la transacción
      const existingTransaction = await c.env.DB.prepare(
        `SELECT id FROM payment_transactions WHERE wompi_transaction_id = ?`
      ).bind(id).first();

      // Crear o actualizar la transacción en el historial
      if (!existingTransaction) {
        const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const now = new Date().toISOString();

        await c.env.DB.prepare(
          `INSERT INTO payment_transactions (
            id, user_profile_id, wompi_transaction_id, amount, currency,
            status, payment_method_type, reference, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          transactionId,
          tenantId,
          id,
          amount_in_cents / 100,
          'COP',
          status,
          payment_method_type || 'unknown',
          reference,
          now
        ).run();

        console.log(`✅ Payment transaction created: ${transactionId}`);
      } else {
        // Actualizar estado de transacción existente
        await c.env.DB.prepare(
          `UPDATE payment_transactions SET status = ? WHERE wompi_transaction_id = ?`
        ).bind(status, id).run();

        console.log(`✅ Payment transaction updated: ${id}`);
      }

      // Solo procesar si el pago fue aprobado
      if (status === 'APPROVED') {
        // Calcular fechas de suscripción
        const now = new Date();
        const nextBillingDate = new Date(now);
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

        // Determinar qué activar según el plan
        let hasAIAddon = 0;
        let hasStoreAddon = 0;
        let hasEmailAddon = 0;

        if (planId === 'addon-ai-monthly') {
          hasAIAddon = 1;
        } else if (planId === 'addon-store-monthly') {
          hasStoreAddon = 1;
        } else if (planId === 'addon-email-monthly') {
          hasEmailAddon = 1;
        }

        // Actualizar suscripción del usuario
        if (planId === 'plan-basico') {
          // Plan completo
          await c.env.DB.prepare(
            `UPDATE user_profiles
             SET subscription_status = 'active',
                 plan_id = 'basic-monthly',
                 trial_start_date = NULL,
                 trial_end_date = NULL,
                 last_payment_date = ?,
                 next_billing_date = ?,
                 subscription_id = ?,
                 updated_at = ?
             WHERE id = ?`
          )
            .bind(
              now.toISOString(),
              nextBillingDate.toISOString(),
              id,
              now.toISOString(),
              tenantId
            )
            .run();

          console.log(`✅ Subscription activated for tenant ${tenantId}`);
        } else {
          // Solo addon
          await c.env.DB.prepare(
            `UPDATE user_profiles
             SET has_ai_addon = ?,
                 has_store_addon = ?,
                 has_email_addon = ?,
                 last_payment_date = ?,
                 next_billing_date = ?,
                 updated_at = ?
             WHERE id = ?`
          )
            .bind(
              hasAIAddon,
              hasStoreAddon,
              hasEmailAddon,
              now.toISOString(),
              nextBillingDate.toISOString(),
              now.toISOString(),
              tenantId
            )
            .run();

          console.log(`✅ Addon ${planId} activated for tenant ${tenantId}`);
        }
      }

      // Si el pago fue rechazado
      if (status === 'DECLINED' || status === 'ERROR') {
        console.log(`⚠️ Payment ${status} for tenant ${tenantId}`);
      }
    }

    return c.json({ received: true });

  } catch (error: any) {
    console.error('Error processing subscription webhook:', error);
    return c.json({ received: true, error: error.message });
  }
});

export default app;
