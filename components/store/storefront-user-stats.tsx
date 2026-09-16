'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, TrendingUp } from 'lucide-react';

interface UserStats {
  total_users: number;
  today_users: number;
  week_users: number;
  month_users: number;
  registrations_by_day: Array<{ date: string; count: number }>;
}

interface StorefrontUserStatsProps {
  slug: string;
  storeId: string;
}

export function StorefrontUserStats({ slug, storeId }: StorefrontUserStatsProps) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        const apiUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL || 'https://tienda-pos-api.julii1295.workers.dev';
        const response = await fetch(
          `${apiUrl}/api/storefront/stats/${slug}/users`
        );

        if (!response.ok) {
          throw new Error('Failed to load statistics');
        }

        const data = await response.json();
        setStats(data.data);
      } catch (err) {
        console.error('Error loading user stats:', err);
        setError('No se pudieron cargar las estadísticas');
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [slug]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Clientes Registrados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300"></div>
            <p className="text-gray-600 mt-2">Cargando estadísticas...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Clientes Registrados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Total Users */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Total de Clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-900">
            {stats.total_users}
          </div>
          <p className="text-xs text-gray-500 mt-1">Todos los tiempos</p>
        </CardContent>
      </Card>

      {/* Today */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Hoy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-blue-600">
            {stats.today_users}
          </div>
          <p className="text-xs text-gray-500 mt-1">Nuevos registros</p>
        </CardContent>
      </Card>

      {/* This Week */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Esta Semana
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600">
            {stats.week_users}
          </div>
          <p className="text-xs text-gray-500 mt-1">Últimos 7 días</p>
        </CardContent>
      </Card>

      {/* This Month */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Este Mes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-purple-600">
            {stats.month_users}
          </div>
          <p className="text-xs text-gray-500 mt-1">Últimos 30 días</p>
        </CardContent>
      </Card>
    </div>
  );
}
