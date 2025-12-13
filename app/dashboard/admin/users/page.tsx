'use client';

import { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getAllUserProfiles, updateUserProfile } from '@/lib/cloudflare-api';
import { UserProfile } from '@/lib/types';
import {
  Users,
  Search,
  Shield,
  Mail,
  Calendar,
  UserCog,
  Ban,
  CheckCircle,
  Crown,
} from 'lucide-react';
import { toast } from 'sonner';
import { getUserProfileByClerkId } from '@/lib/subscription-helpers';

export default function UsersManagementPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
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

      // Ordenar por fecha de creación
      allProfiles.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setUsers(allProfiles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'cajero' : 'admin';

    try {
      await updateUserProfile(userId, {
        role: newRole,
      }, getToken);
      toast.success(`Rol actualizado a ${newRole === 'admin' ? 'Administrador' : 'Cajero'}`);
      fetchData();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Error al actualizar el rol');
    }
  };

  const handlePromoteToSuperAdmin = async (email: string) => {
    if (!confirm(`¿Promover a ${email} como Super Administrador?\n\nEsta acción dará acceso total al sistema.`)) {
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
        <p className="text-gray-500">Cargando usuarios...</p>
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

  const filteredUsers = users.filter((u) =>
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Estadísticas
  const totalUsers = users.length;
  const superAdmins = users.filter(u => u.is_superadmin).length;
  const admins = users.filter(u => !u.is_superadmin && u.role === 'admin').length;
  const cajeros = users.filter(u => u.role === 'cajero').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Users className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
          <p className="text-gray-500">Administra todos los usuarios del sistema</p>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-gray-500">Usuarios registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Super Admins</CardTitle>
            <Crown className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{superAdmins}</div>
            <p className="text-xs text-gray-500">Administradores totales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins de Tienda</CardTitle>
            <Shield className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{admins}</div>
            <p className="text-xs text-gray-500">Propietarios de tienda</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cajeros</CardTitle>
            <UserCog className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{cajeros}</div>
            <p className="text-xs text-gray-500">Empleados</p>
          </CardContent>
        </Card>
      </div>

      {/* Buscador */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de usuarios */}
      <Card>
        <CardHeader>
          <CardTitle>Usuarios del Sistema ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-gray-500">No hay usuarios registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium">Usuario</th>
                    <th className="text-left p-4 font-medium">Email</th>
                    <th className="text-left p-4 font-medium">Rol</th>
                    <th className="text-left p-4 font-medium">Estado</th>
                    <th className="text-left p-4 font-medium">Registro</th>
                    <th className="text-right p-4 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((usr) => {
                    const createdDate = new Date(usr.created_at).toLocaleDateString('es-CO');
                    const roleConfig = {
                      admin: { label: 'Admin Tienda', color: 'bg-blue-100 text-blue-800' },
                      cajero: { label: 'Cajero', color: 'bg-green-100 text-green-800' },
                      cliente: { label: 'Cliente', color: 'bg-gray-100 text-gray-800' },
                    };

                    const statusConfig = {
                      active: { label: 'Activo', color: 'bg-green-100 text-green-800' },
                      trial: { label: 'Prueba', color: 'bg-yellow-100 text-yellow-800' },
                      expired: { label: 'Expirado', color: 'bg-red-100 text-red-800' },
                      canceled: { label: 'Cancelado', color: 'bg-gray-100 text-gray-800' },
                    };

                    const role = roleConfig[usr.role];
                    const status = statusConfig[usr.subscription_status];

                    return (
                      <tr key={usr.id} className="border-b hover:bg-gray-50">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {usr.is_superadmin && (
                              <span title="Super Admin">
                                <Crown className="h-4 w-4 text-purple-600" />
                              </span>
                            )}
                            <div>
                              <div className="font-medium">{usr.full_name || 'Sin nombre'}</div>
                              <div className="text-sm text-gray-500">
                                {usr.is_superadmin ? 'Super Administrador' : role.label}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-gray-400" />
                            {usr.email}
                          </div>
                        </td>
                        <td className="p-4">
                          {usr.is_superadmin ? (
                            <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              Super Admin
                            </span>
                          ) : (
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${role.color}`}>
                              {role.label}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            {createdDate}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2 justify-end">
                            {!usr.is_superadmin && usr.role !== 'cliente' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleToggleRole(usr.id, usr.role)}
                                title="Cambiar rol"
                              >
                                <UserCog className="h-4 w-4 mr-1" />
                                {usr.role === 'admin' ? 'A Cajero' : 'A Admin'}
                              </Button>
                            )}
                            {!usr.is_superadmin && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handlePromoteToSuperAdmin(usr.email)}
                                title="Promover a Super Admin"
                              >
                                <Crown className="h-4 w-4" />
                              </Button>
                            )}
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
