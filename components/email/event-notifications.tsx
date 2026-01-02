'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Bell, ShoppingBag, Package as PackageIcon, Users, TrendingUp } from 'lucide-react';

interface EventNotificationsProps {
  settings: any;
  onUpdate: (settings: any) => void;
}

const notifications = [
  {
    id: 'sale_completed',
    title: 'Venta Completada',
    description: 'Recibe un email cada vez que se complete una venta',
    icon: ShoppingBag,
    defaultEnabled: false,
  },
  {
    id: 'low_stock',
    title: 'Stock Bajo',
    description: 'Alerta cuando el stock de un producto llegue al mínimo',
    icon: PackageIcon,
    defaultEnabled: true,
  },
  {
    id: 'new_customer',
    title: 'Nuevo Cliente Registrado',
    description: 'Notificación cuando un nuevo cliente se registre',
    icon: Users,
    defaultEnabled: true,
  },
  {
    id: 'daily_goal',
    title: 'Meta Diaria Alcanzada',
    description: 'Celebra cuando alcances tu meta de ventas del día',
    icon: TrendingUp,
    defaultEnabled: true,
  },
  {
    id: 'weekly_goal',
    title: 'Meta Semanal Alcanzada',
    description: 'Notificación cuando completes tu meta semanal',
    icon: TrendingUp,
    defaultEnabled: true,
  },
];

export function EventNotifications({ settings, onUpdate }: EventNotificationsProps) {
  const handleToggle = (notificationId: string, enabled: boolean) => {
    onUpdate({
      ...settings,
      [`notify_${notificationId}`]: enabled,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <CardTitle>Notificaciones de Eventos</CardTitle>
        </div>
        <CardDescription>
          Configura qué eventos te generarán notificaciones por email
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {notifications.map((notification) => {
          const Icon = notification.icon;
          const isEnabled =
            settings[`notify_${notification.id}`] ?? notification.defaultEnabled;

          return (
            <div
              key={notification.id}
              className="flex items-start gap-4 p-4 border rounded-lg hover:border-primary/50 transition-colors"
            >
              <div className="p-2 bg-primary/10 rounded-lg">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor={`notify-${notification.id}`}
                    className="font-semibold cursor-pointer"
                  >
                    {notification.title}
                  </Label>
                  <Switch
                    id={`notify-${notification.id}`}
                    checked={isEnabled}
                    onCheckedChange={(checked) =>
                      handleToggle(notification.id, checked)
                    }
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {notification.description}
                </p>
              </div>
            </div>
          );
        })}

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Consejo:</strong> Las notificaciones de eventos te ayudan a
            estar al tanto de lo que sucede en tu tienda en tiempo real. Puedes
            desactivar las que no necesites para evitar recibir demasiados emails.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
