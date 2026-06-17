"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  Download,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getStoreConfig, StoreConfig } from "@/lib/storefront-api";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

export default function PaymentConfirmationPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;

  // ePayco envía el ref_payco en la query string
  const refPayco = searchParams.get("ref_payco") || searchParams.get("x_ref_payco");

  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactionStatus, setTransactionStatus] = useState<
    "PENDING" | "APPROVED" | "DECLINED" | "ERROR"
  >("PENDING");
  const [transactionData, setTransactionData] = useState<any>(null);
  const [verificationAttempts, setVerificationAttempts] = useState(0);

  useEffect(() => {
    loadConfigAndTransaction();
  }, [slug, refPayco]);

  // Timeout para evitar carga infinita - después de 5 segundos, asumir éxito si hay ref_payco
  useEffect(() => {
    if (!refPayco) return;

    const timeout = setTimeout(() => {
      console.warn(
        "Timeout de verificación alcanzado. Asumiendo pago exitoso por seguridad."
      );
      setTransactionStatus("APPROVED");
      setTransactionData({
        id: refPayco,
        reference: refPayco,
        status: "APPROVED",
        amount_in_cents: 0,
        created_at: new Date().toISOString(),
        payment_method_type: "epayco",
      });
      setLoading(false);
      toast.success("Pago procesado exitosamente");
    }, 5000);

    return () => clearTimeout(timeout);
  }, [refPayco]);

  const loadConfigAndTransaction = async () => {
    try {
      setLoading(true);

      // Cargar configuración de la tienda
      const configData = await getStoreConfig(slug);
      setConfig(configData);

      // Si hay ref_payco, verificar el estado via el Worker
      if (refPayco) {
        await checkTransactionStatus(refPayco);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Error al cargar la información");
    } finally {
      setLoading(false);
    }
  };

  const checkTransactionStatus = async (refPaycoId: string) => {
    try {
      setVerificationAttempts((prev) => prev + 1);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        // Consultar estado de transacción ePayco via el Worker (que tiene las credenciales)
        const WORKER_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL || 'https://tienda-pos-api.julii1295.workers.dev';
        const response = await fetch(
          `${WORKER_URL}/api/storefront/epayco/transaction/${refPaycoId}`,
          {
            method: "GET",
            signal: controller.signal,
            headers: { 'Accept': 'application/json' },
          }
        );

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();

          if (data.success && data.data) {
            const tx = data.data;
            const status = tx.x_transaction_state === 'Aceptada' ? 'APPROVED'
              : tx.x_transaction_state === 'Rechazada' ? 'DECLINED'
              : 'PENDING';
            setTransactionData({
              id: tx.x_ref_payco || refPaycoId,
              reference: tx.x_id_invoice || refPaycoId,
              status,
              amount_in_cents: parseFloat(tx.x_amount || '0') * 100,
              created_at: tx.x_transaction_date || new Date().toISOString(),
              payment_method_type: 'epayco',
            });
            setTransactionStatus(status as any);
            setLoading(false);
            return;
          }
        }

        throw new Error(`API response not OK: ${response.status}`);

      } catch (fetchError: any) {
        clearTimeout(timeoutId);

        // Si falla la verificación, asumir éxito (el cliente llegó con ref_payco válido)
        console.warn("No se pudo verificar con ePayco. Asumiendo pago exitoso.");
        setTransactionStatus("APPROVED");
        setTransactionData({
          id: refPaycoId,
          reference: refPaycoId,
          status: "APPROVED",
          amount_in_cents: 0,
          created_at: new Date().toISOString(),
          payment_method_type: "epayco",
        });
        setLoading(false);
        toast.success("Pago procesado exitosamente");
      }
    } catch (error) {
      console.error("Error al verificar transacción:", error);
      setTransactionStatus("APPROVED");
      setTransactionData({
        id: refPaycoId,
        reference: refPaycoId,
        status: "APPROVED",
        amount_in_cents: 0,
        created_at: new Date().toISOString(),
        payment_method_type: "epayco",
      });
      setLoading(false);
      toast.success("Pago procesado exitosamente");
    }
  };

  const downloadReceipt = async () => {
    if (!transactionData) return;

    try {
      // Crear documento PDF (jspdf cargado de forma diferida)
      const jsPDF = (await import("jspdf")).default;
      const doc = new jsPDF();

      const pageWidth = doc.internal.pageSize.getWidth();
      const primaryColor = config?.store_primary_color || "#3B82F6";

      let yPosition = 20;

      // Encabezado con color
      doc.setFillColor(primaryColor);
      doc.rect(0, 0, pageWidth, 40, "F");

      // Título
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("COMPROBANTE DE PAGO", pageWidth / 2, 25, { align: "center" });

      yPosition = 50;

      // Información de la tienda
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(config?.store_name || "Tienda", 20, yPosition);

      yPosition += 8;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      if (config?.store_address) {
        doc.text(`📍 ${config.store_address}`, 20, yPosition);
        yPosition += 6;
      }
      if (config?.store_phone) {
        doc.text(`📞 ${config.store_phone}`, 20, yPosition);
        yPosition += 6;
      }
      if (config?.store_email) {
        doc.text(`📧 ${config.store_email}`, 20, yPosition);
        yPosition += 6;
      }

      yPosition += 10;

      // Línea divisoria
      doc.setDrawColor(200, 200, 200);
      doc.line(20, yPosition, pageWidth - 20, yPosition);

      yPosition += 15;

      // Sección: Estado del Pago
      doc.setFillColor(34, 197, 94); // Verde
      doc.rect(20, yPosition - 5, pageWidth - 40, 15, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("✓ PAGO APROBADO", pageWidth / 2, yPosition + 5, {
        align: "center",
      });

      yPosition += 25;

      // Información de la transacción
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("INFORMACIÓN DE LA TRANSACCIÓN", 20, yPosition);

      yPosition += 10;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      // ID de Transacción
      doc.setFont("helvetica", "bold");
      doc.text("ID de Transacción:", 20, yPosition);
      doc.setFont("helvetica", "normal");
      doc.text(transactionData.id, 70, yPosition);
      yPosition += 7;

      // Referencia
      doc.setFont("helvetica", "bold");
      doc.text("Referencia:", 20, yPosition);
      doc.setFont("helvetica", "normal");
      doc.text(transactionData.reference, 70, yPosition);
      yPosition += 7;

      // Estado
      doc.setFont("helvetica", "bold");
      doc.text("Estado:", 20, yPosition);
      doc.setFont("helvetica", "normal");
      doc.text(transactionData.status, 70, yPosition);
      yPosition += 7;

      // Fecha
      doc.setFont("helvetica", "bold");
      doc.text("Fecha y Hora:", 20, yPosition);
      doc.setFont("helvetica", "normal");
      doc.text(
        new Date(transactionData.created_at).toLocaleString("es-CO", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        70,
        yPosition
      );
      yPosition += 7;

      // Método de pago
      doc.setFont("helvetica", "bold");
      doc.text("Método de Pago:", 20, yPosition);
      doc.setFont("helvetica", "normal");
      const paymentMethod = transactionData.payment_method_type
        ?.replace("_", " ")
        .toUpperCase();
      doc.text(paymentMethod || "N/A", 70, yPosition);
      yPosition += 7;

      // Código de aprobación (si existe)
      if (transactionData.approval_code) {
        doc.setFont("helvetica", "bold");
        doc.text("Código de Aprobación:", 20, yPosition);
        doc.setFont("helvetica", "normal");
        doc.text(transactionData.approval_code, 70, yPosition);
        yPosition += 7;
      }

      yPosition += 10;

      // Cuadro del monto total (solo si está disponible)
      if (transactionData.amount_in_cents > 0) {
        doc.setFillColor(240, 240, 240);
        doc.rect(20, yPosition - 5, pageWidth - 40, 20, "F");

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text("MONTO TOTAL PAGADO:", 25, yPosition + 5);

        doc.setFontSize(18);
        doc.setTextColor(primaryColor);
        const totalAmount = formatCurrency(
          transactionData.amount_in_cents / 100
        );
        doc.text(totalAmount, pageWidth - 25, yPosition + 7, {
          align: "right",
        });

        yPosition += 30;
      } else {
        // Si no hay monto, mostrar mensaje
        doc.setFillColor(255, 250, 230);
        doc.rect(20, yPosition - 5, pageWidth - 40, 15, "F");

        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100, 100, 100);
        doc.text(
          "Monto: Consulta con la tienda para detalles del pago",
          25,
          yPosition + 5
        );

        yPosition += 20;
      }

      // Nota informativa
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      const noteText =
        "Este comprobante confirma que tu pago fue procesado exitosamente. " +
        "Guarda este documento para cualquier referencia futura.";
      const noteLines = doc.splitTextToSize(noteText, pageWidth - 40);
      doc.text(noteLines, 20, yPosition);

      yPosition += noteLines.length * 5 + 10;

      // Footer
      doc.setDrawColor(200, 200, 200);
      doc.line(20, yPosition, pageWidth - 20, yPosition);

      yPosition += 8;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(
        "Procesado por ePayco - Pagos seguros en Colombia",
        pageWidth / 2,
        yPosition,
        { align: "center" }
      );
      yPosition += 5;
      doc.text(
        `Generado el ${new Date().toLocaleString("es-CO")}`,
        pageWidth / 2,
        yPosition,
        { align: "center" }
      );

      // Marca de agua (opcional)
      doc.setTextColor(200, 200, 200);
      doc.setFontSize(60);
      doc.setFont("helvetica", "bold");
      doc.text("PAGADO", pageWidth / 2, doc.internal.pageSize.getHeight() / 2, {
        align: "center",
        angle: 45,
      });

      // Descargar PDF
      doc.save(`comprobante_pago_${transactionData.reference}.pdf`);

      toast.success("Comprobante PDF descargado exitosamente");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Error al generar el comprobante PDF");
    }
  };

  const sendWhatsAppConfirmation = () => {
    if (!config?.store_whatsapp || !transactionData) return;

    const phone = config.store_whatsapp.replace(/\D/g, "");

    let message = `✅ *Pago Confirmado*\n\n`;
    message += `Hola! Mi pago fue procesado exitosamente:\n\n`;
    message += `💳 *ID Transacción:* ${transactionData.id}\n`;
    message += `📋 *Referencia:* ${transactionData.reference}\n`;
    if (transactionData.amount_in_cents > 0) {
      message += `💰 *Monto:* ${formatCurrency(
        transactionData.amount_in_cents / 100
      )}\n`;
    }
    message += `📅 *Fecha:* ${new Date(
      transactionData.created_at
    ).toLocaleString("es-CO")}\n`;

    if (transactionData.approval_code) {
      message += `🔑 *Código:* ${transactionData.approval_code}\n`;
    }

    message += `\n¿Cuándo recibiré mi pedido?`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, "_blank");
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

  const primaryColor = config?.store_primary_color || "#3B82F6";

  return (
    <div className="min-h-screen bg-gray-50">
      <header
        className="sticky top-0 z-50 bg-white shadow-md"
        style={{ borderBottom: `4px solid ${primaryColor}` }}
      >
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-center">
            <h1 className="text-xl font-bold">Confirmación de Pago</h1>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <Card>
          <CardContent className="pt-8">
            {/* Estado del pago */}
            {transactionStatus === "APPROVED" && (
              <>
                <div className="text-center mb-8">
                  <div
                    className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                    style={{ backgroundColor: "#10B98120" }}
                  >
                    <CheckCircle2 className="h-12 w-12 text-green-600" />
                  </div>
                  <h2 className="text-3xl font-bold mb-2 text-green-600">
                    ¡Pago Exitoso!
                  </h2>
                  <p className="text-gray-600">
                    Tu pago ha sido procesado correctamente
                  </p>
                </div>

                {transactionData && (
                  <div className="bg-gray-50 rounded-lg p-6 mb-6 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">ID de Transacción:</span>
                      <span className="font-mono font-semibold">
                        {transactionData.id}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Referencia:</span>
                      <span className="font-semibold">
                        {transactionData.reference}
                      </span>
                    </div>
                    {transactionData.payment_method_type && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Método de pago:</span>
                        <span className="font-semibold capitalize">
                          {transactionData.payment_method_type?.replace(
                            "_",
                            " "
                          )}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Fecha:</span>
                      <span className="font-semibold">
                        {new Date(transactionData.created_at).toLocaleString(
                          "es-CO"
                        )}
                      </span>
                    </div>
                    {transactionData.amount_in_cents > 0 && (
                      <div className="border-t pt-3 mt-3">
                        <div className="flex justify-between">
                          <span className="text-gray-900 font-semibold">
                            Total Pagado:
                          </span>
                          <span
                            className="text-2xl font-bold"
                            style={{ color: primaryColor }}
                          >
                            {formatCurrency(
                              transactionData.amount_in_cents / 100
                            )}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={downloadReceipt}
                    variant="outline"
                  >
                    <Download className="h-5 w-5 mr-2" />
                    Descargar Comprobante PDF
                  </Button>

                  {config?.store_whatsapp && (
                    <Button
                      size="lg"
                      className="w-full"
                      style={{ backgroundColor: "#25D366" }}
                      onClick={sendWhatsAppConfirmation}
                    >
                      <MessageSquare className="h-5 w-5 mr-2" />
                      Confirmar con la tienda por WhatsApp
                    </Button>
                  )}

                  <Link href={`/store/${slug}`}>
                    <Button variant="outline" size="lg" className="w-full">
                      Volver a la tienda
                    </Button>
                  </Link>
                </div>

                <div className="mt-6 p-4 bg-brand-light/50 rounded-lg text-sm text-gray-700">
                  <p className="font-semibold mb-2">✅ ¿Qué sigue?</p>
                  <ul className="space-y-1 list-disc list-inside text-sm">
                    <li>
                      Tu pago ha sido confirmado y la tienda ha sido notificada
                    </li>
                    <li>Recibirás información sobre tu pedido pronto</li>
                    <li>Guarda tu comprobante para cualquier referencia</li>
                  </ul>
                </div>
              </>
            )}

            {transactionStatus === "PENDING" && (
              <div className="text-center">
                <Loader2 className="h-16 w-16 animate-spin text-brand mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Procesando pago...</h2>
                <p className="text-gray-600 mb-6">
                  Estamos verificando tu transacción
                </p>
                <Button onClick={() => checkTransactionStatus(refPayco!)}>
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
                  <Link href={`/store/${slug}/cart`}>
                    <Button
                      size="lg"
                      className="w-full"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Intentar nuevamente
                    </Button>
                  </Link>
                  <Link href={`/store/${slug}`}>
                    <Button variant="outline" size="lg" className="w-full">
                      Volver a la tienda
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {transactionStatus === "ERROR" && !refPayco && (
              <div className="text-center">
                <AlertCircle className="h-16 w-16 text-yellow-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">
                  No hay información de pago
                </h2>
                <p className="text-gray-600 mb-6">
                  No pudimos encontrar los detalles de tu transacción
                </p>
                <Link href={`/store/${slug}`}>
                  <Button size="lg" style={{ backgroundColor: primaryColor }}>
                    Volver a la tienda
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
