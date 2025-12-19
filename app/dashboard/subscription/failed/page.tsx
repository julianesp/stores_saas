'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';

export default function PaymentFailedPage() {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-red-100 p-3">
              <XCircle className="h-12 w-12 text-red-600" />
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-red-900">Pago Rechazado</h1>
            <p className="text-gray-600 mt-2">
              No se pudo procesar tu pago
            </p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              El pago fue rechazado o cancelado. Por favor, intenta nuevamente con otro método de pago.
            </p>
          </div>

          <div className="space-y-2 pt-4">
            <Button
              onClick={() => router.push('/dashboard/subscription')}
              className="w-full"
              size="lg"
            >
              Intentar Nuevamente
            </Button>

            <Button
              onClick={() => router.push('/dashboard')}
              variant="outline"
              className="w-full"
              size="lg"
            >
              Volver al Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
