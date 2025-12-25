import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { generateBusinessInsights } from '@/lib/ai-insights-helpers';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { salesData, customerData, daysAnalyzed } = body;

    if (!salesData || !customerData) {
      return NextResponse.json({ error: 'Datos requeridos' }, { status: 400 });
    }

    // Generar insights con IA
    const insights = await generateBusinessInsights(salesData, customerData, daysAnalyzed || 30);

    return NextResponse.json({
      success: true,
      insights,
    });
  } catch (error) {
    console.error('Error generating insights:', error);
    return NextResponse.json(
      { error: 'Error al generar insights' },
      { status: 500 }
    );
  }
}
