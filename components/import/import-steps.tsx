"use client";

import { Check, CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGuide } from "@/components/guide/GuideProvider";

/**
 * Los pasos de una importación en una fila, marcando en cuál va el tendero.
 * "Ver guía" abre la guía de esta pantalla (lib/guide/guides.ts).
 */
export function ImportSteps({
  steps,
  current,
  guideId,
}: {
  steps: string[];
  /** Índice del paso actual; steps.length = todo terminado. */
  current: number;
  guideId: string;
}) {
  const { openGuide } = useGuide();

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3 sm:flex-row sm:items-center">
      <ol className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-2">
        {steps.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={label} className="flex items-center gap-2">
              {i > 0 && <span className="hidden h-px w-4 bg-border sm:block" aria-hidden="true" />}
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  done
                    ? "bg-brand-light text-brand"
                    : active
                      ? "bg-brand text-white"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
              </span>
              <span
                aria-current={active ? "step" : undefined}
                className={`text-sm ${active ? "font-semibold" : "text-muted-foreground"}`}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
      <Button variant="outline" size="sm" onClick={() => openGuide(guideId)} className="shrink-0">
        <CircleHelp className="mr-1.5 h-4 w-4" />
        Ver guía
      </Button>
    </div>
  );
}
