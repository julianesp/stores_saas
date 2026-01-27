'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { getPurchaseOrders, getSales, getProducts } from '@/lib/cloudflare-api';
import type { PurchaseOrderWithItems, Sale, Product } from '@/lib/types';

interface PurchaseStats {
  totalInvestment: number;
  totalOrders: number;
  averageOrderValue: number;
  totalProducts: number;
  monthlyInvestment: { month: string; amount: number }[];
  supplierStats: { supplier: string; total: number; orders: number }[];
  productStats: { product: string; invested: number; sold: number; profit: number }[];
  profitMargin: number;
  totalRevenue: number;
  totalProfit: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function PurchaseStatsPage() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PurchaseStats | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  useEffect(() => {
    loadStats();
  }, [dateRange]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const [orders, sales, products] = await Promise.all([
        getPurchaseOrders(getToken),
        getSales(getToken),
        getProducts(getToken),
      ]);

      // Filter by date range
      const cutoffDate = getCutoffDate(dateRange);
      const filteredOrders = orders.filter(order =>
        new Date(order.order_date) >= cutoffDate
      );
      const filteredSales = sales.filter(sale =>
        new Date(sale.created_at) >= cutoffDate
      );

      // Calculate total investment
      const totalInvestment = filteredOrders.reduce((sum, order) => sum + order.total, 0);

      // Calculate average order value
      const averageOrderValue = filteredOrders.length > 0
        ? totalInvestment / filteredOrders.length
        : 0;

      // Calculate total products purchased
      const totalProducts = filteredOrders.reduce((sum, order) =>
        sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
      );

      // Monthly investment
      const monthlyData = calculateMonthlyInvestment(filteredOrders);

      // Supplier stats
      const supplierMap = new Map<string, { total: number; orders: number; name: string }>();
      filteredOrders.forEach(order => {
        const existing = supplierMap.get(order.supplier_id) || {
          total: 0,
          orders: 0,
          name: order.supplier?.name || 'Proveedor desconocido'
        };
        supplierMap.set(order.supplier_id, {
          total: existing.total + order.total,
          orders: existing.orders + 1,
          name: existing.name,
        });
      });

      const supplierStats = Array.from(supplierMap.values())
        .map(s => ({ supplier: s.name, total: s.total, orders: s.orders }))
        .sort((a, b) => b.total - a.total);

      // Product profit analysis
      const productMap = new Map<string, { invested: number; sold: number; revenue: number; name: string }>();

      // Calculate investment per product
      filteredOrders.forEach(order => {
        order.items.forEach(item => {
          const existing = productMap.get(item.product_id) || {
            invested: 0,
            sold: 0,
            revenue: 0,
            name: item.product_name
          };
          productMap.set(item.product_id, {
            ...existing,
            invested: existing.invested + item.subtotal,
          });
        });
      });

      // Calculate sales per product
      const allSales = await Promise.all(
        filteredSales.map(async (sale) => {
          try {
            const response = await fetch(`/api/cloudflare/sales/${sale.id}`, {
              headers: { Authorization: `Bearer ${await getToken()}` }
            });
            if (!response.ok) return null;
            const data = await response.json();
            return data.data;
          } catch {
            return null;
          }
        })
      );

      allSales.filter(Boolean).forEach((sale: any) => {
        if (sale?.items) {
          sale.items.forEach((item: any) => {
            const existing = productMap.get(item.product_id);
            if (existing) {
              productMap.set(item.product_id, {
                ...existing,
                sold: existing.sold + item.quantity,
                revenue: existing.revenue + item.subtotal,
              });
            }
          });
        }
      });

      const productStats = Array.from(productMap.values())
        .map(p => ({
          product: p.name,
          invested: p.invested,
          sold: p.sold,
          profit: p.revenue - p.invested,
        }))
        .filter(p => p.sold > 0)
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 10);

      // Calculate totals
      const totalRevenue = productStats.reduce((sum, p) => sum + (p.invested + p.profit), 0);
      const totalProfit = productStats.reduce((sum, p) => sum + p.profit, 0);
      const profitMargin = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0;

