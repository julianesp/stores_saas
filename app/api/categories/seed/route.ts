import { NextResponse } from 'next/server';

/**
 * API endpoint para crear categorías de muestra
 * NOTA: Deshabilitado temporalmente - usar interfaz de categorías para crear manualmente
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Esta funcionalidad fue movida a Cloudflare. Por favor cree categorías manualmente desde la interfaz.' },
    { status: 410 }
  );
}
