'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function AdminUpgradePage() {
  const { user } = useUser();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [secret, setSecret] = useState('');

  const upgradeToSuperAdmin = async () => {
    try {
      setStatus('loading');
      setMessage('Actualizando tu perfil...');

      const response = await fetch('/api/user/force-superadmin-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-bootstrap-secret': secret,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus('success');
        setMessage(data.message || '¡Perfil actualizado exitosamente!');

        // Redirigir al dashboard después de 2 segundos
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 2000);
      } else {
        setStatus('error');
        setMessage(data.error || 'Error al actualizar el perfil');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Error de conexión. Intenta de nuevo.');
      console.error('Error:', error);
    }
  };

  const userEmail = user?.emailAddresses[0]?.emailAddress || '';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-purple-100">
            <Shield className="h-10 w-10 text-purple-600" />
          </div>
          <CardTitle className="text-2xl">Actualizar a Super Admin</CardTitle>
          <p className="text-sm text-gray-500 mt-2">
            {userEmail || 'No has iniciado sesión'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'idle' && (
            <>
              <div className="bg-brand-light/50 border border-brand/40 rounded-lg p-4">
                <p className="text-sm text-brand">
                  <strong>¿Qué hace esto?</strong>
                </p>
                <p className="text-sm text-brand mt-1">
                  Bootstrap del primer Super Admin. Requiere el secreto configurado
                  en la variable de entorno SUPERADMIN_BOOTSTRAP_SECRET. Úsalo una sola vez;
                  después promueve a otros administradores desde el panel.
                </p>
              </div>

              <div className="space-y-1">
                <label htmlFor="bootstrap-secret" className="text-sm font-medium text-gray-700">
                  Secreto de bootstrap
                </label>
                <input
                  id="bootstrap-secret"
                  type="password"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="SUPERADMIN_BOOTSTRAP_SECRET"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  autoComplete="off"
                />
              </div>

              <Button
                onClick={upgradeToSuperAdmin}
                className="w-full"
                size="lg"
                disabled={!secret}
              >
                <Shield className="mr-2 h-5 w-5" />
                Actualizar a Super Admin
              </Button>
            </>
          )}

          {status === 'loading' && (
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-brand" />
              <p className="mt-4 text-gray-600">{message}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 mx-auto text-green-600" />
              <p className="mt-4 text-lg font-semibold text-green-900">{message}</p>
              <p className="mt-2 text-sm text-gray-600">
                Redirigiendo al dashboard...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="text-center py-8">
                <AlertCircle className="h-16 w-16 mx-auto text-red-600" />
                <p className="mt-4 text-lg font-semibold text-red-900">Error</p>
                <p className="mt-2 text-sm text-red-700">{message}</p>
              </div>
              <Button
                onClick={() => setStatus('idle')}
                variant="outline"
                className="w-full"
              >
                Intentar de nuevo
              </Button>
            </div>
          )}

          <div className="pt-4 border-t">
            <p className="text-xs text-gray-500 text-center">
              Requiere el secreto SUPERADMIN_BOOTSTRAP_SECRET. Solo para el arranque inicial.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
