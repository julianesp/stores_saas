'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Receipt, Eye, Download, FileSpreadsheet, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getAllDocuments, queryDocuments } from '@/lib/firestore-helpers';
import { SaleWithRelations, Sale, Customer, UserProfile, SaleItem, Product } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { Timestamp } from 'firebase/firestore';
import { exportSalesToExcel, exportSalesByDateRange, exportSalesForPredictions } from '@/lib/excel-export';

export default function SalesPage() {
  const [sales, setSales] = useState<SaleWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, today, week, month
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomDateRange, setShowCustomDateRange] = useState(false);

  useEffect(() => {
    fetchSales();
  }, [filter]);

  const fetchSales = async () => {
    try {
      // Obtener todas las ventas
      let salesData = await getAllDocuments('sales') as Sale[];

      // Aplicar filtros de fecha
      if (filter === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        salesData = salesData.filter(sale => {
          const saleDate = (sale.created_at as any)?.toDate
            ? (sale.created_at as any).toDate()
            : new Date(sale.created_at);
          return saleDate >= today;
        });
      } else if (filter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        salesData = salesData.filter(sale => {
          const saleDate = (sale.created_at as any)?.toDate
            ? (sale.created_at as any).toDate()
            : new Date(sale.created_at);
          return saleDate >= weekAgo;
        });
      } else if (filter === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        salesData = salesData.filter(sale => {
          const saleDate = (sale.created_at as any)?.toDate
            ? (sale.created_at as any).toDate()
            : new Date(sale.created_at);
          return saleDate >= monthAgo;
        });
      }

      // Obtener datos relacionados para hacer el join manualmente
      const customers = await getAllDocuments('customers') as Customer[];
      const userProfiles = await getAllDocuments('user_profiles') as UserProfile[];
      const saleItems = await getAllDocuments('sale_items') as SaleItem[];
      const products = await getAllDocuments('products') as Product[];

      // Crear mapas para acceso rápido
      const customersMap = new Map(customers.map(c => [c.id, c]));
      const userProfilesMap = new Map(userProfiles.map(u => [u.id, u]));
      const productsMap = new Map(products.map(p => [p.id, p]));

      // Agrupar sale_items por sale_id
      const saleItemsMap = new Map<string, SaleItem[]>();
      saleItems.forEach(item => {
        if (!saleItemsMap.has(item.sale_id)) {
          saleItemsMap.set(item.sale_id, []);
        }
        saleItemsMap.get(item.sale_id)?.push({
          ...item,
          product: productsMap.get(item.product_id)
        } as any);
      });

      // Combinar los datos
      const salesWithRelations: SaleWithRelations[] = salesData.map(sale => ({
        ...sale,
        customer: sale.customer_id ? customersMap.get(sale.customer_id) : undefined,
        cashier: userProfilesMap.get(sale.cashier_id),
        items: saleItemsMap.get(sale.id) || []
      }));

      // Ordenar por fecha de creación descendente
      salesWithRelations.sort((a, b) => {
        const dateA = (a.created_at as any)?.toDate ? (a.created_at as any).toDate() : new Date(a.created_at);
        const dateB = (b.created_at as any)?.toDate ? (b.created_at as any).toDate() : new Date(b.created_at);
        return dateB.getTime() - dateA.getTime();
      });

      setSales(salesWithRelations);
    } catch (error) {
      console.error('Error fetching sales:', error);
      toast.error('Error al cargar ventas');
    } finally {
      setLoading(false);
    }
  };

  const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);

  const handleExportAll = () => {
    if (sales.length === 0) {
      toast.error('No hay ventas para exportar');
      return;
    }
    exportSalesToExcel(sales);
    toast.success(`Exportadas ${sales.length} ventas a Excel`);
  };

  const handleExportForPredictions = () => {
    if (sales.length === 0) {
      toast.error('No hay ventas para exportar');
      return;
    }
    exportSalesForPredictions(sales);
    toast.success('Datos exportados para análisis de predicciones');
  };

  const handleExportCustomRange = () => {
    if (!customStartDate || !customEndDate) {
      toast.error('Selecciona ambas fechas');
      return;
    }

    const startDate = new Date(customStartDate);
    const endDate = new Date(customEndDate);
    endDate.setHours(23, 59, 59, 999); // Incluir todo el día final

    if (startDate > endDate) {
      toast.error('La fecha inicial debe ser anterior a la final');
      return;
    }

    const filteredSales = sales.filter(sale => {
      const saleDate = (sale.created_at as any)?.toDate
        ? (sale.created_at as any).toDate()
        : new Date(sale.created_at);
      return saleDate >= startDate && saleDate <= endDate;
    });

    if (filteredSales.length === 0) {
      toast.error('No hay ventas en ese rango de fechas');
      return;
    }

    exportSalesByDateRange(sales, startDate, endDate);
    toast.success(`Exportadas ${filteredSales.length} ventas del rango seleccionado`);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Ventas</h1>
          <p className="text-gray-500 text-sm md:text-base">Historial de todas las ventas</p>
        </div>

        {/* Botones de Exportación */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleExportAll}
            disabled={sales.length === 0}
            className="text-sm"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Exportar a Excel
          </Button>
          <Button
            variant="outline"
            onClick={handleExportForPredictions}
            disabled={sales.length === 0}
            className="text-sm"
          >
            <Brain className="mr-2 h-4 w-4" />
            Exportar para Predicciones
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {['all', 'today', 'week', 'month'].map(f => (
                <Button
                  key={f}
                  variant={filter === f ? 'default' : 'outline'}
                  onClick={() => {
                    setFilter(f);
                    setShowCustomDateRange(false);
                  }}
                  className="text-sm md:text-base flex-1 sm:flex-none"
                >
                  {f === 'all' ? 'Todas' : f === 'today' ? 'Hoy' : f === 'week' ? 'Semana' : 'Mes'}
                </Button>
              ))}
              <Button
                variant={showCustomDateRange ? 'default' : 'outline'}
                onClick={() => setShowCustomDateRange(!showCustomDateRange)}
                className="text-sm md:text-base flex-1 sm:flex-none"
              >
                Rango Personalizado
              </Button>
            </div>

            {/* Selector de rango personalizado */}
            {showCustomDateRange && (
              <div className="border-t pt-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <Label htmlFor="start-date" className="text-sm">Fecha Inicio</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-date" className="text-sm">Fecha Fin</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-end gap-2">
                    <Button
                      onClick={handleExportCustomRange}
                      disabled={!customStartDate || !customEndDate}
                      className="flex-1 text-sm"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Exportar Rango
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  💡 Tip: Usa el rango personalizado para exportar ventas específicas para análisis de predicciones
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="text-xl md:text-2xl font-bold">{sales.length}</div>
            <p className="text-xs text-gray-500">Total Ventas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="text-xl md:text-2xl font-bold text-green-600">{formatCurrency(totalSales)}</div>
            <p className="text-xs text-gray-500">Monto Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="text-xl md:text-2xl font-bold">
              {sales.length > 0 ? formatCurrency(totalSales / sales.length) : '$0'}
            </div>
            <p className="text-xs text-gray-500">Promedio por Venta</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de ventas */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8">Cargando ventas...</div>
          ) : sales.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-gray-500">No hay ventas en este período</p>
            </div>
          ) : (
            <>
              {/* Vista de tabla para desktop */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Número</th>
                      <th className="text-left py-3 px-4">Fecha</th>
                      <th className="text-left py-3 px-4">Cajero</th>
                      <th className="text-left py-3 px-4">Método de Pago</th>
                      <th className="text-right py-3 px-4">Items</th>
                      <th className="text-right py-3 px-4">Total</th>
                      <th className="text-center py-3 px-4">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map(sale => (
                      <tr key={sale.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-mono text-sm">{sale.sale_number}</td>
                        <td className="py-3 px-4 text-sm">
                          {format(
                            (sale.created_at as any)?.toDate
                              ? (sale.created_at as any).toDate()
                              : new Date(sale.created_at),
                            "dd MMM yyyy HH:mm",
                            { locale: es }
                          )}
                        </td>
                        <td className="py-3 px-4">{sale.cashier?.full_name || 'N/A'}</td>
                        <td className="py-3 px-4 capitalize">{sale.payment_method}</td>
                        <td className="py-3 px-4 text-right">{sale.items?.length || 0}</td>
                        <td className="py-3 px-4 text-right font-semibold">
                          {formatCurrency(sale.total)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block px-2 py-1 rounded text-xs ${
                            sale.status === 'completada' ? 'bg-green-100 text-green-800' :
                            sale.status === 'cancelada' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {sale.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Vista de cards para móvil y tablet */}
              <div className="lg:hidden space-y-3">
                {sales.map(sale => (
                  <Card key={sale.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-mono text-sm font-semibold">{sale.sale_number}</p>
                          <p className="text-xs text-gray-500">
                            {format(
                              (sale.created_at as any)?.toDate
                                ? (sale.created_at as any).toDate()
                                : new Date(sale.created_at),
                              "dd MMM yyyy HH:mm",
                              { locale: es }
                            )}
                          </p>
                        </div>
                        <span className={`inline-block px-2 py-1 rounded text-xs ${
                          sale.status === 'completada' ? 'bg-green-100 text-green-800' :
                          sale.status === 'cancelada' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {sale.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                        <div>
                          <span className="text-gray-500">Cajero:</span>
                          <p className="truncate">{sale.cashier?.full_name || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Pago:</span>
                          <p className="capitalize">{sale.payment_method}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Items:</span>
                          <p>{sale.items?.length || 0}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Total:</span>
                          <p className="font-semibold text-green-600">{formatCurrency(sale.total)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
