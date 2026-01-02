'use client';

import { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAllUserProfiles, updateUserProfile } from '@/lib/cloudflare-api';
import { UserProfile } from '@/lib/types';
import {
  Store,
  Users,
  DollarSign,
  TrendingUp,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Calendar,
  Activity,
  ArrowUpRight,
  Plus,
  Filter,
  Info,
  ShoppingCart
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface StoreStats {
  storeId: string;
  storeName: string;
  storeEmail: string;
  subscriptionStatus: string;
  stats: {
    productsCount: number;
    salesCount: number;
    salesTotal: number;
    customersCount: number;
    lastSaleDate: string | null;
    isActive: boolean;
    error?: string;
  };
}

export default function SuperAdminPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const [stores, setStores] = useState<UserProfile[]>([]);
  const [storeStats, setStoreStats] = useState<StoreStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [usageFilter, setUsageFilter] = useState<string>('all'); // 'all', 'active', 'inactive'
  const [extendTrialDialog, setExtendTrialDialog] = useState<{
    open: boolean;
    store: UserProfile | null;
    days: string;
  }>({ open: false, store: null, days: '15' });
  const [detailsDialog, setDetailsDialog] = useState<{
    open: boolean;
    store: UserProfile | null;
  }>({ open: false, store: null });

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const allProfiles = await getAllUserProfiles(getToken);

      // Obtener perfil del usuario actual
      const myProfile = allProfiles.find(p => p.clerk_user_id === user.id);
      setCurrentUserProfile(myProfile || null);

      // Verificar si es super admin
      if (!myProfile?.is_superadmin) {
        toast.error('No tienes permisos para acceder a esta página');
        return;
      }

      // Filtrar tiendas (excluir super admins)
      const storesData = allProfiles.filter(p => !p.is_superadmin);
      storesData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setStores(storesData);

      // Obtener estadísticas de uso de las tiendas
      try {
        const statsResponse = await fetch('/api/admin/store-stats');
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          if (statsData.success) {
            setStoreStats(statsData.data);
          }
        }
      } catch (error) {
        console.error('Error fetching store stats:', error);
        // No mostrar error al usuario, las estadísticas son opcionales
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (storeId: string, currentStatus: string) => {
    // No permitir cambiar el estado si está en trial
    if (currentStatus === 'trial') {
      toast.error('No puedes cambiar el estado de una cuenta en período de prueba. Espera a que expire o se convierta.');
      return;
    }

    const newStatus = currentStatus === 'active' ? 'expired' : 'active';

    try {
      await updateUserProfile(storeId, {
        subscription_status: newStatus,
      }, getToken);
      toast.success(`Tienda ${newStatus === 'active' ? 'activada' : 'suspendida'} correctamente`);
      fetchData();
    } catch (error) {
      console.error('Error updating store status:', error);
      toast.error('Error al actualizar estado de la tienda');
    }
  };

  const handlePromoteToSuperAdmin = async (email: string) => {
    if (!confirm(`¿Estás seguro de promover a ${email} como Super Administrador?\n\nEsto le dará acceso completo al sistema y la capacidad de gestionar todas las tiendas.`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/set-superadmin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error('Error al promover usuario');
      }

      toast.success('Usuario promovido a Super Admin correctamente');
      fetchData();
    } catch (error) {
      console.error('Error promoting to superadmin:', error);
      toast.error('Error al promover usuario a Super Admin');
    }
  };

  const handleExtendTrial = async () => {
    if (!extendTrialDialog.store) return;

    const days = parseInt(extendTrialDialog.days);
    if (isNaN(days) || days < 1) {
      toast.error('Por favor ingresa un número válido de días');
      return;
    }

    try {
      const response = await fetch('/api/admin/extend-trial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userProfileId: extendTrialDialog.store.id,
          days,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al extender período de prueba');
      }

      toast.success(data.message || `Período de prueba extendido por ${days} días`);
      setExtendTrialDialog({ open: false, store: null, days: '15' });
      fetchData();
    } catch (error) {
      console.error('Error extending trial:', error);
      toast.error(error instanceof Error ? error.message : 'Error al extender período de prueba');
    }
  };

  const getDaysRemaining = (store: UserProfile): number | null => {
    if (store.subscription_status !== 'trial' || !store.trial_end_date) {
      return null;
    }

    const now = new Date();
    const trialEnd = new Date(store.trial_end_date);
    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const trialEndMidnight = new Date(trialEnd.getFullYear(), trialEnd.getMonth(), trialEnd.getDate());

    const daysLeft = Math.ceil(
      (trialEndMidnight.getTime() - nowMidnight.getTime()) / (1000 * 60 * 60 * 24)
    );

    return Math.max(0, daysLeft);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando panel de administración...</p>
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

  const filteredStores = stores.filter((store) => {
    // Filtro por búsqueda
    const matchesSearch = store.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.email.toLowerCase().includes(searchTerm.toLowerCase());

    // Filtro por estado
    const matchesStatus = statusFilter === 'all' || store.subscription_status === statusFilter;

    // Filtro por uso
    let matchesUsage = true;
    if (usageFilter !== 'all') {
      const stats = storeStats.find(s => s.storeId === store.id);
      if (usageFilter === 'active') {
        matchesUsage = stats?.stats.isActive || false;
      } else if (usageFilter === 'inactive') {
        matchesUsage = !(stats?.stats.isActive || false);
      }
    }

    return matchesSearch && matchesStatus && matchesUsage;
  });

  // Estadísticas
  const totalStores = stores.length;
  const activeStores = stores.filter(s => s.subscription_status === 'active').length;
  const trialStores = stores.filter(s => s.subscription_status === 'trial').length;
  const expiredStores = stores.filter(s => s.subscription_status === 'expired').length;
  const totalRevenue = stores.filter(s => s.subscription_status === 'active').length * 50000;

  // Nuevas tiendas hoy
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const newStoresToday = stores.filter(s => new Date(s.created_at) >= today).length;

  // Tasa de conversión (trial a activo)
  const totalWithTrial = stores.filter(s => s.subscription_status === 'trial' || s.subscription_status === 'active' || s.subscription_status === 'expired').length;
  const conversionRate = totalWithTrial > 0 ? (activeStores / totalWithTrial * 100).toFixed(1) : '0.0';

  // Estadísticas de uso
  const storesUsingPOS = storeStats.filter(s => s.stats.isActive).length;
  const storesNotUsing = totalStores - storesUsingPOS;
  const totalSalesAllStores = storeStats.reduce((sum, s) => sum + s.stats.salesCount, 0);
  const totalRevenueAllStores = storeStats.reduce((sum, s) => sum + s.stats.salesTotal, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Dashboard del SaaS</h1>
          <p className="text-gray-500">Vista general del negocio multi-tenant</p>
        </div>
      </div>

      {/* Estadísticas Principales - CLICABLES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Tiendas - Clickeable */}
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow group"
          onClick={() => {
            // Scroll a la tabla de tiendas
            document.getElementById('stores-table')?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tiendas</CardTitle>
            <Store className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStores}</div>
            <p className="text-xs text-gray-500 mt-1">Registradas en el sistema</p>
            <div className="flex items-center mt-2 text-xs text-blue-600 group-hover:text-blue-700">
              <span>Ver todas</span>
              <ArrowUpRight className="h-3 w-3 ml-1" />
            </div>
          </CardContent>
        </Card>

        {/* Tiendas Activas - Clickeable */}
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow group"
          onClick={() => {
            setSearchTerm(''); // Reset search
            setTimeout(() => {
              // Filtrar por activas sería mejor tener un estado, por ahora scroll
              document.getElementById('stores-table')?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tiendas Activas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeStores}</div>
            <p className="text-xs text-gray-500 mt-1">Suscripciones pagando</p>
            <div className="flex items-center mt-2 text-xs text-green-600 group-hover:text-green-700">
              <span>Ver detalles</span>
              <ArrowUpRight className="h-3 w-3 ml-1" />
            </div>
          </CardContent>
        </Card>

        {/* Ingresos Mensuales */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Mensuales</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-gray-500 mt-1">Recurrentes</p>
            <div className="flex items-center mt-2 text-xs text-gray-600">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              <span className="text-green-600">MRR activo</span>
            </div>
          </CardContent>
        </Card>

        {/* Tasa de Conversión */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Conversión</CardTitle>
            <Activity className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{conversionRate}%</div>
            <p className="text-xs text-gray-500 mt-1">Trial → Activo</p>
            <div className="flex items-center mt-2 text-xs text-gray-600">
              <span>De {totalWithTrial} tiendas</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Métricas de Uso del POS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Tiendas Usando POS */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usando el POS</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{storesUsingPOS}</div>
            <p className="text-xs text-gray-500 mt-1">Tiendas con actividad</p>
            <div className="flex items-center mt-2 text-xs text-gray-600">
              <span className="text-green-600">{totalStores > 0 ? ((storesUsingPOS / totalStores) * 100).toFixed(1) : 0}% del total</span>
            </div>
          </CardContent>
        </Card>

        {/* Tiendas Sin Usar */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sin Actividad</CardTitle>
            <XCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{storesNotUsing}</div>
            <p className="text-xs text-gray-500 mt-1">No han usado el POS</p>
            <div className="flex items-center mt-2 text-xs text-gray-600">
              <span className="text-orange-600">Requieren seguimiento</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Ventas del Sistema */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas Totales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalSalesAllStores}</div>
            <p className="text-xs text-gray-500 mt-1">Todas las tiendas</p>
            <div className="flex items-center mt-2 text-xs text-gray-600">
              <span className="text-blue-600">{formatCurrency(totalRevenueAllStores)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Tasa de Adopción */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Adopción</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {totalStores > 0 ? ((storesUsingPOS / totalStores) * 100).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-gray-500 mt-1">Tiendas activas</p>
            <div className="flex items-center mt-2 text-xs text-gray-600">
              <span className="text-purple-600">De {totalStores} registradas</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Métricas Secundarias */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* En Periodo de Prueba */}
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow group"
          onClick={() => {
            document.getElementById('stores-table')?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Período de Prueba</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{trialStores}</div>
            <p className="text-xs text-gray-500 mt-1">Potenciales clientes</p>
            <div className="flex items-center mt-2 text-xs text-yellow-600 group-hover:text-yellow-700">
              <span>Enviar seguimiento</span>
              <ArrowUpRight className="h-3 w-3 ml-1" />
            </div>
          </CardContent>
        </Card>

        {/* Nuevas Hoy */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nuevas Hoy</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{newStoresToday}</div>
            <p className="text-xs text-gray-500 mt-1">Registros hoy</p>
            <div className="flex items-center mt-2 text-xs text-gray-600">
              <span className="text-blue-600">Activo</span>
            </div>
          </CardContent>
        </Card>

        {/* Suscripciones Expiradas */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suscripciones Expiradas</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{expiredStores}</div>
            <p className="text-xs text-gray-500 mt-1">Requieren atención</p>
            <div className="flex items-center mt-2 text-xs text-red-600 group-hover:text-red-700">
              <span>Ver y reactivar</span>
              <ArrowUpRight className="h-3 w-3 ml-1" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accesos Rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Accesos Rápidos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => router.push('/dashboard/superadmin/stores')}
            >
              <Store className="h-4 w-4 mr-2" />
              Gestión de Tiendas
              <span className="ml-auto text-xs text-gray-500">Ver y administrar todas las tiendas</span>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => router.push('/dashboard/superadmin/users')}
            >
              <Users className="h-4 w-4 mr-2" />
              Usuarios del Sistema
              <span className="ml-auto text-xs text-gray-500">Gestionar usuarios y roles</span>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Estado del Sistema</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-900">Sistema Operativo</span>
              </div>
              <span className="text-xs text-green-600">Todos los servicios funcionando</span>
            </div>

            {trialStores > 0 && (
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium text-yellow-900">{trialStores} tiendas en trial</span>
                </div>
                <span className="text-xs text-yellow-600">Enviar seguimiento para conversión</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Buscador y Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar tienda por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="trial">En prueba</SelectItem>
                  <SelectItem value="active">Activas</SelectItem>
                  <SelectItem value="expired">Expiradas</SelectItem>
                  <SelectItem value="canceled">Canceladas</SelectItem>
                </SelectContent>
              </Select>
              <Select value={usageFilter} onValueChange={setUsageFilter}>
                <SelectTrigger className="w-[180px]">
                  <Activity className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtrar por uso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="active">Usando POS</SelectItem>
                  <SelectItem value="inactive">Sin actividad</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de tiendas */}
      <Card id="stores-table">
        <CardHeader>
          <CardTitle>Tiendas Registradas ({filteredStores.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredStores.length === 0 ? (
            <div className="text-center py-12">
              <Store className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-gray-500">No hay tiendas registradas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium">Tienda</th>
                    <th className="text-left p-4 font-medium">Email</th>
                    <th className="text-left p-4 font-medium">Estado</th>
                    <th className="text-left p-4 font-medium">Días Rest.</th>
                    <th className="text-center p-4 font-medium">Productos</th>
                    <th className="text-center p-4 font-medium">Ventas</th>
                    <th className="text-center p-4 font-medium">Clientes</th>
                    <th className="text-left p-4 font-medium">Última Venta</th>
                    <th className="text-right p-4 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStores.map((store) => {
                    const createdDate = new Date(store.created_at).toLocaleDateString('es-CO');
                    const statusConfig = {
                      active: { label: 'Activa', color: 'bg-green-100 text-green-800' },
                      trial: { label: 'Prueba', color: 'bg-yellow-100 text-yellow-800' },
                      expired: { label: 'Expirada', color: 'bg-red-100 text-red-800' },
                      canceled: { label: 'Cancelada', color: 'bg-gray-100 text-gray-800' },
                    };

                    const status = statusConfig[store.subscription_status];
                    const daysRemaining = getDaysRemaining(store);
                    const stats = storeStats.find(s => s.storeId === store.id);

                    return (
                      <tr key={store.id} className="border-b hover:bg-gray-50">
                        <td className="p-4">
                          <div className="font-medium">{store.full_name || 'Sin nombre'}</div>
                          <div className="text-sm text-gray-500">{store.role}</div>
                        </td>
                        <td className="p-4 text-sm">{store.email}</td>
                        <td className="p-4">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="p-4 text-sm">
                          {daysRemaining !== null ? (
                            <span className={`font-medium ${daysRemaining <= 3 ? 'text-red-600' : daysRemaining <= 7 ? 'text-yellow-600' : 'text-green-600'}`}>
                              {daysRemaining} días
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-4 text-sm text-center">
                          {stats ? (
                            <span className={stats.stats.productsCount > 0 ? 'font-medium text-blue-600' : 'text-gray-400'}>
                              {stats.stats.productsCount}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-4 text-sm text-center">
                          {stats ? (
                            <span className={stats.stats.salesCount > 0 ? 'font-medium text-green-600' : 'text-gray-400'}>
                              {stats.stats.salesCount}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-4 text-sm text-center">
                          {stats ? (
                            <span className={stats.stats.customersCount > 0 ? 'font-medium text-purple-600' : 'text-gray-400'}>
                              {stats.stats.customersCount}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-4 text-sm">
                          {stats?.stats.lastSaleDate ? (
                            <span className="text-gray-600">
                              {new Date(stats.stats.lastSaleDate).toLocaleDateString('es-CO', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          ) : (
                            <span className="text-gray-400">Sin ventas</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2 justify-end flex-wrap">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDetailsDialog({ open: true, store })}
                              title="Ver detalles"
                            >
                              <Info className="h-4 w-4" />
                            </Button>
                            {store.subscription_status === 'trial' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setExtendTrialDialog({ open: true, store, days: '15' })}
                                title="Extender período de prueba"
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Extender
                              </Button>
                            )}
                            {store.subscription_status !== 'trial' && (
                              <Button
                                size="sm"
                                variant={store.subscription_status === 'active' ? 'outline' : 'default'}
                                onClick={() => handleToggleStatus(store.id, store.subscription_status)}
                              >
                                {store.subscription_status === 'active' ? (
                                  <>
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Suspender
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Activar
                                  </>
                                )}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handlePromoteToSuperAdmin(store.email)}
                              title="Promover a Super Admin"
                            >
                              <Shield className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogo para extender trial */}
      <Dialog open={extendTrialDialog.open} onOpenChange={(open) => setExtendTrialDialog({ ...extendTrialDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extender Período de Prueba</DialogTitle>
            <DialogDescription>
              Extender el período de prueba para {extendTrialDialog.store?.full_name || extendTrialDialog.store?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Días a agregar</label>
              <Input
                type="number"
                inputMode="numeric"
                min="1"
                max="365"
                value={extendTrialDialog.days}
                onChange={(e) => setExtendTrialDialog({ ...extendTrialDialog, days: e.target.value })}
                placeholder="Número de días"
              />
              <p className="text-xs text-gray-500">
                Puedes agregar entre 1 y 365 días al período de prueba actual
              </p>
            </div>
            {extendTrialDialog.store && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1">
                <div className="text-sm">
                  <span className="font-medium">Estado actual:</span>{' '}
                  {extendTrialDialog.store.subscription_status === 'trial' ? 'En prueba' : 'No activo'}
                </div>
                {extendTrialDialog.store.trial_end_date && (
                  <div className="text-sm">
                    <span className="font-medium">Vence:</span>{' '}
                    {new Date(extendTrialDialog.store.trial_end_date).toLocaleDateString('es-CO')}
                  </div>
                )}
                <div className="text-sm">
                  <span className="font-medium">Días restantes actuales:</span>{' '}
                  {getDaysRemaining(extendTrialDialog.store) ?? 0} días
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExtendTrialDialog({ open: false, store: null, days: '15' })}
            >
              Cancelar
            </Button>
            <Button onClick={handleExtendTrial}>
              Extender Trial
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de detalles de cuenta */}
      <Dialog open={detailsDialog.open} onOpenChange={(open) => setDetailsDialog({ ...detailsDialog, open })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalles de la Cuenta</DialogTitle>
            <DialogDescription>
              Información completa de {detailsDialog.store?.full_name || detailsDialog.store?.email}
            </DialogDescription>
          </DialogHeader>
          {detailsDialog.store && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Nombre completo</p>
                  <p className="text-sm">{detailsDialog.store.full_name || 'No especificado'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="text-sm">{detailsDialog.store.email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Teléfono</p>
                  <p className="text-sm">{detailsDialog.store.phone || 'No especificado'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Rol</p>
                  <p className="text-sm capitalize">{detailsDialog.store.role}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Información de Suscripción</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500">Estado</p>
                    <p className="text-sm capitalize">{detailsDialog.store.subscription_status}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500">Plan</p>
                    <p className="text-sm">{detailsDialog.store.plan_id || 'Sin plan'}</p>
                  </div>
                  {detailsDialog.store.trial_start_date && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500">Inicio de prueba</p>
                      <p className="text-sm">{new Date(detailsDialog.store.trial_start_date).toLocaleDateString('es-CO')}</p>
                    </div>
                  )}
                  {detailsDialog.store.trial_end_date && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500">Fin de prueba</p>
                      <p className="text-sm">{new Date(detailsDialog.store.trial_end_date).toLocaleDateString('es-CO')}</p>
                    </div>
                  )}
                  {detailsDialog.store.last_payment_date && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500">Último pago</p>
                      <p className="text-sm">{new Date(detailsDialog.store.last_payment_date).toLocaleDateString('es-CO')}</p>
                    </div>
                  )}
                  {detailsDialog.store.next_billing_date && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500">Próximo cobro</p>
                      <p className="text-sm">{new Date(detailsDialog.store.next_billing_date).toLocaleDateString('es-CO')}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Fechas</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500">Registro</p>
                    <p className="text-sm">{new Date(detailsDialog.store.created_at).toLocaleString('es-CO')}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500">Última actualización</p>
                    <p className="text-sm">{new Date(detailsDialog.store.updated_at).toLocaleString('es-CO')}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Configuraciones</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500">Add-on de IA</p>
                    <p className="text-sm">{detailsDialog.store.has_ai_addon ? 'Activo' : 'Inactivo'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500">Reportes automáticos</p>
                    <p className="text-sm">{detailsDialog.store.auto_reports_enabled ? 'Activados' : 'Desactivados'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDetailsDialog({ open: false, store: null })}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
