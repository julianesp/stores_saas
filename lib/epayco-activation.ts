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
 * Es IDEMPOTENTE: si el webhook ya activó, volver a activar desde el retorno solo
 * reescribe los mismos campos (estado activo + fecha de facturación a +1 mes). No
 * duplica cobros — solo refleja en el perfil lo que ePayco ya aprobó.
 *
 * IMPORTANTE: los IDs de plan deben coincidir con SUBSCRIPTION_PLANS (lib/epayco.ts).
 * El addon de tienda es 'addon-store-monthly'.
 */

// IDs de complementos de pago. Cualquier otro planId se trata como plan principal.
const AI_ADDON = 'ai-addon-monthly';
const EMAIL_ADDON = 'email-addon-monthly';
const STORE_ADDON = 'addon-store-monthly';

export interface ActivateEPaycoParams {
  apiUrl: string;
  userProfileId: string;
  planId: string;
  /** Id de transacción de ePayco (x_transaction_id), para el registro contable. */
  transactionId?: string;
  /** Referencia de ePayco (x_ref_payco), para rastrear el pago. */
  refPayco?: string;
  /** Monto pagado (x_amount). */
  amount?: string | number;
  /** Moneda (x_currency_code). Por defecto COP. */
  currency?: string;
  /** Factura interna (x_id_invoice), si viene. */
  invoice?: string;
}

/**
 * Activa la suscripción o el complemento en el perfil del usuario (vía Worker) y
 * registra la transacción (best-effort). Devuelve `true` si el perfil quedó
 * actualizado. Lanza solo si el PUT al perfil falla (para que el webhook pueda
 * responder 500 y ePayco reintente); el registro de transacción nunca hace fallar.
 */
export async function activateEPaycoPayment(params: ActivateEPaycoParams): Promise<boolean> {
  const { apiUrl, userProfileId, planId } = params;
  const secret = process.env.CRON_SECRET || '';

  const now = new Date();
  const nextBillingDate = new Date(now);
  nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

  const isAiAddon = planId === AI_ADDON;
  const isEmailAddon = planId === EMAIL_ADDON;
  const isStoreAddon = planId === STORE_ADDON;
  const isMainPlan = !isAiAddon && !isEmailAddon && !isStoreAddon;

  const updatePayload: Record<string, unknown> = {
    subscription_status: 'active',
    last_payment_date: now.toISOString(),
    next_billing_date: nextBillingDate.toISOString(),
    trial_start_date: null,
    trial_end_date: null,
  };

  if (isMainPlan) {
    // No sobreescribir plan_id si es un addon.
    updatePayload.plan_id = planId;
    const businessType = getBusinessTypeByPlanId(planId);
    if (businessType) {
      updatePayload.business_type = businessType.id;
    }
  }
  if (isAiAddon) updatePayload.has_ai_addon = 1;
  if (isEmailAddon) updatePayload.has_email_addon = 1;
  if (isStoreAddon) updatePayload.has_store_addon = 1;

  const updateResponse = await fetch(`${apiUrl}/api/user-profiles/${userProfileId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Secret': secret,
    },
    body: JSON.stringify(updatePayload),
  });

  if (!updateResponse.ok) {
    console.error('activateEPaycoPayment: error actualizando perfil:', await updateResponse.text());
    throw new Error(`No se pudo actualizar el perfil ${userProfileId}: ${updateResponse.status}`);
  }

  // Registro contable (best-effort). El Worker usa la columna legacy
  // `wompi_transaction_id` y el estado canónico en inglés (CHECK). Si el pago se
  // activa por la red de seguridad sin transactionId, igual dejamos rastro.
  try {
    const txResponse = await fetch(`${apiUrl}/api/payment-transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': secret,
      },
      body: JSON.stringify({
        user_profile_id: userProfileId,
        wompi_transaction_id: params.transactionId || `epayco-${params.refPayco || now.getTime()}`,
        amount: params.amount != null ? parseFloat(String(params.amount)) : 0,
        currency: params.currency || 'COP',
        status: 'APPROVED',
        payment_method_type: 'epayco',
        reference: [params.invoice, params.refPayco && `ref ${params.refPayco}`]
          .filter(Boolean)
          .join(' ') || null,
      }),
    });
    if (!txResponse.ok) {
      console.error('activateEPaycoPayment: registro de transacción falló:', txResponse.status, await txResponse.text());
    }
  } catch (error) {
    console.error('activateEPaycoPayment: error registrando transacción (best-effort):', error);
  }

  return true;
}
