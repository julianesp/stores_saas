'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Receipt, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getAllDocuments, queryDocuments } from '@/lib/firestore-helpers';
import { SaleWithRelations, Sale, Customer, UserProfile, SaleItem, Product } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { Timestamp } from 'firebase/firestore';

export default function SalesPage() {
  const [sales, setSales] = useState<SaleWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, today, week, month

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Ventas</h1>
          <p className="text-gray-500">Historial de todas las ventas</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {['all', 'today', 'week', 'month'].map(f => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'Todas' : f === 'today' ? 'Hoy' : f === 'week' ? 'Semana' : 'Mes'}
          </Button>
        ))}
      </div>

      {/* Resumen */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{sales.length}</div>
            <p className="text-xs text-gray-500">Total Ventas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalSales)}</div>
            <p className="text-xs text-gray-500">Monto Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
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
            <div className="overflow-x-auto">
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
