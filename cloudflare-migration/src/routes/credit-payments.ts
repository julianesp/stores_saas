/**
 * Credit Payments Routes
 * Manejo de pagos de crédito
 */

import { Hono } from 'hono';
import { TenantDB, generateId } from '../utils/db-helpers';
import type { Tenant } from '../middleware/tenant-middleware';
import type { CreditPayment, Sale } from '../types';

const app = new Hono<{
  Variables: {
    tenant: Tenant;
  };
}>();

// ============================================================================
// GET /api/credit-payments/sale/:saleId - Get payment history for a sale
// ============================================================================
app.get('/sale/:saleId', async (c) => {
  const tenant: Tenant = c.get('tenant');
  const tenantDB = new TenantDB(c.env.DB, tenant.id);
  const saleId = c.req.param('saleId');

  try {
    // Get all payments for this sale, ordered by creation date
    const payments = await tenantDB.raw<CreditPayment>(
      `SELECT * FROM credit_payments WHERE tenant_id = ? AND sale_id = ? ORDER BY created_at ASC`,
      [saleId]
    );

    return c.json({
      success: true,
      data: payments,
    });
  } catch (error: any) {
    console.error('Error fetching payment history:', error);
    return c.json(
      {
        success: false,
        error: error.message || 'Error al obtener historial de pagos',
      },
      500
    );
  }
});

// ============================================================================
// GET /api/credit-payments/customer/:customerId - Get all payments for a customer
// ============================================================================
app.get('/customer/:customerId', async (c) => {
  const tenant: Tenant = c.get('tenant');
  const tenantDB = new TenantDB(c.env.DB, tenant.id);
  const customerId = c.req.param('customerId');

  try {
    const payments = await tenantDB.raw<CreditPayment>(
      `SELECT * FROM credit_payments WHERE tenant_id = ? AND customer_id = ? ORDER BY created_at DESC`,
      [customerId]
    );

    return c.json({
      success: true,
      data: payments,
    });
  } catch (error: any) {
    console.error('Error fetching customer payments:', error);
    return c.json(
      {
        success: false,
        error: error.message || 'Error al obtener pagos del cliente',
      },
      500
    );
  }
});

// ============================================================================
// POST /api/credit-payments - Register a new credit payment
// ============================================================================
app.post('/', async (c) => {
  const tenant: Tenant = c.get('tenant');
  const tenantDB = new TenantDB(c.env.DB, tenant.id);

  try {
    const body = await c.req.json();
    const {
      sale_id,
      customer_id,
      amount,
      payment_method,
      cashier_id,
      notes,
    } = body;

    // Validate required fields
    if (!sale_id || !customer_id || !amount || !payment_method || !cashier_id) {
      return c.json(
        {
          success: false,
          error: 'Faltan campos requeridos: sale_id, customer_id, amount, payment_method, cashier_id',
        },
        400
      );
    }

    // Get the sale
    const sale = await tenantDB.getById<Sale>('sales', sale_id);
    if (!sale) {
      return c.json(
        {
          success: false,
          error: 'Venta no encontrada',
        },
        404
      );
    }

    // Calculate new amounts
    const currentAmountPaid = sale.amount_paid || 0;
    const newAmountPaid = currentAmountPaid + amount;
    const newAmountPending = sale.total - newAmountPaid;

    // Determine payment status
    let paymentStatus: 'pendiente' | 'parcial' | 'pagado';
    if (newAmountPending <= 0) {
      paymentStatus = 'pagado';
    } else if (newAmountPaid > 0 && newAmountPending < sale.total) {
      paymentStatus = 'parcial';
    } else {
      paymentStatus = 'pendiente';
    }

    // Create credit payment record
    const creditPaymentId = generateId('pay');
    const creditPayment: CreditPayment = {
      id: creditPaymentId,
      tenant_id: tenant.id,
      sale_id,
      customer_id,
      amount,
      payment_method,
      cashier_id,
      notes: notes || undefined,
      created_at: new Date().toISOString(),
    };

    await tenantDB.insert('credit_payments', creditPayment);

    // Update sale with new amounts and status
    await tenantDB.update('sales', sale_id, {
      amount_paid: newAmountPaid,
      amount_pending: newAmountPending,
      payment_status: paymentStatus,
    });

    // Update customer debt (reduce by payment amount)
    const customer = await tenantDB.getById('customers', customer_id);
    if (customer) {
      const currentDebt = (customer.current_debt as number) || 0;
      await tenantDB.update('customers', customer_id, {
        current_debt: Math.max(0, currentDebt - amount),
      });
    }

    // Si la venta quedó completamente pagada, asignar puntos de lealtad
    let customerReachedRewardThreshold = false;
    let customerNewPoints = 0;

    if (paymentStatus === 'pagado' && sale.points_earned && sale.points_earned > 0) {
      if (customer) {
        const currentPoints = (customer.loyalty_points as number) || 0;
        const newPoints = currentPoints + sale.points_earned;

        await tenantDB.update('customers', customer_id, {
          loyalty_points: newPoints,
        });

        customerNewPoints = newPoints;

        // Verificar si alcanzó el umbral de 100 puntos para descuento
        const REWARD_THRESHOLD = 100; // REWARD_CONSTANTS.POINTS_FOR_DISCOUNT
        if (currentPoints < REWARD_THRESHOLD && newPoints >= REWARD_THRESHOLD) {
          customerReachedRewardThreshold = true;
          console.log(`🎉 Cliente ${customer_id} alcanzó ${REWARD_THRESHOLD} puntos y puede obtener descuento!`);
        }

        console.log(`Puntos asignados: ${sale.points_earned} puntos al cliente ${customer_id} por completar pago de venta ${sale_id}`);
      }
    }

    return c.json({
      success: true,
      data: {
        payment: creditPayment,
        sale: {
          id: sale_id,
          amount_paid: newAmountPaid,
          amount_pending: newAmountPending,
          payment_status: paymentStatus,
        },
        points_awarded: paymentStatus === 'pagado' && sale.points_earned ? sale.points_earned : 0,
        customer_reached_reward_threshold: customerReachedRewardThreshold,
        customer_new_points: customerNewPoints,
      },
    });
  } catch (error: any) {
    console.error('Error registering credit payment:', error);
    return c.json(
      {
        success: false,
        error: error.message || 'Error al registrar pago',
      },
      500
    );
  }
});

export default app;
