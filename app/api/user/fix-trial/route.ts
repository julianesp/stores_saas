import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserProfileByClerkId, initializeTrialPeriod } from '@/lib/subscription-helpers';
import { updateDocument } from '@/lib/firestore-helpers';

/**
 * API para diagnosticar y corregir problemas con el período de prueba
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

    // Obtener el perfil actual
    const profile = await getUserProfileByClerkId(userId);

    if (!profile) {
      return NextResponse.json(
        { error: 'Perfil no encontrado' },
        { status: 404 }
      );
    }

    // Diagnóstico
    const diagnostico = {
      email: profile.email,
      subscription_status: profile.subscription_status,
      trial_start_date: profile.trial_start_date,
      trial_end_date: profile.trial_end_date,
      is_superadmin: profile.is_superadmin || false,
    };

    // Si es superadmin, no necesita trial
    if (profile.is_superadmin) {
      return NextResponse.json({
        message: 'Eres Super Admin, no necesitas período de prueba',
        diagnostico,
        fixed: false,
      });
    }

    // Si ya tiene suscripción activa, no cambiar nada
    if (profile.subscription_status === 'active') {
      return NextResponse.json({
        message: 'Tu suscripción ya está activa',
        diagnostico,
        fixed: false,
      });
    }

    // Verificar si el trial está configurado correctamente
    const now = new Date();
    let needsFix = false;
    let fixMessage = '';

    // Caso 1: Estado es 'trial' pero no tiene fechas
    if (profile.subscription_status === 'trial' && !profile.trial_end_date) {
      needsFix = true;
      fixMessage = 'Trial sin fechas configuradas';
    }

    // Caso 2: Estado NO es 'trial' ni 'active' (expired o canceled)
    if (profile.subscription_status === 'expired' || profile.subscription_status === 'canceled') {
      needsFix = true;
      fixMessage = 'Estado incorrecto, debe estar en trial';
    }

    // Caso 3: Trial expiró prematuramente
    if (profile.subscription_status === 'expired' && profile.trial_end_date) {
      const trialEnd = new Date(profile.trial_end_date);
      if (trialEnd > now) {
        needsFix = true;
        fixMessage = 'Trial marcado como expirado pero aún tiene días';
      }
    }

    if (needsFix) {
      // Corregir: establecer trial de 15 días
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 15);

      await updateDocument('user_profiles', profile.id, {
        subscription_status: 'trial',
        trial_start_date: now.toISOString(),
        trial_end_date: trialEnd.toISOString(),
      });

      return NextResponse.json({
        message: 'Período de prueba corregido exitosamente',
        diagnostico,
        fixed: true,
        fixMessage,
        newTrialEndDate: trialEnd.toISOString(),
        daysRemaining: 15,
      });
    }

    // Si llegamos aquí, todo está bien
    const trialEnd = profile.trial_end_date ? new Date(profile.trial_end_date) : null;
    let daysLeft = 0;
    if (trialEnd) {
      // Normalizar ambas fechas a medianoche para comparación precisa
      const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const trialEndMidnight = new Date(trialEnd.getFullYear(), trialEnd.getMonth(), trialEnd.getDate());
      daysLeft = Math.ceil((trialEndMidnight.getTime() - nowMidnight.getTime()) / (1000 * 60 * 60 * 24));
    }

    return NextResponse.json({
      message: 'Tu período de prueba está configurado correctamente',
      diagnostico,
      fixed: false,
      daysRemaining: daysLeft,
    });
  } catch (error) {
    console.error('Error fixing trial:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error al diagnosticar';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
