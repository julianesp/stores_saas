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
  const handleDownloadPDF = () => {
    try {
      const doc = generateInvoicePDF({
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

  // Compartir PDF por WhatsApp
  const handleShareWhatsApp = async () => {
    try {
      toast.loading("Generando enlace de descarga...");

      const success = await shareInvoicePDFViaWhatsApp(
        {
          sale,
          saleItems,
          customer,
          storeInfo,
          cashierName,
        },
        phoneNumber
      );

      toast.dismiss();

      if (success) {
        toast.success("Enlace generado y WhatsApp abierto");
      } else {
        toast.error("Error al procesar la factura");
      }
    } catch (error) {
      toast.dismiss();
      console.error("Error sharing via WhatsApp:", error);
      toast.error("Error al compartir por WhatsApp");
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
              className="gap-2 text-black"
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

          {/* Compartir por WhatsApp */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-black">
              Enviar por WhatsApp
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="Número de teléfono (opcional)"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="flex-1  text-green-600"
              />
              <Button
                onClick={handleShareWhatsApp}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                <MessageCircle className="h-4 w-4" />
                Enviar
              </Button>
            </div>
            <p className="text-xs text-black">
              Deja el número en blanco para elegir el contacto en WhatsApp
            </p>
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
