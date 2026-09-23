/**
 * Genera el Excel de la copia de seguridad diaria de ventas.
 *
 * Una fila por ítem vendido (producto), con las columnas de la venta a la que
 * pertenece, más una hoja de resumen. Formato COP y locale español.
 */

import ExcelJS from 'exceljs';
import type { BackupSale } from './backup-worker';

const PAYMENT_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  credito: 'Crédito (fiado)',
};

function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

/** Hora local Colombia legible a partir de un created_at en UTC. */
function formatTimeCo(isoUtc: string): string {
  const d = new Date(new Date(isoUtc).getTime() - 5 * 60 * 60 * 1000);
  return `${d.getUTCHours().toString().padStart(2, '0')}:${d
    .getUTCMinutes()
    .toString()
    .padStart(2, '0')}`;
}

export async function buildDailyBackupExcel(params: {
  storeName: string;
  date: string; // YYYY-MM-DD
  sales: BackupSale[];
}): Promise<Buffer> {
  const { storeName, date, sales } = params;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'posib.dev';
  workbook.created = new Date();

  // --- Hoja de detalle (una fila por ítem) ---
  const detail = workbook.addWorksheet(`Ventas ${date}`);
  detail.columns = [
    { header: 'Hora', key: 'time', width: 8 },
    { header: 'N° Venta', key: 'sale', width: 14 },
    { header: 'Cliente', key: 'customer', width: 24 },
    { header: 'Producto', key: 'product', width: 34 },
    { header: 'Cantidad', key: 'qty', width: 10 },
    { header: 'Precio unit.', key: 'unit', width: 14 },
    { header: 'Subtotal ítem', key: 'itemsub', width: 14 },
    { header: 'Total venta', key: 'saletotal', width: 14 },
    { header: 'Método pago', key: 'method', width: 16 },
    { header: 'Estado', key: 'status', width: 12 },
  ];
  detail.getRow(1).font = { bold: true };

  let totalRevenue = 0;
  const revenueByMethod: Record<string, number> = {};

  for (const sale of sales) {
    // Solo cuentan las ventas completadas para los totales.
    if (sale.status === 'completada') {
      totalRevenue += sale.total || 0;
      const m = PAYMENT_LABELS[sale.payment_method] || sale.payment_method;
      revenueByMethod[m] = (revenueByMethod[m] || 0) + (sale.total || 0);
    }

    const shortId = sale.id.slice(0, 8);
    const items = sale.items.length > 0 ? sale.items : [null];
    for (const item of items) {
      detail.addRow({
        time: formatTimeCo(sale.created_at),
        sale: shortId,
        customer: sale.customer_name || 'Consumidor final',
        product: item ? item.product_name : '(sin ítems)',
        qty: item ? item.quantity : '',
        unit: item ? formatCOP(item.unit_price) : '',
        itemsub: item ? formatCOP(item.subtotal) : '',
        saletotal: formatCOP(sale.total),
        method: PAYMENT_LABELS[sale.payment_method] || sale.payment_method,
        status: sale.status,
      });
    }
  }

  // --- Hoja de resumen ---
  const summary = workbook.addWorksheet('Resumen');
  summary.columns = [
    { header: '', key: 'k', width: 30 },
    { header: '', key: 'v', width: 24 },
  ];
  const completed = sales.filter((s) => s.status === 'completada').length;
  summary.addRow({ k: 'Tienda', v: storeName });
  summary.addRow({ k: 'Fecha', v: date });
  summary.addRow({ k: 'Ventas registradas', v: sales.length });
  summary.addRow({ k: 'Ventas completadas', v: completed });
  summary.addRow({ k: 'Ingresos del día', v: formatCOP(totalRevenue) });
  summary.addRow({ k: '', v: '' });
  summary.addRow({ k: 'Por método de pago', v: '' });
  for (const [method, amount] of Object.entries(revenueByMethod)) {
    summary.addRow({ k: method, v: formatCOP(amount) });
  }
  summary.getColumn('k').font = { bold: true };

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
