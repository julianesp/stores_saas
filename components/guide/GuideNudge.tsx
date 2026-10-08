"use client";

import { useState } from "react";
import type { Guide } from "@/lib/guide/guides";
import { usePresence } from "./use-presence";
import s from "./guide.module.css";

/**
 * Aviso pequeño en la esquina la primera vez que se entra a una sección.
 * No tapa nada importante ni roba el foco: el tendero puede seguir trabajando.
 */
export function GuideNudge({
  guide,
  onOpen,
  onDismiss,
}: {
  guide: Guide | undefined;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  // Conserva la última guía mientras se anima la salida.
  const [shown, setShown] = useState(guide);
  if (guide && guide !== shown) setShown(guide);

  const { mounted, state } = usePresence(!!guide);
  if (!mounted || !shown) return null;
  const Icon = shown.icon;

  return (
    <aside
      aria-label={`Guía de ${shown.title}`}
      data-state={state}
      className={`${s.float} fixed inset-x-4 bottom-24 z-[60] rounded-2xl border border-gray-200 bg-white p-4 shadow-xl shadow-gray-900/10 md:inset-x-auto md:right-6 md:w-[340px]`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">{shown.title}</p>
          <p className="mt-0.5 text-sm leading-snug text-gray-600">
            ¿Primera vez aquí? Te mostramos cómo funciona en menos de un minuto.
          </p>
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onDismiss}
          className={`${s.press} h-9 cursor-pointer rounded-lg px-3 text-sm font-medium text-gray-600 hover:bg-gray-100`}
        >
          Ahora no
        </button>
        <button
          type="button"
          onClick={onOpen}
          className={`${s.press} h-9 cursor-pointer rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover`}
        >
          Ver guía
        </button>
      </div>
    </aside>
  );
}
