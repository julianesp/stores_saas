'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Calendar, Package as PackageIcon, Clock } from 'lucide-react';

interface AdvancedSettingsProps {
  settings: any;
  onUpdate: (settings: any) => void;
}

export function AdvancedSettings({ settings, onUpdate }: AdvancedSettingsProps) {
  const daysOfWeek = [
    { value: '1', label: 'Lunes' },
    { value: '2', label: 'Martes' },
    { value: '3', label: 'Miércoles' },
    { value: '4', label: 'Jueves' },
    { value: '5', label: 'Viernes' },
    { value: '6', label: 'Sábado' },
    { value: '0', label: 'Domingo' },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle>Configuración Avanzada</CardTitle>
          </div>
          <CardDescription>
            Personaliza aspectos específicos del sistema de emails
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Días de la semana para reportes */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Label>Días de envío para reportes diarios</Label>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {daysOfWeek.map((day) => (
                <div key={day.value} className="flex flex-col items-center">
                  <Label
                    htmlFor={`day-${day.value}`}
                    className="text-xs mb-2 cursor-pointer"
                  >
                    {day.label.substring(0, 3)}
                  </Label>
                  <Switch
                    id={`day-${day.value}`}
                    checked={
                      settings.report_days?.includes(day.value) ?? true
                    }
                    onCheckedChange={(checked) => {
                      const currentDays = settings.report_days || [
                        '1',
                        '2',
                        '3',
                        '4',
                        '5',
                      ];
                      const newDays = checked
                        ? [...currentDays, day.value]
                        : currentDays.filter((d: string) => d !== day.value);
                      onUpdate({ ...settings, report_days: newDays });
                    }}
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Los reportes solo se enviarán en los días seleccionados
            </p>
          </div>

          {/* Umbral de stock */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <PackageIcon className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="stock-threshold">
                Umbral de stock para alertas
              </Label>
            </div>
            <Input
              id="stock-threshold"
              type="number"
              min="1"
              value={settings.stock_threshold || 5}
              onChange={(e) =>
                onUpdate({
                  ...settings,
                  stock_threshold: parseInt(e.target.value),
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              Enviar alerta cuando el stock sea menor o igual a este número
            </p>
          </div>

          {/* Tiempos de carritos abandonados */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label>Tiempos para emails de carritos abandonados</Label>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="cart-time-1" className="text-sm">
                  Primer email (horas)
                </Label>
                <Input
                  id="cart-time-1"
                  type="number"
                  min="1"
                  value={settings.cart_email_1_hours || 1}
                  onChange={(e) =>
                    onUpdate({
                      ...settings,
                      cart_email_1_hours: parseInt(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cart-time-2" className="text-sm">
                  Segundo email (horas)
                </Label>
                <Input
                  id="cart-time-2"
                  type="number"
                  min="1"
                  value={settings.cart_email_2_hours || 24}
                  onChange={(e) =>
                    onUpdate({
                      ...settings,
                      cart_email_2_hours: parseInt(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cart-time-3" className="text-sm">
                  Tercer email (horas)
                </Label>
                <Input
                  id="cart-time-3"
                  type="number"
                  min="1"
                  value={settings.cart_email_3_hours || 72}
                  onChange={(e) =>
                    onUpdate({
                      ...settings,
                      cart_email_3_hours: parseInt(e.target.value),
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* CC/BCC para reportes */}
          <div className="space-y-3">
            <Label htmlFor="cc-emails">
              CC para reportes (opcional)
            </Label>
            <Input
              id="cc-emails"
              type="email"
              placeholder="gerente@tutienda.com"
              value={settings.cc_emails || ''}
              onChange={(e) =>
                onUpdate({ ...settings, cc_emails: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Copia de los reportes diarios a este email
            </p>
          </div>

          <div className="space-y-3">
            <Label htmlFor="bcc-emails">
              BCC para reportes (opcional)
            </Label>
            <Input
              id="bcc-emails"
              type="email"
              placeholder="admin@tutienda.com"
              value={settings.bcc_emails || ''}
              onChange={(e) =>
                onUpdate({ ...settings, bcc_emails: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Copia oculta de los reportes a este email
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
