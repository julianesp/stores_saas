"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

export interface GlossaryItem {
  term: ReactNode;
  meaning: ReactNode;
}

interface PageGlossaryProps {
  /** Identificador de la página, para recordar si el tendero cerró la explicación */
  storageKey: string;
  items: GlossaryItem[];
  title?: string;
}

/**
 * Explicación en palabras sencillas de los números y términos de una página,
 * pensada para que el tendero entienda qué significa cada dato.
 * Se puede cerrar; el navegador recuerda si quedó cerrada.
 */
export function PageGlossary({
  storageKey,
  items,
  title = "¿Qué significa cada cosa?",
}: PageGlossaryProps) {
  const [open, setOpen] = useState(true);
  const key = `glossary_closed_${storageKey}`;

  useEffect(() => {
    try {
      // Solo se puede leer localStorage después de montar (SSR)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (localStorage.getItem(key) === "1") setOpen(false);
    } catch {
      // Sin acceso a localStorage: queda abierta
    }
  }, [key]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    try {
      if (next) localStorage.removeItem(key);
      else localStorage.setItem(key, "1");
    } catch {
      // Sin acceso a localStorage: solo cambia en esta visita
    }
  };

  return (
    <section className="rounded-lg border border-dashed border-gray-300 bg-gray-50">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <HelpCircle className="h-4 w-4 text-brand" />
          {title}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <dl className="grid gap-x-8 gap-y-3 px-4 pb-4 sm:grid-cols-2">
          {items.map((item, i) => (
            <div key={i}>
              <dt className="text-sm font-medium text-gray-800">{item.term}</dt>
              <dd className="mt-0.5 text-sm text-gray-600">{item.meaning}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
