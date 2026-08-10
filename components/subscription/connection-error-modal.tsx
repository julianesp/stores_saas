'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WifiOff, RefreshCw, LogOut } from 'lucide-react';
import { useClerk } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Se muestra cuando NO pudimos verificar el estado de la cuenta por un fallo de
 * red o de autenticación con la API (p. ej. el Worker devuelve Unauthorized).
 *
 * Es distinto de "suscripción expirada": aquí el problema es técnico/temporal,
 * así que NO empujamos al usuario a pagar; le ofrecemos reintentar o volver a
 * iniciar sesión (que renueva el token de Clerk, causa habitual del problema).
 */
export function ConnectionErrorModal() {
  const router = useRouter();
  const { signOut } = useClerk();
  const [retrying, setRetrying] = useState(false);

  const handleRetry = () => {
    setRetrying(true);
    // Recargar la página fuerza a re-obtener un token fresco de Clerk y a
    // repetir la verificación de perfil/tiendas.
    router.refresh();
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const handleReLogin = async () => {
    try {
      await signOut(() => router.push('/sign-in'));
    } catch {
      router.push('/sign-in');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="h-16 w-16 bg-amber-100 rounded-full flex items-center justify-center">
              <WifiOff className="h-8 w-8 text-amber-600" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl">
            No pudimos verificar tu sesión
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-gray-600">
            Hubo un problema temporal al conectar con el servidor. Esto{' '}
            <strong>no</strong> afecta tu suscripción ni tus datos. Vuelve a
            intentarlo; si el problema continúa, cierra sesión y vuelve a
            iniciarla.
          </p>

          <div className="space-y-3 pt-4">
            <Button
              className="w-full"
              size="lg"
              onClick={handleRetry}
              disabled={retrying}
            >
              <RefreshCw
                className={`mr-2 h-5 w-5 ${retrying ? 'animate-spin' : ''}`}
              />
              {retrying ? 'Reintentando...' : 'Reintentar'}
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleReLogin}
            >
              <LogOut className="mr-2 h-5 w-5" />
              Cerrar sesión e iniciar de nuevo
            </Button>
          </div>

          <div className="mt-6 p-4 bg-brand-light/50 rounded-lg">
            <p className="text-sm text-brand text-center">
              💡 <strong>¿Sigue sin funcionar?</strong> Contáctanos por WhatsApp
              y lo revisamos.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
