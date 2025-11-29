'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAllDocuments } from '@/lib/firestore-helpers';
import { UserProfile } from '@/lib/types';
import {
  BarChart3,
  Shield,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  ShoppingCart,
  Calendar,
  Store,
  Activity,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { getUserProfileByClerkId } from '@/lib/subscription-helpers';

export default function ReportsPage() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState({
    totalStores: 0,
    activeStores: 0,
    trialStores: 0,
    expiredStores: 0,
    monthlyRevenue: 0,
    newStoresThisMonth: 0,
    newStoresToday: 0,
    conversionRate: 0,
    churnRate: 0,
  });

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const allProfiles = await getAllDocuments('user_profiles') as UserProfile[];

      // Obtener perfil del usuario actual
      const myProfile = allProfiles.find(p => p.clerk_user_id === user.id);
      setCurrentUserProfile(myProfile || null);

      // Verificar si es super admin
      if (!myProfile?.is_superadmin) {
        toast.error('No tienes permisos para acceder a esta página');
        return;
      }

      // Filtrar tiendas (no superadmins)
      const stores = allProfiles.filter(p => !p.is_superadmin);

      // Calcular estadísticas
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const totalStores = stores.length;
      const activeStores = stores.filter(s => s.subscription_status === 'active').length;
      const trialStores = stores.filter(s => s.subscription_status === 'trial').length;
      const expiredStores = stores.filter(s => s.subscription_status === 'expired').length;

      const monthlyRevenue = activeStores * 50000; // Plan básico

      const newStoresThisMonth = stores.filter(s => {
        const createdAt = new Date(s.created_at);
        return createdAt >= startOfMonth;
      }).length;

      const newStoresToday = stores.filter(s => {
        const createdAt = new Date(s.created_at);
        return createdAt >= startOfToday;
      }).length;

      // Tasa de conversión (de trial a active)
      const conversionRate = trialStores > 0 ? (activeStores / (activeStores + trialStores)) * 100 : 0;

      // Tasa de abandono (expired)
      const churnRate = totalStores > 0 ? (expiredStores / totalStores) * 100 : 0;

      setStats({
        totalStores,
        activeStores,
        trialStores,
        expiredStores,
        monthlyRevenue,
        newStoresThisMonth,
        newStoresToday,
        conversionRate,
        churnRate,
      });
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Error al cargar reportes');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando reportes...</p>
      </div>
    );
  }

  if (!currentUserProfile?.is_superadmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Acceso Denegado</h2>
            <p className="text-gray-500">No tienes permisos para acceder a esta página.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BarChart3 className="h-8 w-8 text-indigo-600" />
        <div>
          <h1 className="text-3xl font-bold">Reportes Globales</h1>
          <p className="text-gray-500">Métricas y estadísticas del SaaS</p>
        </div>
      </div>

      {/* Métricas principales */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Resumen General</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tiendas</CardTitle>
              <Store className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalStores}</div>
              <p className="text-xs text-gray-500 mt-1">
                Registradas en el sistema
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tiendas Activas</CardTitle>
              <Activity className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.activeStores}</div>
              <p className="text-xs text-gray-500 mt-1">
                Pagando mensualmente
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos Mensuales</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(stats.monthlyRevenue)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Recurrentes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nuevas Hoy</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.newStoresToday}</div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.newStoresThisMonth} este mes
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Métricas de conversión */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Métricas de Conversión</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En Período de Prueba</CardTitle>
              <Calendar className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.trialStores}</div>
              <p className="text-xs text-gray-500 mt-1">
                Potenciales clientes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasa de Conversión</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.conversionRate.toFixed(1)}%
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Trial → Activo
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Suscripciones Expiradas</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.expiredStores}</div>
              <p className="text-xs text-gray-500 mt-1">
                Necesitan renovación
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasa de Abandono</CardTitle>
              <TrendingDown className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {stats.churnRate.toFixed(1)}%
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Churn rate
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Proyecciones */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Proyecciones</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Potencial de Ingresos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600">Si todos los trials convierten:</span>
                  </div>
                  <div className="text-xl font-bold text-green-600">
                    {formatCurrency((stats.activeStores + stats.trialStores) * 50000)}
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600">Incremento potencial:</span>
                  </div>
                  <div className="text-xl font-bold text-blue-600">
                    +{formatCurrency(stats.trialStores * 50000)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Crecimiento Mensual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600">Nuevas tiendas este mes:</span>
                  </div>
                  <div className="text-xl font-bold text-purple-600">
                    {stats.newStoresThisMonth}
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600">Tasa de crecimiento:</span>
                  </div>
                  <div className="text-xl font-bold text-indigo-600">
                    {stats.totalStores > 0
                      ? ((stats.newStoresThisMonth / stats.totalStores) * 100).toFixed(1)
                      : 0}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Salud del Negocio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600">Tasa de retención:</span>
                  </div>
                  <div className="text-xl font-bold text-green-600">
                    {(100 - stats.churnRate).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600">Clientes pagando:</span>
                  </div>
                  <div className="text-xl font-bold text-blue-600">
                    {stats.totalStores > 0
                      ? ((stats.activeStores / stats.totalStores) * 100).toFixed(1)
                      : 0}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recomendaciones */}
      <Card>
        <CardHeader>
          <CardTitle>Recomendaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.trialStores > 0 && (
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-900">
                      {stats.trialStores} tiendas en período de prueba
                    </p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Considera enviar emails de seguimiento para aumentar la conversión
                    </p>
                  </div>
                </div>
              </div>
            )}

            {stats.expiredStores > 0 && (
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-start gap-3">
                  <TrendingDown className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900">
                      {stats.expiredStores} suscripciones expiradas
                    </p>
                    <p className="text-sm text-red-700 mt-1">
                      Campaña de re-activación podría recuperar estos clientes
                    </p>
                  </div>
                </div>
              </div>
            )}

            {stats.conversionRate < 50 && stats.trialStores > 0 && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-3">
                  <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">
                      Tasa de conversión baja ({stats.conversionRate.toFixed(1)}%)
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      Considera mejorar el onboarding o agregar más funcionalidades al plan gratuito
                    </p>
                  </div>
                </div>
              </div>
            )}

            {stats.conversionRate >= 50 && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-start gap-3">
                  <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900">
                      ¡Excelente tasa de conversión! ({stats.conversionRate.toFixed(1)}%)
                    </p>
                    <p className="text-sm text-green-700 mt-1">
                      El negocio está funcionando bien. Enfócate en adquirir más clientes.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
