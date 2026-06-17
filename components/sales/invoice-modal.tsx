"use client";

import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InvoiceReceipt } from "./invoice-receipt";
import {
  generateInvoicePDF,
  shareInvoicePDFViaWhatsApp,
  generateWhatsAppMessage,
  shareViaWhatsApp,
} from "@/lib/invoice-helpers";
import { Sale, SaleItemWithProduct, Customer, UserProfile } from "@/lib/types";
import { Download, Printer, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface InvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale;
  saleItems: SaleItemWithProduct[];
  customer?: Customer | null;
  storeInfo: UserProfile;
  cashierName?: string;
}

export function InvoiceModal({
  open,
  onOpenChange,
  sale,
  saleItems,
  customer,
  storeInfo,
  cashierName,
}: InvoiceModalProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [phoneNumber, setPhoneNumber] = useState(customer?.phone || "");

  // Configurar impresión
  const handlePrint = useReactToPrint({
    contentRef: invoiceRef,
    documentTitle: `Factura-${sale.sale_number}`,
    pageStyle: `
      @page {
        size: letter;
        margin: 10mm;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `,
  });

  // Generar y descargar PDF
  const handleDownloadPDF = async () => {
    try {
      const doc = await generateInvoicePDF({
        sale,
        saleItems,
        customer,
        storeInfo,
        cashierName,
      });

      doc.save(`Factura-${sale.sale_number}.pdf`);
      toast.success("PDF descargado correctamente");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Error al generar PDF");
    }
  };

  // Enviar factura por WhatsApp con link al PDF en R2
  const handleShareWhatsApp = async () => {
    try {
      toast.loading("Generando link de factura...");

      // 1. Generar PDF como base64
      const doc = await generateInvoicePDF({ sale, saleItems, customer, storeInfo, cashierName });
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      const fileName = `Factura-${sale.sale_number}-${Date.now()}.pdf`;

      // 2. Subir PDF a R2 via Worker
      const uploadRes = await fetch('/api/facturas/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfBase64, fileName }),
      });

      const uploadData = await uploadRes.json();
      toast.dismiss();

      if (!uploadData.success) {
        toast.error("Error al subir la factura");
        return;
      }

      // 3. Construir mensaje con link al PDF
      const storeName = storeInfo.full_name || 'TIENDA POS';
      const message =
        `🧾 *Factura de compra - ${storeName}*\n\n` +
        `Factura #${sale.sale_number}\n` +
        `Total: *$${sale.total.toLocaleString('es-CO')}*\n\n` +
        `📄 Descarga tu factura aquí:\n${uploadData.url}\n\n` +
        `✨ ¡Gracias por tu compra!`;

      // 4. Abrir WhatsApp con el link
      shareViaWhatsApp(phoneNumber, message);
      toast.success("WhatsApp abierto con el link de la factura");
    } catch (error) {
      toast.dismiss();
      console.error("Error compartiendo factura:", error);
      toast.error("Error al compartir la factura");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-black">
            Factura de Venta #{sale.sale_number}
          </DialogTitle>
        </DialogHeader>

        {/* Opciones de acción */}
        <div className="border-b pb-4 space-y-4">
          {/* Botones principales */}
          <div className="grid grid-cols-2 md:grid-cols-2 gap-2 justify-center w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-2 text-black"
            >
              <Printer className="h-4 w-4 text-black" />
              Imprimir
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
              className="gap-2 text-black bg-green-400 cursor-pointer md:"
              
            >
              <Download className="h-4 w-4 text-black" />
              Descargar PDF
            </Button>

            {/* <Button
              variant="outline"
              size="sm"
              onClick={handleCopyToClipboard}
              className="gap-2 text-black"
            >
              <Share2 className="h-4 w-4 text-black" />
              Copiar
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleShareFacebook}
              className="gap-2 text-black"
            >
              <Facebook className="h-4 w-4 text-black" />
              Facebook
            </Button> */}
          </div>

          {/* Enviar por WhatsApp */}
          <div className="space-y-2 bg-green-50 border border-green-200 rounded-lg p-3">
            <label className="text-sm font-semibold text-green-800 flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Enviar factura por WhatsApp
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="Número de celular del cliente"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="flex-1 text-gray-800"
              />
              <Button
                onClick={handleShareWhatsApp}
                className="gap-2 bg-green-600 hover:bg-green-700 text-white"
              >
                <MessageCircle className="h-4 w-4" />
                Enviar
              </Button>
            </div>
            {customer?.phone && (
              <p className="text-xs text-green-700">
                Número cargado del cliente: <strong>{customer.phone}</strong>
              </p>
            )}
            {!customer?.phone && (
              <p className="text-xs text-gray-500">
                Ingresa el número o déjalo en blanco para elegir el contacto en WhatsApp
              </p>
            )}
          </div>
        </div>

        {/* Vista previa de la factura (con scroll) */}
        <div className="flex-1 overflow-y-auto">
          <InvoiceReceipt
            ref={invoiceRef}
            sale={sale}
            saleItems={saleItems}
            customer={customer}
            storeInfo={storeInfo}
            cashierName={cashierName}
          />
        </div>

        {/* Botón de cerrar */}
        <div className="border-t pt-4 flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <h3 className="text-black size-6">Cerrar</h3>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
