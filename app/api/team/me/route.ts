import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL;

/**
 * GET /api/team/me
 * Obtiene el perfil del TeamMember actual (si el usuario es un colaborador)
 */
export async function GET() {
  try {
    const { userId, getToken } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = await getToken();

    // Intentar obtener el perfil de TeamMember
    const response = await fetch(`${API_URL}/api/team-members/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Si no es un TeamMember, devolver 404
      return NextResponse.json(
        { error: 'No es un miembro del equipo' },
        { status: 404 }
      );
    }

    const teamMember = await response.json();

    return NextResponse.json(teamMember);
  } catch (error) {
    console.error('Error en GET /api/team/me:', error);
    return NextResponse.json(
      { error: 'Error al obtener perfil de miembro del equipo' },
      { status: 500 }
    );
  }
}
