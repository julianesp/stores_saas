'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, FileText, Clock } from 'lucide-react';

const templates = [
  {
    id: 'daily_report',
    name: 'Reporte Diario',
    description: 'Vista previa del reporte de ventas diario',
    icon: FileText,
    preview: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
          <h1>📊 Reporte Diario</h1>
          <p style="margin: 0; opacity: 0.9;">Tu Tienda - 2 de Enero, 2026</p>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333;">Resumen del Día</h2>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #667eea;">Ventas Totales</h3>
            <p style="font-size: 32px; font-weight: bold; margin: 0; color: #10b981;">$1,250,000</p>
            <p style="color: #666; margin: 5px 0 0 0;">15 ventas completadas</p>
          </div>
          <h3 style="color: #333;">Top 5 Productos</h3>
          <ul style="list-style: none; padding: 0;">
            <li style="background: white; padding: 15px; margin: 10px 0; border-radius: 8px;">
              <strong>Producto A</strong> - 10 unidades - $450,000
            </li>
            <li style="background: white; padding: 15px; margin: 10px 0; border-radius: 8px;">
              <strong>Producto B</strong> - 8 unidades - $320,000
            </li>
          </ul>
        </div>
      </div>
    `,
  },
  {
    id: 'subscription_reminder',
    name: 'Recordatorio de Suscripción',
    description: 'Email de recordatorio antes del vencimiento',
    icon: Clock,
    preview: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #dc2626 100%); color: white; padding: 30px; text-align: center;">
          <h1>⏰ Recordatorio de Suscripción</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333;">¡Hola Julián!</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            Tu suscripción vence en <strong style="color: #dc2626;">7 días</strong>.
          </p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; color: #666;">
              <strong>Próxima fecha de renovación:</strong> 9 de Enero, 2026
            </p>
            <p style="margin: 10px 0 0 0; color: #666;">
              <strong>Monto:</strong> $29,900
            </p>
          </div>
          <a href="#" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
            Renovar Ahora
          </a>
        </div>
      </div>
    `,
  },
];

export function TemplatePreview() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const currentTemplate = templates.find((t) => t.id === selectedTemplate);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Vista Previa de Templates</CardTitle>
          <CardDescription>
            Previsualiza cómo se verán los emails que envíes a tus clientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {templates.map((template) => {
              const Icon = template.icon;
              return (
                <div
                  key={template.id}
                  className="border rounded-lg p-4 hover:border-primary transition-colors cursor-pointer"
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{template.name}</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {template.description}
                      </p>
                      <Button variant="outline" size="sm" className="w-full">
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Vista Previa
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{currentTemplate?.name}</DialogTitle>
            <DialogDescription>{currentTemplate?.description}</DialogDescription>
          </DialogHeader>
          {currentTemplate && (
            <div
              className="border rounded-lg p-4 bg-gray-50"
              dangerouslySetInnerHTML={{ __html: currentTemplate.preview }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
