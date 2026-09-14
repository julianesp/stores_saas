import { NextRequest, NextResponse } from 'next/server';
import { verifyEPaycoSignature, type EPaycoConfirmation } from '@/lib/epayco';
import { getBusinessTypeByPlanId } from '@/lib/business-types';

/**
 * Avisa al administrador (por Telegram, vía el Worker) que se registró un pago.
 *
 * Best-effort: el token del bot y el chat_id del admin viven en el Worker, así
 * que aquí solo disparamos el endpoint interno. Cualquier fallo se traga en
 * silencio: NUNCA debe hacer fallar el webhook, porque ePayco reintentaría un
 * pago que ya fue procesado (doble activación). Si el endpoint del Worker aún
 * no existe, el aviso simplemente no se envía y el pago se procesa igual.
 */
async function notifyAdminPayment(params: {
  apiUrl: string;
  userProfileId: string;
  planId: string;
  isAddon: boolean;
  amount: string;
}): Promise<void> {
  try {
    await fetch(`${params.apiUrl}/api/telegram/admin-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.CRON_SECRET || '',
      },
      body: JSON.stringify({
        userProfileId: params.userProfileId,
        planId: params.planId,
        isAddon: params.isAddon,
        amount: params.amount,
      }),
    });
  } catch (error) {
    // Best-effort: no propagamos el error para no tumbar el webhook.
    console.error('notifyAdminPayment (best-effort) falló:', error);
  }
}

/**
 * Webhook de confirmación de ePayco
 * ePayco envía una confirmación POST con los datos de la transacción
 */
export async function POST(req: NextRequest) {
  try {
    console.log('=== ePayco Webhook Received ===');

    // Parsear el body como form data (ePayco envía application/x-www-form-urlencoded)
    const formData = await req.formData();

    // Convertir FormData a objeto
    const confirmation: EPaycoConfirmation = {
      x_cust_id_cliente: formData.get('x_cust_id_cliente') as string,
      x_ref_payco: formData.get('x_ref_payco') as string,
      x_id_invoice: formData.get('x_id_invoice') as string,
      x_transaction_id: formData.get('x_transaction_id') as string,
      x_amount: formData.get('x_amount') as string,
      x_currency_code: formData.get('x_currency_code') as string,
      x_transaction_date: formData.get('x_transaction_date') as string,
      x_transaction_state: formData.get('x_transaction_state') as string,
      x_approval_code: formData.get('x_approval_code') as string,
      x_response: formData.get('x_response') as string,
      x_response_reason_text: formData.get('x_response_reason_text') as string,
      x_signature: formData.get('x_signature') as string,
      x_extra1: formData.get('x_extra1') as string || undefined,
      x_extra2: formData.get('x_extra2') as string || undefined,
      x_extra3: formData.get('x_extra3') as string || undefined,
    };

    console.log('Confirmation data:', confirmation);

    // Verificar la firma
    if (!verifyEPaycoSignature(confirmation)) {
      console.error('Invalid signature from ePayco');
      return NextResponse.json(
        { error: 'Firma inválida' },
        { status: 401 }
      );
    }

    // Verificar que la transacción fue aprobada
    if (confirmation.x_transaction_state !== 'Aceptada') {
      console.log(`Transaction not approved: ${confirmation.x_transaction_state}`);
      return NextResponse.json({
        success: false,
        message: `Transacción en estado: ${confirmation.x_transaction_state}`,
      });
    }

    // Extraer datos adicionales
    const userProfileId = confirmation.x_extra1;
    const planId = confirmation.x_extra2;
    const isAddon = confirmation.x_extra3 === 'true';

    if (!userProfileId || !planId) {
      console.error('Missing userProfileId or planId in webhook');
      return NextResponse.json(
        { error: 'Datos incompletos en el webhook' },
        { status: 400 }
      );
    }

    // Actualizar la suscripción en Cloudflare
    const apiUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL || 'https://tienda-pos-api.julii1295.workers.dev';

    const now = new Date();
    const nextBillingDate = new Date(now);
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

    // Si es un addon, no sobreescribir el plan_id existente.
    // IMPORTANTE: estos IDs deben coincidir EXACTAMENTE con los definidos en
    // lib/epayco.ts (SUBSCRIPTION_PLANS). Un desajuste hace que el webhook no
    // active el addon aunque el pago se apruebe (el cliente paga y no recibe
    // nada). El addon de tienda es 'addon-store-monthly', no 'store-addon-monthly'.
    const isAiAddon = planId === 'ai-addon-monthly';
    const isEmailAddon = planId === 'email-addon-monthly';
    const isStoreAddon = planId === 'addon-store-monthly';
    const isMainPlan = !isAiAddon && !isEmailAddon && !isStoreAddon;

    const updatePayload: Record<string, unknown> = {
      subscription_status: 'active',
      last_payment_date: now.toISOString(),
      next_billing_date: nextBillingDate.toISOString(),
      trial_start_date: null,
      trial_end_date: null,
    };

    if (isMainPlan) {
      updatePayload.plan_id = planId;

      // Si el plan corresponde a un tipo de negocio (abarrotes, papelería,
      // pizzería, licorera, farmacia), guardar también el business_type para
      // adaptar la interfaz. Los planes legacy (basic-monthly) no lo tienen y
      // el perfil queda con el valor por defecto (abarrotes).
      const businessType = getBusinessTypeByPlanId(planId);
      if (businessType) {
        updatePayload.business_type = businessType.id;
      }
    }
    if (isAiAddon) {
      updatePayload.has_ai_addon = 1;
    }
    if (isEmailAddon) {
      updatePayload.has_email_addon = 1;
    }
    if (isStoreAddon) {
      updatePayload.has_store_addon = 1;
    }

    // Actualizar el perfil del usuario
    const updateResponse = await fetch(`${apiUrl}/api/user-profiles/${userProfileId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.CRON_SECRET || '',
      },
      body: JSON.stringify(updatePayload),
    });

    if (!updateResponse.ok) {
      console.error('Error updating user profile:', await updateResponse.text());
      return NextResponse.json(
        { error: 'Error al actualizar el perfil' },
        { status: 500 }
      );
    }

    // Crear registro de transacción
    try {
      await fetch(`${apiUrl}/api/payment-transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': process.env.CRON_SECRET || '',
        },
        body: JSON.stringify({
          user_profile_id: userProfileId,
          epayco_transaction_id: confirmation.x_transaction_id,
          epayco_ref_payco: confirmation.x_ref_payco,
          amount: parseFloat(confirmation.x_amount),
          currency: confirmation.x_currency_code,
          status: confirmation.x_transaction_state,
          reference: confirmation.x_id_invoice,
          approval_code: confirmation.x_approval_code,
        }),
      });
    } catch (error) {
      console.error('Error creating transaction record:', error);
      // No falla si no se puede crear el registro
    }

    console.log(`✅ Subscription activated for user ${userProfileId}`);

    // Avisar al administrador por Telegram que alguien pagó. Best-effort: nunca
    // debe hacer fallar el webhook (ePayco reintentaría un pago ya procesado).
    await notifyAdminPayment({
      apiUrl,
      userProfileId,
      planId,
      isAddon,
      amount: confirmation.x_amount,
    });

    return NextResponse.json({
      success: true,
      message: 'Suscripción activada exitosamente',
    });

  } catch (error) {
    console.error('Error processing ePayco webhook:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al procesar el webhook' },
      { status: 500 }
    );
  }
}

/**
 * Respuesta de ePayco (cuando el usuario regresa del checkout)
 * Esto es solo informativo, la confirmación real viene por POST
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;

  const refPayco = searchParams.get('ref_payco');
  const transactionState = searchParams.get('x_transaction_state');

  console.log('ePayco response received:', { refPayco, transactionState });

  // Redirigir según el estado
  if (transactionState === 'Aceptada') {
    return NextResponse.redirect(new URL('/dashboard/subscription/success', req.url));
  } else {
    return NextResponse.redirect(new URL('/dashboard/subscription/failed', req.url));
  }
}
