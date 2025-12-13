'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw, Users, User, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ResetTrialPage() {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [targetEmail, setTargetEmail] = useState('');

  const handleResetOwnTrial = async () => {
    if (!confirm('¿Estás seguro de que quieres resetear tu período de prueba a 15 días? Esto reiniciará tu contador.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/reset-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        toast.error(data.error || 'Error al resetear trial');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al resetear período de prueba');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSpecificTrial = async () => {
    if (!targetEmail.trim()) {
      toast.error('Por favor ingresa un email');
      return;
    }

    if (!confirm(`¿Estás seguro de que quieres resetear el período de prueba de ${targetEmail} a 15 días?`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/reset-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        setTargetEmail('');
      } else {
        toast.error(data.error || 'Error al resetear trial');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al resetear período de prueba');
    } finally {
      setLoading(false);
    }
  };

  const handleResetAllTrials = async () => {
    if (!confirm('⚠️ ADVERTENCIA: Esto reseteará el período de prueba de TODOS los usuarios a 15 días. ¿Estás seguro?')) {
      return;
    }

    if (!confirm('¿REALMENTE estás seguro? Esta acción afectará a todos los usuarios en período de prueba.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/reset-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetAll: true }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        if (data.updatedUsers && data.updatedUsers.length > 0) {
          console.log('Usuarios actualizados:', data.updatedUsers);
        }
      } else {
        toast.error(data.error || 'Error al resetear trials');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al resetear períodos de prueba');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Resetear Período de Prueba</h1>
        <p className="text-gray-500">Gestiona los períodos de prueba de usuarios</p>
      </div>

      <div className="grid gap-6">
        {/* Resetear propio trial */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              <CardTitle>Resetear Mi Período de Prueba</CardTitle>
            </div>
            <CardDescription>
              Reinicia tu período de prueba a 15 días completos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Usuario actual: {user?.emailAddresses[0]?.emailAddress}</p>
                    <p>Al resetear tu trial, tendrás 15 días completos desde hoy para probar el sistema.</p>
                  </div>
                </div>
              </div>
              <Button
                onClick={handleResetOwnTrial}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {loading ? 'Procesando...' : 'Resetear Mi Trial a 15 Días'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resetear trial de usuario específico */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-purple-600" />
              <CardTitle>Resetear Trial de Usuario Específico</CardTitle>
            </div>
            <CardDescription>
              Reinicia el período de prueba de un usuario por su email
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email del Usuario</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@ejemplo.com"
                  value={targetEmail}
                  onChange={(e) => setTargetEmail(e.target.value)}
                />
              </div>
              <Button
                onClick={handleResetSpecificTrial}
                disabled={loading || !targetEmail.trim()}
                variant="secondary"
                className="w-full sm:w-auto"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {loading ? 'Procesando...' : 'Resetear Trial a 15 Días'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resetear todos los trials - Solo superadmin */}
        <Card className="border-red-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-red-600" />
              <CardTitle className="text-red-900">Resetear Todos los Trials (Superadmin)</CardTitle>
            </div>
            <CardDescription>
              Reinicia el período de prueba de TODOS los usuarios a 15 días
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-red-800">
                    <p className="font-medium mb-1">⚠️ Acción Masiva - Solo Superadmin</p>
                    <p>Esta operación reseteará el período de prueba de todos los usuarios que estén en trial a 15 días desde hoy. Los superadmins no se verán afectados.</p>
                  </div>
                </div>
              </div>
              <Button
                onClick={handleResetAllTrials}
                disabled={loading}
                variant="destructive"
                className="w-full sm:w-auto"
              >
                <Users className="mr-2 h-4 w-4" />
                {loading ? 'Procesando...' : 'Resetear Todos los Trials a 15 Días'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
