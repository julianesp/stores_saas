'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Redirigir al dashboard después de 5 segundos
    const timeout = setTimeout(() => {
      router.push('/dashboard');
    }, 5000);

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl">
            ¡Pago Procesado Exitosamente!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-gray-600">
            Tu suscripción ha sido activada. Gracias por confiar en nuestro Sistema POS.
          </p>

          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800 text-center">
              Recibirás un email de confirmación con los detalles de tu suscripción.
            </p>
          </div>

          <div className="space-y-3 pt-4">
            <Button
              className="w-full"
              size="lg"
              onClick={() => router.push('/dashboard')}
            >
              Ir al Dashboard
            </Button>

            <p className="text-xs text-center text-gray-500">
              Serás redirigido automáticamente en 5 segundos...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
