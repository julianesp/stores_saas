import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserProfile, updateUserProfile, getAllUserProfiles } from '@/lib/cloudflare-api';
import type { UserProfile } from '@/lib/types';

export const runtime = 'nodejs';

/**
 * Endpoint para activar la cuenta de demostración con acceso PERMANENTE a todos los addons
 * Solo para el email julii1295@gmail.com (cuenta del desarrollador)
 * Solo accesible por super administradores
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

    // Verificar que el usuario actual es super admin
    const adminProfile = await getUserProfile(getToken);

    if (!adminProfile || !adminProfile.is_superadmin) {
      return NextResponse.json(
        { error: 'Solo super administradores pueden activar la cuenta demo' },
        { status: 403 }
      );
    }

    const DEMO_EMAIL = 'julii1295@gmail.com';

    console.log(`[activate-demo-account] Activando cuenta demo: ${DEMO_EMAIL}`);

    // Buscar el usuario por email
    const allProfiles = await getAllUserProfiles(getToken);
    const demoProfile = allProfiles.find(
      (p: UserProfile) => p.email.toLowerCase() === DEMO_EMAIL.toLowerCase()
    );

    if (!demoProfile) {
      return NextResponse.json(
        { error: `Usuario con email ${DEMO_EMAIL} no encontrado` },
        { status: 404 }
      );
    }

    // Configurar fecha de expiración muy lejana (10 años en el futuro)
    const now = new Date();
    const farFutureDate = new Date();
    farFutureDate.setFullYear(farFutureDate.getFullYear() + 10);
    const expiresAt = farFutureDate.toISOString();

    // Preparar las actualizaciones - TODOS los addons con acceso permanente
    const updates: Record<string, unknown> = {
      subscription_status: 'active',
      has_ai_addon: true,
      has_store_addon: true,
      has_email_addon: true,
      ai_addon_expires_at: expiresAt,
      store_addon_expires_at: expiresAt,
      email_addon_expires_at: expiresAt,
      next_billing_date: expiresAt,
      last_payment_date: now.toISOString(),
      subscription_tier: 'demo_full_access',
    };

    console.log('[activate-demo-account] Updates to apply:', {
      email: DEMO_EMAIL,
      status: 'active',
      expiresAt: farFutureDate.toLocaleDateString('es-CO'),
      addons: ['IA', 'Tienda Online', 'Email Marketing']
    });

    // Actualizar el perfil del usuario
    await updateUserProfile(demoProfile.id, updates as Partial<UserProfile>, getToken);

    console.log(`✅ Cuenta demo activada con acceso completo y permanente`);

    return NextResponse.json({
      success: true,
      message: 'Cuenta de demostración activada con acceso completo y permanente',
      data: {
        userEmail: demoProfile.email,
        userName: demoProfile.full_name || demoProfile.email,
        status: 'active',
        activatedAt: now.toISOString(),
        expiresAt: expiresAt,
        expiresIn: '10 años (permanente)',
        addons: {
          ai: '✅ Activo (permanente)',
          store: '✅ Activo (permanente)',
          email: '✅ Activo (permanente)',
        },
        message: 'Esta cuenta ahora tiene acceso completo a TODOS los complementos para demostrar el sistema a los leads.',
      },
    });

  } catch (error) {
    console.error('[activate-demo-account] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al activar cuenta demo' },
      { status: 500 }
    );
  }
}
