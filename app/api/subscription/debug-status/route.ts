import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { checkSubscriptionStatus, getUserProfileByToken } from '@/lib/subscription-helpers';

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación
    const { userId, getToken } = await auth();

    if (!userId || !getToken) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Obtener el perfil del usuario
    const userProfile = await getUserProfileByToken(getToken);

    if (!userProfile) {
      return NextResponse.json(
        { error: 'Perfil de usuario no encontrado' },
        { status: 404 }
      );
    }

    // Obtener el estado de suscripción
    const subscriptionStatus = await checkSubscriptionStatus(getToken);

    // Calcular días desde el inicio del trial si existe
    let daysSinceTrialStart = null;
    if (userProfile.trial_start_date) {
      const trialStart = new Date(userProfile.trial_start_date);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - trialStart.getTime());
      daysSinceTrialStart = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    return NextResponse.json({
      debug: true,
      userProfile: {
        id: userProfile.id,
        email: userProfile.email,
        subscription_status: userProfile.subscription_status,
        trial_start_date: userProfile.trial_start_date,
        trial_end_date: userProfile.trial_end_date,
        last_payment_date: userProfile.last_payment_date,
        next_billing_date: userProfile.next_billing_date,
        subscription_id: userProfile.subscription_id,
      },
      subscriptionStatus,
      calculated: {
        daysSinceTrialStart,
        currentDate: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
