'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Mail, Clock, ShoppingCart, Package, FileText, Lock, Settings, BarChart3, Eye, Sparkles, Bell } from 'lucide-react';
import { EmailPreferences, UserProfile } from '@/lib/types';
import { getUserProfile } from '@/lib/cloudflare-api';
import { hasEmailMarketingAccess } from '@/lib/cloudflare-subscription-helpers';
import { useRouter } from 'next/navigation';
import { EmailStats } from '@/components/email/email-stats';
import { EmailHistory } from '@/components/email/email-history';
import { TemplatePreview } from '@/components/email/template-preview';
import { AdvancedSettings } from '@/components/email/advanced-settings';
import { EmailCampaigns } from '@/components/email/email-campaigns';
import { EventNotifications } from '@/components/email/event-notifications';

export default function EmailSettingsPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [preferences, setPreferences] = useState<EmailPreferences | null>(null);
  const [advancedSettings, setAdvancedSettings] = useState<any>({});
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    loadProfileAndPreferences();
  }, []);

  const loadProfileAndPreferences = async () => {
    try {
      // Cargar perfil del usuario
      const profile = await getUserProfile(getToken);
      setUserProfile(profile);

      // Verificar acceso a Email Marketing
      const access = hasEmailMarketingAccess(profile);
      setHasAccess(access);

      if (!access) {
        setLoading(false);
        return;
      }

      // Si tiene acceso, cargar preferencias
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
        // Cargar configuración avanzada si existe
        setAdvancedSettings(data.data.advanced_settings || {});
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
          body: JSON.stringify({
            ...preferences,
            advanced_settings: advancedSettings,
          }),
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

  const handleSendTest = async () => {
    setSendingTest(true);
    try {
      const token = await getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL}/api/email/test`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success('Email de prueba enviado! Revisa tu bandeja de entrada.');
      } else {
        throw new Error(data.error || 'Error al enviar email de prueba');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo enviar el email de prueba');
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Mostrar pantalla de bloqueo si no tiene acceso
  if (!hasAccess && userProfile) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="rounded-full bg-amber-100 p-3">
                <Lock className="h-8 w-8 text-amber-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Email Marketing - Plan Premium
                </h2>
                <p className="text-gray-600 mt-2">
                  Esta funcionalidad está disponible en el Plan Premium
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-3">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-left">
                    <p className="font-medium">Emails de Carritos Abandonados</p>
                    <p className="text-sm text-gray-600">Recupera ventas perdidas automáticamente</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Package className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-left">
                    <p className="font-medium">Alertas de Stock</p>
                    <p className="text-sm text-gray-600">Notifica a clientes cuando haya disponibilidad</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-left">
                    <p className="font-medium">Reportes Automáticos</p>
                    <p className="text-sm text-gray-600">Recibe reportes diarios en tu email</p>
                  </div>
                </div>
              </div>

              {userProfile.subscription_status === 'trial' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 w-full">
                  <p className="text-sm text-green-800">
                    ✨ <strong>Incluido en tu prueba gratuita!</strong> Disfruta Email Marketing gratis durante tu período de prueba.
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => router.push('/dashboard/subscription')}
                  size="lg"
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  Ver Planes Premium
                </Button>
                <Button
                  onClick={() => router.push('/dashboard')}
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  Volver al Dashboard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!preferences) return null;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Configuración de Emails</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona todos los aspectos de tu sistema de email marketing
        </p>
      </div>

      <Tabs defaultValue="settings" className="space-y-6">
        <div className="overflow-x-auto pb-2">
          <TabsList className="inline-flex w-auto min-w-full lg:min-w-0">
            <TabsTrigger value="settings" className="shrink-0">
              <Mail className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Configuración</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="shrink-0">
              <BarChart3 className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Estadísticas</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="shrink-0">
              <FileText className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Historial</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="shrink-0">
              <Eye className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Templates</span>
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="shrink-0">
              <Sparkles className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Campañas</span>
            </TabsTrigger>
            <TabsTrigger value="advanced" className="shrink-0">
              <Settings className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Avanzado</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab: Configuración Básica */}
        <TabsContent value="settings" className="space-y-6">
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

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Button
              onClick={handleSendTest}
              disabled={sendingTest}
              variant="outline"
              size="lg"
              className="w-full sm:flex-1"
            >
              {sendingTest ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Enviar Email de Prueba
                </>
              )}
            </Button>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:flex-1"
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
        </TabsContent>

        {/* Tab: Estadísticas */}
        <TabsContent value="stats" className="space-y-6">
          <EmailStats />
        </TabsContent>

        {/* Tab: Historial */}
        <TabsContent value="history">
          <EmailHistory />
        </TabsContent>

        {/* Tab: Templates */}
        <TabsContent value="templates">
          <TemplatePreview />
        </TabsContent>

        {/* Tab: Campañas */}
        <TabsContent value="campaigns">
          <EmailCampaigns />
        </TabsContent>

        {/* Tab: Avanzado */}
        <TabsContent value="advanced" className="space-y-6">
          <AdvancedSettings
            settings={advancedSettings}
            onUpdate={setAdvancedSettings}
          />

          <EventNotifications
            settings={advancedSettings}
            onUpdate={setAdvancedSettings}
          />

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving}
              size="lg"
              className="w-full sm:w-auto"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Configuración Avanzada'
              )}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
