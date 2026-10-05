import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { createUserProfile, getUserProfile } from '@/lib/cloudflare-api';

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

    // Obtener información del usuario de Clerk
    const user = await currentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const userEmail = user.emailAddresses[0]?.emailAddress || '';

    // Este endpoint NUNCA concede superadmin: el flag solo lo tiene
    // admin@neurai.dev y lo asigna el Worker al crear su perfil.

    const getToken = async () => {
      const { getToken } = await auth();
      return getToken();
    };

    // Verificar si el perfil ya existe obteniendo el perfil del usuario actual
    let existingProfile = null;
    try {
      existingProfile = await getUserProfile(getToken);
      console.log('[init-profile] existingProfile encontrado:', {
        id: existingProfile?.id,
        email: existingProfile?.email,
        is_superadmin: existingProfile?.is_superadmin,
        type: typeof existingProfile?.is_superadmin
      });
    } catch (error) {
      console.log('[init-profile] No se encontró perfil existente para el usuario');
    }

    if (existingProfile) {
      // Normalizar is_superadmin a boolean
      const normalizedProfile = {
        ...existingProfile,
        is_superadmin: !!existingProfile.is_superadmin,
      };

      console.log('[init-profile] normalizedProfile.is_superadmin:', normalizedProfile.is_superadmin);

      console.log('[init-profile] Retornando perfil normalizado:', {
        is_superadmin: normalizedProfile.is_superadmin,
        email: normalizedProfile.email
      });

      return NextResponse.json({
        success: true,
        profile: normalizedProfile,
        message: 'Perfil ya existe',
      });
    }

    // Crear nuevo perfil
    const now = new Date();
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 30); // 30 días de prueba

    const newProfile = await createUserProfile({
      clerk_user_id: userId,
      email: userEmail,
      full_name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Usuario',
      role: 'admin', // Por defecto, el primer usuario es admin
      is_superadmin: false,
      subscription_status: 'trial',
      trial_start_date: now.toISOString(),
      trial_end_date: trialEnd.toISOString(),
    }, getToken);

    return NextResponse.json({
      success: true,
      profile: newProfile,
      message: 'Perfil creado exitosamente',
    });
  } catch (error) {
    console.error('Error initializing user profile:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error al inicializar el perfil';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
