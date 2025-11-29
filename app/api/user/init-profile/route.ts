import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getUserProfileByClerkId } from '@/lib/subscription-helpers';
import { createDocument, updateDocument } from '@/lib/firestore-helpers';

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
    const isSuperAdmin = userEmail === 'admin@neural.dev';

    // Verificar si el perfil ya existe
    const existingProfile = await getUserProfileByClerkId(userId);

    if (existingProfile) {
      // Si el email es admin@neurai.dev, actualizar a superadmin
      if (isSuperAdmin && !existingProfile.is_superadmin) {
        await updateDocument('user_profiles', existingProfile.id, {
          is_superadmin: true,
          subscription_status: 'active',
          trial_start_date: undefined,
          trial_end_date: undefined,
        });

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

    // Crear nuevo perfil
    const now = new Date();
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 30); // 30 días de prueba

    const newProfile = await createDocument('user_profiles', {
      clerk_user_id: userId,
      email: userEmail,
      full_name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Usuario',
      role: 'admin', // Por defecto, el primer usuario es admin
      is_superadmin: isSuperAdmin,
      subscription_status: isSuperAdmin ? 'active' : 'trial', // Super admin tiene acceso ilimitado
      trial_start_date: isSuperAdmin ? undefined : now.toISOString(),
      trial_end_date: isSuperAdmin ? undefined : trialEnd.toISOString(),
    });

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
