'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Mail, Clock, ShoppingCart, Package, FileText } from 'lucide-react';
import { EmailPreferences } from '@/lib/types';

export default function EmailSettingsPage() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<EmailPreferences | null>(null);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const token = await getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL}/api/email/preferences`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPreferences(data.data);
      }
    } catch (error) {
      toast.error('No se pudieron cargar las preferencias');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!preferences) return;

    setSaving(true);
    try {
      const token = await getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL}/api/email/preferences`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(preferences),
        }
      );

      if (response.ok) {
        toast.success('Preferencias de email actualizadas correctamente');
      } else {
        throw new Error('Error al guardar');
      }
    } catch (error) {
      toast.error('No se pudieron guardar las preferencias');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!preferences) return null;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Configuración de Emails</h1>
        <p className="text-muted-foreground mt-2">
          Configura los emails automáticos y notificaciones de marketing
        </p>
      </div>

      <div className="space-y-6">
        {/* Reportes Diarios */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <CardTitle>Reportes Diarios</CardTitle>
            </div>
            <CardDescription>
              Recibe un resumen de ventas diario en tu email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="daily-reports">Activar reportes diarios</Label>
              <Switch
                id="daily-reports"
                checked={preferences.daily_reports_enabled}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, daily_reports_enabled: checked })
                }
              />
            </div>
            {preferences.daily_reports_enabled && (
              <div className="space-y-2">
                <Label htmlFor="reports-time">Hora de envío</Label>
                <Input
                  id="reports-time"
                  type="time"
                  value={preferences.daily_reports_time}
                  onChange={(e) =>
                    setPreferences({ ...preferences, daily_reports_time: e.target.value })
                  }
                />
                <p className="text-sm text-muted-foreground">
                  El reporte se enviará diariamente a esta hora
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recordatorios de Suscripción */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <CardTitle>Recordatorios de Suscripción</CardTitle>
            </div>
            <CardDescription>
              Recibe notificaciones antes de que venza tu suscripción
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label htmlFor="sub-reminders">Activar recordatorios</Label>
              <Switch
                id="sub-reminders"
                checked={preferences.subscription_reminders_enabled}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, subscription_reminders_enabled: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Alertas de Stock */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              <CardTitle>Alertas de Stock</CardTitle>
            </div>
            <CardDescription>
              Notifica a clientes cuando productos agotados vuelvan a estar disponibles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label htmlFor="stock-alerts">Activar alertas de stock</Label>
              <Switch
                id="stock-alerts"
                checked={preferences.stock_alerts_enabled}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, stock_alerts_enabled: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Carritos Abandonados */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              <CardTitle>Recuperación de Carritos Abandonados</CardTitle>
            </div>
            <CardDescription>
              Envía emails automáticos a clientes que abandonaron su carrito
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label htmlFor="cart-emails">Activar emails de carritos abandonados</Label>
              <Switch
                id="cart-emails"
                checked={preferences.abandoned_cart_emails_enabled}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, abandoned_cart_emails_enabled: checked })
                }
              />
            </div>
            {preferences.abandoned_cart_emails_enabled && (
              <p className="text-sm text-muted-foreground mt-4">
                Se enviarán 3 emails: a 1 hora, 24 horas y 72 horas después del abandono
              </p>
            )}
          </CardContent>
        </Card>

        {/* Configuración del Remitente */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              <CardTitle>Configuración del Remitente</CardTitle>
            </div>
            <CardDescription>
              Personaliza cómo aparecen tus emails
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="from-name">Nombre del remitente</Label>
              <Input
                id="from-name"
                placeholder="Tu Tienda"
                value={preferences.from_name || ''}
                onChange={(e) =>
                  setPreferences({ ...preferences, from_name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="from-email">Email de respuesta (opcional)</Label>
              <Input
                id="from-email"
                type="email"
                placeholder="contacto@tutienda.com"
                value={preferences.from_email || ''}
                onChange={(e) =>
                  setPreferences({ ...preferences, from_email: e.target.value })
                }
              />
              <p className="text-sm text-muted-foreground">
                Los clientes pueden responder a este email
              </p>
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full"
          size="lg"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            'Guardar Configuración'
          )}
        </Button>
      </div>
    </div>
  );
}
