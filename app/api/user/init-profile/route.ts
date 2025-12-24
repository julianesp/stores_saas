import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { createUserProfile, updateUserProfile, getAllUserProfiles, getUserProfile } from '@/lib/cloudflare-api';

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
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@neurai.dev';
    const isSuperAdmin = userEmail === superAdminEmail;

    console.log('[init-profile] userEmail:', userEmail);
    console.log('[init-profile] isSuperAdmin:', isSuperAdmin);

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

      // Si el email es admin@neurai.dev, actualizar a superadmin
      if (isSuperAdmin && !normalizedProfile.is_superadmin) {
        await updateUserProfile(existingProfile.id, {
          is_superadmin: true,
          subscription_status: 'active',
          trial_start_date: undefined,
          trial_end_date: undefined,
        }, getToken);

        return NextResponse.json({
          success: true,
          profile: { ...normalizedProfile, is_superadmin: true, subscription_status: 'active' },
          message: 'Perfil actualizado a Super Admin',
        });
      }

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

    // Si no existe por clerk_user_id, buscar por email (para el caso de admin@neurai.dev)
    if (isSuperAdmin) {
      try {
        // Intentar obtener todos los perfiles y buscar por email
        const allProfiles = await getAllUserProfiles(getToken);
        const profileByEmail = allProfiles.find(p => p.email === userEmail);

        if (profileByEmail) {
          // Actualizar el clerk_user_id del perfil existente
          await updateUserProfile(profileByEmail.id, {
            clerk_user_id: userId,
            is_superadmin: true,
            subscription_status: 'active',
          }, getToken);

          // Normalizar is_superadmin a boolean
          const normalizedProfile = {
            ...profileByEmail,
            clerk_user_id: userId,
            is_superadmin: true,
          };

          return NextResponse.json({
            success: true,
            profile: normalizedProfile,
            message: 'Perfil de Super Admin asociado a tu cuenta de Clerk',
          });
        }
      } catch (error) {
        console.error('Error buscando perfil por email:', error);
      }
    }

    // Crear nuevo perfil
    const now = new Date();
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 15); // 15 días de prueba

    const newProfile = await createUserProfile({
      clerk_user_id: userId,
      email: userEmail,
      full_name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Usuario',
      role: 'admin', // Por defecto, el primer usuario es admin
      is_superadmin: isSuperAdmin,
      subscription_status: isSuperAdmin ? 'active' : 'trial', // Super admin tiene acceso ilimitado
      trial_start_date: isSuperAdmin ? undefined : now.toISOString(),
      trial_end_date: isSuperAdmin ? undefined : trialEnd.toISOString(),
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
