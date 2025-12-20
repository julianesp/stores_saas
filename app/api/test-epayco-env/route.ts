import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  return NextResponse.json({
    hasPublicKey: !!process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY,
    hasPrivateKey: !!process.env.EPAYCO_PRIVATE_KEY,
    hasPKey: !!process.env.EPAYCO_P_KEY,
    hasCustId: !!process.env.EPAYCO_P_CUST_ID_CLIENTE,
    env: process.env.NEXT_PUBLIC_EPAYCO_ENV,
    publicKeyPreview: process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY?.substring(0, 10) + '...',
    privateKeyPreview: process.env.EPAYCO_PRIVATE_KEY?.substring(0, 10) + '...',
  });
}
