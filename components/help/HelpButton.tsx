"use client";

import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGuide } from "@/components/guide/GuideProvider";

/**
 * Ícono de ayuda del encabezado, junto a la campana. Abre la guía de uso con
 * todas las funciones (components/guide/). Disponible para todos los tenderos,
 * no solo los nuevos.
 */
export default function HelpButton() {
  const { openCenter } = useGuide();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={openCenter}
      aria-label="Guía de uso"
      title="Guía de uso"
      className="relative"
    >
      <HelpCircle className="h-5 w-5" />
    </Button>
  );
}
