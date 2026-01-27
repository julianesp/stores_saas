/**
 * Service Worker para funcionalidad offline
 * Permite que el POS funcione sin conexión a internet
 */

const CACHE_NAME = 'posib-pos-v3';
const OFFLINE_CACHE = 'posib-offline-v3';

// Recursos críticos que siempre deben estar disponibles offline
const CRITICAL_RESOURCES = [
  '/offline.html',
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Instalando...');

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching recursos críticos');
      // Solo pre-cachear offline.html para evitar errores de instalación
      return cache.addAll(CRITICAL_RESOURCES).catch((err) => {
        console.error('[Service Worker] Error pre-caching:', err);
        // No fallar la instalación por errores de cache
        return Promise.resolve();
      });
    })
  );

  // Activar inmediatamente
  self.skipWaiting();
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activando...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== OFFLINE_CACHE) {
            console.log('[Service Worker] Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

  // Tomar control inmediatamente
  return self.clients.claim();
});

// Interceptar peticiones de red
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar peticiones a dominios externos (APIs de terceros, etc)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Solo interceptar peticiones POST/PUT/DELETE para guardarlas offline
  if (request.method !== 'GET') {
    // Para peticiones POST/PUT/DELETE, intentar enviar y si falla guardar offline
    event.respondWith(
      fetch(request)
        .then((response) => response)
        .catch(async () => {
          // Si falla la red, guardar en IndexedDB
          console.log('[Service Worker] Guardando petición offline:', request.method, request.url);
          return await handleOfflineRequest(request);
        })
    );
    return;
  }

  // Para peticiones GET, solo cachear recursos estáticos (JS, CSS, imágenes)
  // No cachear HTML ni APIs para evitar problemas de navegación
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|woff|woff2|ico)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        // Cache First para recursos estáticos
        if (cached) {
          return cached;
        }

        // Si no está en cache, intentar descargar
        return fetch(request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        }).catch(() => {
          // Si falla, simplemente falla (no bloquear navegación)
          return new Response('', { status: 404 });
        });
      })
    );
    return;
  }

  // Para todo lo demás (HTML, APIs, etc), dejar que pase sin interceptar
  // Esto permite que Next.js maneje las rutas normalmente
  return;

  // Estrategia Cache First para recursos estáticos
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|woff|woff2)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          return cached;
        }

        return fetch(request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Para API calls, intentar red primero
  event.respondWith(
    fetch(request)
      .then((response) => response)
      .catch(() => {
        return new Response(
          JSON.stringify({
            error: 'Sin conexión',
            offline: true,
            message: 'Esta petición se sincronizará cuando recuperes la conexión'
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      })
  );
});

// Manejar peticiones offline (POST/PUT/DELETE)
async function handleOfflineRequest(request) {
  const requestData = {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: await request.clone().text(),
    timestamp: Date.now(),
  };

  // Guardar en IndexedDB para sincronizar después
  await saveToIndexedDB('pending-requests', requestData);

  return new Response(
    JSON.stringify({
      success: true,
      offline: true,
      message: 'Guardado localmente. Se sincronizará cuando recuperes la conexión.',
      timestamp: requestData.timestamp,
    }),
    {
      status: 202, // Accepted
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

// Guardar en IndexedDB
async function saveToIndexedDB(storeName, data) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('posib-offline-db', 2); // Versión 2 con keyPath correcto

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const addRequest = store.add(data);

      addRequest.onsuccess = () => resolve(addRequest.result);
      addRequest.onerror = () => reject(addRequest.error);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Eliminar store antiguo si existe
      if (db.objectStoreNames.contains(storeName)) {
        db.deleteObjectStore(storeName);
      }

      // Crear nuevo store con keyPath correcto
      db.createObjectStore(storeName, { keyPath: 'timestamp' });
    };
  });
}

// Escuchar mensajes para sincronización manual
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SYNC_OFFLINE_DATA') {
    syncOfflineData();
  }
});

// Sincronización automática cuando se recupera la conexión
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-data') {
    event.waitUntil(syncOfflineData());
  }
});

// Función de sincronización
async function syncOfflineData() {
  console.log('[Service Worker] Sincronizando datos offline...');

  return new Promise((resolve, reject) => {
    const request = indexedDB.open('posib-offline-db', 2); // Versión 2

    request.onerror = () => reject(request.error);
    request.onsuccess = async () => {
      const db = request.result;
      const transaction = db.transaction(['pending-requests'], 'readonly');
      const store = transaction.objectStore('pending-requests');
      const getAllRequest = store.getAll();

      getAllRequest.onsuccess = async () => {
        const pendingRequests = getAllRequest.result;

        if (pendingRequests.length === 0) {
          console.log('[Service Worker] No hay datos pendientes de sincronizar');
          resolve();
          return;
        }

        console.log(`[Service Worker] Sincronizando ${pendingRequests.length} peticiones...`);

        // Enviar cada petición pendiente
        for (const reqData of pendingRequests) {
          try {
            await fetch(reqData.url, {
              method: reqData.method,
              headers: reqData.headers,
              body: reqData.body,
            });

            // Si tiene éxito, eliminar de IndexedDB
            await deleteFromIndexedDB('pending-requests', reqData);
          } catch (error) {
            console.error('[Service Worker] Error sincronizando:', error);
          }
        }

        resolve();
      };
    };
  });
}

// Eliminar de IndexedDB
async function deleteFromIndexedDB(storeName, data) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('posib-offline-db', 2); // Versión 2

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      // Eliminar por timestamp (asumiendo que es único)
      const deleteRequest = store.delete(data.timestamp);

      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
  });
}
