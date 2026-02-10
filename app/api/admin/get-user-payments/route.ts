import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserProfile, getAllPaymentTransactions } from '@/lib/cloudflare-api';

export const runtime = 'nodejs';

/**
 * Endpoint para obtener los pagos de un usuario específico
 * Solo accesible por super admin
 */
export async function GET(request: NextRequest) {
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
        { error: 'Solo super administradores pueden ver pagos de usuarios' },
        { status: 403 }
      );
    }

    // Obtener el user_profile_id del query string
    const { searchParams } = new URL(request.url);
    const userProfileId = searchParams.get('userProfileId');

    if (!userProfileId) {
      return NextResponse.json(
        { error: 'userProfileId es requerido' },
        { status: 400 }
      );
    }

    // Obtener todas las transacciones y filtrar por usuario
    const allTransactions = await getAllPaymentTransactions(getToken);
    const userTransactions = allTransactions.filter(
      (tx) => tx.user_profile_id === userProfileId
    );

    // Filtrar solo las aprobadas
    const approvedTransactions = userTransactions.filter(
      (tx) => tx.status === 'APPROVED'
    );

    return NextResponse.json({
      success: true,
      data: {
        all: userTransactions,
        approved: approvedTransactions,
        count: userTransactions.length,
        approvedCount: approvedTransactions.length,
      },
    });

  } catch (error: any) {
    console.error('[get-user-payments] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener pagos del usuario' },
      { status: 500 }
    );
  }
}
