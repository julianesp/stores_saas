import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getUserProfile } from '@/lib/cloudflare-api';

/**
 * Endpoint de diagnóstico para verificar el estado actual del usuario
 */
export async function GET(req: NextRequest) {
  try {
    const { userId, getToken } = await auth();

    if (!userId) {
      return NextResponse.json({
        authenticated: false,
        message: 'No autenticado'
      });
    }

    const user = await currentUser();
    const userEmail = user?.emailAddresses[0]?.emailAddress || '';
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@neurai.dev';

    // Obtener el perfil actual
    let currentProfile = null;
    try {
      currentProfile = await getUserProfile(getToken);
    } catch (error) {
      console.error('Error getting profile:', error);
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: userId,
        email: userEmail,
        firstName: user?.firstName,
        lastName: user?.lastName,
      },
      profile: currentProfile ? {
        id: currentProfile.id,
        email: currentProfile.email,
        is_superadmin: currentProfile.is_superadmin,
        subscription_status: currentProfile.subscription_status,
        role: currentProfile.role,
      } : null,
      environment: {
        superAdminEmail: superAdminEmail,
        isConfiguredSuperAdmin: userEmail === superAdminEmail,
      },
      diagnosis: {
        hasProfile: !!currentProfile,
        isSuperAdmin: currentProfile?.is_superadmin || false,
        needsUpdate: userEmail === superAdminEmail && !currentProfile?.is_superadmin,
      },
    });

  } catch (error) {
    console.error('Error checking status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al verificar estado' },
      { status: 500 }
    );
  }
}
