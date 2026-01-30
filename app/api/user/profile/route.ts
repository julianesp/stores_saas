import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserProfile } from '@/lib/cloudflare-api';

/**
 * GET /api/user/profile
 * Obtiene el perfil del usuario autenticado (owner de la tienda)
 */
export async function GET(request: NextRequest) {
  try {
    const { getToken, userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Obtener el perfil del usuario
    const profile = await getUserProfile(getToken);

    if (!profile) {
      return NextResponse.json(
        { error: 'Perfil no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(profile);
  } catch (error: any) {
    console.error('Error al obtener perfil:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener perfil' },
      { status: 500 }
    );
  }
}
