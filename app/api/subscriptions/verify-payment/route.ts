import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getTransactionStatus } from '@/lib/wompi';
import { getUserProfile, updateUserProfile } from '@/lib/cloudflare-api';

export async function POST(req: NextRequest) {
  try {
    // Obtener el usuario autenticado
    const { userId, getToken } = await auth();

    if (!userId || !getToken) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Obtener el transaction ID del body
    const { transactionId } = await req.json();

    if (!transactionId) {
      return NextResponse.json(
        { success: false, error: 'Transaction ID requerido' },
        { status: 400 }
      );
    }

    // Consultar el estado de la transacción en Wompi
    const transaction = await getTransactionStatus(transactionId);

    console.log('Transaction status from Wompi:', transaction);

    // Verificar si el pago fue aprobado
    const isApproved = transaction.data?.status === 'APPROVED';

    if (isApproved) {
      // Activar la suscripción del usuario
      try {
        const profile = await getUserProfile(getToken);

        // Extraer el plan_id de la referencia de la transacción
        // Formato: SUBSCRIPTION-plan-basico-user123-1234567890
        const reference = transaction.data?.reference || '';
        const planIdMatch = reference.match(/SUBSCRIPTION-([^-]+)-/);
        const planId = planIdMatch ? planIdMatch[1] : null;

        // Calcular la próxima fecha de facturación (30 días desde hoy)
        const nextBillingDate = new Date();
        nextBillingDate.setDate(nextBillingDate.getDate() + 30);

        // Actualizar el perfil del usuario
        await updateUserProfile(profile.id, {
          subscription_status: 'active',
          last_payment_date: new Date().toISOString(),
          next_billing_date: nextBillingDate.toISOString(),
          plan_id: planId || undefined, // Guardar el plan seleccionado
        }, getToken);

        console.log('✅ Subscription activated for user:', userId, 'Plan:', planId);
      } catch (error) {
        console.error('Error updating user profile:', error);
        // No devolvemos error aquí porque el pago sí se procesó
      }
    }

    return NextResponse.json({
      success: true,
      status: transaction.data?.status || 'PENDING',
      isApproved,
      transaction: {
        id: transaction.data?.id,
        status: transaction.data?.status,
        amount: transaction.data?.amount_in_cents,
        currency: transaction.data?.currency,
        reference: transaction.data?.reference,
      },
    });

  } catch (error: any) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al verificar el pago',
        status: 'ERROR'
      },
      { status: 500 }
    );
  }
}
