"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { BellRing } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { getDebtRemindersEnabled, setDebtRemindersEnabled } from "@/lib/cloudflare-api";

/**
 * Recordatorios de fiado: correo automático a los clientes cuando se acerca el
 * plazo. El aviso al tendero (correo y Telegram) siempre llega.
 */
export function DebtRemindersConfig() {
  const { getToken } = useAuth();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getDebtRemindersEnabled(getToken)
      .then(setEnabled)
      .catch((error) => {
        console.error("Error cargando recordatorios de fiado:", error);
        setEnabled(true);
      });
  }, [getToken]);

  const handleChange = async (next: boolean) => {
    setEnabled(next);
    setSaving(true);
    try {
      await setDebtRemindersEnabled(next, getToken);
      toast.success(
        next
          ? "Tus clientes recibirán el recordatorio por correo"
          : "Ya no se enviarán recordatorios a tus clientes"
      );
    } catch (error) {
      console.error("Error guardando recordatorios de fiado:", error);
      setEnabled(!next);
      toast.error("No se pudo guardar el cambio");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing className="h-5 w-5 text-brand" />
          Recordatorios de fiado
        </CardTitle>
        <CardDescription>
          Cada mañana a las 8 am revisamos los plazos de lo que fiaste.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
          <div>
            <p className="font-medium">Avisar a mis clientes por correo</p>
            <p className="text-sm text-gray-500">
              Les llega un correo 3 días antes de que se cumpla el plazo, el día
              que vence y, si no han pagado, uno por semana. Solo a clientes con
              correo registrado.
            </p>
          </div>
          <Switch
            checked={enabled ?? true}
            disabled={enabled === null || saving}
            onCheckedChange={handleChange}
            aria-label="Avisar a mis clientes por correo"
          />
        </div>
        <p className="text-sm text-gray-500">
          A ti siempre te avisamos por correo y por Telegram (si lo tienes
          conectado) qué clientes tienen el fiado por vencer en 3 días o ese
          mismo día, aunque no tengan correo.
        </p>
      </CardContent>
    </Card>
  );
}
