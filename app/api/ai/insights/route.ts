import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { generateBusinessInsights } from '@/lib/ai-insights-helpers';

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || 'https://tienda-pos-api.julii1295.workers.dev';

export async function POST(request: NextRequest) {
  try {
    const { userId, getToken } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { salesData, customerData, daysAnalyzed } = body;

    if (!salesData || !customerData) {
      return NextResponse.json({ error: 'Datos requeridos' }, { status: 400 });
    }

    // Obtener la API key del perfil del usuario
    let userApiKey: string | undefined;
    try {
      const token = await getToken();
      const profileRes = await fetch(`${WORKER_URL}/api/user-profiles/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        userApiKey = profileData.data?.gemini_api_key || profileData.gemini_api_key;
      }
    } catch { /* si falla, continúa sin key del usuario */ }

    // Generar insights con IA
    const insights = await generateBusinessInsights(salesData, customerData, daysAnalyzed || 30, userApiKey);

    return NextResponse.json({
      success: true,
      insights,
    });
  } catch (error) {
    console.error('Error generating insights:', error);

    // Propagar el mensaje de error específico
    const errorMessage = error instanceof Error ? error.message : 'Error al generar insights';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
