import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/wompi';
import { activateSubscription, getUserProfileByClerkId } from '@/lib/subscription-helpers';
import { createDocument, queryDocuments, updateDocument } from '@/lib/firestore-helpers';
import { PaymentTransaction } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    // Obtener el body como texto para verificar la firma
    const body = await req.text();
    const signature = req.headers.get('x-wompi-signature') || '';
    const timestamp = req.headers.get('x-wompi-timestamp') || '';

    // Verificar la firma del webhook
    if (!verifyWebhookSignature(signature, timestamp, body)) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parsear el evento
    const event = JSON.parse(body);

    console.log('Wompi webhook received:', event.event);

    // Manejar diferentes tipos de eventos
    switch (event.event) {
      case 'transaction.updated':
        await handleTransactionUpdated(event.data);
        break;

      default:
        console.log('Unhandled webhook event:', event.event);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleTransactionUpdated(transaction: any) {
  try {
    const { id, status, reference, amount_in_cents, payment_method_type } = transaction;

    // Buscar si ya existe esta transacción
    const existingTransactions = await queryDocuments('payment_transactions', [
      { field: 'wompi_transaction_id', operator: '==', value: id }
    ]);

    // Extraer el user ID del reference (formato: SUB-userId-timestamp)
    const referenceParts = reference.split('-');
    if (referenceParts.length < 2) {
      console.error('Invalid reference format:', reference);
      return;
    }

    // Buscar el user_profile por la referencia
    // El formato es SUB-{primeros8caracteresDelId}-{timestamp}
    const userProfiles = await queryDocuments('user_profiles', []);
    const userProfile = userProfiles.find((profile: any) =>
      reference.includes(profile.id.substring(0, 8))
    );

    if (!userProfile) {
      console.error('User profile not found for reference:', reference);
      return;
    }

    // Crear o actualizar la transacción en Firestore
    const transactionData: Omit<PaymentTransaction, 'id' | 'created_at'> = {
      user_profile_id: userProfile.id,
      wompi_transaction_id: id,
      amount: amount_in_cents / 100,
      currency: 'COP',
      status,
      payment_method_type,
      reference,
    };

    if (existingTransactions.length > 0) {
      // Actualizar transacción existente
      await updateDocument('payment_transactions', existingTransactions[0].id, {
        status,
      });
    } else {
      // Crear nueva transacción
      await createDocument('payment_transactions', transactionData);
    }

    // Si el pago fue aprobado, activar la suscripción
    if (status === 'APPROVED') {
      await activateSubscription(userProfile.id, id);
      console.log('Subscription activated for user:', userProfile.id);
    }

    // Si el pago fue declinado o tiene error, marcar como expirado
    if (status === 'DECLINED' || status === 'ERROR') {
      await updateDocument('user_profiles', userProfile.id, {
        subscription_status: 'expired'
      });
      console.log('Subscription marked as expired for user:', userProfile.id);
    }
  } catch (error) {
    console.error('Error handling transaction update:', error);
    throw error;
  }
}
