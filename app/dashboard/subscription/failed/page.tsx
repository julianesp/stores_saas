'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, AlertCircle, FileText, RefreshCw } from 'lucide-react';
import { Suspense } from 'react';

function FailedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Obtener parámetros de ePayco
  const refPayco = searchParams.get('x_ref_payco') || searchParams.get('ref_payco');
  const transactionId = searchParams.get('x_transaction_id') || searchParams.get('transaction_id');
  const responseReason = searchParams.get('x_response_reason_text') || searchParams.get('response_reason_text');
  const transactionDate = searchParams.get('x_transaction_date') || searchParams.get('transaction_date');
  const amount = searchParams.get('x_amount') || searchParams.get('amount');

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full shadow-xl border-2 border-red-200">
        <CardHeader className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-t-lg">
          <div className="flex items-center justify-center mb-4">
            <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center">
              <XCircle className="h-12 w-12 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-center text-3xl font-bold">
            Pago Rechazado
          </CardTitle>
          <p className="text-center text-red-100 mt-2">
            No se pudo procesar tu pago
          </p>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* Razón del rechazo */}
          {responseReason && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900 mb-1">Motivo del rechazo:</p>
                  <p className="text-sm text-red-800">{responseReason}</p>
                </div>
              </div>
            </div>
          )}

          {/* Detalles de la transacción (si están disponibles) */}
          {(transactionId || refPayco || amount) && (
            <div className="bg-gray-50 rounded-lg p-6 space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Detalles de la Transacción
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {transactionId && (
                  <div>
                    <p className="text-gray-500">ID de Transacción</p>
                    <p className="font-mono font-semibold">{transactionId}</p>
                  </div>
                )}
                {refPayco && (
                  <div>
                    <p className="text-gray-500">Referencia ePayco</p>
                    <p className="font-mono font-semibold">{refPayco}</p>
                  </div>
                )}
                {amount && (
                  <div>
                    <p className="text-gray-500">Monto Intentado</p>
                    <p className="font-semibold">${parseFloat(amount).toLocaleString('es-CO')}</p>
                  </div>
                )}
                {transactionDate && (
                  <div>
                    <p className="text-gray-500">Fecha</p>
                    <p className="font-semibold">{new Date(transactionDate).toLocaleString('es-CO')}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Información adicional */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900 font-medium mb-2">
              ¿Por qué falló mi pago?
            </p>
            <ul className="text-sm text-blue-800 space-y-1 ml-4 list-disc">
              <li>Fondos insuficientes en tu cuenta</li>
              <li>Datos de tarjeta incorrectos</li>
              <li>Límite de transacciones excedido</li>
              <li>Tarjeta bloqueada o vencida</li>
              <li>Conexión interrumpida durante el proceso</li>
            </ul>
          </div>

          {/* Sugerencias */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-900 font-medium mb-2">
              💡 Recomendaciones:
            </p>
            <ul className="text-sm text-yellow-800 space-y-1 ml-4 list-disc">
              <li>Verifica los datos de tu tarjeta</li>
              <li>Asegúrate de tener fondos suficientes</li>
              <li>Intenta con otro método de pago (Nequi, PSE, etc.)</li>
              <li>Contacta a tu banco si el problema persiste</li>
            </ul>
          </div>

          {/* Botones de acción */}
          <div className="space-y-3 pt-4">
            <Button
              onClick={() => router.push('/dashboard/subscription')}
              className="w-full bg-red-600 hover:bg-red-700"
              size="lg"
            >
              <RefreshCw className="mr-2 h-5 w-5" />
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

          {/* Soporte */}
          <div className="text-center pt-4 border-t">
            <p className="text-sm text-gray-600">
              ¿Necesitas ayuda? Contáctanos a{' '}
              <a href="mailto:soporte@tienda-pos.com" className="text-blue-600 hover:underline">
                soporte@tienda-pos.com
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentFailedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando...</div>}>
      <FailedContent />
    </Suspense>
  );
}
