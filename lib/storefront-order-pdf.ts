/**
 * Genera el resumen PDF de un pedido de la tienda pública (lista de productos,
 * no es un comprobante de pago), con el mismo
 * estilo que el recibo del POS local (lib/invoice-helpers.ts) pero a partir de
 * los datos que tiene el checkout del cliente (sin tipos internos del POS).
 */

import { formatCurrency } from '@/lib/utils';
import type { StoreCartItem } from '@/lib/storefront-cart';
import { calculateDiscountedPrice } from '@/lib/storefront-api';

export interface OrderPdfData {
  storeName: string;
  storePhone?: string;
  storeWhatsapp?: string;
  storeAddress?: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryMethod: 'pickup' | 'shipping';
  deliveryAddress?: string;
  items: StoreCartItem[];
  shippingCost?: number;
  notes?: string;
  primaryColor?: string;
}

function itemFinalPrice(item: StoreCartItem): number {
  const hasOffer = item.discount_percentage && item.discount_percentage > 0;
  return hasOffer
    ? calculateDiscountedPrice(item.price, item.discount_percentage!)
    : item.price;
}

/**
 * Construye el jsPDF del pedido. jspdf se carga de forma diferida (~400KB).
 */
export async function generateOrderPDF(data: OrderPdfData) {
  const jsPDF = (await import('jspdf')).default;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 15;

  // Encabezado de la tienda
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(data.storeName || 'Tienda', pageWidth / 2, yPos, { align: 'center' });
  yPos += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (data.storePhone) {
    doc.text(`Tel: ${data.storePhone}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
  }
  if (data.storeAddress) {
    doc.text(data.storeAddress, pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
  }

  yPos += 3;
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 7;

  // Datos del pedido
  const now = new Date();
  const fecha = now.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
  const hora = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

  const line = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 50, yPos);
    yPos += 6;
  };

  line('PEDIDO:', `#${data.orderNumber}`);
  line('Fecha:', fecha);
  line('Hora:', hora);
  line('Cliente:', data.customerName);
  line('Teléfono:', data.customerPhone);
  line(
    'Entrega:',
    data.deliveryMethod === 'pickup' ? 'Recogida en tienda' : 'Envío a domicilio'
  );
  if (data.deliveryMethod === 'shipping' && data.deliveryAddress) {
    const dir = doc.splitTextToSize(data.deliveryAddress, pageWidth - margin - 50);
    doc.setFont('helvetica', 'bold');
    doc.text('Dirección:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(dir, margin + 50, yPos);
    yPos += dir.length * 5 + 1;
  }

  yPos += 2;
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 7;

  // Detalle de productos
  doc.setFont('helvetica', 'bold');
  doc.text('DETALLE DEL PEDIDO:', margin, yPos);
  yPos += 7;

  doc.setFontSize(9);
  doc.text('Producto', margin, yPos);
  doc.text('Cant', pageWidth - margin - 80, yPos);
  doc.text('P.Unit', pageWidth - margin - 55, yPos);
  doc.text('Subtotal', pageWidth - margin - 25, yPos, { align: 'right' });
  yPos += 2;
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 5;

  doc.setFont('helvetica', 'normal');
  let subtotalOriginal = 0;
  let totalDescuento = 0;

  data.items.forEach((item) => {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    const name = item.name.length > 50 ? item.name.substring(0, 47) + '...' : item.name;
    const finalPrice = itemFinalPrice(item);
    const lineSubtotal = finalPrice * item.quantity;
    subtotalOriginal += item.price * item.quantity;
    totalDescuento += (item.price - finalPrice) * item.quantity;

    doc.text(name, margin, yPos);
    doc.text(String(item.quantity), pageWidth - margin - 80, yPos);
    doc.text(formatCurrency(finalPrice), pageWidth - margin - 55, yPos);
    doc.text(formatCurrency(lineSubtotal), pageWidth - margin - 25, yPos, { align: 'right' });
    yPos += 6;

    if (item.discount_percentage && item.discount_percentage > 0) {
      doc.setFontSize(8);
      doc.setTextColor(200, 0, 0);
      doc.text(`(-${item.discount_percentage}% de descuento)`, margin + 5, yPos);
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
  doc.text('Subtotal:', pageWidth - margin - 60, yPos);
  doc.text(formatCurrency(subtotalOriginal), pageWidth - margin - 25, yPos, { align: 'right' });
  yPos += 6;

  if (totalDescuento > 0) {
    doc.setTextColor(200, 0, 0);
    doc.text('Descuento:', pageWidth - margin - 60, yPos);
    doc.text(`- ${formatCurrency(totalDescuento)}`, pageWidth - margin - 25, yPos, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    yPos += 6;
  }

  const shipping = data.shippingCost || 0;
  if (shipping > 0) {
    doc.text('Envío:', pageWidth - margin - 60, yPos);
    doc.text(formatCurrency(shipping), pageWidth - margin - 25, yPos, { align: 'right' });
    yPos += 6;
  }

  const total = subtotalOriginal - totalDescuento + shipping;
  yPos += 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL:', pageWidth - margin - 60, yPos);
  doc.text(formatCurrency(total), pageWidth - margin - 25, yPos, { align: 'right' });
  yPos += 10;

  doc.setFontSize(10);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 7;

  // Método de pago
  doc.setFont('helvetica', 'bold');
  doc.text('Método de pago:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text('Nequi', margin + 50, yPos);
  yPos += 8;

  // Notas
  if (data.notes) {
    doc.setFont('helvetica', 'bold');
    doc.text('NOTAS:', margin, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const notesLines = doc.splitTextToSize(data.notes, pageWidth - 2 * margin);
    doc.text(notesLines, margin, yPos);
    yPos += notesLines.length * 5 + 3;
  }

  // Pie
  yPos = Math.max(yPos + 6, 258);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('¡Gracias por tu compra!', pageWidth / 2, yPos, { align: 'center' });
  yPos += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Resumen de tu pedido — envíalo junto a tu pago de Nequi', pageWidth / 2, yPos, { align: 'center' });
  yPos += 4;
  if (data.deliveryMethod === 'shipping') {
    doc.text('Presenta este resumen para coordinar la entrega a domicilio', pageWidth / 2, yPos, { align: 'center' });
    yPos += 4;
  }
  if (data.storeWhatsapp) {
    doc.text(`Envíalo por WhatsApp al: ${data.storeWhatsapp}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 4;
  }

  yPos += 2;
  doc.setFontSize(7);
  doc.setTextColor(128, 128, 128);
  doc.text(`Generado el ${now.toLocaleString('es-CO')}`, pageWidth / 2, yPos, { align: 'center' });

  return doc;
}

/** Descarga el PDF del pedido directamente. */
export async function downloadOrderPDF(data: OrderPdfData) {
  const doc = await generateOrderPDF(data);
  doc.save(`pedido_${data.orderNumber}.pdf`);
}
