import { NextRequest, NextResponse } from 'next/server';

/**
 * CRON Job que se ejecuta diariamente para verificar suscripciones
 * y enviar notificaciones de recordatorio de pago
 *
 * Este endpoint debe ser llamado por un servicio CRON externo
 * (ej: Vercel Cron, cron-job.org, etc.)
 */

const CLOUDFLARE_API_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL || 'https://tienda-pos-api.julii1295.workers.dev';
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  try {
    // Verificar el secret del CRON para seguridad
    const authHeader = req.headers.get('authorization');
    const providedSecret = authHeader?.replace('Bearer ', '');

    if (!CRON_SECRET || providedSecret !== CRON_SECRET) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    console.log('🕐 CRON: Verificando suscripciones...');

    // Llamar al Worker de Cloudflare para procesar las notificaciones
    const response = await fetch(`${CLOUDFLARE_API_URL}/api/subscriptions/check-expiring`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CRON_SECRET}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error en worker:', errorText);
      throw new Error(`Worker returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    console.log('✅ CRON completado:', result);

    return NextResponse.json({
      success: true,
      message: 'Verificación de suscripciones completada',
      ...result,
    });

  } catch (error) {
    console.error('❌ Error en CRON de suscripciones:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
