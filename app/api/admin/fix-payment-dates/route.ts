import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  getUserProfile,
  getAllUserProfiles,
  getUserPaymentTransactions,
  updateUserProfile
} from '@/lib/cloudflare-api';

export const runtime = 'nodejs';

/**
 * Endpoint para corregir las fechas de pago basándose en las transacciones reales
 * Solo accesible por super admin
 */
export async function POST(request: NextRequest) {
  try {
    const { getToken, userId } = await auth();

    if (!getToken || !userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar que el usuario autenticado es superadmin
    const adminProfile = await getUserProfile(getToken);

    if (!adminProfile || !adminProfile.is_superadmin) {
      return NextResponse.json(
        { error: 'Solo super administradores pueden corregir fechas de pago' },
        { status: 403 }
      );
    }

    // Obtener el email del usuario a corregir
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email es requerido' },
        { status: 400 }
      );
    }

    // Buscar el usuario por email
    const allProfiles = await getAllUserProfiles(getToken);
    const targetProfile = allProfiles.find(p => p.email.toLowerCase() === email.toLowerCase());

    if (!targetProfile) {
      return NextResponse.json(
        { error: `No se encontró un usuario con el email: ${email}` },
        { status: 404 }
      );
    }

    // Obtener las transacciones de pago del usuario
    const transactions = await getUserPaymentTransactions(targetProfile.id, getToken);

    // Filtrar solo las aprobadas
    const approvedTransactions = transactions.filter(tx => tx.status === 'APPROVED');

    if (approvedTransactions.length === 0) {
      return NextResponse.json(
        {
          error: `El usuario ${email} no tiene transacciones aprobadas registradas`,
          info: 'Puede que haya pagado antes de implementar el sistema de payment_transactions'
        },
        { status: 404 }
      );
    }

    // Ordenar por fecha (más reciente primero)
    approvedTransactions.sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // Obtener el pago más reciente
    const lastPayment = approvedTransactions[0];
    const lastPaymentDate = new Date(lastPayment.created_at);

    // Calcular la próxima fecha de cobro (30 días después del último pago)
    const nextBillingDate = new Date(lastPaymentDate);
    nextBillingDate.setDate(nextBillingDate.getDate() + 30);

    // Actualizar el perfil del usuario
    await updateUserProfile(targetProfile.id, {
      last_payment_date: lastPaymentDate.toISOString(),
      next_billing_date: nextBillingDate.toISOString(),
      subscription_status: 'active',
    }, getToken);

    console.log(`✅ Fechas corregidas para ${email}`);
    console.log(`   Último pago: ${lastPaymentDate.toISOString()}`);
    console.log(`   Próximo cobro: ${nextBillingDate.toISOString()}`);

    return NextResponse.json({
      success: true,
      message: `Fechas de pago corregidas para ${email}`,
      data: {
        email: email,
        userProfileId: targetProfile.id,
        lastPayment: {
          date: lastPaymentDate.toISOString(),
          transactionId: lastPayment.wompi_transaction_id,
          amount: lastPayment.amount,
          currency: lastPayment.currency,
        },
        updated: {
          last_payment_date: lastPaymentDate.toISOString(),
          next_billing_date: nextBillingDate.toISOString(),
          subscription_status: 'active',
        },
        totalApprovedPayments: approvedTransactions.length,
        allTransactions: transactions.length,
      },
    });

  } catch (error: any) {
    console.error('[fix-payment-dates] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al corregir fechas de pago' },
      { status: 500 }
    );
  }
}
