/**
 * Helpers para impresión de tickets
 */

export interface PrintTicketData {
  saleNumber: string;
  date: Date;
  items: Array<{
    name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }>;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  customerName?: string;
  customerPoints?: number;
  pointsEarned?: number;
  pointsRedeemed?: number;
  storeName?: string;
}

/**
 * Abre una ventana de impresión para el ticket
 */
export function printTicket(elementRef: HTMLDivElement | null) {
  if (!elementRef) {
    console.error('No se encontró el elemento para imprimir');
    return;
  }

  // Crear una ventana de impresión
  const printWindow = window.open('', '', 'width=800,height=600');

  if (!printWindow) {
    alert('Por favor habilita las ventanas emergentes para imprimir');
    return;
  }

  // Copiar el contenido al documento de impresión
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Ticket de Venta - ${(elementRef.querySelector('.font-bold.uppercase') as HTMLElement)?.textContent || 'Impresión'}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.4;
            padding: 10mm;
          }

          @media print {
            body {
              padding: 0;
            }

            @page {
              size: 80mm auto;
              margin: 0;
            }
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          th, td {
            text-align: left;
            padding: 2px 0;
          }

          th {
            border-bottom: 1px solid #000;
          }

          .text-center {
            text-align: center;
          }

          .text-right {
            text-align: right;
          }

          .font-bold {
            font-weight: bold;
          }

          .uppercase {
            text-transform: uppercase;
          }

          .border-b {
            border-bottom: 1px solid #ccc;
          }

          .border-dashed {
            border-style: dashed;
          }

          .mb-1 { margin-bottom: 4px; }
          .mb-2 { margin-bottom: 8px; }
          .mb-3 { margin-bottom: 12px; }
          .mb-4 { margin-bottom: 16px; }
          .mt-1 { margin-top: 4px; }
          .mt-2 { margin-top: 8px; }
          .mt-3 { margin-top: 12px; }
          .mt-4 { margin-top: 16px; }
          .pb-2 { padding-bottom: 8px; }
          .pb-3 { padding-bottom: 12px; }
          .pt-2 { padding-top: 8px; }
          .py-1 { padding-top: 4px; padding-bottom: 4px; }
        </style>
      </head>
      <body>
        ${elementRef.innerHTML}
      </body>
    </html>
  `);

  printWindow.document.close();

  // Esperar a que se cargue el contenido antes de imprimir
  printWindow.onload = function() {
    printWindow.focus();
    printWindow.print();
    // No cerrar automáticamente para permitir reimprimir si es necesario
    // printWindow.close();
  };
}

/**
 * Descarga el ticket como PDF (simplificado)
 */
export async function downloadTicketAsPDF(ticketData: PrintTicketData) {
  // Por ahora, abre la ventana de impresión y el usuario puede guardar como PDF desde ahí
  // En el futuro se puede integrar jsPDF para una generación más completa
  alert('Usa la función de "Imprimir" y selecciona "Guardar como PDF" en tu navegador');
}