      setStats({
        totalInvestment,
        totalOrders: filteredOrders.length,
        averageOrderValue,
        totalProducts,
        monthlyInvestment: monthlyData,
        supplierStats: supplierStats.slice(0, 10),
        productStats,
        profitMargin,
        totalRevenue,
        totalProfit,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCutoffDate = (range: '7d' | '30d' | '90d' | 'all'): Date => {
    const now = new Date();
    switch (range) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case 'all':
        return new Date(0);
    }
  };

  const calculateMonthlyInvestment = (orders: PurchaseOrderWithItems[]) => {
    const monthMap = new Map<string, number>();

    orders.forEach(order => {
      const date = new Date(order.order_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' });

      monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + order.total);
    });

    return Array.from(monthMap.entries())
      .map(([key, amount]) => {
        const [year, month] = key.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return {
          month: date.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' }),
          amount,
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando estadísticas...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">No hay datos disponibles</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Estadísticas de Compras</h1>
          <p className="text-gray-500">Análisis de inversión y rentabilidad</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={dateRange === '7d' ? 'default' : 'outline'}
            onClick={() => setDateRange('7d')}
            size="sm"
          >
            7 días
          </Button>
          <Button
            variant={dateRange === '30d' ? 'default' : 'outline'}
            onClick={() => setDateRange('30d')}
            size="sm"
          >
            30 días
          </Button>
          <Button
            variant={dateRange === '90d' ? 'default' : 'outline'}
            onClick={() => setDateRange('90d')}
            size="sm"
          >
            90 días
          </Button>
          <Button
            variant={dateRange === 'all' ? 'default' : 'outline'}
            onClick={() => setDateRange('all')}
            size="sm"
          >
            Todo
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inversión Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalInvestment)}</div>
            <p className="text-xs text-muted-foreground">
              En {stats.totalOrders} órdenes de compra
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ganancia Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.totalProfit)}
            </div>
            <p className="text-xs text-muted-foreground">
              Margen: {stats.profitMargin.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio por Orden</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.averageOrderValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.totalOrders} órdenes totales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productos Comprados</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              Unidades totales
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Investment Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Inversión Mensual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.monthlyInvestment}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelStyle={{ color: '#000' }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#0088FE"
                  name="Inversión"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Supplier Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Distribución por Proveedor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.supplierStats}
                  dataKey="total"
                  nameKey="supplier"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {stats.supplierStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Suppliers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Proveedores por Inversión</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Proveedor</th>
                  <th className="text-right py-3 px-4">Órdenes</th>
                  <th className="text-right py-3 px-4">Total Invertido</th>
                  <th className="text-right py-3 px-4">Promedio/Orden</th>
                </tr>
              </thead>
              <tbody>
                {stats.supplierStats.map((supplier, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{supplier.supplier}</td>
                    <td className="py-3 px-4 text-right">{supplier.orders}</td>
                    <td className="py-3 px-4 text-right font-semibold">
                      {formatCurrency(supplier.total)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600">
                      {formatCurrency(supplier.total / supplier.orders)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Product Profitability */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Productos por Rentabilidad</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={stats.productStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="product"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelStyle={{ color: '#000' }}
                />
                <Legend />
                <Bar dataKey="invested" fill="#FF8042" name="Invertido" />
                <Bar dataKey="profit" fill="#00C49F" name="Ganancia" />
              </BarChart>
            </ResponsiveContainer>

            <div className="overflow-x-auto">
              <table className="w-full mt-6">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Producto</th>
                    <th className="text-right py-3 px-4">Unidades Vendidas</th>
                    <th className="text-right py-3 px-4">Invertido</th>
                    <th className="text-right py-3 px-4">Ganancia</th>
                    <th className="text-right py-3 px-4">ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.productStats.map((product, index) => {
                    const roi = product.invested > 0 ? (product.profit / product.invested) * 100 : 0;
                    return (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{product.product}</td>
                        <td className="py-3 px-4 text-right">{product.sold}</td>
                        <td className="py-3 px-4 text-right text-red-600">
                          {formatCurrency(product.invested)}
                        </td>
                        <td className="py-3 px-4 text-right text-green-600 font-semibold">
                          {formatCurrency(product.profit)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`font-semibold ${roi > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {roi > 0 ? '+' : ''}{roi.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
