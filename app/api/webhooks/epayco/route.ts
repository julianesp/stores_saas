import { NextRequest, NextResponse } from 'next/server';
import { verifyEPaycoSignature, type EPaycoConfirmation } from '@/lib/epayco';

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
    const hasAIAddon = confirmation.x_extra3 === 'true';

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

    // Actualizar el perfil del usuario
    const updateResponse = await fetch(`${apiUrl}/api/user-profiles/${userProfileId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.CRON_SECRET || '',
      },
      body: JSON.stringify({
        subscription_status: 'active',
        plan_id: planId,
        has_ai_addon: hasAIAddon ? 1 : 0,
        last_payment_date: now.toISOString(),
        next_billing_date: nextBillingDate.toISOString(),
        trial_start_date: null,
        trial_end_date: null,
      }),
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
