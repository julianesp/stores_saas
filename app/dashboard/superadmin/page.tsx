'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAllDocuments, updateDocument } from '@/lib/firestore-helpers';
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
  ArrowUpRight
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

export default function SuperAdminPage() {
  const { user } = useUser();
  const router = useRouter();
  const [stores, setStores] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);

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

      // Filtrar tiendas (excluir super admins)
      const storesData = allProfiles.filter(p => !p.is_superadmin);
      storesData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setStores(storesData);
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
      await updateDocument('user_profiles', storeId, {
        subscription_status: newStatus,
      });
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

  const filteredStores = stores.filter((store) =>
    store.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

      {/* Buscador */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar tienda por nombre o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
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
                    <th className="text-left p-4 font-medium">Plan</th>
                    <th className="text-left p-4 font-medium">Registro</th>
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
                          {store.plan_id || 'Sin plan'}
                        </td>
                        <td className="p-4 text-sm text-gray-600">{createdDate}</td>
                        <td className="p-4">
                          <div className="flex gap-2 justify-end">
                            {store.subscription_status === 'trial' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled
                                title="Las cuentas en período de prueba no se pueden modificar manualmente"
                              >
                                <Clock className="h-4 w-4 mr-1" />
                                En Prueba
                              </Button>
                            ) : (
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
    </div>
  );
}
