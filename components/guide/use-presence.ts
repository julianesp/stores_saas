"use client";

import { useEffect, useState } from "react";

/**
 * Monta el elemento al abrir y lo desmonta `exitMs` después de cerrar, para que
 * la salida alcance a animarse. `state` va a data-state: el CSS hace el resto
 * con transiciones (si se reabre a mitad de la salida, se devuelve sin saltos).
 */
export function usePresence(open: boolean, exitMs = 180) {
  const [mounted, setMounted] = useState(open);
  const [entered, setEntered] = useState(false);

  // Montar en el mismo render en que se abre (sin esperar un efecto).
  if (open && !mounted) setMounted(true);

  useEffect(() => {
    if (open) {
      // Dos frames: el primero pinta el estado cerrado, el segundo dispara la
      // transición hacia abierto.
      // Respaldo con setTimeout por si el navegador pausa los frames (pestaña
      // en segundo plano): así nunca queda montado pero invisible.
      let inner = 0;
      const enter = () => setEntered(true);
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(enter);
      });
      const fallback = window.setTimeout(enter, 60);
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
        window.clearTimeout(fallback);
      };
    }
    const t = window.setTimeout(() => {
      setMounted(false);
      setEntered(false);
    }, exitMs);
    return () => window.clearTimeout(t);
  }, [open, exitMs]);

  return { mounted, state: open && entered ? "open" : "closed" } as const;
}
