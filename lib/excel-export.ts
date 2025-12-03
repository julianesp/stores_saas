import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { SaleWithRelations, Sale } from './types';

/**
 * Exporta las ventas a un archivo Excel con múltiples hojas
 * Incluye datos necesarios para análisis y predicciones
 */
export function exportSalesToExcel(sales: SaleWithRelations[], filename?: string) {
  // Preparar datos para la hoja de resumen de ventas
  const salesSummary = sales.map(sale => {
    const saleDate = (sale.created_at as any)?.toDate
      ? (sale.created_at as any).toDate()
      : new Date(sale.created_at);

    return {
      'Número de Venta': sale.sale_number,
      'Fecha': format(saleDate, 'yyyy-MM-dd', { locale: es }),
      'Hora': format(saleDate, 'HH:mm:ss', { locale: es }),
      'Día de la Semana': format(saleDate, 'EEEE', { locale: es }),
      'Día del Mes': format(saleDate, 'd', { locale: es }),
      'Mes': format(saleDate, 'MMMM', { locale: es }),
      'Año': format(saleDate, 'yyyy', { locale: es }),
      'Cajero': sale.cashier?.full_name || 'N/A',
      'Cliente': sale.customer?.name || 'Cliente General',
      'Método de Pago': sale.payment_method,
      'Cantidad de Items': sale.items?.length || 0,
      'Subtotal': sale.subtotal,
      'Descuento': sale.discount,
      'Impuesto': sale.tax,
      'Total': sale.total,
      'Estado': sale.status,
    };
  });

  // Preparar datos detallados por producto vendido
  const salesDetails: any[] = [];
  sales.forEach(sale => {
    const saleDate = (sale.created_at as any)?.toDate
      ? (sale.created_at as any).toDate()
      : new Date(sale.created_at);

    sale.items?.forEach((item: any) => {
      salesDetails.push({
        'Número de Venta': sale.sale_number,
        'Fecha': format(saleDate, 'yyyy-MM-dd', { locale: es }),
        'Hora': format(saleDate, 'HH:mm:ss', { locale: es }),
        'Día de la Semana': format(saleDate, 'EEEE', { locale: es }),
        'Mes': format(saleDate, 'MMMM', { locale: es }),
        'Producto': item.product?.name || 'Producto desconocido',
        'Código de Barras': item.product?.barcode || 'N/A',
        'Categoría': item.product?.category?.name || 'Sin categoría',
        'Cantidad': item.quantity,
        'Precio Unitario': item.unit_price,
        'Descuento': item.discount,
        'Subtotal': item.subtotal,
        'Método de Pago': sale.payment_method,
        'Cajero': sale.cashier?.full_name || 'N/A',
      });
    });
  });

  // Preparar estadísticas por producto
  const productStats = new Map<string, {
    name: string;
    barcode: string;
    totalQuantity: number;
    totalRevenue: number;
    salesCount: number;
    avgPrice: number;
  }>();

  sales.forEach(sale => {
    sale.items?.forEach((item: any) => {
      const productId = item.product?.id || 'unknown';
      const existing = productStats.get(productId);

      if (existing) {
        existing.totalQuantity += item.quantity;
        existing.totalRevenue += item.subtotal;
        existing.salesCount += 1;
      } else {
        productStats.set(productId, {
          name: item.product?.name || 'Desconocido',
          barcode: item.product?.barcode || 'N/A',
          totalQuantity: item.quantity,
          totalRevenue: item.subtotal,
          salesCount: 1,
          avgPrice: item.unit_price,
        });
      }
    });
  });

  const productStatsArray = Array.from(productStats.values())
    .map(stat => ({
      'Producto': stat.name,
      'Código de Barras': stat.barcode,
      'Cantidad Total Vendida': stat.totalQuantity,
      'Número de Ventas': stat.salesCount,
      'Ingreso Total': stat.totalRevenue,
      'Precio Promedio': stat.avgPrice,
      'Ingreso Promedio por Venta': stat.totalRevenue / stat.salesCount,
    }))
    .sort((a, b) => b['Ingreso Total'] - a['Ingreso Total']);

  // Estadísticas por día
  const dailyStats = new Map<string, {
    date: string;
    salesCount: number;
    totalRevenue: number;
    avgTicket: number;
    itemsCount: number;
  }>();

  sales.forEach(sale => {
    const saleDate = (sale.created_at as any)?.toDate
      ? (sale.created_at as any).toDate()
      : new Date(sale.created_at);
    const dateKey = format(saleDate, 'yyyy-MM-dd', { locale: es });

    const existing = dailyStats.get(dateKey);
    const itemsCount = sale.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;

    if (existing) {
      existing.salesCount += 1;
      existing.totalRevenue += sale.total;
      existing.itemsCount += itemsCount;
      existing.avgTicket = existing.totalRevenue / existing.salesCount;
    } else {
      dailyStats.set(dateKey, {
        date: dateKey,
        salesCount: 1,
        totalRevenue: sale.total,
        avgTicket: sale.total,
        itemsCount: itemsCount,
      });
    }
  });

  const dailyStatsArray = Array.from(dailyStats.values())
    .map(stat => ({
      'Fecha': stat.date,
      'Número de Ventas': stat.salesCount,
      'Total de Items Vendidos': stat.itemsCount,
      'Ingreso Total': stat.totalRevenue,
      'Ticket Promedio': stat.avgTicket,
      'Items Promedio por Venta': stat.itemsCount / stat.salesCount,
    }))
    .sort((a, b) => a.Fecha.localeCompare(b.Fecha));

  // Estadísticas por método de pago
  const paymentStats = new Map<string, { count: number; total: number }>();
  sales.forEach(sale => {
    const method = sale.payment_method;
    const existing = paymentStats.get(method);
    if (existing) {
      existing.count += 1;
      existing.total += sale.total;
    } else {
      paymentStats.set(method, { count: 1, total: sale.total });
    }
  });

  const paymentStatsArray = Array.from(paymentStats.entries()).map(([method, stats]) => ({
    'Método de Pago': method,
    'Número de Ventas': stats.count,
    'Total': stats.total,
    'Promedio': stats.total / stats.count,
  }));

  // Crear libro de Excel con múltiples hojas
  const workbook = XLSX.utils.book_new();

  // Hoja 1: Resumen de Ventas
  const wsSalesSummary = XLSX.utils.json_to_sheet(salesSummary);
  XLSX.utils.book_append_sheet(workbook, wsSalesSummary, 'Resumen Ventas');

  // Hoja 2: Detalle por Producto
  const wsSalesDetails = XLSX.utils.json_to_sheet(salesDetails);
  XLSX.utils.book_append_sheet(workbook, wsSalesDetails, 'Detalle por Producto');

  // Hoja 3: Estadísticas por Producto
  const wsProductStats = XLSX.utils.json_to_sheet(productStatsArray);
  XLSX.utils.book_append_sheet(workbook, wsProductStats, 'Estadísticas Productos');

  // Hoja 4: Estadísticas Diarias
  const wsDailyStats = XLSX.utils.json_to_sheet(dailyStatsArray);
  XLSX.utils.book_append_sheet(workbook, wsDailyStats, 'Estadísticas Diarias');

  // Hoja 5: Estadísticas por Método de Pago
  const wsPaymentStats = XLSX.utils.json_to_sheet(paymentStatsArray);
  XLSX.utils.book_append_sheet(workbook, wsPaymentStats, 'Métodos de Pago');

  // Generar nombre de archivo
  const defaultFilename = `ventas_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.xlsx`;
  const finalFilename = filename || defaultFilename;

  // Descargar archivo
  XLSX.writeFile(workbook, finalFilename);
}

