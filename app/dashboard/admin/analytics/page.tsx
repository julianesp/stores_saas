'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Activity,
  Users,
  MousePointer,
  Eye,
  Smartphone,
  AlertTriangle,
  TrendingUp,
  Loader2,
  BarChart3,
  RefreshCcw,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface AnalyticsStats {
  period_days: number;
  events_by_type: Array<{ event_type: string; count: number }>;
  top_pages: Array<{ page_path: string; page_title: string; views: number; unique_users: number }>;
  top_features: Array<{ event_name: string; uses: number; unique_users: number }>;
  active_users: Array<{
    user_email: string;
    store_name: string;
    events_count: number;
    subscription_status: string;
    has_ai_addon: number;
    has_store_addon: number;
    has_email_addon: number;
  }>;
  device_stats: Array<{ device_type: string; count: number }>;
  browser_stats: Array<{ browser: string; count: number }>;
  recent_errors: Array<{
    event_name: string;
    page_path: string;
    metadata: string;
    occurrences: number;
    last_occurrence: string;
  }>;
  message?: string;
}

export default function AnalyticsPage() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(7);

  const loadStats = async (days: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/analytics/stats?days=${days}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch analytics');
      }

      const data = await response.json();
      setStats(data);

      // Mostrar mensaje si hay datos o si es inicial
      if (data.message) {
        toast.info(data.message);
      } else if (data.events_by_type && data.events_by_type.length > 0) {
        toast.success(`Estadísticas de los últimos ${days} días cargadas`);
      } else {
        toast.info('El sistema comenzará a recolectar datos automáticamente');
      }
    } catch (error: any) {
      console.error('Error loading analytics:', error);
      toast.error(error.message || 'Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats(selectedPeriod);
  }, [selectedPeriod]);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto" />
          <p className="mt-4 text-gray-600">Cargando analytics...</p>
        </div>
      </div>
    );
  }

  const totalEvents = stats?.events_by_type.reduce((sum, e) => sum + e.count, 0) || 0;
  const uniqueUsers = new Set(stats?.active_users.map(u => u.user_email) || []).size;

  // Estado vacío cuando no hay datos todavía
  if (!loading && stats && totalEvents === 0) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-purple-600" />
            Analytics del Sistema
          </h1>
          <p className="text-gray-500 mt-2">
            Rastreo de comportamiento y uso de funcionalidades
          </p>
        </div>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Activity className="h-16 w-16 text-blue-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-blue-900 mb-2">
                Sistema de Analytics Activado
              </h3>
              <p className="text-blue-700 mb-4">
                El sistema está rastreando automáticamente todas las actividades.
              </p>
              <p className="text-sm text-blue-600 mb-6">
                {stats.message || 'Los datos comenzarán a aparecer cuando los usuarios naveguen por el sistema.'}
              </p>
              <div className="bg-white rounded-lg p-6 max-w-md mx-auto">
                <p className="text-sm text-gray-700 mb-3 font-medium">
                  Qué se está rastreando:
                </p>
                <ul className="text-sm text-gray-600 space-y-2 text-left">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Páginas visitadas
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Features utilizadas
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Tiempo en cada sección
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Dispositivos y navegadores
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Errores detectados
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-purple-600" />
            Analytics del Sistema
          </h1>
          <p className="text-gray-500 mt-2">
            Rastreo de comportamiento y uso de funcionalidades
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadStats(selectedPeriod)}
            disabled={loading}
          >
            <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2">
        {[7, 14, 30, 90].map((days) => (
          <Button
            key={days}
            variant={selectedPeriod === days ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPeriod(days)}
          >
            Últimos {days} días
          </Button>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Eventos</p>
                <p className="text-3xl font-bold mt-2">{totalEvents.toLocaleString()}</p>
              </div>
              <Activity className="h-12 w-12 text-purple-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Usuarios Activos</p>
                <p className="text-3xl font-bold mt-2">{uniqueUsers}</p>
              </div>
              <Users className="h-12 w-12 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Páginas Vistas</p>
                <p className="text-3xl font-bold mt-2">
                  {stats?.top_pages.reduce((sum, p) => sum + p.views, 0).toLocaleString() || 0}
                </p>
              </div>
              <Eye className="h-12 w-12 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Errores</p>
                <p className="text-3xl font-bold mt-2">
                  {stats?.recent_errors.reduce((sum, e) => sum + e.occurrences, 0) || 0}
                </p>
              </div>
              <AlertTriangle className="h-12 w-12 text-red-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Events by Type */}
      <Card>
        <CardHeader>
          <CardTitle>Eventos por Tipo</CardTitle>
          <CardDescription>Distribución de eventos rastreados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats?.events_by_type.map((event) => {
              const percentage = totalEvents > 0 ? (event.count / totalEvents) * 100 : 0;
              const colors: Record<string, string> = {
                page_view: 'bg-blue-500',
                click: 'bg-green-500',
                feature_use: 'bg-purple-500',
                action: 'bg-yellow-500',
                error: 'bg-red-500',
              };

              return (
                <div key={event.event_type}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium capitalize">
                      {event.event_type.replace('_', ' ')}
                    </span>
                    <span className="text-sm text-gray-600">
                      {event.count.toLocaleString()} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${colors[event.event_type] || 'bg-gray-500'}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Páginas Más Visitadas
            </CardTitle>
            <CardDescription>Top 10 páginas por número de visitas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.top_pages.slice(0, 10).map((page, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{page.page_title || 'Sin título'}</p>
                    <p className="text-xs text-gray-500 truncate">{page.page_path}</p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-bold text-purple-600">{page.views}</p>
                    <p className="text-xs text-gray-500">{page.unique_users} usuarios</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Features Más Usadas
            </CardTitle>
            <CardDescription>Funcionalidades más utilizadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.top_features.slice(0, 10).map((feature, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{feature.event_name}</p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-bold text-green-600">{feature.uses}</p>
                    <p className="text-xs text-gray-500">{feature.unique_users} usuarios</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Usuarios Más Activos
          </CardTitle>
          <CardDescription>Top 20 usuarios por número de eventos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium text-sm">#</th>
                  <th className="text-left p-3 font-medium text-sm">Tienda</th>
                  <th className="text-left p-3 font-medium text-sm">Email</th>
                  <th className="text-left p-3 font-medium text-sm">Eventos</th>
                  <th className="text-left p-3 font-medium text-sm">Estado</th>
                  <th className="text-left p-3 font-medium text-sm">Addons</th>
                </tr>
              </thead>
              <tbody>
                {stats?.active_users.slice(0, 20).map((user, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-sm">{index + 1}</td>
                    <td className="p-3 text-sm font-medium">{user.store_name || 'Sin nombre'}</td>
                    <td className="p-3 text-sm text-gray-600">{user.user_email}</td>
                    <td className="p-3 text-sm">
                      <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                        {user.events_count} eventos
                      </span>
                    </td>
                    <td className="p-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.subscription_status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : user.subscription_status === 'trial'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {user.subscription_status}
                      </span>
                    </td>
                    <td className="p-3 text-sm">
                      <div className="flex gap-1">
                        {user.has_ai_addon ? <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">IA</span> : null}
                        {user.has_store_addon ? <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Store</span> : null}
                        {user.has_email_addon ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Email</span> : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Device and Browser Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Dispositivos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.device_stats.map((device) => {
                const total = stats.device_stats.reduce((sum, d) => sum + d.count, 0);
                const percentage = total > 0 ? (device.count / total) * 100 : 0;

                return (
                  <div key={device.device_type}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium capitalize">{device.device_type}</span>
                      <span className="text-sm text-gray-600">
                        {device.count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-blue-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Navegadores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.browser_stats.slice(0, 5).map((browser) => {
                const total = stats.browser_stats.reduce((sum, b) => sum + b.count, 0);
                const percentage = total > 0 ? (browser.count / total) * 100 : 0;

                return (
                  <div key={browser.browser}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">{browser.browser}</span>
                      <span className="text-sm text-gray-600">
                        {browser.count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-green-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Errors */}
      {stats && stats.recent_errors && stats.recent_errors.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Errores Recientes
            </CardTitle>
            <CardDescription>Errores rastreados en el sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recent_errors.map((error, index) => (
                <div key={index} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-red-900">{error.event_name}</p>
                    <span className="bg-red-200 text-red-900 px-3 py-1 rounded-full text-sm font-medium">
                      {error.occurrences} veces
                    </span>
                  </div>
                  {error.page_path && (
                    <p className="text-sm text-red-700">Página: {error.page_path}</p>
                  )}
                  <p className="text-xs text-red-600 mt-1">
                    Última ocurrencia: {new Date(error.last_occurrence).toLocaleString('es-CO')}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
