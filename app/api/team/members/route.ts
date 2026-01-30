import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL;

/**
 * GET /api/team/members
 * Obtiene todos los miembros del equipo del usuario actual
 */
export async function GET() {
  try {
    const { userId, getToken } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = await getToken();

    // Obtener todos los miembros del equipo
    const response = await fetch(`${API_URL}/api/team-invitations`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Error al obtener miembros del equipo');
    }

    const result = await response.json();

    // El Worker devuelve { success: true, data: [...] }
    // Extraemos solo el array de datos
    const members = result.data || [];

    return NextResponse.json(members);
  } catch (error) {
    console.error('Error en GET /api/team/members:', error);
    return NextResponse.json(
      { error: 'Error al obtener miembros del equipo' },
      { status: 500 }
    );
  }
}