/**
 * Exporta solo ventas de un período específico
 */
export function exportSalesByDateRange(
  sales: SaleWithRelations[],
  startDate: Date,
  endDate: Date,
  filename?: string
) {
  const filteredSales = sales.filter(sale => {
    const saleDate = (sale.created_at as any)?.toDate
      ? (sale.created_at as any).toDate()
      : new Date(sale.created_at);
    return saleDate >= startDate && saleDate <= endDate;
  });

  const defaultFilename = `ventas_${format(startDate, 'yyyy-MM-dd')}_a_${format(endDate, 'yyyy-MM-dd')}.xlsx`;
  exportSalesToExcel(filteredSales, filename || defaultFilename);
}

/**
 * Exporta datos optimizados para machine learning / predicciones
 * Formato específico para análisis de series de tiempo
 */
export function exportSalesForPredictions(sales: SaleWithRelations[], filename?: string) {
  const mlData: any[] = [];

  sales.forEach(sale => {
    const saleDate = (sale.created_at as any)?.toDate
      ? (sale.created_at as any).toDate()
      : new Date(sale.created_at);

    sale.items?.forEach((item: any) => {
      mlData.push({
        // Características temporales
        'fecha': format(saleDate, 'yyyy-MM-dd', { locale: es }),
        'año': saleDate.getFullYear(),
        'mes': saleDate.getMonth() + 1,
        'dia_mes': saleDate.getDate(),
        'dia_semana': saleDate.getDay(), // 0 = Domingo, 6 = Sábado
        'hora': saleDate.getHours(),
        'minuto': saleDate.getMinutes(),
        'es_fin_de_semana': saleDate.getDay() === 0 || saleDate.getDay() === 6 ? 1 : 0,

        // Características del producto
        'producto_id': item.product?.id || '',
        'producto_nombre': item.product?.name || '',
        'producto_barcode': item.product?.barcode || '',
        'categoria': item.product?.category?.name || 'Sin categoría',
        'precio_costo': item.product?.cost_price || 0,
        'precio_venta': item.unit_price,
        'margen': item.unit_price - (item.product?.cost_price || 0),

        // Características de la venta
        'cantidad': item.quantity,
        'subtotal': item.subtotal,
        'descuento': item.discount,
        'metodo_pago': sale.payment_method,
        'metodo_pago_efectivo': sale.payment_method === 'efectivo' ? 1 : 0,
        'metodo_pago_tarjeta': sale.payment_method === 'tarjeta' ? 1 : 0,
        'metodo_pago_transferencia': sale.payment_method === 'transferencia' ? 1 : 0,

        // Métricas agregadas de la venta
        'total_venta': sale.total,
        'items_en_venta': sale.items?.length || 0,

        // Identificadores
        'venta_id': sale.id,
        'venta_numero': sale.sale_number,
      });
    });
  });

  const workbook = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(mlData);
  XLSX.utils.book_append_sheet(workbook, ws, 'Datos para Predicciones');

  const defaultFilename = `datos_predicciones_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(workbook, filename || defaultFilename);
}
