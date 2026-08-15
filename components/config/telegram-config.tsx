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
import { Switch } from "@/components/ui/switch";
import { Send, Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const WORKER_URL =
  process.env.NEXT_PUBLIC_WORKER_URL ||
  "https://tienda-pos-api.julii1295.workers.dev";

// Username del bot de Telegram (sin @). Se configura al crear el bot con BotFather.
const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT || "";

/**
 * Genera un código de vinculación corto y legible (sin caracteres ambiguos).
 */
function generateLinkCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < bytes.length; i++) {
    code += alphabet[bytes[i] % alphabet.length];
  }
  return code;
}

export function TelegramConfig() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [linkCode, setLinkCode] = useState<string>("");
  const [profileId, setProfileId] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;
      // GET /api/user-profiles/ devuelve el perfil del owner autenticado
      const res = await fetch(`${WORKER_URL}/api/user-profiles/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const profile = data.data || data;
        setProfileId(profile.id || "");
        setConnected(Boolean(profile.telegram_chat_id));
        setEnabled(profile.telegram_enabled !== 0 && profile.telegram_enabled !== false);
        setLinkCode(profile.telegram_link_code || "");
      }
    } catch (error) {
      console.error("Error cargando config de Telegram:", error);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const patchProfile = async (body: Record<string, unknown>) => {
    if (!profileId) throw new Error("Perfil no cargado");
    const token = await getToken();
    // PUT /api/user-profiles/:id — endpoint real del Worker (no existe /me)
    const res = await fetch(`${WORKER_URL}/api/user-profiles/${profileId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Error al guardar");
  };

  // Genera un código nuevo y lo guarda en el perfil
  const handleGenerateCode = async () => {
    setBusy(true);
    try {
      const code = generateLinkCode();
      await patchProfile({ telegram_link_code: code, telegram_enabled: 1 });
      setLinkCode(code);
      toast.success("Código generado. Ábrelo en el bot para conectar.");
    } catch {
      toast.error("No se pudo generar el código");
    } finally {
      setBusy(false);
    }
  };

  const handleToggleEnabled = async (value: boolean) => {
    setEnabled(value);
    try {
      await patchProfile({ telegram_enabled: value ? 1 : 0 });
      toast.success(value ? "Avisos activados" : "Avisos pausados");
    } catch {
      setEnabled(!value); // revertir
      toast.error("No se pudo actualizar");
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(linkCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Enlace directo que abre el bot con el código ya cargado
  const startLink =
    BOT_USERNAME && linkCode
      ? `https://t.me/${BOT_USERNAME}?start=${linkCode}`
      : "";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5 text-sky-500" />
          Alertas por Telegram
        </CardTitle>
        <CardDescription>
          Recibe un aviso en Telegram cuando tengas productos próximos a vencer,
          para ponerlos en promoción a tiempo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-gray-500">Cargando...</p>
        ) : connected ? (
          <>
            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">Telegram conectado</p>
                  <p className="text-sm text-green-700">
                    Te avisaremos aquí de los productos próximos a vencer.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Avisos activos</p>
                <p className="text-sm text-gray-500">
                  {enabled
                    ? "Recibirás notificaciones de vencimiento"
                    : "Notificaciones pausadas"}
                </p>
              </div>
              <Switch checked={enabled} onCheckedChange={handleToggleEnabled} />
            </div>

            <Button variant="outline" size="sm" onClick={handleGenerateCode} disabled={busy}>
              Volver a conectar (otro Telegram)
            </Button>
          </>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-sky-50 border border-sky-200 rounded-lg space-y-3">
              <p className="font-semibold text-sky-900 text-sm">
                ¿Cómo conectar tu Telegram?
              </p>
              <ol className="text-sm text-sky-800 space-y-2 list-decimal list-inside">
                <li>Genera tu código con el botón de abajo.</li>
                <li>
                  {startLink ? (
                    <>Abre el bot y toca <strong>Iniciar</strong> (el código ya va incluido).</>
                  ) : (
                    <>Abre el bot de posib.dev en Telegram y envía <strong>/start</strong> seguido del código.</>
                  )}
                </li>
                <li>Listo: te llegará un mensaje de confirmación.</li>
              </ol>
            </div>

            {linkCode ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 font-mono text-lg tracking-widest text-center bg-gray-100 rounded-lg py-3 select-all">
                    {linkCode}
                  </div>
                  <Button variant="outline" size="icon" onClick={copyCode} aria-label="Copiar código">
                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                {startLink ? (
                  <a href={startLink} target="_blank" rel="noopener noreferrer">
                    <Button className="w-full bg-sky-500 hover:bg-sky-600 text-white">
                      <Send className="h-4 w-4 mr-2" />
                      Abrir el bot en Telegram
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </Button>
                  </a>
                ) : (
                  <p className="text-xs text-gray-500 text-center">
                    Envía este código al bot con el comando <strong>/start</strong>.
                  </p>
                )}
                <Button variant="ghost" size="sm" className="w-full" onClick={handleGenerateCode} disabled={busy}>
                  Generar otro código
                </Button>
              </div>
            ) : (
              <Button onClick={handleGenerateCode} disabled={busy} className="w-full">
                <Send className="h-4 w-4 mr-2" />
                {busy ? "Generando..." : "Generar código de conexión"}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
