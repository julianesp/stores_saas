'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getAllDocuments } from '@/lib/firestore-helpers';
import { UserProfile, PaymentTransaction } from '@/lib/types';
import {
  DollarSign,
  Search,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  CreditCard,
  TrendingUp,
  Banknote,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { getUserProfileByClerkId } from '@/lib/subscription-helpers';

export default function BillingPage() {
  const { user } = useUser();
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
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

      // Cargar todas las transacciones
      const allTransactions = await getAllDocuments('payment_transactions') as PaymentTransaction[];
      allTransactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setTransactions(allTransactions);
      setUserProfiles(allProfiles);
    } catch (error) {
      console.error('Error fetching billing data:', error);
      toast.error('Error al cargar datos de facturación');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando historial de cobros...</p>
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

  const filteredTransactions = transactions.filter((tx) => {
    const profile = userProfiles.find(p => p.id === tx.user_profile_id);
    return (
      profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.reference?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Estadísticas
  const approvedTransactions = transactions.filter(t => t.status === 'APPROVED');
  const declinedTransactions = transactions.filter(t => t.status === 'DECLINED');
  const pendingTransactions = transactions.filter(t => t.status === 'PENDING');

  const totalRevenue = approvedTransactions.reduce((sum, t) => sum + t.amount, 0);

  // Calcular ingresos del mes actual
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlyRevenue = approvedTransactions
    .filter(t => new Date(t.created_at) >= startOfMonth)
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Banknote className="h-8 w-8 text-green-600" />
        <div>
          <h1 className="text-3xl font-bold">Historial de Cobros</h1>
          <p className="text-gray-500">Todas las transacciones de pago del sistema</p>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cobrado</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalRevenue)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {approvedTransactions.length} transacciones aprobadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Este Mes</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(monthlyRevenue)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Ingresos del mes actual
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {pendingTransactions.length}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Transacciones en proceso
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rechazadas</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {declinedTransactions.length}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Pagos fallidos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Buscador */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por tienda, email o referencia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de transacciones */}
      <Card>
        <CardHeader>
          <CardTitle>Transacciones ({filteredTransactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-gray-500">No hay transacciones registradas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium">Fecha</th>
                    <th className="text-left p-4 font-medium">Tienda</th>
                    <th className="text-left p-4 font-medium">Email</th>
                    <th className="text-left p-4 font-medium">Monto</th>
                    <th className="text-left p-4 font-medium">Método</th>
                    <th className="text-left p-4 font-medium">Estado</th>
                    <th className="text-left p-4 font-medium">Referencia</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((tx) => {
                    const profile = userProfiles.find(p => p.id === tx.user_profile_id);
                    const txDate = new Date(tx.created_at).toLocaleString('es-CO', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    const statusConfig = {
                      APPROVED: {
                        label: 'Aprobado',
                        color: 'bg-green-100 text-green-800',
                        icon: CheckCircle
                      },
                      DECLINED: {
                        label: 'Rechazado',
                        color: 'bg-red-100 text-red-800',
                        icon: XCircle
                      },
                      PENDING: {
                        label: 'Pendiente',
                        color: 'bg-yellow-100 text-yellow-800',
                        icon: Clock
                      },
                      ERROR: {
                        label: 'Error',
                        color: 'bg-red-100 text-red-800',
                        icon: XCircle
                      },
                    };

                    const status = statusConfig[tx.status] || statusConfig.ERROR;
                    const StatusIcon = status.icon;

                    return (
                      <tr key={tx.id} className="border-b hover:bg-gray-50">
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            {txDate}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-medium">{profile?.full_name || 'Desconocido'}</div>
                        </td>
                        <td className="p-4 text-sm">{profile?.email || 'N/A'}</td>
                        <td className="p-4">
                          <div className="font-bold text-green-600">
                            {formatCurrency(tx.amount)}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-sm">
                            <CreditCard className="h-4 w-4 text-gray-400" />
                            {tx.payment_method_type || 'N/A'}
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
                        <td className="p-4 text-xs text-gray-500 font-mono">
                          {tx.reference || 'N/A'}
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
