'use client';

import { useEffect, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, Download, Printer, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [autoRedirect, setAutoRedirect] = useState(true);

  // Obtener parámetros de ePayco
  const refPayco = searchParams.get('x_ref_payco') || searchParams.get('ref_payco');
  const transactionId = searchParams.get('x_transaction_id') || searchParams.get('transaction_id');
  const amount = searchParams.get('x_amount') || searchParams.get('amount');
  const currency = searchParams.get('x_currency_code') || searchParams.get('currency_code') || 'COP';
  const transactionDate = searchParams.get('x_transaction_date') || searchParams.get('transaction_date');
  const approvalCode = searchParams.get('x_approval_code') || searchParams.get('approval_code');
  const franchise = searchParams.get('x_franchise') || searchParams.get('franchise');
  const cardNumber = searchParams.get('x_card_number') || searchParams.get('card_number');

  useEffect(() => {
    if (!autoRedirect) return;

    // Redirigir al dashboard después de 10 segundos
    const timeout = setTimeout(() => {
      router.push('/dashboard');
    }, 10000);

    return () => clearTimeout(timeout);
  }, [router, autoRedirect]);

  const handleDownloadReceipt = () => {
    setAutoRedirect(false);

    const receiptData = {
      title: 'RECIBO DE PAGO - SUSCRIPCIÓN',
      date: transactionDate || new Date().toLocaleString('es-CO'),
      transactionId: transactionId || 'N/A',
      reference: refPayco || 'N/A',
      amount: amount || '0',
      currency: currency,
      approvalCode: approvalCode || 'N/A',
      paymentMethod: franchise || 'Nequi/Tarjeta',
      cardNumber: cardNumber || 'N/A',
      status: 'APROBADO',
      merchant: 'Tienda POS',
      service: 'Suscripción Plan Básico',
    };

    // Crear contenido de texto para descargar
    const receiptText = `
═══════════════════════════════════════
    ${receiptData.title}
═══════════════════════════════════════

DETALLES DE LA TRANSACCIÓN
───────────────────────────────────────
Fecha:              ${receiptData.date}
ID Transacción:     ${receiptData.transactionId}
Referencia:         ${receiptData.reference}
Código Aprobación:  ${receiptData.approvalCode}

INFORMACIÓN DEL PAGO
───────────────────────────────────────
Servicio:           ${receiptData.service}
Monto:              ${formatCurrency(parseFloat(receiptData.amount))}
Método de Pago:     ${receiptData.paymentMethod}
${receiptData.cardNumber !== 'N/A' ? `Tarjeta:            ${receiptData.cardNumber}` : ''}
Estado:             ${receiptData.status} ✓

COMERCIO
───────────────────────────────────────
Nombre:             ${receiptData.merchant}

═══════════════════════════════════════
    Gracias por tu pago
    www.tienda-pos.vercel.app
═══════════════════════════════════════
    `;

    // Crear y descargar archivo
    const blob = new Blob([receiptText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `recibo-${transactionId || refPayco || 'pago'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Recibo descargado correctamente');
  };

  const handlePrint = () => {
    setAutoRedirect(false);
    window.print();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full shadow-xl border-2 border-green-200">
        <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-lg">
          <div className="flex items-center justify-center mb-4">
            <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-center text-3xl font-bold">
            ¡Pago Procesado Exitosamente!
          </CardTitle>
          <p className="text-center text-green-100 mt-2">
            Tu suscripción ha sido activada
          </p>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* Detalles de la transacción */}
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
                  <p className="text-gray-500">Monto Pagado</p>
                  <p className="font-semibold text-green-600 text-lg">
                    {formatCurrency(parseFloat(amount))}
                  </p>
                </div>
              )}
              {approvalCode && (
                <div>
                  <p className="text-gray-500">Código de Aprobación</p>
                  <p className="font-mono font-semibold">{approvalCode}</p>
                </div>
              )}
              {franchise && (
                <div>
                  <p className="text-gray-500">Método de Pago</p>
                  <p className="font-semibold">{franchise}</p>
                </div>
              )}
              {transactionDate && (
                <div>
                  <p className="text-gray-500">Fecha de Transacción</p>
                  <p className="font-semibold">{new Date(transactionDate).toLocaleString('es-CO')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Mensaje de confirmación */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900 text-center font-medium">
              ✉️ Recibirás un email de confirmación con los detalles de tu suscripción
            </p>
          </div>

          {/* Botones de acción */}
          <div className="space-y-3 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleDownloadReceipt}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <Download className="mr-2 h-5 w-5" />
                Descargar Recibo
              </Button>

              <Button
                onClick={handlePrint}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <Printer className="mr-2 h-5 w-5" />
                Imprimir
              </Button>
            </div>

            <Button
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
              onClick={() => router.push('/dashboard')}
            >
              Ir al Dashboard
            </Button>

            {autoRedirect && (
              <p className="text-xs text-center text-gray-500">
                Serás redirigido automáticamente en 10 segundos...
              </p>
            )}
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
