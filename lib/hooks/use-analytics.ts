import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

// Generar un ID de sesión único
const getSessionId = () => {
  if (typeof window === 'undefined') return null;

  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
};

// Función para enviar eventos a la API
const trackEvent = async (eventData: {
  eventType: 'page_view' | 'click' | 'action' | 'feature_use' | 'error';
  eventName: string;
  pagePath?: string;
  pageTitle?: string;
  metadata?: Record<string, any>;
  durationMs?: number;
}) => {
  try {
    const sessionId = getSessionId();

    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...eventData,
        sessionId,
      }),
    });

    // Silent fail - no queremos interrumpir la UX por errores de analytics
  } catch (error) {
    // Silently ignore analytics errors
    console.debug('[Analytics] Failed to track event:', error);
  }
};

/**
 * Hook para rastrear page views automáticamente
 * Uso: Agregar en el layout principal o en cada página
 */
export function usePageTracking() {
  const pathname = usePathname();
  const { isLoaded, user } = useUser();
  const pageStartTime = useRef<number>(Date.now());

  useEffect(() => {
    if (!isLoaded || !user) return;

    // Reset start time cuando cambia la página
    pageStartTime.current = Date.now();

    // Obtener el título de la página
    const pageTitle = document.title;

    // Rastrear page view
    trackEvent({
      eventType: 'page_view',
      eventName: `Page View: ${pageTitle}`,
      pagePath: pathname,
      pageTitle: pageTitle,
    });

    // Cleanup: rastrear duración al salir de la página
    return () => {
      const durationMs = Date.now() - pageStartTime.current;
      if (durationMs > 1000) {
        // Solo rastrear si el usuario estuvo más de 1 segundo
        trackEvent({
          eventType: 'page_view',
          eventName: `Page Duration: ${pageTitle}`,
          pagePath: pathname,
          pageTitle: pageTitle,
          durationMs,
        });
      }
    };
  }, [pathname, isLoaded, user]);
}

/**
 * Hook para rastrear acciones y uso de features
 * Retorna funciones para rastrear diferentes tipos de eventos
 */
export function useAnalytics() {
  const pathname = usePathname();
  const { isLoaded, user } = useUser();

  const trackClick = (elementName: string, metadata?: Record<string, any>) => {
    if (!isLoaded || !user) return;

    trackEvent({
      eventType: 'click',
      eventName: `Click: ${elementName}`,
      pagePath: pathname,
      pageTitle: document.title,
      metadata,
    });
  };

  const trackFeatureUse = (featureName: string, metadata?: Record<string, any>) => {
    if (!isLoaded || !user) return;

    trackEvent({
      eventType: 'feature_use',
      eventName: featureName,
      pagePath: pathname,
      pageTitle: document.title,
      metadata,
    });
  };

  const trackAction = (actionName: string, metadata?: Record<string, any>) => {
    if (!isLoaded || !user) return;

    trackEvent({
      eventType: 'action',
      eventName: actionName,
      pagePath: pathname,
      pageTitle: document.title,
      metadata,
    });
  };

  const trackError = (errorName: string, metadata?: Record<string, any>) => {
    if (!isLoaded || !user) return;

    trackEvent({
      eventType: 'error',
      eventName: errorName,
      pagePath: pathname,
      pageTitle: document.title,
      metadata,
    });
  };

  return {
    trackClick,
    trackFeatureUse,
    trackAction,
    trackError,
  };
}

/**
 * HOC para rastrear clicks en componentes
 * Ejemplo: <Button onClick={withAnalytics(() => console.log('click'), 'Save Product')}>
 */
export function withAnalytics<T extends (...args: any[]) => any>(
  callback: T,
  eventName: string,
  metadata?: Record<string, any>
): T {
  return ((...args: any[]) => {
    trackEvent({
      eventType: 'click',
      eventName: `Click: ${eventName}`,
      pagePath: window.location.pathname,
      pageTitle: document.title,
      metadata,
    });

    return callback(...args);
  }) as T;
}
