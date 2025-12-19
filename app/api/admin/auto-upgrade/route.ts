import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getUserProfile, updateUserProfile, createUserProfile } from '@/lib/cloudflare-api';

/**
 * Endpoint que automáticamente actualiza o crea el perfil del super admin
 * Se llama automáticamente desde el dashboard layout si detecta que el usuario es admin@neurai.dev
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
      return NextResponse.json({
        upgraded: false,
        message: 'No eres el super admin',
        isSuperAdmin: false,
      });
    }

    // Intentar obtener el perfil actual
    let currentProfile = null;
    try {
      currentProfile = await getUserProfile(getToken);
    } catch (error) {
      console.log('Perfil no encontrado, se creará uno nuevo');
    }

    // Si ya es superadmin, no hacer nada
    if (currentProfile?.is_superadmin) {
      return NextResponse.json({
        upgraded: false,
        message: 'Ya eres super admin',
        isSuperAdmin: true,
        profile: currentProfile,
      });
    }

    // Si existe el perfil pero no es superadmin, actualizar
    if (currentProfile) {
      const updatedProfile = await updateUserProfile(currentProfile.id, {
        is_superadmin: true,
        subscription_status: 'active',
        trial_start_date: undefined,
        trial_end_date: undefined,
      }, getToken);

      return NextResponse.json({
        upgraded: true,
        message: 'Perfil actualizado a super admin',
        isSuperAdmin: true,
        profile: updatedProfile,
      });
    }

    // Si no existe el perfil, crear uno nuevo
    const newProfile = await createUserProfile({
      clerk_user_id: userId,
      email: userEmail,
      full_name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Admin',
      role: 'admin',
      is_superadmin: true,
      subscription_status: 'active',
    }, getToken);

    return NextResponse.json({
      upgraded: true,
      message: 'Perfil de super admin creado',
      isSuperAdmin: true,
      profile: newProfile,
    });

  } catch (error) {
    console.error('Error in auto-upgrade:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al actualizar' },
      { status: 500 }
    );
  }
}
