'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  ShoppingCart,
  Package,
  AlertTriangle,
  Info,
} from 'lucide-react';
import {
  calculateAdvancedMetrics,
  calculateTemporalComparison,
  generateProactiveAlerts,
  type AdvancedMetrics,
  type TemporalComparison,
  type ProactiveAlert,
} from '@/lib/advanced-analytics-helpers';

const COLORS = ['#2563eb', '#059669', '#f59e0b', '#dc2626', '#8b5cf6'];

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  format?: 'currency' | 'percentage' | 'number';
}

function MetricCard({ title, value, change, icon, format = 'number' }: MetricCardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'string') return val;

    switch (format) {
      case 'currency':
        return `$${val.toLocaleString('es-CO')}`;
      case 'percentage':
        return `${val.toFixed(2)}%`;
      default:
        return val.toLocaleString('es-CO');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(value)}</div>
        {change !== undefined && (
          <p
            className={`text-xs flex items-center gap-1 mt-1 ${
              change >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(change).toFixed(1)}% vs período anterior
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdvancedMetricsDashboard() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<AdvancedMetrics | null>(null);
  const [comparison, setComparison] = useState<TemporalComparison | null>(null);
  const [alerts, setAlerts] = useState<ProactiveAlert[]>([]);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const apiUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL!;

      // Obtener métricas del período actual
      const now = new Date();
      const start =
        period === 'week'
          ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          : period === 'month'
          ? new Date(now.getFullYear(), now.getMonth(), 1)
          : new Date(now.getFullYear(), 0, 1);

      const metricsData = await calculateAdvancedMetrics(
        apiUrl,
        token,
        start.toISOString(),
        now.toISOString()
      );
      setMetrics(metricsData);

      // Obtener comparación temporal
      const comparisonData = await calculateTemporalComparison(apiUrl, token, period);
      setComparison(comparisonData);

      // Obtener alertas proactivas
      const alertsData = await generateProactiveAlerts(apiUrl, token);
      setAlerts(alertsData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !metrics || !comparison) {
    return <div className="flex items-center justify-center p-12">Cargando métricas...</div>;
  }

  // Datos para gráfico de margen de ganancia
  const profitData = [
    { name: 'Ingresos', value: metrics.total_revenue },
    { name: 'Costos', value: metrics.total_cost },
    { name: 'Ganancia', value: metrics.gross_profit },
  ];

  // Datos para comparación temporal
  const temporalData = [
    {
      name: 'Período Anterior',
      Ingresos: comparison.previous.revenue,
      Ganancia: comparison.previous.profit,
    },
    {
      name: 'Período Actual',
      Ingresos: comparison.current.revenue,
      Ganancia: comparison.current.profit,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Alertas Proactivas */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <Card
              key={alert.id}
              className={`border-l-4 ${
                alert.severity === 'critical'
                  ? 'border-l-red-500'
                  : alert.severity === 'warning'
                  ? 'border-l-yellow-500'
                  : 'border-l-blue-500'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  {alert.severity === 'critical' ? (
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  ) : alert.severity === 'warning' ? (
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <Info className="h-5 w-5 text-blue-500" />
                  )}
                  <CardTitle className="text-base">{alert.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{alert.message}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tabs para períodos */}
      <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
        <TabsList>
          <TabsTrigger value="week">Última Semana</TabsTrigger>
          <TabsTrigger value="month">Este Mes</TabsTrigger>
          <TabsTrigger value="year">Este Año</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Métricas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Margen de Ganancia"
          value={metrics.profit_margin_percentage}
          change={comparison.growth.profit_percentage}
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
          format="percentage"
        />
        <MetricCard
          title="ROI"
          value={metrics.roi_percentage}
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          format="percentage"
        />
        <MetricCard
          title="Valor Promedio de Orden"
          value={metrics.average_order_value}
          icon={<ShoppingCart className="h-4 w-4 text-muted-foreground" />}
          format="currency"
        />
        <MetricCard
          title="Lifetime Value (LTV)"
          value={metrics.customer_lifetime_value}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          format="currency"
        />
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Ingresos vs Costos vs Ganancia */}
        <Card>
          <CardHeader>
            <CardTitle>Análisis de Rentabilidad</CardTitle>
            <CardDescription>Desglose de ingresos, costos y ganancias</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={profitData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `$${Number(value).toLocaleString('es-CO')}`} />
                <Bar dataKey="value" fill="#2563eb">
                  {profitData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Comparación Temporal */}
        <Card>
          <CardHeader>
            <CardTitle>Comparación Temporal</CardTitle>
            <CardDescription>Período actual vs anterior</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={temporalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `$${Number(value).toLocaleString('es-CO')}`} />
                <Legend />
                <Line type="monotone" dataKey="Ingresos" stroke="#2563eb" strokeWidth={2} />
                <Line type="monotone" dataKey="Ganancia" stroke="#059669" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Métricas de Clientes */}
      <Card>
        <CardHeader>
          <CardTitle>Métricas de Clientes</CardTitle>
          <CardDescription>Análisis del comportamiento de clientes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Total de Clientes</p>
              <p className="text-2xl font-bold">{metrics.total_customers}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Clientes Nuevos</p>
              <p className="text-2xl font-bold text-green-600">{metrics.new_customers}</p>
              <p className="text-xs text-muted-foreground">
                {comparison.growth.customers_percentage.toFixed(1)}% vs anterior
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Clientes Recurrentes</p>
              <p className="text-2xl font-bold text-blue-600">{metrics.returning_customers}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Costo de Adquisición (CAC)</p>
              <p className="text-2xl font-bold">
                ${metrics.customer_acquisition_cost.toLocaleString('es-CO')}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">LTV / CAC Ratio</p>
              <p className="text-2xl font-bold">
                {(metrics.customer_lifetime_value / metrics.customer_acquisition_cost || 0).toFixed(2)}x
              </p>
              <p className="text-xs text-muted-foreground">
                {metrics.customer_lifetime_value / metrics.customer_acquisition_cost >= 3
                  ? 'Excelente'
                  : 'Mejorar marketing'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas de Productos */}
      {metrics.best_profit_margin_product && (
        <Card>
          <CardHeader>
            <CardTitle>Mejor Producto por Margen</CardTitle>
            <CardDescription>Producto más rentable del período</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-lg">{metrics.best_profit_margin_product.name}</p>
                <p className="text-sm text-muted-foreground">Producto estrella</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">
                  {metrics.best_profit_margin_product.margin_percentage.toFixed(1)}%
                </p>
                <p className="text-sm text-muted-foreground">Margen de ganancia</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
