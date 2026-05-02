import { NextResponse } from 'next/server';

// Este endpoint usaba Wompi y fue reemplazado por /api/subscription/verify-payment (ePayco)
export async function POST() {
  return NextResponse.json(
    { error: 'Endpoint obsoleto. Use /api/subscription/verify-payment.' },
    { status: 410 }
  );
}
