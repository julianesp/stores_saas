'use client';

import { useRouter } from 'next/navigation';
import { AlertTriangle, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SubscriptionExpiredModalProps {
  reason: string;
}

export function SubscriptionExpiredModal({ reason }: SubscriptionExpiredModalProps) {
  const router = useRouter();

  const getMessage = () => {
    switch (reason) {
      case 'trial_expired':
        return {
          title: 'Tu período de prueba ha expirado',
          description:
            'Gracias por probar nuestro Sistema POS. Para continuar usando todas las funciones, por favor suscríbete a uno de nuestros planes.',
        };
      case 'expired':
        return {
          title: 'Tu suscripción ha expirado',
          description:
            'Tu suscripción necesita ser renovada para continuar usando el sistema. Por favor, renueva tu plan para seguir disfrutando de todas las funciones.',
        };
      case 'canceled':
        return {
          title: 'Tu suscripción ha sido cancelada',
          description:
            'Tu suscripción fue cancelada. Para volver a acceder al sistema, por favor suscríbete nuevamente.',
        };
      default:
        return {
          title: 'Acceso restringido',
          description: 'Necesitas una suscripción activa para acceder al sistema.',
        };
    }
  };

  const message = getMessage();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="h-16 w-16 bg-orange-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl">{message.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-gray-600">{message.description}</p>

          <div className="space-y-3 pt-4">
            <Button
              className="w-full"
              size="lg"
              onClick={() => router.push('/dashboard/subscription')}
            >
              <CreditCard className="mr-2 h-5 w-5" />
              Ver Planes y Suscribirse
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push('/')}
            >
              Volver al Inicio
            </Button>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800 text-center">
              💡 <strong>¿Necesitas ayuda?</strong> Contáctanos por email o WhatsApp
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
