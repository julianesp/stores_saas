import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/api-auth';

/**
 * Diagnóstico de configuración de ePayco.
 * Solo super admin, y nunca expone fragmentos de las claves.
 */
export async function GET() {
  const admin = await requireSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  return NextResponse.json({
    hasPublicKey: !!process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY,
    hasPrivateKey: !!process.env.EPAYCO_PRIVATE_KEY,
    hasPKey: !!process.env.EPAYCO_P_KEY,
    hasCustId: !!process.env.EPAYCO_P_CUST_ID_CLIENTE,
    env: process.env.NEXT_PUBLIC_EPAYCO_ENV,
  });
}
