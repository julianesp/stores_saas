import { NextResponse } from 'next/server';

// Wompi fue reemplazado por ePayco. Use /api/test-epayco-env
export async function GET() {
  return NextResponse.json(
    { error: 'Endpoint obsoleto. Use /api/test-epayco-env.' },
    { status: 410 }
  );
}
