import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/team/test-me
 * Endpoint de prueba para verificar datos del team member
 */
export async function GET() {
  try {
    const { userId } = await auth();

    console.log('🔍 [/api/team/test-me] userId de Clerk:', userId);

    if (!userId) {
      return NextResponse.json({
        error: 'No autorizado',
        userId: null
      }, { status: 401 });
    }

    // Consultar directamente a D1
    const API_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL;
    const { getToken } = await auth();
    const token = await getToken();

    console.log('📡 [/api/team/test-me] Consultando a Cloudflare...');

    // Intentar ambas rutas
    const routes = [
      '/api/team-members/me',
      '/api/team-invitations/me'
    ];

    const results: Record<string, any> = {};

    for (const route of routes) {
      try {
        const url = `${API_URL}${route}`;
        console.log(`🔗 [/api/team/test-me] Probando:`, url);

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();
        results[route] = {
          status: response.status,
          ok: response.ok,
          data
        };

        console.log(`📦 [/api/team/test-me] Respuesta de ${route}:`, data);
      } catch (error) {
        results[route] = {
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    return NextResponse.json({
      userId,
      clerkUserId: userId,
      results,
      message: 'Prueba de endpoints completada'
    });

  } catch (error) {
    console.error('❌ [/api/team/test-me] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
