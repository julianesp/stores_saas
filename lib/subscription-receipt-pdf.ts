import type jsPDF from 'jspdf';
import { formatCurrency } from '@/lib/utils';

/**
 * Comprobante de pago de la suscripción en PDF (prueba de pago para el tendero).
 * No es factura electrónica DIAN: lo dice el pie del documento.
 */

export interface SubscriptionReceipt {
  refPayco: string;
  sessionRef: string;
  transactionId: string | null;
  approvalCode: string | null;
  /** Fecha tal como la reporta ePayco (hora de Colombia), "YYYY-MM-DD HH:mm:ss". */
  transactionDate: string | null;
  amount: number;
  tax: number;
  currency: string;
  paymentMethod: string;
  planName: string;
  isAddon: boolean;
  customer: {
    name: string;
    document: string | null;
    email: string | null;
  };
  storeName: string | null;
  /** Hasta cuándo queda activo el plan o el complemento pagado. */
  validUntil: string | null;
}

const BRAND: [number, number, number] = [0, 124, 128]; // #007c80
const BRAND_LIGHT: [number, number, number] = [230, 244, 244]; // #e6f4f4
const INK: [number, number, number] = [17, 24, 39];
const MUTED: [number, number, number] = [107, 114, 128];
const LINE: [number, number, number] = [229, 231, 235];
const OK: [number, number, number] = [5, 150, 105];

/** "2026-10-08 15:21:12" (hora Colombia) → "8 de octubre de 2026, 3:21 p. m." */
export function formatEpaycoDate(value: string | null): string {
  if (!value) return 'No disponible';
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  const date = m
    ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] ?? 0))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDay(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
}

async function loadLogo(): Promise<string | null> {
  try {
    const res = await fetch('/icon-192x192.png');
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateSubscriptionReceiptPDF(r: SubscriptionReceipt): Promise<jsPDF> {
  const JsPDF = (await import('jspdf')).default;
  const doc = new JsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 20; // margen
  let y = 0;

  // Encabezado de marca
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, W, 38, 'F');
  const logo = await loadLogo();
  if (logo) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(M, 10, 18, 18, 3, 3, 'F');
    doc.addImage(logo, 'PNG', M + 1.5, 11.5, 15, 15);
  }
  const textX = logo ? M + 24 : M;
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('posib.dev', textX, 19);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Sistema POS para tiendas en Colombia', textX, 25.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('COMPROBANTE DE PAGO', W - M, 19, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Ref. ePayco ${r.refPayco}`, W - M, 25.5, { align: 'right' });

  // Estado + monto
  y = 54;
  doc.setTextColor(...MUTED);
  doc.setFontSize(10);
  doc.text('Total pagado', M, y);

  const chip = 'APROBADO';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const chipW = doc.getTextWidth(chip) + 10;
  doc.setFillColor(209, 250, 229);
  doc.roundedRect(W - M - chipW, y - 5.5, chipW, 8, 4, 4, 'F');
  doc.setTextColor(...OK);
  doc.text(chip, W - M - chipW / 2, y, { align: 'center' });

  y += 12;
  doc.setTextColor(...INK);
  doc.setFontSize(28);
  doc.text(`${formatCurrency(r.amount)} ${r.currency}`, M, y);

  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  doc.text(`${r.planName}${r.isAddon ? ' (complemento mensual)' : ' (suscripción mensual)'}`, M, y);

  // Bloque de detalle: filas etiqueta / valor
  const rows = (title: string, items: [string, string | null | undefined][]) => {
    y += 14;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...BRAND);
    doc.text(title, M, y);
    y += 3;
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.line(M, y, W - M, y);
    for (const [label, value] of items) {
      if (!value) continue;
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...MUTED);
      doc.text(label, M, y);
      doc.setTextColor(...INK);
      const lines = doc.splitTextToSize(value, W - M * 2 - 60);
      doc.text(lines, W - M, y, { align: 'right' });
      y += (lines.length - 1) * 5;
    }
  };

  rows('Detalle de la transacción', [
    ['Fecha y hora', formatEpaycoDate(r.transactionDate)],
    ['Medio de pago', r.paymentMethod],
    ['Código de aprobación', r.approvalCode],
    ['ID de transacción', r.transactionId],
    ['Referencia ePayco', r.refPayco],
    ['Referencia de la sesión', r.sessionRef !== r.refPayco ? r.sessionRef : null],
    ['Impuestos', r.tax > 0 ? formatCurrency(r.tax) : 'No aplica'],
  ]);

  rows('Pagado por', [
    ['Nombre', r.customer.name],
    ['Documento', r.customer.document],
    ['Correo', r.customer.email],
    ['Tienda', r.storeName],
  ]);

  // Vigencia
  const until = formatDay(r.validUntil);
  if (until) {
    y += 14;
    doc.setFillColor(...BRAND_LIGHT);
    doc.roundedRect(M, y - 6, W - M * 2, 16, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...BRAND);
    doc.text(`${r.isAddon ? 'Complemento activo' : 'Plan activo'} hasta el ${until}`, M + 6, y + 3.5);
  }

  // Pie
  const footY = doc.internal.pageSize.getHeight() - 24;
  doc.setDrawColor(...LINE);
  doc.line(M, footY, W - M, footY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  const note = doc.splitTextToSize(
    `Pago procesado por ePayco. Puedes verificarlo con la referencia ${r.refPayco}. ` +
      'Este documento es un comprobante de pago; no reemplaza una factura electrónica.',
    W - M * 2,
  );
  doc.text(note, M, footY + 6);
  doc.text(
    `Generado el ${new Date().toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' })} · posib.dev`,
    M,
    footY + 6 + note.length * 4 + 2,
  );

  return doc;
}
