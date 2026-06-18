import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserProfile, getAllUserProfiles, updateUserProfile } from '@/lib/cloudflare-api';

export const runtime = 'nodejs';

/**
 * Endpoint para promover un usuario a Super Admin
 * Solo puede ser ejecutado por usuarios que ya son Super Admin
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

    // Verificar que el usuario autenticado es superadmin
    const adminProfile = await getUserProfile(getToken);

    if (!adminProfile || !adminProfile.is_superadmin) {
      return NextResponse.json(
        { error: 'Solo super administradores pueden promover a otros usuarios' },
        { status: 403 }
      );
    }

    // Obtener el email del usuario a promover
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email es requerido' },
        { status: 400 }
      );
    }

    // Buscar el usuario por email
    const allProfiles = await getAllUserProfiles(getToken);
    const targetProfile = allProfiles.find(p => p.email.toLowerCase() === email.toLowerCase());

    if (!targetProfile) {
      return NextResponse.json(
        { error: `No se encontró un usuario con el email: ${email}` },
        { status: 404 }
      );
    }

    // Verificar si ya es super admin
    if (targetProfile.is_superadmin) {
      return NextResponse.json(
        { error: `El usuario ${email} ya es super administrador` },
        { status: 400 }
      );
    }

    // Promover a super admin
    await updateUserProfile(targetProfile.id, {
      is_superadmin: true,
      role: 'admin', // Asegurar que tenga rol de admin
    }, getToken);

    console.log(`✅ Usuario ${email} promovido a Super Admin por ${adminProfile.email}`);

    return NextResponse.json({
      success: true,
      message: `Usuario ${email} promovido a Super Admin correctamente`,
    });

  } catch (error) {
    console.error('[set-superadmin] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al promover usuario a Super Admin' },
      { status: 500 }
    );
  }
}
