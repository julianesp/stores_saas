import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getUserProfile, createUserProfile } from '@/lib/cloudflare-api';

/**
 * Sincroniza el perfil del usuario actual. Se llama automáticamente desde el
 * dashboard layout.
 *
 * IMPORTANTE: este endpoint NO concede el privilegio de superadmin basándose en
 * el email. El flag `is_superadmin` es la fuente de verdad y solo se otorga a
 * través del bootstrap protegido por secreto (/api/user/force-superadmin-update)
 * o por un superadmin existente (/api/admin/set-superadmin). Aquí únicamente se
 * garantiza que exista un perfil para el usuario autenticado.
 */
export async function POST() {
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

    // Intentar obtener el perfil actual
    let currentProfile = null;
    try {
      currentProfile = await getUserProfile(getToken);
    } catch {
      console.log('Perfil no encontrado, se creará uno nuevo');
    }

    // Si ya existe el perfil, no tocamos privilegios: solo reportamos el estado.
    if (currentProfile) {
      return NextResponse.json({
        upgraded: false,
        message: 'Perfil ya existe',
        isSuperAdmin: !!currentProfile.is_superadmin,
        profile: currentProfile,
      });
    }

    // Si no existe el perfil, crear uno normal (sin superadmin ni suscripción activa).
    const newProfile = await createUserProfile({
      clerk_user_id: userId,
      email: userEmail,
      full_name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || userEmail,
      role: 'admin',
      is_superadmin: false,
    }, getToken);

    return NextResponse.json({
      upgraded: false,
      message: 'Perfil creado',
      isSuperAdmin: false,
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
