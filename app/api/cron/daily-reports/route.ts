import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Endpoint para generar reportes diarios automáticamente
 * Este endpoint debe ser llamado por un cron job a las 8 PM
 *
 * Para Vercel: Configurar Vercel Cron en vercel.json
 *
 * NOTA: Este endpoint está simplificado por ahora.
 * Los reportes se descargan manualmente desde la interfaz de usuario.
 * En el futuro se puede agregar:
 * - Generación automática de reportes
 * - Almacenamiento en Cloudflare R2
 * - Envío por email
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar token de seguridad para cron jobs
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'default-secret-change-this';

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({
        error: 'No autorizado'
      }, { status: 401 });
    }

    const today = new Date().toISOString().split('T')[0];

    // Por ahora, solo registramos que el cron se ejecutó
    console.log(`[CRON] Daily reports cron executed for date: ${today}`);

    // TODO: Implementar lógica de generación automática:
    // 1. Obtener todos los user_profiles con auto_reports_enabled=true
    // 2. Para cada usuario, generar su reporte del día
    // 3. Guardar en Cloudflare R2 o enviar por email
    // 4. Registrar en una tabla de logs

    return NextResponse.json({
      message: 'Cron job ejecutado correctamente',
      date: today,
      note: 'Los reportes se descargan manualmente por ahora'
    });

  } catch (error) {
    console.error('Error in cron job:', error);
    return NextResponse.json({
      error: 'Error al ejecutar cron job',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
