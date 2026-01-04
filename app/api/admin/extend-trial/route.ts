import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserProfile, getAllUserProfiles, updateUserProfile } from '@/lib/cloudflare-api';

export const runtime = 'nodejs';

/**
 * API para extender el período de prueba de una cuenta específica
 * Solo accesible por super admins
 */
export async function POST(request: NextRequest) {
  try {
    const { getToken, userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Verificar que el usuario actual sea super admin
    const currentUserProfile = await getUserProfile(getToken);

    if (!currentUserProfile?.is_superadmin) {
      return NextResponse.json(
        { error: 'No tienes permisos para realizar esta acción' },
        { status: 403 }
      );
    }

    // Obtener datos del body
    const { userProfileId, days = 15 } = await request.json();

    if (!userProfileId) {
      return NextResponse.json(
        { error: 'userProfileId es requerido' },
        { status: 400 }
      );
    }

    // Validar que days sea un número válido
    const daysToAdd = parseInt(days);
    if (isNaN(daysToAdd) || daysToAdd < 1 || daysToAdd > 365) {
      return NextResponse.json(
        { error: 'El número de días debe estar entre 1 y 365' },
        { status: 400 }
      );
    }

    // Obtener todas las cuentas para encontrar la específica
    const allProfiles = await getAllUserProfiles(getToken);
    const targetProfile = allProfiles.find(p => p.id === userProfileId);

    if (!targetProfile) {
      return NextResponse.json(
        { error: 'Cuenta no encontrada' },
        { status: 404 }
      );
    }

    // Calcular nueva fecha de finalización del trial
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Si ya tiene una fecha de fin de trial, extenderla; si no, usar hoy como base
    let newTrialEnd: Date;
    if (targetProfile.trial_end_date) {
      const currentTrialEnd = new Date(targetProfile.trial_end_date);
      // Si el trial ya expiró, usar hoy como base; si no, extender desde la fecha actual
      if (currentTrialEnd > startOfToday) {
        newTrialEnd = new Date(currentTrialEnd);
      } else {
        newTrialEnd = new Date(startOfToday);
      }
    } else {
      newTrialEnd = new Date(startOfToday);
    }

    newTrialEnd.setDate(newTrialEnd.getDate() + daysToAdd);

    // Actualizar el perfil
    await updateUserProfile(userProfileId, {
      subscription_status: 'trial',
      trial_end_date: newTrialEnd.toISOString(),
      trial_start_date: targetProfile.trial_start_date || startOfToday.toISOString(),
    }, getToken);

    return NextResponse.json({
      success: true,
      message: `Período de prueba extendido por ${daysToAdd} días`,
      new_trial_end_date: newTrialEnd.toISOString(),
      days_added: daysToAdd,
    });

  } catch (error) {
    console.error('Error extending trial:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al extender período de prueba' },
      { status: 500 }
    );
  }
}
