'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { DollarSign, Users, Eye, Search, Filter, CreditCard, FileSpreadsheet, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Customer } from '@/lib/types';
import { getDebtorCustomers } from '@/lib/cloudflare-credit-helpers';
import { getSales } from '@/lib/cloudflare-api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ExcelJS from 'exceljs';
import { toast } from 'sonner';

export default function DebtorsPage() {
  const { getToken } = useAuth();
  const [debtors, setDebtors] = useState<Customer[]>([]);
  const [filteredDebtors, setFilteredDebtors] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [totalDebt, setTotalDebt] = useState(0);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchDebtors = async () => {
      try {
        setLoading(true);
        const data = await getDebtorCustomers(getToken);
        setDebtors(data);
        setFilteredDebtors(data);

        // Calcular deuda total
        const total = data.reduce((sum, debtor) => sum + (debtor.current_debt || 0), 0);
        setTotalDebt(total);
      } catch (error) {
        console.error('Error fetching debtors:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDebtors();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredDebtors(debtors);
    } else {
      const filtered = debtors.filter(
        (debtor) =>
          debtor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          debtor.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          debtor.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredDebtors(filtered);
    }
  }, [searchTerm, debtors]);

  const handleExportToExcel = async () => {
    try {
      setExporting(true);
      toast.loading('Generando archivo Excel...', { id: 'exporting' });

      // Obtener todas las ventas a crédito
      const allSales = await getSales(getToken) as any[];

      // Filtrar solo ventas a crédito con saldo pendiente
      const creditSales = allSales.filter((sale: any) =>
        sale.payment_method === 'credito' &&
        sale.payment_status !== 'pagado' &&
        sale.customer_id
      );

      // Crear array para las filas del Excel
      const excelData: any[] = [];

      // Agregar hoja de resumen de deudores
      debtors.forEach((debtor) => {
        const debtorSales = creditSales.filter((sale: any) => sale.customer_id === debtor.id);

        debtorSales.forEach((sale: any) => {
          // Para cada venta, agregar los productos
          (sale.items || []).forEach((item: any) => {
            excelData.push({
              'Cliente': debtor.name,
              'Teléfono': debtor.phone || 'N/A',
              'Email': debtor.email || 'N/A',
              'Límite de Crédito': debtor.credit_limit || 0,
              'Deuda Total Cliente': debtor.current_debt || 0,
              'Crédito Disponible': (debtor.credit_limit || 0) - (debtor.current_debt || 0),
              '---': '---',
              'Nº Venta': sale.sale_number,
              'Fecha Venta': sale.created_at ? format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm', { locale: es }) : 'N/A',
              'Total Venta': sale.total || 0,
              'Monto Pagado': sale.amount_paid || 0,
              'Saldo Pendiente': sale.amount_pending || 0,
              'Estado': sale.payment_status === 'pendiente' ? 'Pendiente' : sale.payment_status === 'parcial' ? 'Parcial' : 'Pagado',
              '----': '----',
              'Producto': item.product?.name || 'Producto desconocido',
              'Cantidad': item.quantity,
              'Precio Unitario': item.unit_price,
              'Subtotal Producto': item.subtotal,
            });
          });
        });
      });

      // Crear workbook con ExcelJS
      const workbook = new ExcelJS.Workbook();

      // Hoja 1: Detalle completo de deudas
      const ws = workbook.addWorksheet('Detalle de Deudas');

      if (excelData.length > 0) {
        const headers = Object.keys(excelData[0]);
        ws.addRow(headers);

        // Estilizar headers
        const headerRow = ws.getRow(1);
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
          const values = headers.map(header => item[header]);
          ws.addRow(values);
        });

        // Ajustar anchos de columna
        ws.columns = [
          { width: 25 }, // Cliente
          { width: 15 }, // Teléfono
          { width: 25 }, // Email
          { width: 18 }, // Límite de Crédito
          { width: 18 }, // Deuda Total Cliente
          { width: 18 }, // Crédito Disponible
          { width: 5 },  // ---
          { width: 20 }, // Nº Venta
          { width: 18 }, // Fecha Venta
          { width: 15 }, // Total Venta
          { width: 15 }, // Monto Pagado
          { width: 15 }, // Saldo Pendiente
          { width: 12 }, // Estado
          { width: 5 },  // ----
          { width: 30 }, // Producto
          { width: 10 }, // Cantidad
          { width: 15 }, // Precio Unitario
          { width: 15 }, // Subtotal Producto
        ];
      }

      // Hoja 2: Resumen por cliente
      const summaryData = debtors.map(debtor => {
        const debtorSales = creditSales.filter((sale: any) => sale.customer_id === debtor.id);
        const totalVentas = debtorSales.length;
        const totalProductos = debtorSales.reduce((sum: number, sale: any) =>
          sum + (sale.items?.length || 0), 0
        );

        return {
          'Cliente': debtor.name,
          'Teléfono': debtor.phone || 'N/A',
          'Email': debtor.email || 'N/A',
          'Límite de Crédito': debtor.credit_limit || 0,
          'Deuda Total': debtor.current_debt || 0,
          'Crédito Disponible': (debtor.credit_limit || 0) - (debtor.current_debt || 0),
          'Ventas a Crédito': totalVentas,
          'Total Productos': totalProductos,
          'Estado': !debtor.credit_limit || debtor.credit_limit === 0
            ? 'Sin Límite'
            : ((debtor.current_debt || 0) / (debtor.credit_limit || 1) * 100) >= 90
            ? 'Crítico'
            : ((debtor.current_debt || 0) / (debtor.credit_limit || 1) * 100) >= 70
            ? 'Alerta'
            : 'Normal',
        };
      });

      const wsSummary = workbook.addWorksheet('Resumen por Cliente');

      if (summaryData.length > 0) {
        const summaryHeaders = Object.keys(summaryData[0]);
        wsSummary.addRow(summaryHeaders);

        // Estilizar headers
        const summaryHeaderRow = wsSummary.getRow(1);
        summaryHeaderRow.font = { bold: true };
        summaryHeaderRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4472C4' }
        };
        summaryHeaderRow.eachCell((cell) => {
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        });

        // Agregar datos
        summaryData.forEach(item => {
          const values = summaryHeaders.map(header => (item as any)[header]);
          wsSummary.addRow(values);
        });

        // Ajustar anchos de columna
        wsSummary.columns = [
          { width: 25 },
          { width: 15 },
          { width: 25 },
          { width: 18 },
          { width: 18 },
          { width: 18 },
          { width: 18 },
          { width: 15 },
          { width: 12 },
        ];
      }

      // Generar archivo y descargar
      const fileName = `deudores_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`;
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success('Archivo Excel generado correctamente', { id: 'exporting' });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Error al generar archivo Excel', { id: 'exporting' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Clientes Deudores</h1>
          <p className="text-gray-500 text-sm md:text-base">
            Gestiona las cuentas por cobrar
          </p>
        </div>
        <Button
          onClick={handleExportToExcel}
          disabled={exporting || debtors.length === 0}
          className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
        >
          {exporting ? (
            <>
              <Download className="h-4 w-4 animate-bounce" />
              Generando...
            </>
          ) : (
            <>
              <FileSpreadsheet className="h-4 w-4" />
              Exportar a Excel
            </>
          )}
        </Button>
      </div>

      {/* Resumen de deuda total */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deuda Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${totalDebt.toLocaleString('es-CO')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes con Deuda</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{debtors.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deuda Promedio</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${debtors.length > 0 ? Math.round(totalDebt / debtors.length).toLocaleString('es-CO') : 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de búsqueda */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Search className="h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar cliente por nombre, teléfono o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de deudores */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Cargando deudores...</p>
            </div>
          ) : filteredDebtors.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-gray-500">
                {searchTerm
                  ? 'No se encontraron deudores con ese criterio'
                  : 'No hay clientes con deuda pendiente'}
              </p>
            </div>
          ) : (
            <>
              {/* Vista de tabla para desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Nombre</th>
                      <th className="text-left py-3 px-4">Contacto</th>
                      <th className="text-right py-3 px-4">Límite de Crédito</th>
                      <th className="text-right py-3 px-4">Deuda Actual</th>
                      <th className="text-right py-3 px-4">Crédito Disponible</th>
                      <th className="text-center py-3 px-4">Estado</th>
                      <th className="text-center py-3 px-4">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDebtors.map((debtor) => {
                      const creditLimit = debtor.credit_limit || 0;
                      const currentDebt = debtor.current_debt || 0;
                      const availableCredit = creditLimit - currentDebt;
                      const debtPercentage = creditLimit > 0 ? (currentDebt / creditLimit) * 100 : 0;

                      return (
                        <tr key={debtor.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{debtor.name}</td>
                          <td className="py-3 px-4">
                            <div className="text-sm">
                              {debtor.phone && <div>{debtor.phone}</div>}
                              {debtor.email && (
                                <div className="text-gray-500 truncate max-w-[200px]">
                                  {debtor.email}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {creditLimit > 0 ? `$${creditLimit.toLocaleString('es-CO')}` : 'Sin límite'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="font-semibold text-red-600">
                              ${currentDebt.toLocaleString('es-CO')}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={availableCredit > 0 ? 'text-green-600' : creditLimit === 0 ? 'text-blue-600' : 'text-red-600'}>
                              {creditLimit === 0 ? 'Ilimitado' : `$${availableCredit.toLocaleString('es-CO')}`}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center justify-center px-2 py-1 rounded text-xs font-semibold ${
                                creditLimit === 0
                                  ? 'bg-blue-100 text-blue-800'
                                  : debtPercentage >= 90
                                  ? 'bg-red-100 text-red-800'
                                  : debtPercentage >= 70
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-green-100 text-green-800'
                              }`}
                            >
                              {creditLimit === 0
                                ? 'Sin Límite'
                                : debtPercentage >= 90
                                ? 'Crítico'
                                : debtPercentage >= 70
                                ? 'Alerta'
                                : 'Normal'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Link href={`/dashboard/debtors/${debtor.id}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-1" />
                                Ver Detalle
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Vista de cards para móvil */}
              <div className="md:hidden space-y-3">
                {filteredDebtors.map((debtor) => {
                  const creditLimit = debtor.credit_limit || 0;
                  const currentDebt = debtor.current_debt || 0;
                  const availableCredit = creditLimit - currentDebt;
                  const debtPercentage = creditLimit > 0 ? (currentDebt / creditLimit) * 100 : 0;

                  return (
                    <Card key={debtor.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-semibold text-base">{debtor.name}</h3>
                          <span
                            className={`inline-flex items-center justify-center px-2 py-1 rounded text-xs font-semibold ${
                              creditLimit === 0
                                ? 'bg-blue-100 text-blue-800'
                                : debtPercentage >= 90
                                ? 'bg-red-100 text-red-800'
                                : debtPercentage >= 70
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {creditLimit === 0
                              ? 'Sin Límite'
                              : debtPercentage >= 90
                              ? 'Crítico'
                              : debtPercentage >= 70
                              ? 'Alerta'
                              : 'Normal'}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm mb-3">
                          {debtor.phone && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Teléfono:</span>
                              <span>{debtor.phone}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-500">Límite:</span>
                            <span>{creditLimit > 0 ? `$${creditLimit.toLocaleString('es-CO')}` : 'Sin límite'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Deuda:</span>
                            <span className="font-semibold text-red-600">
                              ${currentDebt.toLocaleString('es-CO')}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Disponible:</span>
                            <span className={availableCredit > 0 ? 'text-green-600' : creditLimit === 0 ? 'text-blue-600' : 'text-red-600'}>
                              {creditLimit === 0 ? 'Ilimitado' : `$${availableCredit.toLocaleString('es-CO')}`}
                            </span>
                          </div>
                        </div>
                        <Link href={`/dashboard/debtors/${debtor.id}`}>
                          <Button variant="outline" size="sm" className="w-full">
                            <Eye className="h-4 w-4 mr-1" />
                            Ver Detalle y Pagos
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
