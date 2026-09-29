"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CheckCircle2, Package } from "lucide-react";
import s from "./ProcessShowcase.module.css";
import { usePrefersReducedMotion } from "./use-prefers-reduced-motion";

/** Celular decorativo: la información real va en la lista de pasos (el celular es aria-hidden). */
export function Phone({ children }: { children: ReactNode }) {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto h-[540px] w-[270px] select-none rounded-[2.4rem] bg-slate-900 p-2.5 shadow-2xl shadow-black/30 ring-1 ring-white/10"
    >
      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[1.9rem] bg-slate-50 text-slate-800">
        <div className="absolute left-1/2 top-1.5 z-30 h-4 w-16 -translate-x-1/2 rounded-full bg-slate-900" />
        {children}
      </div>
    </div>
  );
}

/** Pantalla apilada: entra/sale con fundido y leve desplazamiento. */
export function Layer({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`absolute inset-0 flex flex-col transition-all duration-500 motion-reduce:transition-none ${
        active
          ? "translate-x-0 opacity-100"
          : "pointer-events-none translate-x-5 opacity-0"
      }`}
    >
      {children}
    </div>
  );
}

export function AppBar({
  title,
  className = "bg-brand",
}: {
  title: string;
  className?: string;
}) {
  return (
    <div
      className={`px-4 pb-3 pt-8 text-[13px] font-semibold text-white ${className}`}
    >
      {title}
    </div>
  );
}

/** Anillo de "toque" que se dibuja centrado sobre el elemento `relative` que lo contiene. */
export function Tap({ show, delay = 500 }: { show: boolean; delay?: number }) {
  if (!show) return null;
  return <span className={s.tap} style={{ animationDelay: `${delay}ms` }} />;
}

export function Pop({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <div
      className={`${s.pop} ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export function Btn({
  children,
  tap = false,
  tapDelay,
  outline = false,
  className = "",
}: {
  children: ReactNode;
  tap?: boolean;
  tapDelay?: number;
  outline?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`relative flex h-9 items-center justify-center gap-1.5 rounded-lg text-[12px] font-semibold ${
        outline
          ? "border border-slate-300 bg-white text-slate-700"
          : "bg-brand text-white"
      } ${className}`}
    >
      {children}
      <Tap show={tap} delay={tapDelay} />
    </div>
  );
}

export function Field({
  label,
  active = false,
  children,
}: {
  label: string;
  active?: boolean;
  children?: ReactNode;
}) {
  return (
    <div>
      <div className="mb-0.5 text-[10px] font-medium text-slate-500">
        {label}
      </div>
      <div
        className={`flex h-8 items-center rounded-md border bg-white px-2 text-[12px] text-slate-800 transition-colors ${
          active
            ? "border-brand ring-2 ring-brand/25"
            : "border-slate-300"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Escribe el texto letra por letra. Se monta solo cuando le toca su paso (así
 * al reiniciar la demo vuelve a escribirse). Con `instant` (paso ya superado) o
 * con movimiento reducido aparece completo.
 */
export function Typed({
  text,
  delayMs = 0,
  instant = false,
}: {
  text: string;
  delayMs?: number;
  instant?: boolean;
}) {
  const reduced = usePrefersReducedMotion();
  const [n, setN] = useState(instant || reduced ? text.length : 0);

  useEffect(() => {
    if (n >= text.length) return;
    const id = window.setTimeout(
      () => setN(n + 1),
      n === 0 ? 350 + delayMs : 60,
    );
    return () => window.clearTimeout(id);
  }, [n, text, delayMs]);

  return (
    <span>
      {text.slice(0, n)}
      {n < text.length && <span className={s.caret} />}
    </span>
  );
}

export function Toast({
  show,
  delay = 0,
  children,
}: {
  show: boolean;
  delay?: number;
  children: ReactNode;
}) {
  if (!show) return null;
  return (
    <div
      className={`${s.rise} absolute inset-x-3 bottom-2 z-20 flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5 text-[12px] font-medium text-slate-50 shadow-lg`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
      {children}
    </div>
  );
}

const BADGE_TONES = {
  green: "bg-emerald-100 text-emerald-700",
  red: "bg-red-100 text-red-700",
  amber: "bg-amber-100 text-amber-800",
  slate: "bg-slate-100 text-slate-600",
  brand: "bg-brand/10 text-brand",
} as const;

export function Badge({
  tone = "slate",
  children,
}: {
  tone?: keyof typeof BADGE_TONES;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium ${BADGE_TONES[tone]}`}
    >
      {children}
    </span>
  );
}

/** Fila de producto de las listas de la demo. */
export function ProductRow({
  name,
  sub,
  right,
  highlight,
  fresh = false,
  delay = 0,
}: {
  name: string;
  sub: ReactNode;
  right?: ReactNode;
  highlight?: "brand" | "red" | "amber";
  fresh?: boolean;
  delay?: number;
}) {
  const ring =
    highlight === "red"
      ? "border-red-300 ring-2 ring-red-200"
      : highlight === "amber"
        ? "border-amber-300 ring-2 ring-amber-200"
        : highlight === "brand"
          ? "border-brand/50 ring-2 ring-brand/20"
          : "border-slate-200";
  return (
    <div
      className={`${fresh ? s.pop : ""} flex items-center gap-2 rounded-lg border bg-white p-2 transition-all duration-500 ${ring}`}
      style={fresh ? { animationDelay: `${delay}ms` } : undefined}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100">
        <Package className="h-4 w-4 text-slate-400" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12px] font-medium text-slate-800">
          {name}
        </div>
        <div className="text-[11px] text-slate-500">{sub}</div>
      </div>
      {right}
    </div>
  );
}
