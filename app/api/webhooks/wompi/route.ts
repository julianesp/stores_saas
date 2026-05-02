import { NextResponse } from 'next/server';

// Wompi ha sido reemplazado por ePayco.
// Los webhooks de pagos de suscripción van a /api/webhooks/epayco
// Los webhooks de pagos de tienda online van al Cloudflare Worker directamente.
export async function POST() {
  return NextResponse.json(
    { error: 'Este endpoint está desactivado. Use /api/webhooks/epayco.' },
    { status: 410 }
  );
}
