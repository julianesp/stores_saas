import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL;

/**
 * POST /api/team/accept-invitation
 * Acepta una invitación y crea el TeamMember
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, getToken } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = await getToken();
    const body = await request.json();

    const { invitationToken } = body;

    if (!invitationToken) {
      return NextResponse.json(
        { error: 'Token de invitación requerido' },
        { status: 400 }
      );
    }

    // Aceptar la invitación en la base de datos
    const response = await fetch(`${API_URL}/api/team-invitations/accept`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: invitationToken,
        clerk_user_id: userId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al aceptar la invitación');
    }

    const result = await response.json();

    return NextResponse.json({
      message: 'Invitación aceptada exitosamente',
      teamMember: result.teamMember,
    });
  } catch (error) {
    console.error('Error en POST /api/team/accept-invitation:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Error al aceptar la invitación'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/team/accept-invitation?token=xxx
 * Obtiene información de una invitación sin aceptarla (para preview)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const invitationToken = searchParams.get('token');

    if (!invitationToken) {
      return NextResponse.json(
        { error: 'Token de invitación requerido' },
        { status: 400 }
      );
    }

    // Obtener información de la invitación
    const response = await fetch(
      `${API_URL}/api/team-invitations/validate?token=${invitationToken}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Invitación no válida');
    }

    const invitation = await response.json();

    return NextResponse.json(invitation);
  } catch (error) {
    console.error('Error en GET /api/team/accept-invitation:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Error al validar la invitación'
      },
      { status: 500 }
    );
  }
}
