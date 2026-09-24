"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { HelpCircle, PlayCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useTour, TourConfig } from "@/hooks/useTour";
import {
  isAutoHelpEnabled,
  setAutoHelpEnabled,
} from "@/lib/help-preferences";
import {
  dashboardTourConfig,
  productsTourConfig,
  posTourConfig,
  customersTourConfig,
  inventoryTourConfig,
} from "@/lib/tour-configs";

/**
 * Botón flotante de ayuda, global en el dashboard. Disponible para TODOS los
 * tenderos (no solo nuevos):
 *  - Muestra "Ver ayuda de esta página" que lanza el tour guiado de la ruta
 *    actual, cuantas veces quiera.
 *  - Tiene un interruptor para activar/desactivar las ayudas automáticas (las
 *    que aparecen solas la primera vez). La preferencia es por dispositivo.
 *
 * Conserva el color principal de marca (brand = #007c80).
 */

// Ruta actual → tour correspondiente. Orden importa: rutas más específicas
// primero (p. ej. /dashboard/products antes que /dashboard).
const ROUTE_TOURS: { match: (path: string) => boolean; config: TourConfig; label: string }[] = [
  {
    match: (p) => p.startsWith("/dashboard/products"),
    config: productsTourConfig,
    label: "Productos",
  },
  {
    match: (p) => p.startsWith("/dashboard/pos"),
    config: posTourConfig,
    label: "Punto de venta",
  },
  {
    match: (p) => p.startsWith("/dashboard/customers"),
    config: customersTourConfig,
    label: "Clientes",
  },
  {
    match: (p) => p.startsWith("/dashboard/inventory"),
    config: inventoryTourConfig,
    label: "Inventario",
  },
  {
    // Fallback: el dashboard principal. Debe ir al final.
    match: (p) => p.startsWith("/dashboard"),
    config: dashboardTourConfig,
    label: "Panel principal",
  },
];

export default function HelpButton() {
  const pathname = usePathname();
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  // Inicialización lazy: en SSR isAutoHelpEnabled() devuelve true; en el cliente
  // lee la preferencia real de localStorage. Sin effect que dispare re-render.
  const [autoHelp, setAutoHelp] = useState(() => isAutoHelpEnabled());

  // Elegir el tour de la página actual.
  const current = ROUTE_TOURS.find((r) => r.match(pathname ?? ""));

  // Registrar el tour de la página actual sin auto-lanzarlo (enabled=false):
  // el auto-inicio ya lo maneja cada página; aquí solo queremos startTour manual.
  const { startTour } = useTour(
    current?.config ?? dashboardTourConfig,
    false,
    user?.id
  );

  const handleToggleAuto = (checked: boolean) => {
    setAutoHelp(checked);
    setAutoHelpEnabled(checked);
  };

  const handleStartTour = () => {
    setOpen(false);
    // Pequeño respiro para que el modal cierre antes de arrancar el overlay del tour.
    setTimeout(() => startTour(), 200);
  };

  return (
    <>
      {/* Ícono de ayuda en el header, junto a la campana. Mismo tamaño y estilo
          que el botón de notificaciones (Button ghost icon). */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="Ayuda"
        className="relative"
      >
        <HelpCircle className="h-5 w-5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md border-t-4 border-brand">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl text-brand">
              <HelpCircle className="h-5 w-5" />
              Ayuda
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Aprende a usar cada sección con una guía paso a paso.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Ver ayuda de la página actual */}
            <button
              type="button"
              onClick={handleStartTour}
              className="flex w-full items-center gap-3 rounded-xl border border-brand/30 bg-brand-light px-4 py-3 text-left transition-colors hover:bg-brand/10 cursor-pointer"
            >
              <PlayCircle className="h-6 w-6 shrink-0 text-brand" />
              <div>
                <p className="font-semibold text-gray-900">
                  Ver ayuda de esta página
                </p>
                <p className="text-sm text-gray-600">
                  Guía de: {current?.label ?? "esta sección"}
                </p>
              </div>
            </button>

            {/* Interruptor de ayudas automáticas */}
            <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
              <div className="pr-4">
                <p className="font-semibold text-gray-900">
                  Mostrar ayudas automáticamente
                </p>
                <p className="text-sm text-gray-600">
                  Las guías aparecen solas la primera vez que entras a una
                  sección. Apágalo si ya no las necesitas.
                </p>
              </div>
              <Switch
                checked={autoHelp}
                onCheckedChange={handleToggleAuto}
                aria-label="Activar o desactivar ayudas automáticas"
              />
            </div>

            {!autoHelp && (
              <p className="flex items-start gap-2 text-sm text-gray-500">
                <X className="mt-0.5 h-4 w-4 shrink-0" />
                Las ayudas automáticas están desactivadas. Puedes verlas cuando
                quieras con el botón de arriba.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
