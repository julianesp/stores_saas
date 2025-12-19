import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getTransactionStatus } from '@/lib/epayco';
import { getUserProfile, updateUserProfile } from '@/lib/cloudflare-api';

/**
 * Endpoint para verificar manualmente si un pago fue aprobado
 * El usuario debe proporcionar el ID de transacción de ePayco
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, getToken } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { transactionId } = await req.json();

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Se requiere el ID de transacción' },
        { status: 400 }
      );
    }

    // Obtener el estado de la transacción desde ePayco
    const transaction = await getTransactionStatus(transactionId);

    if (!transaction || !transaction.data) {
      return NextResponse.json(
        { error: 'Transacción no encontrada en ePayco' },
        { status: 404 }
      );
    }

    const transactionData = transaction.data;

    // ePayco devuelve el estado como 'Aceptada', 'Rechazada', 'Pendiente'
    const status = transactionData.x_transaction_state || transactionData.estado;
    const amount = parseFloat(transactionData.x_amount || transactionData.valor);
    const reference = transactionData.x_id_invoice || transactionData.referencia;

    // Obtener el perfil del usuario
    const userProfile = await getUserProfile(getToken);

    if (!userProfile) {
      return NextResponse.json(
        { error: 'Perfil de usuario no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que la transacción fue aprobada (ePayco usa 'Aceptada')
    if (status !== 'Aceptada') {
      return NextResponse.json({
        success: false,
        message: `El pago está en estado: ${status}`,
        transactionStatus: status,
        canActivate: false,
      });
    }

    // Verificar que el monto sea correcto
    const amountCOP = amount;
    if (amountCOP !== 29900 && amountCOP !== 9900 && amountCOP !== 39800) {
      return NextResponse.json({
        success: false,
        message: `Monto incorrecto: $${amountCOP}. Se esperaba $29,900, $9,900 o $39,800`,
        canActivate: false,
      });
    }

    // Determinar el plan
    let planId = 'basic-monthly';
    let hasAIAddon = false;

    if (amountCOP === 29900) {
      planId = 'basic-monthly';
    } else if (amountCOP === 9900) {
      planId = 'ai-addon-monthly';
      hasAIAddon = true;
    } else if (amountCOP === 39800) {
      planId = 'basic-monthly';
      hasAIAddon = true;
    }

    // Activar la suscripción
    const now = new Date();
    const nextBillingDate = new Date(now);
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

    await updateUserProfile(userProfile.id, {
      subscription_status: 'active',
      plan_id: planId,
      has_ai_addon: hasAIAddon,
      last_payment_date: now.toISOString(),
      next_billing_date: nextBillingDate.toISOString(),
      trial_start_date: undefined,
      trial_end_date: undefined,
    }, getToken);

    // También crear el registro de transacción
    try {
      const apiUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL || 'https://tienda-pos-api.julii1295.workers.dev';
      const token = await getToken();

      await fetch(`${apiUrl}/api/payment-transactions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_profile_id: userProfile.id,
          epayco_transaction_id: transactionId,
          epayco_ref_payco: transactionData.x_ref_payco || '',
          amount: amountCOP,
          currency: 'COP',
          status: 'Aceptada',
          reference: reference || `MANUAL-${transactionId}`,
          approval_code: transactionData.x_approval_code || '',
        }),
      });
    } catch (error) {
      console.error('Error creating transaction record:', error);
      // No falla si no se puede crear el registro
    }

    return NextResponse.json({
      success: true,
      message: '¡Suscripción activada exitosamente!',
      subscription: {
        status: 'active',
        planId,
        hasAIAddon,
        nextBillingDate: nextBillingDate.toISOString(),
      },
      transaction: {
        id: transactionId,
        amount: amountCOP,
        status,
      },
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al verificar el pago' },
      { status: 500 }
    );
  }
}
