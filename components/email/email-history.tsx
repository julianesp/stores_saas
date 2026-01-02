'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface EmailLog {
  id: string;
  email_type: string;
  recipient_email: string;
  subject: string;
  status: 'sent' | 'failed';
  error_message?: string;
  sent_at?: string;
  created_at: string;
}

export function EmailHistory() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<EmailLog[]>([]);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const token = await getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL}/api/email/logs?limit=50`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setLogs(data.data || []);
      }
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEmailTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'subscription_reminder': 'Recordatorio de Suscripción',
      'daily_report': 'Reporte Diario',
      'stock_alert': 'Alerta de Stock',
      'cart_abandoned': 'Carrito Abandonado',
      'new_product_campaign': 'Nueva Campaña de Producto',
      'general': 'General',
      'sale_notification': 'Notificación de Venta',
      'low_stock_alert': 'Alerta de Stock Bajo',
      'goal_achieved': 'Meta Alcanzada',
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'sent') {
      return (
        <Badge variant="default" className="bg-green-500">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Enviado
        </Badge>
      );
    }
    return (
      <Badge variant="destructive">
        <XCircle className="h-3 w-3 mr-1" />
        Fallido
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historial de Emails</CardTitle>
          <CardDescription>Últimos emails enviados desde tu cuenta</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Emails</CardTitle>
        <CardDescription>
          Últimos {logs.length} emails enviados desde tu cuenta
        </CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay emails en el historial aún</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Destinatario</TableHead>
                  <TableHead>Asunto</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {format(new Date(log.created_at), 'PPp', { locale: es })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getEmailTypeLabel(log.email_type)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{log.recipient_email}</TableCell>
                    <TableCell className="text-sm max-w-xs truncate">
                      {log.subject}
                    </TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
