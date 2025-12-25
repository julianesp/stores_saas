import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { generateProductRecommendations } from '@/lib/ai-insights-helpers';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { currentInventory, storeType } = body;

    if (!currentInventory) {
      return NextResponse.json({ error: 'Inventario requerido' }, { status: 400 });
    }

    // Generar recomendaciones de productos con IA
    const recommendations = await generateProductRecommendations(
      currentInventory,
      storeType || 'Tienda general'
    );

    return NextResponse.json({
      success: true,
      recommendations,
    });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return NextResponse.json(
      { error: 'Error al generar recomendaciones' },
      { status: 500 }
    );
  }
}
