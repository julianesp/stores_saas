'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

function PaymentResponseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Conservar todos los params de ePayco para la página de destino.
    const params = new URLSearchParams();
    searchParams.forEach((value, key) => {
      params.append(key, value);
    });

    // ref_payco es el identificador que ePayco SIEMPRE incluye en la
    // redirección (a diferencia de x_transaction_state, que Smart Checkout v2
    // omite a menudo). Con él consultamos el estado REAL en ePayco en lugar de
    // adivinar por los query params: así un pago aprobado nunca se muestra como
    // "rechazado" por un param ausente.
    const refPayco =
      searchParams.get('ref_payco') || searchParams.get('x_ref_payco');

    async function decideDestination() {
      // Sin ref_payco no podemos verificar. Caemos al estado que venga en la
      // URL (mejor que nada) y, si tampoco, a pendiente (nunca "rechazado" a
      // ciegas: eso asusta al cliente que sí pagó).
      if (!refPayco) {
        const urlState =
          searchParams.get('x_transaction_state') ||
          searchParams.get('x_response');
        if (urlState === 'Aceptada') {
          router.push(`/dashboard/subscription/success?${params.toString()}`);
        } else if (urlState === 'Rechazada') {
          router.push(`/dashboard/subscription/failed?${params.toString()}`);
        } else {
          router.push('/dashboard?payment=pending');
        }
        return;
      }

      try {
        const res = await fetch(
          `/api/subscription/payment-status?ref_payco=${encodeURIComponent(refPayco)}`
        );
        const data = await res.json();

        if (data.state === 'approved') {
          router.push(`/dashboard/subscription/success?${params.toString()}`);
        } else if (data.state === 'rejected') {
          router.push(`/dashboard/subscription/failed?${params.toString()}`);
        } else {
          // pending / unknown: el pago puede seguir procesándose. No afirmamos
          // rechazo; llevamos al dashboard con aviso de pendiente. El webhook
          // activará la suscripción cuando ePayco confirme.
          router.push('/dashboard?payment=pending');
        }
      } catch (error) {
        console.error('Error verificando estado del pago:', error);
        router.push('/dashboard?payment=pending');
      }
    }

    decideDestination();
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="flex justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-brand" />
          </div>

          <div>
            <h1 className="text-2xl font-bold">Procesando Pago...</h1>
            <p className="text-gray-600 mt-2">
              Por favor espera mientras verificamos tu pago
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentResponsePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-brand" />
      </div>
    }>
      <PaymentResponseContent />
    </Suspense>
  );
}
