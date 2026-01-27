/**
 * Webhooks API Routes
 * Procesa webhooks de servicios externos (Wompi, etc.)
 */

import { Hono } from 'hono';
import type { Env, APIResponse } from '../types';

const app = new Hono<{ Bindings: Env }>();

// GET /api/webhooks/wompi/config - Debug endpoint para verificar configuración
app.get('/wompi/config', async (c) => {
  try {
    return c.json<APIResponse>({
      success: true,
      data: {
        webhook_url: 'https://tienda-pos-api.julian-mendieta24.workers.dev/api/webhooks/wompi',
        expected_secret: c.env.WOMPI_EVENTS_SECRET || 'prod_events_QqwC3D3DQxyCyvjMo1O4VFRIT6DaJ2ZZ',
        wompi_public_key: c.env.WOMPI_PUBLIC_KEY ? 'configurada' : 'NO configurada',
        wompi_private_key: c.env.WOMPI_PRIVATE_KEY ? 'configurada' : 'NO configurada',
        instructions: 'Configure este webhook URL en Wompi Dashboard: Settings > API Keys > Eventos',
      },
    });
  } catch (error: any) {
    return c.json<APIResponse>({
      success: false,
      error: error.message,
    }, 500);
  }
});

// POST /api/webhooks/wompi - Procesar webhook de Wompi
app.post('/wompi', async (c) => {
  try {
    const webhookSecret = c.req.header('X-Webhook-Secret');
    const expectedSecret = c.env.WOMPI_EVENTS_SECRET || 'prod_events_QqwC3D3DQxyCyvjMo1O4VFRIT6DaJ2ZZ';

    // Verificar el secret del webhook
    if (webhookSecret !== expectedSecret) {
      console.error('❌ Invalid webhook secret');
      return c.json<APIResponse>({
        success: false,
        error: 'Invalid webhook secret',
      }, 401);
    }

    const event = await c.req.json();

    console.log('📨 Wompi webhook event received:', event.event);
    console.log('Transaction data:', event.data);

    // 🔄 REENVIAR EVENTO A NEURAI.DEV
    // Neurai.dev ya tiene configurado este webhook y debe seguir funcionando
    try {
      console.log('📤 Forwarding event to Neurai.dev...');
      const neuraiResponse = await fetch('https://neurai.dev/api/payments/confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': expectedSecret,
        },
        body: JSON.stringify(event),
      });

      if (neuraiResponse.ok) {
        console.log('✅ Event forwarded to Neurai.dev successfully');
      } else {
        console.warn(`⚠️ Failed to forward to Neurai.dev: ${neuraiResponse.status}`);
      }
    } catch (error) {
      console.error('❌ Error forwarding to Neurai.dev:', error);
      // No fallar si Neurai no responde, continuar procesando para tienda-pos
    }

    // Procesar según el tipo de evento
    if (event.event === 'transaction.updated') {
      const transaction = event.data.transaction;
      const { id, status, reference, amount_in_cents, payment_method_type, payment_link_id } = transaction;

      console.log(`🔄 Processing transaction ${id} with status: ${status}`);
      console.log(`Reference: ${reference}, Payment Link ID: ${payment_link_id}`);

      // Si la transacción viene de un payment link, buscar por el SKU en lugar del reference
      if (payment_link_id) {
        console.log(`💳 Transaction from payment link: ${payment_link_id}`);

        // Obtener información del payment link para obtener el SKU (order_id)
        const paymentLink = event.data.payment_link;
        const sku = paymentLink?.sku;

        if (!sku) {
          console.error('❌ Payment link has no SKU');
          return c.json<APIResponse>({
            success: false,
            error: 'Payment link has no SKU',
          }, 400);
        }

        console.log(`🛒 Processing web order with SKU: ${sku}`);

        // Buscar la venta por ID (el SKU contiene el order_id)
        const sale = await c.env.DB.prepare(
          `SELECT id, tenant_id, total, status, sale_number FROM sales WHERE id = ?`
        ).bind(sku).first<{
          id: string;
          tenant_id: string;
          total: number;
          status: string;
          sale_number: string;
        }>();

        if (!sale) {
          console.error('❌ Sale not found for SKU:', sku);
          return c.json<APIResponse>({
            success: false,
            error: 'Sale not found',
          }, 404);
        }

        console.log(`✅ Found sale: ${sale.id} (${sale.status})`);

        // Si el pago fue aprobado, actualizar la venta a completada
        if (status === 'APPROVED') {
          const now = new Date().toISOString();

          // Actualizar estado de la venta
          await c.env.DB.prepare(
            `UPDATE sales
             SET status = 'completada',
                 payment_status = 'pagado',
                 amount_paid = ?,
                 amount_pending = 0,
                 notes = COALESCE(notes, '') || ?
             WHERE id = ? AND tenant_id = ?`
          ).bind(
            sale.total,
            `\nPago confirmado vía Wompi: ${id}\nMétodo: ${payment_method_type || 'desconocido'}\nFecha: ${now}`,
            sale.id,
            sale.tenant_id
          ).run();

          console.log(`✅ Sale ${sale.id} marked as completed and paid`);

          // Descontar inventario de los productos vendidos
          const saleItems = await c.env.DB.prepare(
            `SELECT product_id, quantity FROM sale_items WHERE sale_id = ? AND tenant_id = ?`
          ).bind(sale.id, sale.tenant_id).all<{ product_id: string; quantity: number }>();

          for (const item of saleItems.results) {
            await c.env.DB.prepare(
              `UPDATE products SET stock = stock - ? WHERE id = ? AND tenant_id = ?`
            ).bind(item.quantity, item.product_id, sale.tenant_id).run();
          }

          console.log(`✅ Inventory updated for ${saleItems.results.length} products`);

          return c.json<APIResponse>({
            success: true,
            message: 'Web order completed and inventory updated',
            data: {
              saleId: sale.id,
              orderNumber: sale.sale_number,
              status: 'completada',
            },
          });
        }

        // Si el pago fue rechazado, actualizar la venta
        if (status === 'DECLINED' || status === 'ERROR' || status === 'VOIDED') {
          await c.env.DB.prepare(
            `UPDATE sales
             SET notes = COALESCE(notes, '') || ?
             WHERE id = ? AND tenant_id = ?`
          ).bind(
            `\nPago rechazado/error en Wompi: ${id}\nEstado: ${status}\nFecha: ${new Date().toISOString()}`,
            sale.id,
            sale.tenant_id
          ).run();

          console.log(`⚠️ Sale ${sale.id} payment declined/error`);

          return c.json<APIResponse>({
            success: true,
            message: 'Payment declined for web order',
            data: {
              saleId: sale.id,
              orderNumber: sale.sale_number,
              status: 'pendiente',
            },
          });
        }

        // Para estados pendientes, solo registrar
        console.log(`⏳ Web order ${sale.sale_number} status is ${status}, waiting for completion`);

        return c.json<APIResponse>({
          success: true,
          message: 'Transaction recorded, awaiting completion',
          data: {
            saleId: sale.id,
            orderNumber: sale.sale_number,
            transactionStatus: status,
          },
        });
      }

      // 💳 PROCESAR SUSCRIPCIÓN (transacciones directas, no de payment links)
      // Determinar el tipo de transacción según el reference
      // - Suscripciones: SUB-{primeros8chars}-{timestamp}
      const referenceParts = reference.split('-');
      if (referenceParts.length < 2 || referenceParts[0] !== 'SUB') {
        console.error('❌ Invalid reference format for subscription:', reference);
        return c.json<APIResponse>({
          success: true,
          message: 'Transaction received but not processed (unknown type)',
        });
      }

      const userIdPrefix = referenceParts[1]; // Primeros 8 caracteres del user_profile_id

      // Buscar el user_profile
      const userProfileResult = await c.env.DB.prepare(
        `SELECT id, email, subscription_status FROM user_profiles WHERE id LIKE ?`
      ).bind(`${userIdPrefix}%`).first<{
        id: string;
        email: string;
        subscription_status: string;
      }>();

      if (!userProfileResult) {
        console.error('❌ User profile not found for reference:', reference);
        return c.json<APIResponse>({
          success: false,
          error: 'User profile not found',
        }, 404);
      }

      console.log(`✅ Found user profile: ${userProfileResult.id} (${userProfileResult.email})`);

      // Verificar si ya existe la transacción
      const existingTransaction = await c.env.DB.prepare(
        `SELECT id FROM payment_transactions WHERE wompi_transaction_id = ?`
      ).bind(id).first();

      // Crear o actualizar la transacción
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
          userProfileResult.id,
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

      // Si el pago fue aprobado, activar la suscripción
      if (status === 'APPROVED') {
        const now = new Date();
        const nextBillingDate = new Date(now);
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

        // Determinar el plan basado en el monto
        const amountCOP = amount_in_cents / 100;
        let planId = 'basic-monthly';
        let hasAIAddon = false;
        let hasStoreAddon = false;
        let hasEmailAddon = false;

        // Plan básico
        if (amountCOP === 24900) {
          planId = 'basic-monthly';
        }
        // Addon IA solo
        else if (amountCOP === 4900) {
          planId = 'ai-addon-monthly';
          hasAIAddon = true;
        }
        // Addon Tienda solo
        else if (amountCOP === 9900) {
          planId = 'store-addon-monthly';
          hasStoreAddon = true;
        }
        // Plan básico + IA addon (24900 + 4900 = 29800)
        else if (amountCOP === 29800) {
          planId = 'basic-monthly';
          hasAIAddon = true;
        }
        // Plan básico + Tienda (24900 + 9900 = 34800)
        else if (amountCOP === 34800) {
          planId = 'basic-monthly';
          hasStoreAddon = true;
        }
        // Plan básico + Email (24900 + 4900 = 29800)
        else if (amountCOP === 29800) {
          planId = 'basic-monthly';
          hasEmailAddon = true;
        }

        await c.env.DB.prepare(
          `UPDATE user_profiles SET
            subscription_status = 'active',
            plan_id = ?,
            has_ai_addon = ?,
            last_payment_date = ?,
            next_billing_date = ?,
            trial_start_date = NULL,
            trial_end_date = NULL,
            updated_at = ?
          WHERE id = ?`
        ).bind(
          planId,
          hasAIAddon ? 1 : 0,
          now.toISOString(),
          nextBillingDate.toISOString(),
          now.toISOString(),
          userProfileResult.id
        ).run();

        console.log(`✅ Subscription activated for user: ${userProfileResult.id} with plan: ${planId}`);

        return c.json<APIResponse>({
          success: true,
          message: 'Subscription activated successfully',
          data: {
            userId: userProfileResult.id,
            planId,
            hasAIAddon,
          },
        });
      }

      // Si el pago fue declinado o tiene error, marcar como expirado
      if (status === 'DECLINED' || status === 'ERROR' || status === 'VOIDED') {
        await c.env.DB.prepare(
          `UPDATE user_profiles SET
            subscription_status = 'expired',
            updated_at = ?
          WHERE id = ?`
        ).bind(new Date().toISOString(), userProfileResult.id).run();

        console.log(`⚠️  Subscription marked as expired for user: ${userProfileResult.id}`);

        return c.json<APIResponse>({
          success: true,
          message: 'Subscription marked as expired',
          data: {
            userId: userProfileResult.id,
            status: 'expired',
          },
        });
      }

      // Para estados pendientes, solo registrar la transacción
      console.log(`⏳ Transaction status is ${status}, waiting for completion`);

      return c.json<APIResponse>({
        success: true,
        message: 'Transaction recorded, awaiting completion',
        data: {
          userId: userProfileResult.id,
          transactionStatus: status,
        },
      });
    }

    // Otros eventos no manejados
    return c.json<APIResponse>({
      success: true,
      message: 'Event received but not processed',
    });

  } catch (error) {
    console.error('❌ Error processing Wompi webhook:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

export default app;
