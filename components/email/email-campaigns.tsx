'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Send, Sparkles } from 'lucide-react';

export function EmailCampaigns() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [campaign, setCampaign] = useState({
    name: '',
    subject: '',
    message: '',
    segment: 'all',
  });

  const handleSendCampaign = async () => {
    if (!campaign.name || !campaign.subject || !campaign.message) {
      toast.error('Completa todos los campos requeridos');
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL}/api/email/campaign`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(campaign),
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success(`Campaña enviada a ${data.recipients_count} destinatarios`);
        setCampaign({
          name: '',
          subject: '',
          message: '',
          segment: 'all',
        });
      } else {
        throw new Error('Error al enviar campaña');
      }
    } catch (error) {
      toast.error('No se pudo enviar la campaña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          <CardTitle>Campañas de Email</CardTitle>
        </div>
        <CardDescription>
          Crea y envía campañas personalizadas a tus clientes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="campaign-name">Nombre de la campaña</Label>
          <Input
            id="campaign-name"
            placeholder="Ej: Promoción de Verano 2026"
            value={campaign.name}
            onChange={(e) => setCampaign({ ...campaign, name: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="campaign-subject">Asunto del email</Label>
          <Input
            id="campaign-subject"
            placeholder="Ej: 🎉 Aprovecha 30% de descuento en toda la tienda"
            value={campaign.subject}
            onChange={(e) =>
              setCampaign({ ...campaign, subject: e.target.value })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="campaign-segment">Segmento de clientes</Label>
          <Select
            value={campaign.segment}
            onValueChange={(value) =>
              setCampaign({ ...campaign, segment: value })
            }
          >
            <SelectTrigger id="campaign-segment">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los clientes</SelectItem>
              <SelectItem value="active">Clientes activos</SelectItem>
              <SelectItem value="inactive">Clientes inactivos (30+ días)</SelectItem>
              <SelectItem value="vip">Clientes VIP (compras &gt; $500,000)</SelectItem>
              <SelectItem value="new">Clientes nuevos (últimos 30 días)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Selecciona a quién quieres enviar esta campaña
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="campaign-message">Mensaje</Label>
          <Textarea
            id="campaign-message"
            placeholder="Escribe el contenido de tu campaña aquí..."
            rows={6}
            value={campaign.message}
            onChange={(e) =>
              setCampaign({ ...campaign, message: e.target.value })
            }
          />
          <p className="text-xs text-muted-foreground">
            El mensaje se enviará en formato HTML con el diseño de tu tienda
          </p>
        </div>

        <Button
          onClick={handleSendCampaign}
          disabled={loading}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando campaña...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Enviar Campaña
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
