'use client';

import { useRouter } from 'next/navigation';
import { AlertTriangle, Clock, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ExpirationAlertProps {
  type: 'trial' | 'subscription';
  daysLeft: number;
}

export function ExpirationAlert({ type, daysLeft }: ExpirationAlertProps) {
  const router = useRouter();

  // Solo mostrar si faltan 3 días o menos
  if (daysLeft > 3) {
    return null;
  }

  const isTrial = type === 'trial';
  const isUrgent = daysLeft <= 1;

  return (
    <Card
      className={`border-2 ${
        isUrgent
          ? 'border-red-400 bg-red-50'
          : 'border-orange-400 bg-orange-50'
      }`}
    >
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-full ${
            isUrgent ? 'bg-red-100' : 'bg-orange-100'
          }`}>
            {isUrgent ? (
              <AlertTriangle className={`h-6 w-6 ${isUrgent ? 'text-red-600' : 'text-orange-600'}`} />
            ) : (
              <Clock className="h-6 w-6 text-orange-600" />
            )}
          </div>

          <div className="flex-1">
            <h3 className={`font-semibold text-lg ${
              isUrgent ? 'text-red-900' : 'text-orange-900'
            }`}>
              {isTrial
                ? `Tu período de prueba termina en ${daysLeft} ${daysLeft === 1 ? 'día' : 'días'}`
                : `Tu suscripción vence en ${daysLeft} ${daysLeft === 1 ? 'día' : 'días'}`
              }
            </h3>

            <p className={`mt-2 text-sm ${
              isUrgent ? 'text-red-800' : 'text-orange-800'
            }`}>
              {isTrial
                ? 'No pierdas acceso a todas las funciones del sistema. Suscríbete ahora y continúa gestionando tu negocio sin interrupciones.'
                : 'Renueva tu suscripción para continuar usando el sistema sin interrupciones. Toda tu información se mantendrá segura.'
              }
            </p>

            <div className="mt-4 flex gap-3">
              <Button
                size="sm"
                onClick={() => router.push('/dashboard/subscription')}
                className={
                  isUrgent
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-orange-600 hover:bg-orange-700'
                }
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {isTrial ? 'Ver Planes' : 'Renovar Ahora'}
              </Button>

              {!isUrgent && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    // Cerrar temporalmente (podrías usar localStorage para no mostrar por X tiempo)
                  }}
                >
                  Recordarme mañana
                </Button>
              )}
            </div>
          </div>
        </div>

        {!isTrial && (
          <div className="mt-4 pt-4 border-t border-orange-200">
            <p className="text-xs text-orange-700">
              💡 <strong>Tranquilo:</strong> Tu información está segura. Aunque la suscripción expire,
              no perderás tus datos. Podrás recuperar el acceso al renovar tu plan.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
