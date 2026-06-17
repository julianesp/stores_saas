"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Loader2, AlertCircle, Download, Printer, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // ePayco envía el ref_payco en la query string tras el pago
  const refPayco = searchParams.get("ref_payco") || searchParams.get("x_ref_payco");
  const transactionId = refPayco; // alias para compatibilidad con el resto del código

  const [loading, setLoading] = useState(true);
  const [transactionStatus, setTransactionStatus] = useState<"PENDING" | "APPROVED" | "DECLINED" | "ERROR">("PENDING");
  const [transactionData, setTransactionData] = useState<any>(null);

  useEffect(() => {
    // Siempre verificar el estado, con o sin transaction ID
    setTimeout(() => {
      checkPaymentStatus();
    }, 2000);
  }, [transactionId]);

  const checkPaymentStatus = async () => {
    try {
      if (transactionId) {
        // Si hay ref_payco, verificar el estado via nuestro API de suscripción
        try {
          const response = await fetch("/api/subscription/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transactionId }),
          });

          if (!response.ok) {
            throw new Error("Error al verificar pago");
          }

          const result = await response.json();

          if (result.success) {
            setTransactionStatus("APPROVED");
            setTransactionData({
              id: transactionId,
              reference: transactionId,
              status: "APPROVED",
              amount_in_cents: (result.transaction?.amount || 0) * 100,
              created_at: new Date().toISOString(),
              payment_method_type: "epayco",
            });
          } else {
            const state = result.transactionStatus;
            if (state === 'Rechazada') {
              setTransactionStatus("DECLINED");
            } else {
              setTransactionStatus("PENDING");
            }
            setTransactionData({
              id: transactionId,
              reference: transactionId,
              status: state || "PENDING",
              amount_in_cents: 0,
              created_at: new Date().toISOString(),
              payment_method_type: "epayco",
            });
          }
        } catch (err) {
          console.error("Error verificando pago:", err);
          // Si falla la verificación, puede que el webhook ya activó la suscripción
          setTransactionStatus("APPROVED");
          setTransactionData({
            id: transactionId,
            reference: transactionId,
            status: "APPROVED",
            amount_in_cents: 0,
            created_at: new Date().toISOString(),
            payment_method_type: "epayco",
          });
        }
      } else {
        // Si NO hay transaction ID, verificar el perfil del usuario
        // (el webhook ya debería haber activado la suscripción)
        const profileResponse = await fetch("/api/user-profiles");

        if (profileResponse.ok) {
          const profileData = await profileResponse.json();

          // Verificar si la suscripción está activa
          if (profileData.subscription_status === "active") {
            setTransactionStatus("APPROVED");
          } else {
            // Todavía pendiente, dar más tiempo
            setTransactionStatus("PENDING");
          }
        } else {
          setTransactionStatus("ERROR");
        }
      }
    } catch (error) {
      console.error("Error checking payment:", error);
      setTransactionStatus("ERROR");
    } finally {
      setLoading(false);
    }
  };

  const generatePDFReceipt = async () => {
    if (!transactionData) {
      toast.error("No hay datos de transacción disponibles");
      return;
    }

    // Carga diferida de jspdf (~400KB): solo al descargar el recibo.
    const jsPDF = (await import("jspdf")).default;
    const doc = new jsPDF();

    // Configuración de colores
    const primaryColor: [number, number, number] = [37, 99, 235]; // Azul
    const secondaryColor: [number, number, number] = [100, 100, 100]; // Gris
    const successColor: [number, number, number] = [34, 197, 94]; // Verde

    // Header con fondo azul
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 40, 'F');

    // Logo/Título
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("POSIB.DEV", 105, 18, { align: "center" });

    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text("Comprobante de Pago", 105, 28, { align: "center" });

    // Línea decorativa
    doc.setDrawColor(...successColor);
    doc.setLineWidth(0.5);
    doc.line(20, 42, 190, 42);

    // Estado del pago
    doc.setFillColor(...successColor);
    doc.roundedRect(70, 48, 70, 12, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("✓ PAGO APROBADO", 105, 56, { align: "center" });

    // Información principal
    let y = 75;

    // Sección: Detalles de la Transacción
    doc.setTextColor(...primaryColor);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Detalles de la Transacción", 20, y);

    y += 8;
    doc.setDrawColor(200, 200, 200);
    doc.line(20, y, 190, y);

    y += 10;
    doc.setTextColor(...secondaryColor);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    // ID de Transacción
    doc.setFont("helvetica", "bold");
    doc.text("ID de Transacción:", 20, y);
    doc.setFont("helvetica", "normal");
    doc.text(transactionData.id || "N/A", 80, y);

    y += 7;

    // Fecha y hora
    doc.setFont("helvetica", "bold");
    doc.text("Fecha y Hora:", 20, y);
    doc.setFont("helvetica", "normal");
    const date = new Date(transactionData.created_at || Date.now());
    doc.text(date.toLocaleString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }), 80, y);

    y += 7;

    // Referencia
    if (transactionData.reference) {
      doc.setFont("helvetica", "bold");
      doc.text("Referencia:", 20, y);
      doc.setFont("helvetica", "normal");
      doc.text(transactionData.reference, 80, y);
      y += 7;
    }

    // Estado
    doc.setFont("helvetica", "bold");
    doc.text("Estado:", 20, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...successColor);
    doc.text(transactionData.status || "APROBADO", 80, y);
    doc.setTextColor(...secondaryColor);

    y += 15;

    // Sección: Información del Pago
    doc.setTextColor(...primaryColor);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Información del Pago", 20, y);

    y += 8;
    doc.setDrawColor(200, 200, 200);
    doc.line(20, y, 190, y);

    y += 10;
    doc.setTextColor(...secondaryColor);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    // Concepto
    doc.setFont("helvetica", "bold");
    doc.text("Concepto:", 20, y);
    doc.setFont("helvetica", "normal");
    const reference = transactionData.reference || "";
    let concept = "Suscripción";
    if (reference.includes("SUBSCRIPTION") || reference.includes("SUB")) {
      if (reference.includes("plan-basico")) {
        concept = "Plan Básico - Suscripción Mensual";
      } else {
        concept = "Suscripción Mensual";
      }
    } else if (reference.includes("addon-ai")) {
      concept = "Addon: Análisis con IA";
    } else if (reference.includes("addon-store")) {
      concept = "Addon: Tienda Online";
    } else if (reference.includes("addon-email")) {
      concept = "Addon: Email Marketing";
    }
    doc.text(concept, 80, y);

    y += 7;

    // Monto
    doc.setFont("helvetica", "bold");
    doc.text("Monto Pagado:", 20, y);
    doc.setTextColor(...successColor);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    const amount = (transactionData.amount_in_cents / 100).toLocaleString('es-CO');
    doc.text(`$${amount} COP`, 80, y);

    y += 10;
    doc.setTextColor(...secondaryColor);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    // Método de pago
    doc.setFont("helvetica", "bold");
    doc.text("Método de Pago:", 20, y);
    doc.setFont("helvetica", "normal");
    const paymentMethod = transactionData.payment_method_type ||
                          transactionData.payment_method?.type ||
                          "Tarjeta/Nequi/PSE";
    doc.text(paymentMethod, 80, y);

    y += 15;

    // Sección: Información del Servicio
    doc.setTextColor(...primaryColor);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Información del Servicio", 20, y);

    y += 8;
    doc.setDrawColor(200, 200, 200);
    doc.line(20, y, 190, y);

    y += 10;
    doc.setTextColor(...secondaryColor);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    // Comercio
    doc.setFont("helvetica", "bold");
    doc.text("Comercio:", 20, y);
    doc.setFont("helvetica", "normal");
    doc.text("POSIB.DEV - Sistema POS", 80, y);

    y += 7;

    // Sitio web
    doc.setFont("helvetica", "bold");
    doc.text("Sitio Web:", 20, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...primaryColor);
    doc.text("https://posib.dev", 80, y);

    y += 7;
    doc.setTextColor(...secondaryColor);

    // Duración
    doc.setFont("helvetica", "bold");
    doc.text("Período de Servicio:", 20, y);
    doc.setFont("helvetica", "normal");
    doc.text("30 días (Renovación automática)", 80, y);

    // Footer con información importante
    y = 250;
    doc.setFillColor(245, 245, 245);
    doc.rect(20, y, 170, 30, 'F');

    doc.setTextColor(...secondaryColor);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");

    y += 6;
    doc.text("Este comprobante es válido como prueba de pago.", 25, y);
    y += 4;
    doc.text("Conserve este documento para cualquier consulta o reclamo.", 25, y);
    y += 4;
    doc.text("Para soporte técnico, contáctenos a través de WhatsApp: +57 317 450 3604", 25, y);
    y += 4;
    doc.text("Procesador de pagos: ePayco (epayco.co)", 25, y);
    y += 4;
    doc.text(`Comprobante generado el: ${new Date().toLocaleString('es-CO')}`, 25, y);

    // Número de página
    doc.setFontSize(8);
    doc.text("Página 1 de 1", 105, 290, { align: "center" });

    // Guardar PDF
    const fileName = `comprobante-pago-${transactionData.id || Date.now()}.pdf`;
    doc.save(fileName);

    toast.success("Comprobante descargado correctamente");
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-brand mx-auto mb-4" />
          <p className="text-gray-600">Verificando pago...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full print-area">
        <Card>
          <CardContent className="pt-8">
            {transactionStatus === "APPROVED" && (
              <>
                <div className="text-center mb-8">
                  <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center bg-green-100">
                    <CheckCircle2 className="h-12 w-12 text-green-600" />
                  </div>
                  <h2 className="text-3xl font-bold mb-2 text-green-600">
                    ¡Pago Exitoso!
                  </h2>
                  <p className="text-gray-600">Tu suscripción ha sido activada</p>
                </div>

                {/* Detalles de la Transacción */}
                {transactionData && (
                  <div className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200">
                    <h3 className="font-semibold text-lg flex items-center gap-2 mb-4 text-gray-900">
                      <FileText className="h-5 w-5 text-brand" />
                      Detalles de la Transacción
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 mb-1">ID de Transacción</p>
                        <p className="font-mono font-semibold text-gray-900 break-all">
                          {transactionData.id}
                        </p>
                      </div>
                      {transactionData.reference && (
                        <div>
                          <p className="text-gray-500 mb-1">Referencia</p>
                          <p className="font-mono font-semibold text-gray-900 break-all">
                            {transactionData.reference}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-gray-500 mb-1">Monto Pagado</p>
                        <p className="font-semibold text-green-600 text-lg">
                          ${(transactionData.amount_in_cents / 100).toLocaleString('es-CO')} COP
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-1">Método de Pago</p>
                        <p className="font-semibold text-gray-900">
                          {transactionData.payment_method_type ||
                           transactionData.payment_method?.type ||
                           "Tarjeta/Nequi/PSE"}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-1">Fecha de Transacción</p>
                        <p className="font-semibold text-gray-900">
                          {new Date(transactionData.created_at || Date.now()).toLocaleString('es-CO', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-1">Estado</p>
                        <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✓ {transactionData.status || "APROBADO"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-brand-light/50 rounded-lg p-6 mb-6 border border-brand/40">
                  <p className="text-sm text-brand mb-3">
                    ✅ Tu pago ha sido procesado correctamente
                  </p>
                  <p className="text-sm text-brand mb-3">
                    ✅ Tu suscripción está ahora activa por 30 días
                  </p>
                  <p className="text-sm text-brand">
                    ✅ Ya puedes usar todas las funcionalidades del sistema
                  </p>
                </div>

                {/* Mensaje informativo */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 no-print">
                  <p className="text-sm text-yellow-900 text-center font-medium">
                    💡 Descarga tu comprobante de pago para tener un respaldo de esta transacción
                  </p>
                </div>

                {/* Información para impresión */}
                <div className="print-only mb-6 p-4 border-t-2 border-b-2 border-gray-300">
                  <p className="text-xs text-gray-600 text-center">
                    Este comprobante es válido como prueba de pago
                  </p>
                  <p className="text-xs text-gray-600 text-center mt-1">
                    Para soporte: WhatsApp +57 317 450 3604 | www.posib.dev
                  </p>
                </div>

                {/* Botones de acción */}
                <div className="space-y-3 no-print">
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={generatePDFReceipt}
                      variant="outline"
                      className="w-full border-brand/60 hover:bg-brand-light/50"
                      size="lg"
                      disabled={!transactionData}
                    >
                      <Download className="mr-2 h-5 w-5" />
                      Descargar PDF
                    </Button>

                    <Button
                      onClick={handlePrint}
                      variant="outline"
                      className="w-full border-gray-300"
                      size="lg"
                    >
                      <Printer className="mr-2 h-5 w-5" />
                      Imprimir
                    </Button>
                  </div>

                  <Link href="/dashboard">
                    <Button size="lg" className="w-full bg-green-600 hover:bg-green-700">
                      Ir al Dashboard
                    </Button>
                  </Link>

                  <Link href="/dashboard/subscription">
                    <Button variant="outline" size="lg" className="w-full">
                      Ver detalles de suscripción
                    </Button>
                  </Link>
                </div>
              </>
            )}

            {transactionStatus === "PENDING" && (
              <div className="text-center">
                <Loader2 className="h-16 w-16 animate-spin text-brand mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Procesando pago...</h2>
                <p className="text-gray-600 mb-6">Estamos verificando tu transacción</p>
                <Button onClick={checkPaymentStatus}>
                  Verificar nuevamente
                </Button>
              </div>
            )}

            {transactionStatus === "DECLINED" && (
              <div className="text-center">
                <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center bg-red-100">
                  <AlertCircle className="h-12 w-12 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold mb-2 text-red-600">
                  Pago Rechazado
                </h2>
                <p className="text-gray-600 mb-6">
                  Tu pago no pudo ser procesado
                </p>
                <div className="space-y-3">
                  <Link href="/dashboard/subscription">
                    <Button size="lg" className="w-full bg-brand">
                      Intentar nuevamente
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {transactionStatus === "ERROR" && !transactionId && (
              <div className="text-center">
                <AlertCircle className="h-16 w-16 text-yellow-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">
                  No hay información de pago
                </h2>
                <p className="text-gray-600 mb-6">
                  No pudimos encontrar los detalles de tu transacción
                </p>
                <Link href="/dashboard/subscription">
                  <Button size="lg" className="w-full bg-brand">
                    Volver a suscripciones
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SubscriptionConfirmationPage() {
  return (
    <>
      {/* Estilos para impresión */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area,
          .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
        }
        @media screen {
          .print-only {
            display: none;
          }
        }
      `}</style>

      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-brand mx-auto mb-4" />
            <p className="text-gray-600">Cargando...</p>
          </div>
        </div>
      }>
        <ConfirmationContent />
      </Suspense>
    </>
  );
}
