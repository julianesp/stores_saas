import { getBusinessTypeByPlanId } from './business-types';

/**
 * Activación de suscripción por pago de ePayco — fuente única de verdad.
 *
 * La usa DOS caminos, a propósito redundantes para que un pago aprobado SIEMPRE
 * habilite la cuenta al instante:
 *  1. El webhook de confirmación (/api/webhooks/epayco), disparado por ePayco.
 *  2. La página de retorno del checkout (payment-status), como red de seguridad
 *     por si el webhook no llega (ePayco no lo manda, timeout, etc.).
 *
 * Toda la lógica de fechas vive en el Worker (POST /api/user-profiles/:id/apply-payment),
 * que aplica el pago y registra la transacción en un solo batch e idempotente por
 * `payment_key`: si los dos caminos llegan a la vez, solo el primero suma el mes.
 * Pagar antes de vencer suma el mes al final del período en curso.
 *
 * IMPORTANTE: los IDs de plan deben coincidir con SUBSCRIPTION_PLANS (lib/epayco.ts).
 * El addon de tienda es 'addon-store-monthly'.
 */

const AI_ADDON = 'ai-addon-monthly';
const EMAIL_ADDON = 'email-addon-monthly';
const STORE_ADDON = 'addon-store-monthly';

export interface ActivateEPaycoParams {
  apiUrl: string;
  userProfileId: string;
  planId: string;
  /** Id de transacción de ePayco (x_transaction_id). */
  transactionId?: string;
  /** Referencia de ePayco (x_ref_payco); es la llave de idempotencia. */
  refPayco?: string;
  /** Monto pagado (x_amount). */
  amount?: string | number;
  /** Moneda (x_currency_code). Por defecto COP. */
  currency?: string;
  /** Factura interna (x_id_invoice), si viene. */
  invoice?: string;
}

function kindOfPlan(planId: string): 'plan' | 'store' | 'ai' | 'email' {
  if (planId === STORE_ADDON) return 'store';
  if (planId === AI_ADDON) return 'ai';
  if (planId === EMAIL_ADDON) return 'email';
  return 'plan';
}

/**
 * Aplica el pago aprobado al perfil (vía Worker). Devuelve `true` si el perfil
 * quedó al día, incluso si el pago ya se había aplicado antes. Lanza si el Worker
 * falla, para que el webhook responda 500 y ePayco reintente.
 */
export async function activateEPaycoPayment(params: ActivateEPaycoParams): Promise<boolean> {
  const { apiUrl, userProfileId, planId } = params;
  const secret = process.env.CRON_SECRET || '';

  const kind = kindOfPlan(planId);
  const paymentKey = params.refPayco
    ? `epayco-${params.refPayco}`
    : params.transactionId || `epayco-${Date.now()}`;

  const response = await fetch(`${apiUrl}/api/user-profiles/${userProfileId}/apply-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Secret': secret,
    },
    body: JSON.stringify({
      kind,
      plan_id: kind === 'plan' ? planId : undefined,
      business_type: kind === 'plan' ? getBusinessTypeByPlanId(planId)?.id : undefined,
      payment_key: paymentKey,
      amount: params.amount != null ? parseFloat(String(params.amount)) : 0,
      currency: params.currency || 'COP',
      reference: [params.invoice, params.transactionId && `tx ${params.transactionId}`, params.refPayco && `ref ${params.refPayco}`]
        .filter(Boolean)
        .join(' ') || null,
    }),
  });

  if (!response.ok) {
    console.error('activateEPaycoPayment: el Worker rechazó el pago:', response.status, await response.text());
    throw new Error(`No se pudo aplicar el pago al perfil ${userProfileId}: ${response.status}`);
  }

  return true;
}
