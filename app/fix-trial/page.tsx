'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, CheckCircle, AlertCircle, Loader2, Clock } from 'lucide-react';

export default function FixTrialPage() {
  const { user } = useUser();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<any>(null);

  const fixTrial = async () => {
    try {
      setStatus('loading');
      setResult(null);

      const response = await fetch('/api/user/fix-trial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setResult(data);

        // Si se corrigió, redirigir después de 3 segundos
        if (data.fixed) {
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 3000);
        }
      } else {
        setStatus('error');
        setResult(data);
      }
    } catch (error) {
      setStatus('error');
      setResult({ error: 'Error de conexión' });
      console.error('Error:', error);
    }
  };

  const userEmail = user?.emailAddresses[0]?.emailAddress || '';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100">
            <Clock className="h-10 w-10 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Diagnóstico de Período de Prueba</CardTitle>
          <p className="text-sm text-gray-500 mt-2">
            {userEmail}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'idle' && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>¿Qué hace esta herramienta?</strong>
                </p>
                <ul className="text-sm text-blue-700 mt-2 list-disc list-inside space-y-1">
                  <li>Verifica el estado de tu suscripción</li>
                  <li>Diagnostica problemas con el período de prueba</li>
                  <li>Corrige automáticamente configuraciones incorrectas</li>
                  <li>Te otorga 30 días de prueba si es necesario</li>
                </ul>
              </div>

              <Button
                onClick={fixTrial}
                className="w-full"
                size="lg"
              >
                <Shield className="mr-2 h-5 w-5" />
                Diagnosticar y Corregir
              </Button>
            </>
          )}

          {status === 'loading' && (
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600" />
              <p className="mt-4 text-gray-600">Diagnosticando tu cuenta...</p>
            </div>
          )}

          {status === 'success' && result && (
            <div className="space-y-4">
              <div className="text-center py-6">
                {result.fixed ? (
                  <>
                    <CheckCircle className="h-16 w-16 mx-auto text-green-600" />
                    <p className="mt-4 text-lg font-semibold text-green-900">
                      ¡Período de prueba corregido!
                    </p>
                    <p className="mt-2 text-sm text-gray-600">
                      {result.message}
                    </p>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-16 w-16 mx-auto text-blue-600" />
                    <p className="mt-4 text-lg font-semibold text-blue-900">
                      Todo está en orden
                    </p>
                    <p className="mt-2 text-sm text-gray-600">
                      {result.message}
                    </p>
                  </>
                )}
              </div>

              {/* Información de diagnóstico */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-sm mb-3">Diagnóstico:</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estado:</span>
                    <span className="font-medium">{result.diagnostico?.subscription_status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">{result.diagnostico?.email}</span>
                  </div>
                  {result.daysRemaining !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Días restantes:</span>
                      <span className="font-medium text-green-600">{result.daysRemaining} días</span>
                    </div>
                  )}
                  {result.fixMessage && (
                    <div className="mt-3 pt-3 border-t">
                      <span className="text-gray-600">Problema corregido:</span>
                      <p className="text-orange-600 font-medium mt-1">{result.fixMessage}</p>
                    </div>
                  )}
                </div>
              </div>

              {result.fixed && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <p className="text-sm text-green-900">
                    ✅ Ahora tienes <strong>{result.daysRemaining} días</strong> de acceso completo
                  </p>
                  <p className="text-xs text-green-700 mt-2">
                    Redirigiendo al dashboard...
                  </p>
                </div>
              )}

              {!result.fixed && (
                <Button
                  onClick={() => window.location.href = '/dashboard'}
                  variant="outline"
                  className="w-full"
                >
                  Volver al Dashboard
                </Button>
              )}
            </div>
          )}

          {status === 'error' && result && (
            <div className="space-y-4">
              <div className="text-center py-8">
                <AlertCircle className="h-16 w-16 mx-auto text-red-600" />
                <p className="mt-4 text-lg font-semibold text-red-900">Error</p>
                <p className="mt-2 text-sm text-red-700">
                  {result.error || 'Ocurrió un error inesperado'}
                </p>
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
        </CardContent>
      </Card>
    </div>
  );
}
