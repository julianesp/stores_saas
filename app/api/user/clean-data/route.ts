import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Esta funcionalidad de administración fue deshabilitada.' },
    { status: 410 }
  );
}
