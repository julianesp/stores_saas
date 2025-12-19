import { NextResponse } from 'next/server';

/**
 * API endpoint para crear categorías de muestra
 * NOTA: Deshabilitado - retorna éxito sin hacer nada para no bloquear otros flujos
 */
export async function POST() {
  return NextResponse.json({
    success: true,
    message: 'Endpoint desactivado. Crear categorías desde la interfaz.',
  });
}
