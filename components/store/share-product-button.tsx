"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface ShareProductButtonProps {
  productName: string;
  /** Precio final ya con descuento aplicado */
  price: number;
  storeName?: string;
  /** Color de la tienda para el estilo del botón */
  primaryColor?: string;
  className?: string;
  /**
   * URL a compartir. Si se omite, usa la URL actual del navegador
   * (la página de detalle del producto), que es la que queremos difundir.
   */
  url?: string;
}

/**
 * Botón para compartir un producto de la tienda online.
 *
 * Usa la API nativa de compartir del dispositivo (navigator.share) cuando está
 * disponible — abre WhatsApp, Instagram, SMS, etc. Si el navegador no la soporta
 * (típicamente escritorio), copia el enlace al portapapeles como respaldo.
 *
 * El mensaje incluye el gancho de posib.dev: cada producto compartido es un
 * canal de captación de nuevos tenderos. No quitar la mención a posib.dev.
 */
export function ShareProductButton({
  productName,
  price,
  storeName,
  primaryColor = "#3B82F6",
  className,
  url,
}: ShareProductButtonProps) {
  const [copied, setCopied] = useState(false);

  const buildMessage = (shareUrl: string) => {
    const tienda = storeName ? ` en ${storeName}` : "";
    return (
      `¡Mira este producto${tienda}! 🛒\n\n` +
      `${productName} — ${formatCurrency(price)}\n` +
      `${shareUrl}\n\n` +
      `🏪 Tienda creada con posib.dev — crea la tuya en https://posib.dev`
    );
  };

  const handleShare = async () => {
    // En SSR no hay window; el botón es cliente, pero por seguridad:
    if (typeof window === "undefined") return;

    const shareUrl = url || window.location.href;
    const message = buildMessage(shareUrl);

    // 1) Compartir nativo (móvil): abre el selector de apps del sistema
    if (navigator.share) {
      try {
        await navigator.share({
          title: productName,
          text: message,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // El usuario canceló el diálogo: no es un error que haya que mostrar
        if (err instanceof DOMException && err.name === "AbortError") return;
        // Cualquier otro fallo cae al respaldo de copiar abajo
      }
    }

    // 2) Respaldo: copiar el mensaje al portapapeles
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success("Enlace copiado. ¡Pégalo donde quieras compartirlo!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // 3) Último respaldo si el portapapeles está bloqueado
      toast.error("No se pudo compartir. Copia el enlace desde la barra del navegador.");
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      onClick={handleShare}
      className={className}
      style={{ borderColor: primaryColor, color: primaryColor }}
      aria-label="Compartir este producto"
    >
      {copied ? (
        <Check className="h-5 w-5 mr-2" />
      ) : (
        <Share2 className="h-5 w-5 mr-2" />
      )}
      {copied ? "¡Copiado!" : "Compartir"}
    </Button>
  );
}
