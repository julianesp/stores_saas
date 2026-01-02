import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import ExcelJS from 'exceljs';
import { getSales, getProducts, getCustomers, getUserProfile } from '@/lib/cloudflare-api';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    // Obtener user_profile
    const userProfile = await getUserProfile(getToken);

    if (!userProfile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    // Obtener ventas, productos y clientes desde Cloudflare API
    const [allSales, allProducts, allCustomers] = await Promise.all([
      getSales(getToken),
      getProducts(getToken),
      getCustomers(getToken),
    ]);

    // Filtrar ventas del día
    const startDate = new Date(date + 'T00:00:00');
    const endDate = new Date(date + 'T23:59:59');

    const salesOfDay = allSales.filter((sale) => {
      const saleDate = new Date(sale.created_at);
      return saleDate >= startDate && saleDate <= endDate;
    });

    if (salesOfDay.length === 0) {
      return NextResponse.json({
        error: 'No hay ventas para esta fecha',
        date
      }, { status: 404 });
    }

    // Crear mapas para búsqueda rápida
    const productsMap = new Map(allProducts.map((p) => [p.id, p]));
    const customersMap = new Map(allCustomers.map((c) => [c.id, c]));

    // Procesar ventas con sus items
    const salesData: any[] = [];

    for (const sale of salesOfDay) {
      // Las ventas ya vienen con items desde la API de Cloudflare
      const saleItems = sale.items || [];

      for (const item of saleItems) {
        const product = productsMap.get(item.product_id);
        const customer = sale.customer_id ? customersMap.get(sale.customer_id) : null;

        salesData.push({
          fecha_compra: sale.created_at,
          numero_venta: sale.sale_number,
          producto: product?.name || 'N/A',
          cantidad: item.quantity,
          valor_unitario: item.unit_price,
          valor_total: item.subtotal,
          cliente: customer?.name || 'Cliente General',
          telefono: customer?.phone || 'N/A',
          metodo_pago: sale.payment_method,
        });
      }
    }

    if (salesData.length === 0) {
      return NextResponse.json({
        error: 'No hay items de venta para esta fecha',
        date
      }, { status: 404 });
    }

    // Formatear datos para Excel
    const excelData = salesData.map((sale: any) => ({
      'Fecha de Compra': new Date(sale.fecha_compra).toLocaleString('es-CO', {
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }),
      'N° Venta': sale.numero_venta,
      'Producto': sale.producto || 'N/A',
      'Cantidad': sale.cantidad,
      'Valor Unitario': `$${Number(sale.valor_unitario || 0).toLocaleString('es-CO')}`,
      'Valor Total': `$${Number(sale.valor_total || 0).toLocaleString('es-CO')}`,
      'Cliente': sale.cliente,
      'Teléfono': sale.telefono,
      'Método de Pago': sale.metodo_pago === 'efectivo' ? 'Efectivo' :
                        sale.metodo_pago === 'tarjeta' ? 'Tarjeta' :
                        sale.metodo_pago === 'transferencia' ? 'Transferencia' : 'Crédito'
    }));

    // Crear libro de Excel con ExcelJS
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Ventas ${date}`);

    // Agregar headers y datos
    if (excelData.length > 0) {
      const headers = Object.keys(excelData[0]);
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
      excelData.forEach(item => {
        const values = headers.map(header => (item as any)[header]);
        worksheet.addRow(values);
      });

      // Ajustar ancho de columnas
      worksheet.columns = [
        { width: 18 }, // Fecha de Compra
        { width: 12 }, // N° Venta
        { width: 30 }, // Producto
        { width: 10 }, // Cantidad
        { width: 15 }, // Valor Unitario
        { width: 15 }, // Valor Total
        { width: 25 }, // Cliente
        { width: 15 }, // Teléfono
        { width: 15 }, // Método de Pago
      ];
    }

    // Generar buffer
    const excelBuffer = await workbook.xlsx.writeBuffer();

    // Retornar archivo Excel
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Ventas_${date}.xlsx"`,
      },
    });

  } catch (error) {
    console.error('Error generating daily report:', error);
    return NextResponse.json({
      error: 'Error al generar el reporte',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
