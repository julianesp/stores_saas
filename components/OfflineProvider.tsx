'use client';

import { useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';
import { registerServiceWorker } from '@/lib/register-sw';
import OfflineIndicator from './OfflineIndicator';
import {
  getQueuedSales,
  removeQueuedSale,
  countQueuedSales,
} from '@/lib/offline-store';
import { createSale, setSelectedTenantId, getSelectedTenantId } from '@/lib/cloudflare-api';
import type { Sale } from '@/lib/cloudflare-api';

export default function OfflineProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();

  // Sincroniza las ventas que se hicieron sin conexión.
  const syncQueuedSales = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.onLine) return;

    const queued = await getQueuedSales();
    if (queued.length === 0) return;

    const originalTenant = getSelectedTenantId();
    let synced = 0;

    for (const sale of queued) {
      try {
        // Restaurar el tenant con el que se generó la venta.
        if (sale.tenantId) setSelectedTenantId(sale.tenantId);
        await createSale(sale.payload as Partial<Sale>, getToken);
        await removeQueuedSale(sale.localId);
        synced++;
      } catch (error) {
        console.error('[offline] Error sincronizando venta encolada:', error);
        // Dejamos la venta en cola para reintentar en el próximo evento online.
      }
    }

    // Restaurar el tenant activo original.
    if (originalTenant) setSelectedTenantId(originalTenant);

    if (synced > 0) {
      const pending = await countQueuedSales();
      toast.success(
        `${synced} venta${synced === 1 ? '' : 's'} sincronizada${synced === 1 ? '' : 's'}`,
        {
          description:
            pending > 0
              ? `Quedan ${pending} pendientes por sincronizar`
              : 'Todas las ventas offline se subieron correctamente',
        },
      );
    }
  }, [getToken]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    registerServiceWorker().catch((error) => {
      console.error('Error al registrar Service Worker:', error);
    });

    // Intentar sincronizar al montar (por si quedaron ventas de una sesión previa).
    syncQueuedSales().catch((error) => {
      console.error('[offline] Error en sincronización inicial:', error);
    });

    const handleOnline = () => {
      syncQueuedSales().catch((error) => {
        console.error('[offline] Error sincronizando al reconectar:', error);
      });
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [syncQueuedSales]);

  return (
    <>
      {children}
      <OfflineIndicator />
    </>
  );
}
