import jsPDF from 'jspdf';
import { Sale, SaleItemWithProduct, Customer, UserProfile } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface InvoiceData {
  sale: Sale;
  saleItems: SaleItemWithProduct[];
  customer?: Customer | null;
  storeInfo: UserProfile;
  cashierName?: string;
}

/**
 * Genera un PDF de la factura
 */
export function generateInvoicePDF(data: InvoiceData): jsPDF {
  const { sale, saleItems, customer, storeInfo, cashierName } = data;

  // Crear documento PDF (tamaño carta)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  let yPos = 15;
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();

  // Encabezado de la tienda
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(storeInfo.full_name || 'TIENDA POS', pageWidth / 2, yPos, { align: 'center' });

  yPos += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (storeInfo.phone) {
    doc.text(`Tel: ${storeInfo.phone}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
  }
  if (storeInfo.email) {
    doc.text(`Email: ${storeInfo.email}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
  }

  yPos += 5;
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 7;

  // Información de la factura
  const saleDate = new Date(sale.created_at);
  const formattedDate = format(saleDate, "dd 'de' MMMM 'de' yyyy", { locale: es });
  const formattedTime = format(saleDate, 'HH:mm:ss');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURA/RECIBO:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(`#${sale.sale_number}`, margin + 50, yPos);
  yPos += 6;

  doc.setFont('helvetica', 'bold');
  doc.text('Fecha:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(formattedDate, margin + 50, yPos);
  yPos += 6;

  doc.setFont('helvetica', 'bold');
  doc.text('Hora:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(formattedTime, margin + 50, yPos);
  yPos += 6;

  if (cashierName) {
    doc.setFont('helvetica', 'bold');
    doc.text('Atendido por:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(cashierName, margin + 50, yPos);
    yPos += 6;
  }

  yPos += 3;
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 7;

  // Información del cliente
  if (customer) {
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENTE:', margin, yPos);
    yPos += 6;

    doc.setFont('helvetica', 'normal');
    doc.text(customer.name, margin, yPos);
    yPos += 5;

    if (customer.phone) {
      doc.text(`Tel: ${customer.phone}`, margin, yPos);
      yPos += 5;
    }

    if (customer.id_number) {
      doc.text(`ID: ${customer.id_number}`, margin, yPos);
      yPos += 5;
    }

    yPos += 3;
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 7;
  }

  // Detalles de los productos
  doc.setFont('helvetica', 'bold');
  doc.text('DETALLE DE LA COMPRA:', margin, yPos);
  yPos += 7;

  // Encabezados de la tabla
  doc.setFontSize(9);
  doc.text('Producto', margin, yPos);
  doc.text('Cant', pageWidth - margin - 80, yPos);
  doc.text('P.Unit', pageWidth - margin - 55, yPos);
  doc.text('Subtotal', pageWidth - margin - 25, yPos, { align: 'right' });
  yPos += 2;
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 5;

  // Items
  doc.setFont('helvetica', 'normal');
  saleItems.forEach((item) => {
    // Verificar si necesitamos nueva página
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    const productName = item.product?.name || 'Producto';
    // Limitar nombre del producto a 50 caracteres
    const truncatedName = productName.length > 50 ? productName.substring(0, 47) + '...' : productName;

    doc.text(truncatedName, margin, yPos);
    doc.text(item.quantity.toString(), pageWidth - margin - 80, yPos);
    doc.text(formatCurrency(item.unit_price), pageWidth - margin - 55, yPos);
    doc.text(formatCurrency(item.subtotal), pageWidth - margin - 25, yPos, { align: 'right' });
    yPos += 6;

    if (item.discount > 0) {
      doc.setFontSize(8);
      doc.setTextColor(200, 0, 0);
      doc.text(`(Desc: ${formatCurrency(item.discount)})`, margin + 5, yPos);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      yPos += 5;
    }
  });

  yPos += 3;
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 7;

  // Totales
  doc.setFontSize(10);
  const subtotalAmount = saleItems.reduce((sum, item) => sum + item.subtotal, 0);

  doc.text('Subtotal:', pageWidth - margin - 60, yPos);
  doc.text(formatCurrency(subtotalAmount), pageWidth - margin - 25, yPos, { align: 'right' });
  yPos += 6;

  if (sale.discount > 0) {
    doc.setTextColor(200, 0, 0);
    doc.text('Descuento:', pageWidth - margin - 60, yPos);
    doc.text(`- ${formatCurrency(sale.discount)}`, pageWidth - margin - 25, yPos, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    yPos += 6;
  }

  if (sale.tax > 0) {
    doc.text('Impuesto (IVA):', pageWidth - margin - 60, yPos);
    doc.text(formatCurrency(sale.tax), pageWidth - margin - 25, yPos, { align: 'right' });
    yPos += 6;
  }

  yPos += 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL:', pageWidth - margin - 60, yPos);
  doc.text(formatCurrency(sale.total), pageWidth - margin - 25, yPos, { align: 'right' });

  yPos += 10;
  doc.setFontSize(10);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 7;

  // Método de pago
  const paymentMethodLabels: Record<string, string> = {
    efectivo: 'Efectivo',
    tarjeta: 'Tarjeta',
    transferencia: 'Transferencia',
    credito: 'Crédito',
  };

  doc.setFont('helvetica', 'bold');
  doc.text('Método de pago:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(paymentMethodLabels[sale.payment_method] || sale.payment_method, margin + 50, yPos);
  yPos += 6;

  // Puntos ganados
  if (sale.points_earned && sale.points_earned > 0) {
    yPos += 5;
    doc.setFillColor(220, 252, 231);
    doc.rect(margin, yPos - 4, pageWidth - 2 * margin, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 101, 52);
    doc.text(`🎉 ¡Ganaste ${sale.points_earned} puntos de lealtad!`, pageWidth / 2, yPos, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    yPos += 10;
  }

  // Notas
  if (sale.notes) {
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('NOTAS:', margin, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const notesLines = doc.splitTextToSize(sale.notes, pageWidth - 2 * margin);
    doc.text(notesLines, margin, yPos);
    yPos += notesLines.length * 5;
  }

  // Pie de página
  yPos = Math.max(yPos + 10, 260);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('¡Gracias por su compra!', pageWidth / 2, yPos, { align: 'center' });
  yPos += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Este documento es válido como comprobante de compra', pageWidth / 2, yPos, { align: 'center' });
  yPos += 4;

  if (storeInfo.phone) {
    doc.text(`Cualquier duda o reclamo, contáctenos al ${storeInfo.phone}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 4;
  }

  yPos += 3;
  doc.setFontSize(7);
  doc.setTextColor(128, 128, 128);
  doc.text('Generado por Sistema POS', pageWidth / 2, yPos, { align: 'center' });
  yPos += 3;
  doc.text(format(new Date(), 'dd/MM/yyyy HH:mm:ss'), pageWidth / 2, yPos, { align: 'center' });

  return doc;
}

/**
 * Genera un mensaje de texto para compartir por WhatsApp
 */
export function generateWhatsAppMessage(data: InvoiceData): string {
  const { sale, saleItems, customer, storeInfo } = data;

  const saleDate = new Date(sale.created_at);
  const formattedDate = format(saleDate, "dd 'de' MMMM 'de' yyyy", { locale: es });
  const formattedTime = format(saleDate, 'HH:mm:ss');

  const paymentMethodLabels: Record<string, string> = {
    efectivo: 'Efectivo',
    tarjeta: 'Tarjeta',
    transferencia: 'Transferencia',
    credito: 'Crédito',
  };

  let message = `🧾 *FACTURA DE COMPRA*\n\n`;
  message += `*${storeInfo.full_name || 'TIENDA POS'}*\n`;
  if (storeInfo.phone) message += `📞 ${storeInfo.phone}\n`;
  if (storeInfo.email) message += `📧 ${storeInfo.email}\n`;
  message += `\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  message += `*Factura #${sale.sale_number}*\n`;
  message += `📅 Fecha: ${formattedDate}\n`;
  message += `🕐 Hora: ${formattedTime}\n\n`;

  if (customer) {
    message += `*Cliente:* ${customer.name}\n`;
    if (customer.phone) message += `📞 ${customer.phone}\n`;
    message += `\n`;
  }

  message += `*DETALLE DE LA COMPRA:*\n\n`;

  saleItems.forEach((item, index) => {
    message += `${index + 1}. *${item.product?.name || 'Producto'}*\n`;
    message += `   Cantidad: ${item.quantity} x ${formatCurrency(item.unit_price)}\n`;
    if (item.discount > 0) {
      message += `   Descuento: -${formatCurrency(item.discount)}\n`;
    }
    message += `   Subtotal: ${formatCurrency(item.subtotal)}\n\n`;
  });

  message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  const subtotalAmount = saleItems.reduce((sum, item) => sum + item.subtotal, 0);
  message += `Subtotal: ${formatCurrency(subtotalAmount)}\n`;

  if (sale.discount > 0) {
    message += `Descuento: -${formatCurrency(sale.discount)}\n`;
  }

  if (sale.tax > 0) {
    message += `Impuesto (IVA): ${formatCurrency(sale.tax)}\n`;
  }

  message += `\n*TOTAL: ${formatCurrency(sale.total)}*\n\n`;

  message += `*Método de pago:* ${paymentMethodLabels[sale.payment_method] || sale.payment_method}\n`;

  if (sale.payment_method === 'credito' && sale.amount_pending && sale.amount_pending > 0) {
    message += `\n⚠️ *Saldo pendiente:* ${formatCurrency(sale.amount_pending)}\n`;
    if (sale.due_date) {
      message += `Vence: ${format(new Date(sale.due_date), 'dd/MM/yyyy')}\n`;
    }
  }

  if (sale.points_earned && sale.points_earned > 0) {
    message += `\n🎉 *¡Ganaste ${sale.points_earned} puntos de lealtad!*\n`;
  }

  if (sale.notes) {
    message += `\n*Notas:* ${sale.notes}\n`;
  }

  message += `\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  message += `✨ ¡Gracias por su compra! ✨\n`;

  return message;
}

/**
 * Abre WhatsApp con el mensaje de la factura
 */
export function shareViaWhatsApp(phoneNumber: string | undefined, message: string) {
  // Limpiar el número de teléfono (quitar espacios, guiones, etc.)
  const cleanPhone = phoneNumber?.replace(/[^\d+]/g, '') || '';

  // Codificar el mensaje para URL
  const encodedMessage = encodeURIComponent(message);

  // Generar URL de WhatsApp
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodedMessage}`
    : `https://wa.me/?text=${encodedMessage}`;

  // Abrir en nueva pestaña
  window.open(whatsappUrl, '_blank');
}

/**
 * Comparte la factura por Facebook (usando Facebook Share Dialog)
 */
export function shareViaFacebook(message: string) {
  // Facebook no permite pre-llenar texto por políticas
  // Pero podemos abrir el diálogo de compartir
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`;

  window.open(facebookUrl, '_blank', 'width=600,height=400');

  // Nota: Para compartir con texto pre-llenado necesitarías usar la API de Facebook
  // que requiere una app ID y permisos especiales
}
