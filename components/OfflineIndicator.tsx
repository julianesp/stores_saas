'use client';

import { useEffect, useState } from 'react';
import { WifiOff, Wifi, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { toast } from 'sonner';

export default function OfflineIndicator() {
  const { isOnline, pendingSync, isSyncing, syncOfflineData } = useOfflineSync();
  const [showIndicator, setShowIndicator] = useState(false);
  const [userDismissed, setUserDismissed] = useState(false);

  useEffect(() => {
    // Resetear dismissal cuando cambia el estado de conexión
    if (!isOnline) {
      setUserDismissed(false);
      setShowIndicator(true);
      toast.warning('Sin conexión a internet', {
        description: 'El sistema continuará funcionando offline',
        duration: 5000,
      });
    } else if (isOnline && !userDismissed) {
      // Solo mostrar mensaje si hay cambio de offline a online
      if (showIndicator) {
        toast.success('Conexión restaurada', {
          description: 'Sincronizando datos...',
          duration: 3000,
        });
      }
      setShowIndicator(true);
      // Auto-ocultar después de sincronizar
      setTimeout(() => {
        if (pendingSync === 0 && !userDismissed) {
          setShowIndicator(false);
        }
      }, 3000);
    }
  }, [isOnline, pendingSync]);

  const handleSync = async () => {
    try {
      await syncOfflineData();
      toast.success('Sincronización completada');
    } catch (error) {
      toast.error('Error al sincronizar datos');
    }
  };

  const handleClose = () => {
    setUserDismissed(true);
    setShowIndicator(false);
  };

  // No mostrar si el usuario lo cerró manualmente
  if (userDismissed) {
    return null;
  }

  // No mostrar si está todo bien y no hay nada que mostrar
  if (!showIndicator && isOnline && pendingSync === 0) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 rounded-lg shadow-lg p-4 max-w-sm transition-all ${
        isOnline
          ? 'bg-green-500 text-white'
          : 'bg-orange-500 text-white'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {isOnline ? (
            <Wifi className="h-5 w-5" />
          ) : (
            <WifiOff className="h-5 w-5 animate-pulse" />
          )}
        </div>

        <div className="flex-1">
          <h4 className="font-semibold text-sm mb-1">
            {isOnline ? 'Conectado' : 'Modo Offline'}
          </h4>

          <p className="text-xs opacity-90 mb-2">
            {isOnline ? (
              pendingSync > 0 ? (
                `${pendingSync} operación${pendingSync > 1 ? 'es' : ''} pendiente${pendingSync > 1 ? 's' : ''} de sincronizar`
              ) : (
                'Todos los datos sincronizados'
              )
            ) : (
              'Las ventas se guardarán localmente y se sincronizarán automáticamente'
            )}
          </p>

          {isOnline && pendingSync > 0 && (
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSync}
              disabled={isSyncing}
              className="h-7 text-xs"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Sincronizar ahora
                </>
              )}
            </Button>
          )}

          {isOnline && pendingSync === 0 && !isSyncing && (
            <div className="flex items-center gap-1 text-xs">
              <CheckCircle2 className="h-3 w-3" />
              <span>Sincronizado</span>
            </div>
          )}
        </div>

        <button
          onClick={handleClose}
          className="text-white/80 hover:text-white text-xl leading-none"
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>

      {!isOnline && (
        <div className="mt-3 pt-3 border-t border-white/20">
          <div className="text-xs space-y-1">
            <p className="font-medium">✓ Puedes seguir usando:</p>
            <ul className="ml-3 space-y-0.5 opacity-90">
              <li>• Registrar ventas</li>
              <li>• Consultar productos</li>
              <li>• Ver clientes</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
