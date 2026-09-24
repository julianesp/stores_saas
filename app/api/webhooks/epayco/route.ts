import { NextRequest, NextResponse } from 'next/server';
import { verifyEPaycoSignature, type EPaycoConfirmation } from '@/lib/epayco';
import { activateEPaycoPayment } from '@/lib/epayco-activation';

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

    // Actualizar la suscripción en Cloudflare mediante el helper compartido
    // (misma lógica que usa la red de seguridad en payment-status). Es
    // idempotente: activar de nuevo solo reescribe los mismos campos.
    const apiUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL || 'https://tienda-pos-api.julii1295.workers.dev';

    try {
      await activateEPaycoPayment({
        apiUrl,
        userProfileId,
        planId,
        transactionId: confirmation.x_transaction_id,
        refPayco: confirmation.x_ref_payco,
        amount: confirmation.x_amount,
        currency: confirmation.x_currency_code,
        invoice: confirmation.x_id_invoice,
      });
    } catch (error) {
      // Falla dura: el perfil no se actualizó. Respondemos 500 para que ePayco
      // reintente el webhook (el registro de transacción, en cambio, es
      // best-effort dentro del helper y nunca llega aquí).
      console.error('Error updating user profile:', error);
      return NextResponse.json(
        { error: 'Error al actualizar el perfil' },
        { status: 500 }
      );
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
