import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserProfileByClerkId } from '@/lib/subscription-helpers';
import { updateDocument } from '@/lib/firestore-helpers';

export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Obtener el perfil del usuario
    const userProfile = await getUserProfileByClerkId(userId);

    if (!userProfile) {
      return NextResponse.json(
        { error: 'Perfil de usuario no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si tiene trial_start_date y trial_end_date pero no tiene pagos
    if (userProfile.trial_start_date && userProfile.trial_end_date && !userProfile.last_payment_date) {
      // Restaurar el estado a trial
      await updateDocument('user_profiles', userProfile.id, {
        subscription_status: 'trial',
      });

      return NextResponse.json({
        success: true,
        message: 'Estado restaurado a trial correctamente',
        userProfile: {
          id: userProfile.id,
          email: userProfile.email,
          subscription_status: 'trial',
          trial_start_date: userProfile.trial_start_date,
          trial_end_date: userProfile.trial_end_date,
        }
      });
    } else if (userProfile.last_payment_date) {
      return NextResponse.json(
        { error: 'Esta cuenta ya tiene pagos registrados, no se puede restaurar a trial' },
        { status: 400 }
      );
    } else {
      return NextResponse.json(
        { error: 'Esta cuenta no tiene un período de prueba configurado' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error restoring trial status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
