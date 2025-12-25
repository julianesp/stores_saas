import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { analyzeFrequentCombos } from '@/lib/ai-insights-helpers';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { salesItems } = body;

    if (!salesItems || !Array.isArray(salesItems)) {
      return NextResponse.json({ error: 'Items de venta requeridos' }, { status: 400 });
    }

    // Analizar combos frecuentes con IA
    const analysis = await analyzeFrequentCombos(salesItems);

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
