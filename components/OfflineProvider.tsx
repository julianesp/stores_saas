'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/register-sw';
import OfflineIndicator from './OfflineIndicator';

export default function OfflineProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Registrar Service Worker solo en el cliente
    if (typeof window !== 'undefined') {
      // Verificar y migrar IndexedDB si es necesario
      migrateIndexedDB().catch((error) => {
        console.error('Error migrando IndexedDB:', error);
      });

      registerServiceWorker().catch((error) => {
        console.error('Error al registrar Service Worker:', error);
      });
    }
  }, []);

  return (
    <>
      {children}
      <OfflineIndicator />
    </>
  );
}

// Migrar IndexedDB de estructura antigua a nueva
async function migrateIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('posib-offline-db', 2); // Incrementar versión para forzar upgrade

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      console.log('[OfflineProvider] IndexedDB verificado y actualizado');
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Eliminar store antiguo si existe
      if (db.objectStoreNames.contains('pending-requests')) {
        db.deleteObjectStore('pending-requests');
        console.log('[OfflineProvider] Eliminando store antiguo de pending-requests');
      }

      // Crear nuevo store con keyPath correcto
      db.createObjectStore('pending-requests', { keyPath: 'timestamp' });
      console.log('[OfflineProvider] Creado nuevo store de pending-requests con keyPath: timestamp');
    };
  });
}
