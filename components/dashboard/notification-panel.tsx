'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Bell, BellOff, Package, Award, TrendingUp, AlertCircle, Calendar, DollarSign, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Notification } from '@/lib/types';
import { getAllNotifications } from '@/lib/notification-helpers';
import {
  playBellSound,
  isNotificationSoundEnabled,
  setNotificationSoundEnabled,
} from '@/lib/notification-sound';
import {
  getSeenNotificationIds,
  markNotificationSeen,
  markNotificationsSeen,
} from '@/lib/seen-notifications';

export function NotificationPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  // Ids de notificaciones que el tendero ya abrió (vio individualmente). Se
  // persiste por dispositivo. El campaneo sigue mientras quede alguna sin ver;
  // abrir el panel NO marca nada: hay que hacer clic en cada notificación.
  const [seenIds, setSeenIds] = useState<Set<string>>(() => getSeenNotificationIds());
  // Clase de animación activa durante el campaneo (~900ms) y luego se limpia.
  const [ringing, setRinging] = useState(false);
  // Preferencia de sonido (por dispositivo). Lazy init: en SSR devuelve true.
  const [soundOn, setSoundOn] = useState(() => isNotificationSoundEnabled());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hasLoadedOnceRef = useRef(false);
  const router = useRouter();
  const { getToken } = useAuth();

  // Hay avisos sin ver si existe alguna notificación cuyo id no esté marcado.
  const unseenNotifications = notifications.filter((n) => !seenIds.has(n.id));
  const hasUnseen = unseenNotifications.length > 0;

  const loadNotifications = useCallback(async () => {
    if (!getToken) return;

    // Solo mostrar el spinner en la primera carga. Las recargas en segundo plano
    // (montaje, intervalo) son silenciosas para no parpadear el panel.
    if (!hasLoadedOnceRef.current) setLoading(true);
    try {
      const notifs = await getAllNotifications(getToken);
      setNotifications(notifs);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      hasLoadedOnceRef.current = true;
      setLoading(false);
    }
  }, [getToken]);

  // Cargar notificaciones al montar (para que el badge de conteo aparezca sin
  // necesidad de abrir el panel) y refrescar cada 90 segundos. El refresco corto
  // hace que los pedidos de la tienda online aparezcan pronto en la campana
  // (el aviso instantáneo sigue siendo Telegram). loadNotifications hace setState
  // de forma asíncrona (fetch), que es un uso legítimo de efecto.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadNotifications();
    const interval = setInterval(loadNotifications, 90 * 1000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Recargar al abrir, para tener el dato más fresco. Abrir el panel NO marca
  // las notificaciones como vistas: eso ocurre al hacer clic en cada una.
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadNotifications();
    }
  }, [isOpen, loadNotifications]);

  // Campaneo periódico: cada 10 segundos, mientras quede AL MENOS UNA
  // notificación sin ver, la campana "suena" (animación ~900ms) y reproduce el
  // tono. Sigue aunque el panel esté abierto: solo para cuando el tendero abre
  // (hace clic en) todas las notificaciones. Vuelve a sonar si llegan nuevas.
  useEffect(() => {
    if (!hasUnseen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRinging(false);
      return;
    }

    // Sonar una vez de inmediato al detectar avisos sin ver, y luego cada 10s.
    // NO suena al hacer clic en la campana, solo con el pulso periódico.
    const ring = () => {
      setRinging(true);
      playBellSound();
      setTimeout(() => setRinging(false), 950);
    };
    ring();
    const interval = setInterval(ring, 10 * 1000);
    return () => clearInterval(interval);
  }, [hasUnseen]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const markSeen = (id: string) => {
    markNotificationSeen(id);
    setSeenIds((prev) => new Set(prev).add(id));
  };

  const handleNotificationClick = (notification: Notification) => {
    // Abrir una notificación la marca como vista → detiene el campaneo si era
    // la última pendiente.
    markSeen(notification.id);
    if (notification.link) {
      router.push(notification.link);
      setIsOpen(false);
    }
  };

  const handleMarkAllSeen = () => {
    const ids = notifications.map((n) => n.id);
    markNotificationsSeen(ids);
    setSeenIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'stock':
        return <Package className="h-5 w-5 text-orange-600" />;
      case 'expiration':
        return <Calendar className="h-5 w-5 text-red-600" />;
      case 'debt':
        return <DollarSign className="h-5 w-5 text-amber-600" />;
      case 'loyalty':
        return <Award className="h-5 w-5 text-yellow-600" />;
      case 'sale':
        return <TrendingUp className="h-5 w-5 text-green-600" />;
      case 'system':
        return <AlertCircle className="h-5 w-5 text-brand" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'stock':
        return 'bg-orange-50 border-orange-200 hover:bg-orange-100';
      case 'expiration':
        return 'bg-red-50 border-red-200 hover:bg-red-100';
      case 'debt':
        return 'bg-amber-50 border-amber-200 hover:bg-amber-100';
      case 'loyalty':
        return 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100';
      case 'sale':
        return 'bg-green-50 border-green-200 hover:bg-green-100';
      case 'system':
        return 'bg-brand-light/50 border-brand/40 hover:bg-brand-light';
      default:
        return 'bg-gray-50 border-gray-200 hover:bg-gray-100';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className={`h-5 w-5 ${ringing ? 'bell-ring' : ''}`} />
        {notifications.length > 0 && (
          <>
            <span
              className={`absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold ${
                hasUnseen ? 'ring-2 ring-red-400/60' : ''
              }`}
            >
              {notifications.length > 9 ? '9+' : notifications.length}
            </span>
          </>
        )}
      </Button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold text-gray-900">Notificaciones</h3>
            <div className="flex items-center gap-1">
              {/* Silenciar/activar el tono de campana (por dispositivo). */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const next = !soundOn;
                  setSoundOn(next);
                  setNotificationSoundEnabled(next);
                  if (next) playBellSound(); // muestra cómo suena al activarlo
                }}
                className="h-6 w-6 p-0 text-gray-600"
                aria-label={soundOn ? 'Silenciar sonido' : 'Activar sonido'}
                title={soundOn ? 'Silenciar sonido de avisos' : 'Activar sonido de avisos'}
              >
                {soundOn ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50 animate-pulse" />
                <p className="text-sm">Cargando notificaciones...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No hay notificaciones</p>
                <p className="text-xs mt-1">Todo está en orden</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full p-4 text-left transition-colors border ${getNotificationColor(notification.type)}`}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm text-gray-900 flex items-center gap-1.5">
                            {!seenIds.has(notification.id) && (
                              <span
                                className="inline-block h-2 w-2 shrink-0 rounded-full bg-red-600"
                                aria-label="Sin ver"
                              />
                            )}
                            {notification.title}
                          </p>
                          {notification.count !== undefined && (
                            <span className="flex-shrink-0 bg-gray-900 text-white text-xs font-bold rounded-full px-2 py-0.5">
                              {notification.count}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        {notification.link && (
                          <p className="text-xs text-brand mt-2 font-medium">
                            Ver detalles →
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="flex items-center gap-2 p-3 border-t bg-gray-50">
              {hasUnseen && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllSeen}
                  className="flex-1 text-sm text-brand hover:text-brand-hover"
                >
                  Marcar todas como vistas
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => loadNotifications()}
                className="flex-1 text-sm"
              >
                Actualizar
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
