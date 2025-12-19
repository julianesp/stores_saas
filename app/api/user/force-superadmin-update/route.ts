import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getUserProfile, updateUserProfile } from '@/lib/cloudflare-api';

/**
 * Endpoint para forzar la actualización del usuario actual a super admin
 * Solo funciona si el email del usuario coincide con SUPER_ADMIN_EMAIL
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

    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const userEmail = user.emailAddresses[0]?.emailAddress || '';
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@neurai.dev';

    // Verificar que el email coincida con el super admin
    if (userEmail !== superAdminEmail) {
      return NextResponse.json(
        {
          error: 'Solo el email de super admin puede usar esta función',
          yourEmail: userEmail,
          superAdminEmail: superAdminEmail
        },
        { status: 403 }
      );
    }

    // Obtener el perfil actual
    const currentProfile = await getUserProfile(getToken);

    if (!currentProfile) {
      return NextResponse.json(
        { error: 'Perfil no encontrado. Por favor, crea tu perfil primero.' },
        { status: 404 }
      );
    }

    // Actualizar a super admin
    const updatedProfile = await updateUserProfile(currentProfile.id, {
      is_superadmin: true,
      subscription_status: 'active',
      trial_start_date: undefined,
      trial_end_date: undefined,
    }, getToken);

    return NextResponse.json({
      success: true,
      message: 'Perfil actualizado exitosamente a Super Admin',
      profile: updatedProfile,
      previousStatus: {
        is_superadmin: currentProfile.is_superadmin,
        subscription_status: currentProfile.subscription_status,
      },
    });

  } catch (error) {
    console.error('Error forcing superadmin update:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al actualizar perfil' },
      { status: 500 }
    );
  }
}
