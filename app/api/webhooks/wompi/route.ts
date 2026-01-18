import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/wompi';

// El webhook de Wompi llamará directamente al Worker de Cloudflare
// que tiene acceso directo a la base de datos
const CLOUDFLARE_API_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL || 'https://tienda-pos-api.julii1295.workers.dev';
const WEBHOOK_SECRET = process.env.WOMPI_INTEGRITY_SECRET || '';

export async function POST(req: NextRequest) {
  try {
    // Obtener el body como texto para verificar la firma
    const body = await req.text();
    const signature = req.headers.get('x-wompi-signature') || '';
    const timestamp = req.headers.get('x-wompi-timestamp') || '';

    console.log('📨 Webhook received from Wompi');
    console.log('Headers:', {
      signature: signature?.substring(0, 20) + '...',
      timestamp,
    });

    // Verificar la firma del webhook
    if (!verifyWebhookSignature(signature, timestamp, body)) {
      console.error('❌ Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parsear el evento
    const event = JSON.parse(body);

    console.log('✅ Valid webhook signature');
    console.log('Event type:', event.event);
    console.log('Transaction data:', event.data);

    // Reenviar al Worker de Cloudflare que tiene acceso directo a la DB
    const workerResponse = await fetch(`${CLOUDFLARE_API_URL}/api/webhooks/wompi`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': WEBHOOK_SECRET,
      },
      body: JSON.stringify(event),
    });

    if (!workerResponse.ok) {
      const errorText = await workerResponse.text();
      console.error('❌ Worker webhook processing failed:', errorText);
      throw new Error(`Worker returned ${workerResponse.status}: ${errorText}`);
    }

    const result = await workerResponse.json();
    console.log('✅ Worker processed webhook successfully:', result);

    return NextResponse.json({ received: true, workerResult: result });
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// El procesamiento real del webhook se hace en el Worker de Cloudflare
// que tiene acceso directo a la base de datos
