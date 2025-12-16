import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { error: 'Esta funcionalidad de debug fue deshabilitada.' },
    { status: 410 }
  );
}
