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
      console.log('❌ [/api/team/me] No userId');
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = await getToken();

    // Intentar obtener el perfil de TeamMember
    console.log('🔍 [/api/team/me] Llamando a Cloudflare API...');
    const response = await fetch(`${API_URL}/api/team-members/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('📡 [/api/team/me] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ [/api/team/me] Error response:', errorText);
      // Si no es un TeamMember, devolver 404
      return NextResponse.json(
        { error: 'No es un miembro del equipo' },
        { status: 404 }
      );
    }

    const data = await response.json();
    console.log('📦 [/api/team/me] Respuesta de Cloudflare:', data);
    console.log('✅ [/api/team/me] Team member encontrado:', {
      hasData: !!data.data,
      hasDataDirectly: !!data.email,
      email: data.data?.email || data.email,
      role: data.data?.role || data.role,
      permissions: data.data?.permissions || data.permissions
    });

    // Devolver solo los datos del team member (sin el wrapper success/data)
    const teamMemberData = data.data || data;
    console.log('📤 [/api/team/me] Enviando al cliente:', teamMemberData);
    return NextResponse.json(teamMemberData);
  } catch (error) {
    console.error('❌ [/api/team/me] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener perfil de miembro del equipo' },
      { status: 500 }
    );
  }
}
