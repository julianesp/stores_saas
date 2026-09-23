"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { HardDriveUpload, ExternalLink, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const WORKER_URL =
  process.env.NEXT_PUBLIC_WORKER_URL ||
  "https://tienda-pos-api.julii1295.workers.dev";

interface LastBackup {
  backup_date: string;
  status: "pending" | "uploaded" | "failed";
  drive_file_link: string | null;
  sales_count: number;
  uploaded_at: string | null;
  last_error: string | null;
}

interface DriveSettings {
  connected: boolean;
  enabled: boolean;
  backup_time: string;
  google_email: string | null;
  connected_at: string | null;
  last_backup: LastBackup | null;
}

/**
 * Copia de seguridad automática de las ventas del día a Google Drive.
 * El tendero conecta su cuenta de Google, elige la hora y el sistema sube el
 * Excel del día solo (aunque no esté presente). Si una noche falla, se reintenta
 * a la mañana siguiente.
 */
export function GoogleDriveBackupConfig() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState<DriveSettings | null>(null);
  const [time, setTime] = useState("22:00");

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${WORKER_URL}/api/backup/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const s: DriveSettings = data.data;
        setSettings(s);
        setTime(s.backup_time || "22:00");
      }
    } catch {
      // silencioso; se muestra el estado por defecto
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    load();
  }, [load]);

  // Mostrar el resultado del OAuth al volver del callback (?drive=ok|error).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const drive = params.get("drive");
    if (drive === "ok") {
      toast.success("Google Drive conectado. Tus ventas se respaldarán automáticamente.");
    } else if (drive === "error") {
      toast.error(params.get("drive_msg") || "No se pudo conectar Google Drive.");
    }
    if (drive) {
      params.delete("drive");
      params.delete("drive_msg");
      const qs = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
    }
  }, []);

  const connect = () => {
    // Redirección al flujo OAuth (Next.js arma el consentimiento de Google).
    window.location.href = "/api/backup/google/connect";
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/backup/google/disconnect", { method: "POST" });
      if (!res.ok) throw new Error();
      toast.success("Google Drive desconectado.");
      await load();
    } catch {
      toast.error("No se pudo desconectar.");
    } finally {
      setBusy(false);
    }
  };

  const patchSettings = async (payload: { enabled?: boolean; backup_time?: string }) => {
    setBusy(true);
    try {
      const token = await getToken();
      const res = await fetch(`${WORKER_URL}/api/backup/settings`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      await load();
    } catch {
      toast.error("No se pudo guardar el cambio.");
    } finally {
      setBusy(false);
    }
  };

  const connected = settings?.connected ?? false;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDriveUpload className="h-5 w-5 text-brand" />
          Copia de seguridad en Google Drive
        </CardTitle>
        <CardDescription>
          Sube automáticamente un Excel con las ventas de cada día a tu Google Drive.
          Funciona solo, aunque no tengas el sistema abierto. Si una noche falla, se
          reintenta a la mañana siguiente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : !connected ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Conecta tu cuenta de Google para activar las copias automáticas.
            </p>
            <Button onClick={connect} disabled={busy}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Conectar Google Drive
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>
                Conectado como{" "}
                <span className="font-medium">{settings?.google_email || "tu cuenta"}</span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Respaldo automático</p>
                <p className="text-xs text-muted-foreground">
                  Activa o pausa la subida diaria.
                </p>
              </div>
              <Switch
                checked={settings?.enabled ?? false}
                disabled={busy}
                onCheckedChange={(checked) => patchSettings({ enabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Hora de la copia</p>
                <p className="text-xs text-muted-foreground">
                  Cada noche a esta hora (Colombia).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={time}
                  className="w-32"
                  onChange={(e) => setTime(e.target.value)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy || time === settings?.backup_time}
                  onClick={() => patchSettings({ backup_time: time })}
                >
                  Guardar
                </Button>
              </div>
            </div>

            {settings?.last_backup && (
              <div className="rounded-md border p-3 text-sm">
                <p className="font-medium mb-1">Última copia</p>
                {settings.last_backup.status === "uploaded" ? (
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>
                      {settings.last_backup.backup_date} · {settings.last_backup.sales_count}{" "}
                      ventas
                    </span>
                    {settings.last_backup.drive_file_link && (
                      <a
                        href={settings.last_backup.drive_file_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-brand underline"
                      >
                        Ver <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-amber-700">
                    <AlertCircle className="h-4 w-4" />
                    <span>
                      {settings.last_backup.backup_date}:{" "}
                      {settings.last_backup.last_error || "pendiente de subir"}
                    </span>
                  </div>
                )}
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              disabled={busy}
              onClick={disconnect}
            >
              Desconectar Google Drive
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
