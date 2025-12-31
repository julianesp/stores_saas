/**
 * Webhooks API Routes
 * Procesa webhooks de servicios externos (Wompi, etc.)
 */

import { Hono } from 'hono';
import type { Env, APIResponse } from '../types';

const app = new Hono<{ Bindings: Env }>();

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

    // Procesar según el tipo de evento
    if (event.event === 'transaction.updated') {
      const transaction = event.data;
      const { id, status, reference, amount_in_cents, payment_method_type } = transaction;

      console.log(`🔄 Processing transaction ${id} with status: ${status}`);

      // Determinar el tipo de transacción según el reference
      // - Suscripciones: SUB-{primeros8chars}-{timestamp}
      // - Ventas web: WEB-{date}-{number}
      const referenceParts = reference.split('-');
      if (referenceParts.length < 2) {
        console.error('❌ Invalid reference format:', reference);
        return c.json<APIResponse>({
          success: false,
          error: 'Invalid reference format',
        }, 400);
      }

      const referenceType = referenceParts[0]; // 'SUB' o 'WEB'

      // 🛒 PROCESAR VENTA WEB
      if (referenceType === 'WEB') {
        console.log(`🛒 Processing web order: ${reference}`);

        // Buscar la venta por sale_number
        const sale = await c.env.DB.prepare(
          `SELECT id, tenant_id, total, status FROM sales WHERE sale_number = ?`
        ).bind(reference).first<{
          id: string;
          tenant_id: string;
          total: number;
          status: string;
        }>();

        if (!sale) {
          console.error('❌ Sale not found for reference:', reference);
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
              orderNumber: reference,
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
              orderNumber: reference,
              status: 'pendiente',
            },
          });
        }

        // Para estados pendientes, solo registrar
        console.log(`⏳ Web order ${reference} status is ${status}, waiting for completion`);

        return c.json<APIResponse>({
          success: true,
          message: 'Transaction recorded, awaiting completion',
          data: {
            saleId: sale.id,
            orderNumber: reference,
            transactionStatus: status,
          },
        });
      }

      // 💳 PROCESAR SUSCRIPCIÓN
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

        if (amountCOP === 29900) {
          planId = 'basic-monthly';
          hasAIAddon = false;
        } else if (amountCOP === 9900) {
          planId = 'ai-addon-monthly';
          hasAIAddon = true;
        } else if (amountCOP === 39800) {
          // Plan básico + IA addon
          planId = 'basic-monthly';
          hasAIAddon = true;
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
