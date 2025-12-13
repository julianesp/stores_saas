import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserProfileByClerkId } from '@/lib/subscription-helpers';
import { updateDocument, queryDocuments } from '@/lib/firestore-helpers';
import { UserProfile } from '@/lib/types';

/**
 * API de administrador para resetear el período de prueba a 15 días
 * Solo puede ser usado por superadmins o por el propio usuario
 */
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

    // Obtener el perfil del usuario autenticado
    const authProfile = await getUserProfileByClerkId(userId);

    if (!authProfile) {
      return NextResponse.json(
        { error: 'Perfil no encontrado' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { targetEmail, resetAll } = body;

    // Si resetAll es true, solo superadmin puede hacerlo
    if (resetAll && !authProfile.is_superadmin) {
      return NextResponse.json(
        { error: 'Solo superadmins pueden resetear todos los trials' },
        { status: 403 }
      );
    }

    const now = new Date();
    const newTrialEnd = new Date();
    newTrialEnd.setDate(newTrialEnd.getDate() + 15);

    let updatedCount = 0;
    const updatedUsers: string[] = [];

    if (resetAll) {
      // Resetear todos los usuarios en trial
      const allProfiles = await queryDocuments('user_profiles', [
        { field: 'subscription_status', operator: '==', value: 'trial' }
      ]) as UserProfile[];

      for (const profile of allProfiles) {
        if (profile.is_superadmin) continue; // No resetear superadmins

        await updateDocument('user_profiles', profile.id, {
          trial_start_date: now.toISOString(),
          trial_end_date: newTrialEnd.toISOString(),
        });

        updatedCount++;
        updatedUsers.push(profile.email);
      }

      return NextResponse.json({
        success: true,
        message: `Se resetearon ${updatedCount} períodos de prueba a 15 días`,
        updatedUsers,
        newTrialEndDate: newTrialEnd.toISOString(),
      });
    } else if (targetEmail) {
      // Resetear un usuario específico
      const profiles = await queryDocuments('user_profiles', [
        { field: 'email', operator: '==', value: targetEmail }
      ]) as UserProfile[];

      if (profiles.length === 0) {
        return NextResponse.json(
          { error: `Usuario con email ${targetEmail} no encontrado` },
          { status: 404 }
        );
      }

      const targetProfile = profiles[0];

      // Solo puede resetear su propio trial o si es superadmin
      if (targetProfile.id !== authProfile.id && !authProfile.is_superadmin) {
        return NextResponse.json(
          { error: 'No tienes permiso para resetear el trial de otro usuario' },
          { status: 403 }
        );
      }

      if (targetProfile.is_superadmin) {
        return NextResponse.json(
          { error: 'No se puede resetear el trial de un superadmin' },
          { status: 400 }
        );
      }

      await updateDocument('user_profiles', targetProfile.id, {
        subscription_status: 'trial',
        trial_start_date: now.toISOString(),
        trial_end_date: newTrialEnd.toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: `Período de prueba reseteado a 15 días para ${targetEmail}`,
        newTrialEndDate: newTrialEnd.toISOString(),
        daysRemaining: 15,
      });
    } else {
      // Resetear el trial del usuario autenticado
      if (authProfile.is_superadmin) {
        return NextResponse.json(
          { error: 'Los superadmins no tienen período de prueba' },
          { status: 400 }
        );
      }

      await updateDocument('user_profiles', authProfile.id, {
        subscription_status: 'trial',
        trial_start_date: now.toISOString(),
        trial_end_date: newTrialEnd.toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: 'Tu período de prueba ha sido reseteado a 15 días',
        newTrialEndDate: newTrialEnd.toISOString(),
        daysRemaining: 15,
      });
    }
  } catch (error) {
    console.error('Error resetting trial:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error al resetear trial';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
