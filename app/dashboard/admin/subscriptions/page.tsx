'use client';

import { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getAllUserProfiles, updateUserProfile } from '@/lib/cloudflare-api';
import { UserProfile, PaymentTransaction } from '@/lib/types';
import {
  CreditCard,
  Search,
  Shield,
  DollarSign,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Mail,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { getUserProfileByClerkId } from '@/lib/subscription-helpers';

export default function SubscriptionsManagementPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [subscriptions, setSubscriptions] = useState<UserProfile[]>([]);
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
      const allProfiles = await getAllUserProfiles(getToken);

      // Obtener perfil del usuario actual
      const myProfile = allProfiles.find(p => p.clerk_user_id === user.id);
      setCurrentUserProfile(myProfile || null);

      // Verificar si es super admin
      if (!myProfile?.is_superadmin) {
        toast.error('No tienes permisos para acceder a esta página');
        return;
      }

      // Filtrar solo usuarios con tiendas (no superadmins)
      const storeSubscriptions = allProfiles.filter(p => !p.is_superadmin);
      storeSubscriptions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setSubscriptions(storeSubscriptions);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast.error('Error al cargar suscripciones');
    } finally {
      setLoading(false);
    }
  };

  const handleActivateSubscription = async (profileId: string, email: string) => {
    if (!confirm(`¿Activar manualmente la suscripción de ${email}?\n\nEsto activará su acceso por 30 días.`)) {
      return;
    }

    try {
      const now = new Date();
      const nextBilling = new Date();
      nextBilling.setMonth(nextBilling.getMonth() + 1);

      await updateUserProfile(profileId, {
        subscription_status: 'active',
        last_payment_date: now.toISOString(),
        next_billing_date: nextBilling.toISOString(),
      }, getToken);

      toast.success('Suscripción activada correctamente');
      fetchData();
    } catch (error) {
      console.error('Error activating subscription:', error);
      toast.error('Error al activar suscripción');
    }
  };

  const handleExtendTrial = async (profileId: string, email: string) => {
    if (!confirm(`¿Extender el período de prueba de ${email} por 15 días más?`)) {
      return;
    }

    try {
      const now = new Date();
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 15);

      await updateUserProfile(profileId, {
        subscription_status: 'trial',
        trial_end_date: trialEnd.toISOString(),
      }, getToken);

      toast.success('Período de prueba extendido por 15 días');
      fetchData();
    } catch (error) {
      console.error('Error extending trial:', error);
      toast.error('Error al extender prueba');
    }
  };

  const handleSuspendSubscription = async (profileId: string, email: string) => {
    if (!confirm(`¿Suspender la suscripción de ${email}?\n\nEl usuario perderá acceso al sistema.`)) {
      return;
    }

    try {
      await updateUserProfile(profileId, {
        subscription_status: 'expired',
      }, getToken);

      toast.success('Suscripción suspendida');
      fetchData();
    } catch (error) {
      console.error('Error suspending subscription:', error);
      toast.error('Error al suspender suscripción');
    }
  };

  const handleDeleteUser = async (profileId: string, email: string, fullName: string) => {
    if (!confirm(`¿Eliminar a ${fullName} (${email}) y todos sus datos?\n\nEsta acción NO SE PUEDE DESHACER.`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/delete-user', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userIdToDelete: profileId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar usuario');
      }

      toast.success(`Usuario ${fullName} eliminado correctamente`);
      fetchData();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error instanceof Error ? error.message : 'Error al eliminar usuario');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando suscripciones...</p>
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

  const filteredSubscriptions = subscriptions.filter((sub) =>
    sub.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Estadísticas
  const totalSubscriptions = subscriptions.length;
  const activeSubscriptions = subscriptions.filter(s => s.subscription_status === 'active').length;
  const trialSubscriptions = subscriptions.filter(s => s.subscription_status === 'trial').length;
  const expiredSubscriptions = subscriptions.filter(s => s.subscription_status === 'expired').length;

  // Calcular ingresos mensuales (asumiendo plan básico de 50,000 COP)
  const monthlyRevenue = activeSubscriptions * 50000;
  const potentialRevenue = (activeSubscriptions + trialSubscriptions) * 50000;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <CreditCard className="h-8 w-8 text-green-600" />
        <div>
          <h1 className="text-3xl font-bold">Gestión de Suscripciones</h1>
          <p className="text-gray-500">Administra las suscripciones de todas las tiendas</p>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Suscripciones</CardTitle>
            <CreditCard className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubscriptions}</div>
            <p className="text-xs text-gray-500">Tiendas registradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeSubscriptions}</div>
            <p className="text-xs text-gray-500">Pagando mensualmente</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Prueba</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{trialSubscriptions}</div>
            <p className="text-xs text-gray-500">Período de prueba</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Mensuales</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(monthlyRevenue)}</div>
            <p className="text-xs text-gray-500">Potencial: {formatCurrency(potentialRevenue)}</p>
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

      {/* Lista de suscripciones */}
      <Card>
        <CardHeader>
          <CardTitle>Suscripciones ({filteredSubscriptions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredSubscriptions.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-gray-500">No hay suscripciones registradas</p>
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
                    <th className="text-left p-4 font-medium">Próximo Pago</th>
                    <th className="text-right p-4 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubscriptions.map((sub) => {
                    const statusConfig = {
                      active: { label: 'Activa', color: 'bg-green-100 text-green-800', icon: CheckCircle },
                      trial: { label: 'Prueba', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
                      expired: { label: 'Expirada', color: 'bg-red-100 text-red-800', icon: XCircle },
                      canceled: { label: 'Cancelada', color: 'bg-gray-100 text-gray-800', icon: XCircle },
                    };

                    const status = statusConfig[sub.subscription_status];
                    const StatusIcon = status.icon;

                    let nextPaymentDate = 'N/A';
                    if (sub.subscription_status === 'active' && sub.next_billing_date) {
                      nextPaymentDate = new Date(sub.next_billing_date).toLocaleDateString('es-CO');
                    } else if (sub.subscription_status === 'trial' && sub.trial_end_date) {
                      const trialEnd = new Date(sub.trial_end_date);
                      const now = new Date();
                      // Normalizar ambas fechas a medianoche para comparación precisa
                      const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                      const trialEndMidnight = new Date(trialEnd.getFullYear(), trialEnd.getMonth(), trialEnd.getDate());
                      const daysLeft = Math.ceil((trialEndMidnight.getTime() - nowMidnight.getTime()) / (1000 * 60 * 60 * 24));
                      nextPaymentDate = `${daysLeft} días restantes`;
                    }

                    return (
                      <tr key={sub.id} className="border-b hover:bg-gray-50">
                        <td className="p-4">
                          <div className="font-medium">{sub.full_name || 'Sin nombre'}</div>
                          <div className="text-sm text-gray-500">{sub.role}</div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-gray-400" />
                            {sub.email}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <StatusIcon className="h-4 w-4" />
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                              {status.label}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-sm">
                          {sub.plan_id || 'Plan Básico'}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            {nextPaymentDate}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2 justify-end">
                            {sub.subscription_status === 'trial' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleExtendTrial(sub.id, sub.email)}
                                title="Extender prueba 15 días"
                              >
                                <Clock className="h-4 w-4 mr-1" />
                                Extender
                              </Button>
                            )}
                            {sub.subscription_status !== 'active' ? (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleActivateSubscription(sub.id, sub.email)}
                                title="Activar suscripción"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Activar
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleSuspendSubscription(sub.id, sub.email)}
                                title="Suspender suscripción"
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Suspender
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => handleDeleteUser(sub.id, sub.email, sub.full_name || 'Usuario')}
                              title="Eliminar usuario y todos sus datos"
                            >
                              <Trash2 className="h-4 w-4" />
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
