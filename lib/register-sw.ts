/**
 * Registrar Service Worker para funcionalidad offline
 */

export async function registerServiceWorker() {
  // En desarrollo el SW sirve chunks viejos de Turbopack (errores de hidratación,
  // estilos que no se actualizan): se desregistra en vez de registrarlo.
  if (process.env.NODE_ENV === 'development') {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    }
    return undefined;
  }

  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register(
        '/service-worker.js',
        {
          scope: '/',
        }
      );

      console.log('✅ Service Worker registrado:', registration.scope);

      // Escuchar actualizaciones
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🔄 Nueva versión del Service Worker disponible');
              // Opcionalmente, mostrar notificación al usuario
            }
          });
        }
      });

      // Verificar si hay actualizaciones cada hora
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);

      return registration;
    } catch (error) {
      console.error('❌ Error registrando Service Worker:', error);
      throw error;
    }
  } else {
    console.warn('⚠️ Service Workers no soportados en este navegador');
    return null;
  }
}

// Desregistrar Service Worker (útil para desarrollo)
export async function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.unregister();
      console.log('Service Worker desregistrado');
    }
  }
}
