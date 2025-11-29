'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/**
 * Botón para forzar la actualización del perfil del usuario
 * Útil cuando se necesita actualizar el estado de superadmin
 */
export function RefreshProfileButton() {
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/user/init-profile', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Error al actualizar perfil');
      }

      const data = await response.json();

      if (data.profile?.is_superadmin) {
        toast.success('¡Perfil actualizado! Eres Super Administrador. Recargando página...');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        toast.success('Perfil actualizado correctamente');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
      toast.error('Error al actualizar el perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleRefresh}
      disabled={loading}
      className="gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
      {loading ? 'Actualizando...' : 'Actualizar Perfil'}
    </Button>
  );
}
