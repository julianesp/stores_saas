import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserProfile } from '@/lib/cloudflare-api';

export async function GET() {
  try {
    const { getToken } = await auth();

    if (!getToken) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const profile = await getUserProfile(getToken);

    return NextResponse.json(profile);
  } catch (error: any) {
    console.error('Error getting user profile:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener el perfil' },
      { status: 500 }
    );
  }
}
