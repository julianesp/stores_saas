'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, ShoppingCart, Package, TrendingUp, Users, AlertTriangle, Store, Activity, Crown, Calendar } from 'lucide-react';
import { getUserProfileByClerkId } from '@/lib/subscription-helpers';
import { getAllDocuments } from '@/lib/firestore-helpers';
import { UserProfile } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

export default function DashboardPage() {
  const { user } = useUser();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saasMetrics, setSaasMetrics] = useState({
    totalStores: 0,
    activeStores: 0,
    trialStores: 0,
    monthlyRevenue: 0,
    newStoresToday: 0,
    conversionRate: 0,
  });

  useEffect(() => {
    async function checkUserAndFetchMetrics() {
      if (user) {
        const profile = await getUserProfileByClerkId(user.id);
        const isSuper = profile?.is_superadmin || false;
        setIsSuperAdmin(isSuper);

        if (isSuper) {
          // Fetch SaaS metrics for super admin
          const allProfiles = await getAllDocuments('user_profiles') as UserProfile[];
          const stores = allProfiles.filter(p => !p.is_superadmin);

          const now = new Date();
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

          const totalStores = stores.length;
          const activeStores = stores.filter(s => s.subscription_status === 'active').length;
          const trialStores = stores.filter(s => s.subscription_status === 'trial').length;
          const monthlyRevenue = activeStores * 50000;
          const newStoresToday = stores.filter(s => new Date(s.created_at) >= startOfToday).length;
          const conversionRate = trialStores > 0 ? (activeStores / (activeStores + trialStores)) * 100 : 0;

          setSaasMetrics({
            totalStores,
            activeStores,
            trialStores,
            monthlyRevenue,
            newStoresToday,
            conversionRate,
          });
        }

        setLoading(false);
      }
    }
    checkUserAndFetchMetrics();
  }, [user]);

  // TODO: Fetch real data from Firestore for store owners
  const metrics = {
    dailySales: 1250000,
    todayOrders: 45,
    totalProducts: 350,
    lowStockProducts: 12,
    activeCustomers: 120,
    monthlyGrowth: 12.5,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando dashboard...</p>
      </div>
    );
  }

  // Super Admin Dashboard
  if (isSuperAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3">
            <Crown className="h-8 w-8 text-purple-600" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard del SaaS</h1>
              <p className="text-gray-500">Vista general del negocio multi-tenant</p>
            </div>
          </div>
        </div>

        {/* Métricas principales del SaaS */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tiendas</CardTitle>
              <Store className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{saasMetrics.totalStores}</div>
              <p className="text-xs text-gray-500 mt-1">Registradas en el sistema</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tiendas Activas</CardTitle>
              <Activity className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{saasMetrics.activeStores}</div>
              <p className="text-xs text-gray-500 mt-1">Suscripciones pagando</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos Mensuales</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(saasMetrics.monthlyRevenue)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Recurrentes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En Período de Prueba</CardTitle>
              <Calendar className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{saasMetrics.trialStores}</div>
              <p className="text-xs text-gray-500 mt-1">Potenciales clientes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nuevas Hoy</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{saasMetrics.newStoresToday}</div>
              <p className="text-xs text-gray-500 mt-1">Registros hoy</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasa de Conversión</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{saasMetrics.conversionRate.toFixed(1)}%</div>
              <p className="text-xs text-gray-500 mt-1">Trial → Activo</p>
            </CardContent>
          </Card>
        </div>

        {/* Acceso rápido */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Accesos Rápidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <a
                  href="/dashboard/superadmin"
                  className="flex items-center justify-between p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Store className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-sm">Gestión de Tiendas</p>
                      <p className="text-xs text-gray-500">Ver y administrar todas las tiendas</p>
                    </div>
                  </div>
                </a>
                <a
                  href="/dashboard/admin/users"
                  className="flex items-center justify-between p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="font-medium text-sm">Usuarios del Sistema</p>
                      <p className="text-xs text-gray-500">Gestionar usuarios y roles</p>
                    </div>
                  </div>
                </a>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Estado del Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-sm">Sistema Operativo</p>
                      <p className="text-xs text-gray-500">Todos los servicios funcionando</p>
                    </div>
                  </div>
                </div>
                {saasMetrics.trialStores > 0 && (
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <div>
                        <p className="font-medium text-sm">{saasMetrics.trialStores} tiendas en trial</p>
                        <p className="text-xs text-gray-500">Enviar seguimiento para conversión</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-gray-500">Resumen general de tu tienda</p>
      </div>

      {/* Métricas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas de Hoy</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('es-CO', {
                style: 'currency',
                currency: 'COP',
                minimumFractionDigits: 0,
              }).format(metrics.dailySales)}
            </div>
            <p className="text-xs text-gray-500 mt-1">+20.1% desde ayer</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Órdenes Hoy</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.todayOrders}</div>
            <p className="text-xs text-gray-500 mt-1">+15% desde ayer</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
            <Package className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalProducts}</div>
            <p className="text-xs text-gray-500 mt-1">{metrics.lowStockProducts} con stock bajo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.lowStockProducts}</div>
            <p className="text-xs text-gray-500 mt-1">Requieren reposición</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Activos</CardTitle>
            <Users className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeCustomers}</div>
            <p className="text-xs text-gray-500 mt-1">Este mes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Crecimiento Mensual</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{metrics.monthlyGrowth}%</div>
            <p className="text-xs text-gray-500 mt-1">Comparado al mes pasado</p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas y acciones rápidas */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Alertas de Inventario</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="font-medium text-sm">12 productos con stock bajo</p>
                    <p className="text-xs text-gray-500">Revisar inventario</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="font-medium text-sm">5 productos próximos a vencer</p>
                    <p className="text-xs text-gray-500">Crear ofertas</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Productos Más Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {['Coca Cola 1.5L', 'Pan Tajado', 'Leche Entera 1L', 'Arroz Diana 500g'].map(
                (product, i) => (
                  <div key={product} className="flex items-center justify-between">
                    <span className="text-sm">{product}</span>
                    <span className="text-sm font-medium text-gray-500">
                      {120 - i * 15} unidades
                    </span>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
