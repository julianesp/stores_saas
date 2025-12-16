'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Bell, Package, Award, TrendingUp, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Notification } from '@/lib/types';
import { getAllNotifications } from '@/lib/notification-helpers';

export function NotificationPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { getToken } = useAuth();

  // Cargar notificaciones al abrir el panel
  useEffect(() => {
    if (isOpen && notifications.length === 0) {
      loadNotifications();
    }
  }, [isOpen]);

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

  const loadNotifications = async () => {
    if (!getToken) return;

    setLoading(true);
    try {
      const notifs = await getAllNotifications(getToken);
      setNotifications(notifs);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.link) {
      router.push(notification.link);
      setIsOpen(false);
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'stock':
        return <Package className="h-5 w-5 text-orange-600" />;
      case 'loyalty':
        return <Award className="h-5 w-5 text-yellow-600" />;
      case 'sale':
        return <TrendingUp className="h-5 w-5 text-green-600" />;
      case 'system':
        return <AlertCircle className="h-5 w-5 text-blue-600" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'stock':
        return 'bg-orange-50 border-orange-200 hover:bg-orange-100';
      case 'loyalty':
        return 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100';
      case 'sale':
        return 'bg-green-50 border-green-200 hover:bg-green-100';
      case 'system':
        return 'bg-blue-50 border-blue-200 hover:bg-blue-100';
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
        <Bell className="h-5 w-5" />
        {notifications.length > 0 && (
          <>
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-600" />
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
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
                          <p className="font-medium text-sm text-gray-900">
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
                          <p className="text-xs text-blue-600 mt-2 font-medium">
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
            <div className="p-3 border-t bg-gray-50">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => loadNotifications()}
                className="w-full text-sm"
              >
                Actualizar notificaciones
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
