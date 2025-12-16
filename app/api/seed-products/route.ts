import { NextResponse } from 'next/server';

/**
 * API endpoint para crear productos de muestra
 * NOTA: Deshabilitado temporalmente - usar interfaz de productos para crear manualmente
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Esta funcionalidad fue movida a Cloudflare. Por favor cree productos manualmente desde la interfaz.' },
    { status: 410 }
  );
}
