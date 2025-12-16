import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Esta funcionalidad fue deshabilitada.' },
    { status: 410 }
  );
}
