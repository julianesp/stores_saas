/**
 * Service Worker para funcionalidad offline
 * Permite que el POS funcione sin conexión a internet
 */

const CACHE_NAME = 'posib-pos-v1';
const OFFLINE_CACHE = 'posib-offline-v1';

// Recursos críticos que siempre deben estar disponibles offline
const CRITICAL_RESOURCES = [
  '/',
  '/dashboard',
  '/dashboard/sales',
  '/dashboard/products',
  '/dashboard/customers',
  '/offline.html',
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Instalando...');

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching recursos críticos');
      return cache.addAll(CRITICAL_RESOURCES).catch((err) => {
        console.error('[Service Worker] Error pre-caching:', err);
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

  // Solo cachear peticiones GET
  if (request.method !== 'GET') {
    // Para peticiones POST/PUT/DELETE offline, las guardamos en IndexedDB
    if (!navigator.onLine) {
      event.respondWith(
        handleOfflineRequest(request)
      );
      return;
    }
    return;
  }

  // Estrategia Network First para páginas HTML
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Guardar en cache si la respuesta es válida
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Si falla la red, intentar servir desde cache
          return caches.match(request).then((cached) => {
            if (cached) {
              return cached;
            }
            // Si no hay cache, mostrar página offline
            return caches.match('/offline.html');
          });
        })
    );
    return;
  }

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
    const request = indexedDB.open('posib-offline-db', 1);

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
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { autoIncrement: true });
      }
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
    const request = indexedDB.open('posib-offline-db', 1);

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
    const request = indexedDB.open('posib-offline-db', 1);

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
