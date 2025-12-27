'use client';

import { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, ShoppingCart, Package, TrendingUp, Users, AlertTriangle, Store, Activity, Crown, Calendar, Database, Trash2, FileText, Info } from 'lucide-react';
import { getUserProfileByClerkId } from '@/lib/cloudflare-subscription-helpers';
import { getAllUserProfiles } from '@/lib/cloudflare-api';
import { UserProfile } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import {
  getDashboardMetrics,
  getTopProducts,
  getInventoryAlerts,
  getExpiringProducts,
  getExpiringProductsList,
  DashboardMetrics,
  TopProduct
} from '@/lib/dashboard-helpers';
import { Product } from '@/lib/cloudflare-api';
import { differenceInDays } from 'date-fns';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
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
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    dailySales: 0,
    todayOrders: 0,
    totalProducts: 0,
    lowStockProducts: 0,
    activeCustomers: 0,
    monthlyGrowth: 0,
  });
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [expiringProductsCount, setExpiringProductsCount] = useState(0);
  const [expiringProducts, setExpiringProducts] = useState<Product[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  useEffect(() => {
    async function checkUserAndFetchMetrics() {
      if (user) {
        const profile = await getUserProfileByClerkId(getToken);
        const isSuper = profile?.is_superadmin || false;
        setIsSuperAdmin(isSuper);
        const userProfileId = profile?.id;

        if (isSuper) {
          // Fetch SaaS metrics for super admin
          const allProfiles = await getAllUserProfiles(getToken);
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
        } else {
          // Fetch store metrics for regular users
          const [dashboardMetrics, products, expiringCount, expiringProductsList] = await Promise.all([
            getDashboardMetrics(getToken),
            getTopProducts(4, getToken),
            getExpiringProducts(getToken),
            getExpiringProductsList(getToken),
          ]);

          setMetrics(dashboardMetrics);
          setTopProducts(products);
          setExpiringProductsCount(expiringCount);
          setExpiringProducts(expiringProductsList.slice(0, 5)); // Primeros 5
        }

        setLoading(false);
      }
    }
    checkUserAndFetchMetrics();
  }, [user]);

  const handleSeedProducts = async () => {
    if (!confirm('¿Quieres crear productos de muestra para tu tienda? Esto creará aproximadamente 27 productos variados.')) {
      return;
    }

    try {
      setSeeding(true);
      const response = await fetch('/api/seed-products', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        // Recargar métricas
        if (!isSuperAdmin && user) {
          const [dashboardMetrics, products, expiringCount] = await Promise.all([
            getDashboardMetrics(getToken),
            getTopProducts(4, getToken),
            getExpiringProducts(getToken),
          ]);

          setMetrics(dashboardMetrics);
          setTopProducts(products);
          setExpiringProductsCount(expiringCount);
        }
      } else {
        toast.error(data.error || 'Error al crear productos');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al crear productos de muestra');
    } finally {
      setSeeding(false);
    }
  };

  const handleCleanData = async () => {
    if (!confirm('⚠️ ADVERTENCIA: Esto eliminará TODOS tus datos (productos, ventas, clientes, etc.). Esta operación es IRREVERSIBLE. ¿Estás seguro de que quieres continuar?')) {
      return;
    }

    if (!confirm('¿Estás completamente seguro? Esta es tu última oportunidad para cancelar.')) {
      return;
    }

    try {
      setCleaning(true);
      const response = await fetch('/api/user/clean-data', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Datos limpiados: ${data.totalDeleted} elementos eliminados`);
        // Recargar métricas
        if (!isSuperAdmin && user) {
          const [dashboardMetrics, products, expiringCount] = await Promise.all([
            getDashboardMetrics(getToken),
            getTopProducts(4, getToken),
            getExpiringProducts(getToken),
          ]);

          setMetrics(dashboardMetrics);
          setTopProducts(products);
          setExpiringProductsCount(expiringCount);
        }
      } else {
        toast.error(data.error || 'Error al limpiar datos');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al limpiar datos');
    } finally {
      setCleaning(false);
    }
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
      <div className="space-y-4 md:space-y-6">
        <div>
          <div className="flex items-center gap-2 md:gap-3">
            <Crown className="h-6 w-6 md:h-8 md:w-8 text-purple-600" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard del SaaS</h1>
              <p className="text-gray-500 text-sm md:text-base">Vista general del negocio multi-tenant</p>
            </div>
          </div>
        </div>

        {/* Métricas principales del SaaS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base md:text-lg">Accesos Rápidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 md:space-y-3">
                <a
                  href="/dashboard/superadmin"
                  className="flex items-center justify-between p-2 md:p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <div className="flex items-center gap-2 md:gap-3">
                    <Store className="h-4 w-4 md:h-5 md:w-5 text-blue-600 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-xs md:text-sm">Gestión de Tiendas</p>
                      <p className="text-xs text-gray-500 hidden sm:block">Ver y administrar todas las tiendas</p>
                    </div>
                  </div>
                </a>
                <a
                  href="/dashboard/admin/users"
                  className="flex items-center justify-between p-2 md:p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <div className="flex items-center gap-2 md:gap-3">
                    <Users className="h-4 w-4 md:h-5 md:w-5 text-purple-600 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-xs md:text-sm">Usuarios del Sistema</p>
                      <p className="text-xs text-gray-500 hidden sm:block">Gestionar usuarios y roles</p>
                    </div>
                  </div>
                </a>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base md:text-lg">Estado del Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 md:space-y-3">
                <div className="flex items-center justify-between p-2 md:p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 md:gap-3">
                    <Activity className="h-4 w-4 md:h-5 md:w-5 text-green-600 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-xs md:text-sm">Sistema Operativo</p>
                      <p className="text-xs text-gray-500 hidden sm:block">Todos los servicios funcionando</p>
                    </div>
                  </div>
                </div>
                {saasMetrics.trialStores > 0 && (
                  <div className="flex items-center justify-between p-2 md:p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center gap-2 md:gap-3">
                      <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-yellow-600 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-xs md:text-sm">{saasMetrics.trialStores} tiendas en trial</p>
                        <p className="text-xs text-gray-500 hidden sm:block">Enviar seguimiento para conversión</p>
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
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-gray-500 text-sm md:text-base">Resumen general de tu tienda</p>
        </div>
        {!isSuperAdmin && (
          <div className="flex gap-2">
            {metrics.totalProducts === 0 && (
              <Button
                onClick={handleSeedProducts}
                disabled={seeding}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Database className="h-4 w-4" />
                {seeding ? 'Creando...' : 'Crear Productos Demo'}
              </Button>
            )}
            {metrics.totalProducts > 0 && (
              <Button
                onClick={handleCleanData}
                disabled={cleaning}
                variant="destructive"
                size="sm"
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {cleaning ? 'Limpiando...' : 'Limpiar Todos los Datos'}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
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
            <p className="text-xs text-gray-500 mt-1">
              {metrics.dailySales > 0 ? 'Ventas del día' : 'Sin ventas hoy'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Órdenes Hoy</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.todayOrders}</div>
            <p className="text-xs text-gray-500 mt-1">
              {metrics.todayOrders > 0 ? 'Órdenes completadas' : 'Sin órdenes hoy'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
            <Package className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalProducts}</div>
            <p className="text-xs text-gray-500 mt-1">
              {metrics.lowStockProducts > 0
                ? `${metrics.lowStockProducts} con cantidad baja`
                : 'Inventario saludable'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cantidad Baja</CardTitle>
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
            <div className={`text-2xl font-bold ${metrics.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {metrics.monthlyGrowth >= 0 ? '+' : ''}{metrics.monthlyGrowth}%
            </div>
            <p className="text-xs text-gray-500 mt-1">Comparado al mes pasado</p>
          </CardContent>
        </Card>
      </div>

      {/* Productos Próximos a Vencer - Alerta Destacada */}
      {expiringProducts.length > 0 && (
        <Card className="border-2 border-red-300 bg-gradient-to-r from-red-50 via-orange-50 to-yellow-50 shadow-lg">
          <CardHeader className="pb-3 bg-gradient-to-r from-red-100 to-orange-100 border-b-2 border-red-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-600 rounded-lg animate-pulse">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg md:text-xl font-bold text-red-900">
                    ⚠️ Productos Próximos a Vencer
                  </CardTitle>
                  <p className="text-sm text-red-700 mt-1">
                    {expiringProducts.length} productos vencen en los próximos 30 días
                  </p>
                </div>
              </div>
              <Link href="/dashboard/offers">
                <Button variant="destructive" size="sm" className="hidden md:flex">
                  Ver Ofertas
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {expiringProducts.map(product => {
                const daysToExpire = differenceInDays(
                  new Date(product.expiration_date!),
                  new Date()
                );

                // Determinar color según días restantes
                let bgColor = 'bg-yellow-50 border-yellow-300';
                let textColor = 'text-yellow-900';
                let badgeColor = 'bg-yellow-600';

                if (daysToExpire <= 7) {
                  bgColor = 'bg-red-50 border-red-300';
                  textColor = 'text-red-900';
                  badgeColor = 'bg-red-600';
                } else if (daysToExpire <= 15) {
                  bgColor = 'bg-orange-50 border-orange-300';
                  textColor = 'text-orange-900';
                  badgeColor = 'bg-orange-600';
                }

                return (
                  <div
                    key={product.id}
                    className={`flex flex-col md:flex-row md:items-center justify-between p-4 border-2 rounded-lg ${bgColor} hover:shadow-md transition-all`}
                  >
                    <div className="flex-1 mb-2 md:mb-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-bold ${textColor}`}>{product.name}</h3>
                        <span className={`px-2 py-1 ${badgeColor} text-white text-xs font-bold rounded-full`}>
                          {daysToExpire} {daysToExpire === 1 ? 'día' : 'días'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm text-gray-700">
                        <span>📦 Stock: <strong>{product.stock}</strong> unidades</span>
                        <span>💰 Precio: <strong>{formatCurrency(product.sale_price)}</strong></span>
                        <span>📅 Vence: <strong>{new Date(product.expiration_date!).toLocaleDateString('es-CO')}</strong></span>
                      </div>
                    </div>
                    <div className="flex gap-2 md:ml-4">
                      <Link href="/dashboard/offers">
                        <Button size="sm" variant="outline" className="text-xs">
                          Crear Oferta
                        </Button>
                      </Link>
                      <Link href={`/dashboard/products/${product.id}`}>
                        <Button size="sm" variant="default" className="text-xs">
                          Ver Producto
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {expiringProductsCount > 5 && (
              <div className="mt-4 text-center">
                <Link href="/dashboard/offers">
                  <Button variant="destructive" className="w-full md:w-auto">
                    Ver todos los {expiringProductsCount} productos próximos a vencer →
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Alertas y acciones rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg">Alertas de Inventario</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 md:space-y-3">
              {metrics.lowStockProducts > 0 ? (
                <div className="flex items-center justify-between p-2 md:p-3 bg-orange-50 rounded-lg">
                  <div className="flex items-center gap-2 md:gap-3">
                    <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-orange-600 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-xs md:text-sm">{metrics.lowStockProducts} productos con cantidad baja</p>
                      <p className="text-xs text-gray-500 hidden sm:block">Revisar inventario</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-2 md:p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 md:gap-3">
                    <Package className="h-4 w-4 md:h-5 md:w-5 text-green-600 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-xs md:text-sm">Inventario saludable</p>
                      <p className="text-xs text-gray-500 hidden sm:block">Sin alertas de cantidad</p>
                    </div>
                  </div>
                </div>
              )}
              {expiringProductsCount > 0 ? (
                <div className="flex items-center justify-between p-2 md:p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-2 md:gap-3">
                    <Package className="h-4 w-4 md:h-5 md:w-5 text-red-600 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-xs md:text-sm">{expiringProductsCount} productos próximos a vencer</p>
                      <p className="text-xs text-gray-500 hidden sm:block">Crear ofertas</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-2 md:p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 md:gap-3">
                    <Package className="h-4 w-4 md:h-5 md:w-5 text-blue-600 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-xs md:text-sm">Sin productos próximos a vencer</p>
                      <p className="text-xs text-gray-500 hidden sm:block">Inventario fresco</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg">Productos Más Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 md:space-y-3">
              {topProducts.length > 0 ? (
                topProducts.map((product) => (
                  <div key={product.name} className="flex items-center justify-between">
                    <span className="text-xs md:text-sm truncate mr-2">{product.name}</span>
                    <span className="text-xs md:text-sm font-medium text-gray-500 flex-shrink-0">
                      {product.quantity} und
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-xs md:text-sm text-gray-500">No hay ventas registradas</p>
                  <p className="text-xs text-gray-400 mt-1">Los productos más vendidos aparecerán aquí</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Banner informativo sobre Facturación Electrónica */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex-shrink-0">
              <div className="p-3 bg-blue-600 rounded-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-1 text-sm md:text-base">
                💡 Sobre Facturación Electrónica DIAN
              </h3>
              <p className="text-sm text-blue-800 mb-2">
                Este sistema genera <strong>recibos de venta internos</strong> perfectos para control de tu negocio.
                Si necesitas <strong>facturación electrónica ante la DIAN</strong>, podemos integrar el sistema con proveedores como Alegra o Siigo.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Link href="/dashboard/config">
                  <Button variant="outline" size="sm" className="text-xs bg-white hover:bg-blue-50">
                    <Info className="h-3 w-3 mr-1" />
                    Más Información
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
