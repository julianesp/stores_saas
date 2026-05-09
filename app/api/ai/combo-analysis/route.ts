import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { analyzeFrequentCombos } from '@/lib/ai-insights-helpers';

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || 'https://tienda-pos-api.julii1295.workers.dev';

export async function POST(request: NextRequest) {
  try {
    const { userId, getToken } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { salesItems } = body;

    if (!salesItems || !Array.isArray(salesItems)) {
      return NextResponse.json({ error: 'Items de venta requeridos' }, { status: 400 });
    }

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
    } catch { /* continúa sin key del usuario */ }

    // Analizar combos frecuentes con IA
    const analysis = await analyzeFrequentCombos(salesItems, userApiKey);

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error('Error analyzing combos:', error);
    return NextResponse.json(
      { error: 'Error al analizar combos' },
      { status: 500 }
    );
  }
}
