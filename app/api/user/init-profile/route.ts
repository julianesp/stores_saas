import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getUserProfileByClerkId } from '@/lib/subscription-helpers';
import { createUserProfile, updateUserProfile, getAllUserProfiles } from '@/lib/cloudflare-api';

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

    const getToken = async () => {
      const { getToken } = await auth();
      return getToken();
    };

    // Verificar si el perfil ya existe por clerk_user_id
    let existingProfile = await getUserProfileByClerkId(userId);

    if (existingProfile) {
      // Si el email es admin@neurai.dev, actualizar a superadmin
      if (isSuperAdmin && !existingProfile.is_superadmin) {
        await updateUserProfile(existingProfile.id, {
          is_superadmin: true,
          subscription_status: 'active',
          trial_start_date: undefined,
          trial_end_date: undefined,
        }, getToken);

        return NextResponse.json({
          success: true,
          profile: { ...existingProfile, is_superadmin: true, subscription_status: 'active' },
          message: 'Perfil actualizado a Super Admin',
        });
      }

      return NextResponse.json({
        success: true,
        profile: existingProfile,
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

          return NextResponse.json({
            success: true,
            profile: { ...profileByEmail, clerk_user_id: userId, is_superadmin: true },
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
