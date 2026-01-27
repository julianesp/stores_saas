/**
 * Hook para manejar sincronización offline
 */

import { useState, useEffect, useCallback } from 'react';

interface OfflineRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  timestamp: number;
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSync, setPendingSync] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Detectar cambios en la conexión
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Intentar sincronizar automáticamente
      syncOfflineData();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    // Estado inicial
    setIsOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Verificar peticiones pendientes
  const checkPendingRequests = useCallback(async () => {
    try {
      const db = await openDB();
      const transaction = db.transaction(['pending-requests'], 'readonly');
      const store = transaction.objectStore('pending-requests');
      const count = await new Promise<number>((resolve) => {
        const countRequest = store.count();
        countRequest.onsuccess = () => resolve(countRequest.result);
      });
      setPendingSync(count);
    } catch (error) {
      console.error('Error checking pending requests:', error);
    }
  }, []);

  // Sincronizar datos offline
  const syncOfflineData = useCallback(async () => {
    if (!navigator.onLine || isSyncing) {
      return;
    }

    setIsSyncing(true);

    try {
      const db = await openDB();
      const transaction = db.transaction(['pending-requests'], 'readwrite');
      const store = transaction.objectStore('pending-requests');

      const getAllRequest = store.getAll();
      const pendingRequests = await new Promise<OfflineRequest[]>((resolve) => {
        getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      });

      if (pendingRequests.length === 0) {
        console.log('No hay datos pendientes de sincronizar');
        setIsSyncing(false);
        return;
      }

      console.log(`Sincronizando ${pendingRequests.length} peticiones...`);

      let successCount = 0;
      for (const request of pendingRequests) {
        try {
          const response = await fetch(request.url, {
            method: request.method,
            headers: request.headers,
            body: request.body,
          });

          if (response.ok) {
            // Eliminar de IndexedDB
            await deleteFromDB(db, request.timestamp);
            successCount++;
          }
        } catch (error) {
          console.error('Error sincronizando petición:', error);
        }
      }

      console.log(`${successCount}/${pendingRequests.length} peticiones sincronizadas`);

      // Actualizar contador
      await checkPendingRequests();
    } catch (error) {
      console.error('Error en sincronización:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, checkPendingRequests]);

  // Guardar petición offline
  const saveOfflineRequest = useCallback(async (
    url: string,
    method: string,
    headers: Record<string, string>,
    body: any
  ) => {
    const requestData: OfflineRequest = {
      url,
      method,
      headers,
      body: JSON.stringify(body),
      timestamp: Date.now(),
    };

    try {
      const db = await openDB();
      const transaction = db.transaction(['pending-requests'], 'readwrite');
      const store = transaction.objectStore('pending-requests');

      await new Promise((resolve, reject) => {
        const addRequest = store.add(requestData);
        addRequest.onsuccess = () => resolve(addRequest.result);
        addRequest.onerror = () => reject(addRequest.error);
      });

      await checkPendingRequests();

      return {
        success: true,
        offline: true,
        message: 'Guardado localmente. Se sincronizará cuando recuperes la conexión.',
      };
    } catch (error) {
      console.error('Error guardando petición offline:', error);
      throw error;
    }
  }, [checkPendingRequests]);

  // Verificar al montar
  useEffect(() => {
    checkPendingRequests();
  }, [checkPendingRequests]);

  return {
    isOnline,
    pendingSync,
    isSyncing,
    syncOfflineData,
    saveOfflineRequest,
    checkPendingRequests,
  };
}

// Abrir base de datos IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('posib-offline-db', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('pending-requests')) {
        db.createObjectStore('pending-requests', { keyPath: 'timestamp' });
      }
    };
  });
}

// Eliminar de IndexedDB
async function deleteFromDB(db: IDBDatabase, timestamp: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending-requests'], 'readwrite');
    const store = transaction.objectStore('pending-requests');
    const deleteRequest = store.delete(timestamp);

    deleteRequest.onsuccess = () => resolve();
    deleteRequest.onerror = () => reject(deleteRequest.error);
  });
}
