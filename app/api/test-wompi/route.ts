import { NextResponse } from 'next/server';
import { WOMPI_CONFIG, createPaymentLink } from '@/lib/wompi';

/**
 * Endpoint de prueba para verificar la configuración de Wompi
 */
export async function GET() {
  try {
    // Verificar que las credenciales estén configuradas
    const diagnostics = {
      hasPublicKey: !!WOMPI_CONFIG.publicKey,
      hasPrivateKey: !!WOMPI_CONFIG.privateKey,
      hasIntegritySecret: !!WOMPI_CONFIG.integritySecret,
      apiUrl: WOMPI_CONFIG.apiUrl,
      publicKeyPrefix: WOMPI_CONFIG.publicKey?.substring(0, 20) + '...',
      privateKeyPrefix: WOMPI_CONFIG.privateKey?.substring(0, 20) + '...',
    };

    // Intentar crear un payment link de prueba
    try {
      const testPaymentLink = await createPaymentLink({
        amount: 29900,
        currency: 'COP',
        reference: `TEST-${Date.now()}`,
        customerEmail: 'test@example.com',
        redirectUrl: 'https://example.com/success',
      });

      return NextResponse.json({
        success: true,
        message: '✅ Wompi está configurado correctamente',
        diagnostics,
        testPaymentLink: {
          id: testPaymentLink.data?.id,
          permalink: testPaymentLink.data?.id
            ? `https://checkout.wompi.co/l/${testPaymentLink.data.id}`
            : null,
          hasData: !!testPaymentLink.data,
        },
      });
    } catch (paymentError) {
      return NextResponse.json({
        success: false,
        message: '❌ Error al crear payment link',
        diagnostics,
        error: paymentError instanceof Error ? paymentError.message : String(paymentError),
      }, { status: 500 });
    }

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }, { status: 500 });
  }
}
