import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { SaleWithRelations, Sale } from './types';
import { ProductAnalytics } from './analytics-helpers';

/**
 * Exporta las ventas a un archivo Excel con múltiples hojas
 * Incluye datos necesarios para análisis y predicciones
 */
export async function exportSalesToExcel(sales: SaleWithRelations[], filename?: string) {
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
  const workbook = new ExcelJS.Workbook();

  // Hoja 1: Resumen de Ventas
  const wsSalesSummary = workbook.addWorksheet('Resumen Ventas');
  addDataToWorksheet(wsSalesSummary, salesSummary);

  // Hoja 2: Detalle por Producto
  const wsSalesDetails = workbook.addWorksheet('Detalle por Producto');
  addDataToWorksheet(wsSalesDetails, salesDetails);

  // Hoja 3: Estadísticas por Producto
  const wsProductStats = workbook.addWorksheet('Estadísticas Productos');
  addDataToWorksheet(wsProductStats, productStatsArray);

  // Hoja 4: Estadísticas Diarias
  const wsDailyStats = workbook.addWorksheet('Estadísticas Diarias');
  addDataToWorksheet(wsDailyStats, dailyStatsArray);

  // Hoja 5: Estadísticas por Método de Pago
  const wsPaymentStats = workbook.addWorksheet('Métodos de Pago');
  addDataToWorksheet(wsPaymentStats, paymentStatsArray);

  // Generar nombre de archivo
  const defaultFilename = `ventas_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.xlsx`;
  const finalFilename = filename || defaultFilename;

  // Descargar archivo
  const buffer = await workbook.xlsx.writeBuffer();
  downloadBuffer(buffer, finalFilename);
}

/**
 * Exporta solo ventas de un período específico
 */
export async function exportSalesByDateRange(
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
  await exportSalesToExcel(filteredSales, filename || defaultFilename);
}

/**
 * Exporta datos optimizados para machine learning / predicciones
 * Formato específico para análisis de series de tiempo
 */
