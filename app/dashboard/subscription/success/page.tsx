'use client';

import { useEffect, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, Download, Printer, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { formatEpaycoDate, type SubscriptionReceipt } from '@/lib/subscription-receipt-pdf';

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [autoRedirect, setAutoRedirect] = useState(true);

  // Obtener parámetros de ePayco
  const refPayco = searchParams.get('x_ref_payco') || searchParams.get('ref_payco');
  const transactionId = searchParams.get('x_transaction_id') || searchParams.get('transaction_id');
  const amount = searchParams.get('x_amount') || searchParams.get('amount');
  const transactionDate = searchParams.get('x_transaction_date') || searchParams.get('transaction_date');
  const approvalCode = searchParams.get('x_approval_code') || searchParams.get('approval_code');
  const franchise = searchParams.get('x_franchise') || searchParams.get('franchise');

  useEffect(() => {
    if (!autoRedirect) return;

    // Redirigir al dashboard después de 10 segundos
    const timeout = setTimeout(() => {
      router.push('/dashboard');
    }, 10000);

    return () => clearTimeout(timeout);
  }, [router, autoRedirect]);

  // La redirección de ePayco casi solo trae ref_payco: los datos reales del
  // comprobante (monto, fecha, aprobación, pagador) se piden al servidor, que los
  // valida con ePayco y comprueba que el pago es de esta cuenta.
  const [receipt, setReceipt] = useState<SubscriptionReceipt | null>(null);
  const [receiptError, setReceiptError] = useState<string | null>(
    refPayco ? null : 'Falta la referencia del pago'
  );
  const [building, setBuilding] = useState(false);

  useEffect(() => {
    if (!refPayco) return;
    let cancelled = false;
    fetch(`/api/subscription/receipt?ref_payco=${encodeURIComponent(refPayco)}`)
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok) setReceipt(json as SubscriptionReceipt);
        else setReceiptError(json?.error || 'No se pudo cargar el comprobante');
      })
      .catch(() => {
        if (!cancelled) setReceiptError('No se pudo cargar el comprobante');
      });
    return () => {
      cancelled = true;
    };
  }, [refPayco]);

  const buildPdf = async () => {
    setAutoRedirect(false);
    if (!receipt) {
      toast.error(receiptError || 'El comprobante aún se está cargando, intenta en un momento');
      return null;
    }
    setBuilding(true);
    try {
      const { generateSubscriptionReceiptPDF } = await import('@/lib/subscription-receipt-pdf');
      return await generateSubscriptionReceiptPDF(receipt);
    } catch (error) {
      console.error('Error generando el comprobante:', error);
      toast.error('No se pudo generar el PDF');
      return null;
    } finally {
      setBuilding(false);
    }
  };

  const handleDownloadReceipt = async () => {
    const doc = await buildPdf();
    if (!doc || !receipt) return;
    doc.save(`comprobante-posib-${receipt.refPayco}.pdf`);
    toast.success('Comprobante descargado');
  };

  const handlePrint = async () => {
    const doc = await buildPdf();
    if (!doc) return;
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  };

  const shownAmount = receipt ? receipt.amount : amount ? parseFloat(amount) : null;
  const shownApproval = receipt?.approvalCode || approvalCode;
  const shownMethod = receipt?.paymentMethod || franchise;
  const shownTransactionId = receipt?.transactionId || transactionId;
  const shownDate = receipt?.transactionDate
    ? formatEpaycoDate(receipt.transactionDate)
    : transactionDate
      ? new Date(transactionDate).toLocaleString('es-CO')
      : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-brand-light/50 flex items-center justify-center p-4">
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
              {shownTransactionId && (
                <div>
                  <p className="text-gray-500">ID de Transacción</p>
                  <p className="font-mono font-semibold">{shownTransactionId}</p>
                </div>
              )}
              {refPayco && (
                <div>
                  <p className="text-gray-500">Referencia ePayco</p>
                  <p className="font-mono font-semibold">{receipt?.refPayco || refPayco}</p>
                </div>
              )}
              {shownAmount != null && (
                <div>
                  <p className="text-gray-500">Monto Pagado</p>
                  <p className="font-semibold text-green-600 text-lg">
                    {formatCurrency(shownAmount)}
                  </p>
                </div>
              )}
              {shownApproval && (
                <div>
                  <p className="text-gray-500">Código de Aprobación</p>
                  <p className="font-mono font-semibold">{shownApproval}</p>
                </div>
              )}
              {shownMethod && (
                <div>
                  <p className="text-gray-500">Método de Pago</p>
                  <p className="font-semibold">{shownMethod}</p>
                </div>
              )}
              {shownDate && (
                <div>
                  <p className="text-gray-500">Fecha de Transacción</p>
                  <p className="font-semibold">{shownDate}</p>
                </div>
              )}
            </div>
          </div>

          {/* Mensaje de confirmación */}
          <div className="p-4 bg-brand-light/50 rounded-lg border border-brand/40">
            <p className="text-sm text-brand text-center font-medium">
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
                disabled={building || (!receipt && !receiptError)}
              >
                <Download className="mr-2 h-5 w-5" />
                {receipt || receiptError ? 'Descargar PDF' : 'Cargando...'}
              </Button>

              <Button
                onClick={handlePrint}
                variant="outline"
                className="w-full"
                size="lg"
                disabled={building || (!receipt && !receiptError)}
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
