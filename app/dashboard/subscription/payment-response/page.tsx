'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

function PaymentResponseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Obtener parámetros de respuesta de ePayco
    const transactionState = searchParams.get('x_transaction_state');
    const refPayco = searchParams.get('x_ref_payco');
    const response = searchParams.get('x_response');

    console.log('ePayco response:', { transactionState, refPayco, response });

    // Crear query string con todos los parámetros para pasarlos a la página de destino
    const params = new URLSearchParams();
    searchParams.forEach((value, key) => {
      params.append(key, value);
    });

    // Redirigir según el estado
    if (transactionState === 'Aceptada' || response === 'Aceptada') {
      router.push(`/dashboard/subscription/success?${params.toString()}`);
    } else if (transactionState === 'Rechazada' || response === 'Rechazada') {
      router.push(`/dashboard/subscription/failed?${params.toString()}`);
    } else if (transactionState === 'Pendiente' || response === 'Pendiente') {
      // Caso pendiente - mostrar página de pendiente o redirigir al dashboard
      router.push('/dashboard?payment=pending');
    } else {
      // Estado desconocido o cancelado
      router.push(`/dashboard/subscription/failed?${params.toString()}`);
    }
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="flex justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
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
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    }>
      <PaymentResponseContent />
    </Suspense>
  );
}