export async function exportSalesForPredictions(sales: SaleWithRelations[], filename?: string) {
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

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Datos para Predicciones');
  addDataToWorksheet(ws, mlData);

  const defaultFilename = `datos_predicciones_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  const buffer = await workbook.xlsx.writeBuffer();
  downloadBuffer(buffer, defaultFilename);
}

/**
 * Exporta análisis de IA con recomendaciones de stock
 */
export async function exportAnalyticsToExcel(analytics: ProductAnalytics[], filename?: string) {
  // Hoja 1: Análisis Completo
  const fullAnalysis = analytics.map(item => ({
    'Producto': item.product_name,
    'Código de Barras': item.product_barcode || 'N/A',
    'Unidades Vendidas (Total)': item.total_quantity_sold,
    'Ventas Últimos 7 Días': item.last_7_days_sales,
    'Ventas Últimos 30 Días': item.last_30_days_sales,
    'Ingresos Totales': `$${item.total_revenue.toLocaleString('es-CO')}`,
    'Número de Ventas': item.sales_count,
    'Promedio por Venta': item.average_sale_quantity,
    'Velocidad de Venta (und/día)': item.sales_velocity,
    'Stock Actual': item.current_stock,
    'Stock Mínimo': item.min_stock,
    'Días hasta Agotarse': item.days_until_stockout === 9999 ? 'Sin ventas' : item.days_until_stockout,
    'Tendencia': item.trend === 'high' ? 'Alta' : item.trend === 'medium' ? 'Media' : 'Baja',
    'Nivel de Riesgo': item.risk_level === 'critical' ? 'Crítico' : item.risk_level === 'warning' ? 'Advertencia' : 'Bien',
    'Cantidad Recomendada a Pedir': item.recommended_order_quantity,
  }));

  // Hoja 2: Top 10 Productos Más Vendidos
  const topSelling = analytics.slice(0, 10).map((item, index) => ({
    'Posición': index + 1,
    'Producto': item.product_name,
    'Código': item.product_barcode || 'N/A',
    'Unidades Vendidas': item.total_quantity_sold,
    'Velocidad (und/día)': item.sales_velocity,
    'Ingresos': `$${item.total_revenue.toLocaleString('es-CO')}`,
    'Stock Actual': item.current_stock,
    'Pedir': item.recommended_order_quantity,
  }));

  // Hoja 3: Productos Críticos (necesitan pedirse urgente)
  const criticalProducts = analytics
    .filter(item => item.risk_level === 'critical')
    .map(item => ({
      'Producto': item.product_name,
      'Código': item.product_barcode || 'N/A',
      'Stock Actual': item.current_stock,
      'Stock Mínimo': item.min_stock,
      'Velocidad de Venta': item.sales_velocity,
      'Días hasta Agotarse': item.days_until_stockout,
      '⚠️ Cantidad URGENTE a Pedir': item.recommended_order_quantity,
      'Razón': item.current_stock <= item.min_stock
        ? 'Stock por debajo del mínimo'
        : 'Se agotará en menos de 3 días',
    }));

  // Hoja 4: Productos en Advertencia
  const warningProducts = analytics
    .filter(item => item.risk_level === 'warning')
    .map(item => ({
      'Producto': item.product_name,
      'Código': item.product_barcode || 'N/A',
      'Stock Actual': item.current_stock,
      'Velocidad de Venta': item.sales_velocity,
      'Días hasta Agotarse': item.days_until_stockout,
      'Cantidad Recomendada a Pedir': item.recommended_order_quantity,
    }));

  // Hoja 5: Recomendaciones de Pedido (todos los que necesitan pedirse)
  const orderRecommendations = analytics
    .filter(item => item.recommended_order_quantity > 0)
    .map(item => ({
      'Producto': item.product_name,
      'Código de Barras': item.product_barcode || 'N/A',
      'Stock Actual': item.current_stock,
      'Cantidad a Pedir': item.recommended_order_quantity,
      'Prioridad': item.risk_level === 'critical'
        ? '🔴 URGENTE'
        : item.risk_level === 'warning'
        ? '🟡 PRONTO'
        : '🟢 NORMAL',
      'Días hasta Agotarse': item.days_until_stockout === 9999 ? 'N/A' : item.days_until_stockout,
      'Ventas Últimos 7 Días': item.last_7_days_sales,
      'Ventas Últimos 30 Días': item.last_30_days_sales,
    }))
    .sort((a, b) => {
      // Ordenar por prioridad
      const priorityOrder = { '🔴 URGENTE': 0, '🟡 PRONTO': 1, '🟢 NORMAL': 2 };
      return (priorityOrder[a.Prioridad as keyof typeof priorityOrder] || 3) -
             (priorityOrder[b.Prioridad as keyof typeof priorityOrder] || 3);
    });

  // Hoja 6: Resumen Ejecutivo
  const totalProducts = analytics.length;
  const criticalCount = analytics.filter(a => a.risk_level === 'critical').length;
  const warningCount = analytics.filter(a => a.risk_level === 'warning').length;
  const goodCount = analytics.filter(a => a.risk_level === 'good').length;
  const totalToOrder = analytics.filter(a => a.recommended_order_quantity > 0).length;
  const highTrendCount = analytics.filter(a => a.trend === 'high').length;
  const totalRevenue = analytics.reduce((sum, a) => sum + a.total_revenue, 0);

  const executiveSummary = [
    { 'Métrica': 'Total de Productos Analizados', 'Valor': totalProducts },
    { 'Métrica': '---', 'Valor': '---' },
    { 'Métrica': '🔴 Productos en Estado Crítico', 'Valor': criticalCount },
    { 'Métrica': '🟡 Productos en Advertencia', 'Valor': warningCount },
    { 'Métrica': '🟢 Productos en Buen Estado', 'Valor': goodCount },
    { 'Métrica': '---', 'Valor': '---' },
    { 'Métrica': 'Productos que Necesitan Pedirse', 'Valor': totalToOrder },
    { 'Métrica': 'Productos con Tendencia Alta', 'Valor': highTrendCount },
    { 'Métrica': '---', 'Valor': '---' },
    { 'Métrica': 'Ingresos Totales Analizados', 'Valor': `$${totalRevenue.toLocaleString('es-CO')}` },
  ];

  // Crear libro de Excel
  const workbook = new ExcelJS.Workbook();

  // Agregar hojas
  const ws1 = workbook.addWorksheet('Resumen Ejecutivo');
  addDataToWorksheet(ws1, executiveSummary);

  const ws2 = workbook.addWorksheet('Pedidos Recomendados');
  addDataToWorksheet(ws2, orderRecommendations);

  const ws3 = workbook.addWorksheet('Productos Críticos');
  addDataToWorksheet(ws3, criticalProducts);

  const ws4 = workbook.addWorksheet('Productos Advertencia');
  addDataToWorksheet(ws4, warningProducts);

  const ws5 = workbook.addWorksheet('Top 10 Más Vendidos');
  addDataToWorksheet(ws5, topSelling);

  const ws6 = workbook.addWorksheet('Análisis Completo');
  addDataToWorksheet(ws6, fullAnalysis);

  // Generar archivo
  const defaultFilename = `analisis_ia_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.xlsx`;
  const buffer = await workbook.xlsx.writeBuffer();
  downloadBuffer(buffer, filename || defaultFilename);
}

// Helper functions
function addDataToWorksheet(worksheet: ExcelJS.Worksheet, data: any[]) {
  if (data.length === 0) return;

  // Obtener los headers de las claves del primer objeto
  const headers = Object.keys(data[0]);

  // Agregar headers
  worksheet.addRow(headers);

  // Estilizar headers
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  });

  // Agregar datos
  data.forEach(item => {
    const values = headers.map(header => item[header]);
    worksheet.addRow(values);
  });

  // Auto-ajustar ancho de columnas basado en el contenido de las filas
  const colWidths: number[] = [];
  worksheet.eachRow((row) => {
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const len = cell.value ? cell.value.toString().length : 0;
      colWidths[colNumber] = Math.max(colWidths[colNumber] || 0, len);
    });
  });
  colWidths.forEach((width, colNumber) => {
    const col = worksheet.getColumn(colNumber);
    col.width = Math.min(Math.max(width + 2, 10), 50);
  });
}

function downloadBuffer(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}
