"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Crosshair,
  LayoutGrid,
  Lightbulb,
  Pause,
  Play,
  X,
} from "lucide-react";
import type { Guide } from "@/lib/guide/guides";
import { SCENES, type Scene } from "@/components/landing/process-showcase/scenes";
import { Phone } from "@/components/landing/process-showcase/ui";
import { usePrefersReducedMotion } from "@/components/landing/process-showcase/use-prefers-reduced-motion";
import { usePresence } from "./use-presence";
import s from "./guide.module.css";

export type GuideTab = "demo" | "steps";

// Mismo ritmo que las demos del home.
const STEP_MS = 2800;
const HOLD_MS = 3600;

/* ───────────── Demo animada ("Mira cómo") ───────────── */

function DemoPlayer({ scene, active }: { scene: Scene; active: boolean }) {
  const reduced = usePrefersReducedMotion();
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const last = scene.steps.length - 1;
  const playing = active && !paused && !reduced;

  useEffect(() => {
    if (!playing) return;
    const id = window.setTimeout(
      () => setStep((n) => (n < last ? n + 1 : 0)),
      step === last ? HOLD_MS : STEP_MS,
    );
    return () => window.clearTimeout(id);
  }, [playing, step, last]);

  const current = scene.steps[step];

  return (
    <div className="flex gap-4">
      {/* Celular del home a escala. keep-light: es una pantalla, no se oscurece. */}
      <div className="keep-light relative h-[270px] w-[135px] shrink-0 sm:h-[310px] sm:w-[155px]">
        <div className="absolute left-0 top-0 w-[270px] origin-top-left scale-50 sm:scale-[0.574]">
          <Phone>
            <scene.Screen step={step} />
          </Phone>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <p className="text-xs font-medium text-gray-500">
          Paso {step + 1} de {scene.steps.length}
        </p>
        <div key={step} className={`${s.caption} mt-1`} aria-live="polite">
          <p className="text-sm font-semibold text-gray-900">{current.title}</p>
          <p className="mt-1 text-sm leading-snug text-gray-600">{current.text}</p>
        </div>

        <div className="mt-auto flex items-center gap-1.5 pt-3">
          {scene.steps.map((item, i) => (
            <button
              key={item.title}
              type="button"
              onClick={() => {
                setStep(i);
                setPaused(true);
              }}
              aria-label={`Ver paso ${i + 1}: ${item.title}`}
              aria-current={i === step ? "step" : undefined}
              className="flex h-6 cursor-pointer items-center px-0.5"
            >
              <span
                className={`block h-1.5 rounded-full transition-[width,background-color] duration-200 ${
                  i === step ? "w-5 bg-brand" : "w-1.5 bg-gray-300"
                }`}
              />
            </button>
          ))}
          {!reduced && (
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? "Reproducir demostración" : "Pausar demostración"}
              className={`${s.press} ml-auto flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-100`}
            >
              {paused ? (
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Pause className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────── Pasos ("Hazlo tú") ───────────── */

function StepList({
  guide,
  step,
  onStepChange,
  onRoute,
  onShowTarget,
}: {
  guide: Guide;
  step: number;
  onStepChange: (i: number) => void;
  onRoute: boolean;
  onShowTarget: (target: string, missing?: string) => void;
}) {
  return (
    <ol className="space-y-1">
      {guide.steps.map((item, i) => {
        const open = i === step;
        return (
          <li key={item.title}>
            <button
              type="button"
              onClick={() => onStepChange(i)}
              aria-expanded={open}
              className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-left ${
                open ? "" : "hover:bg-gray-50"
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors duration-200 ${
                  open ? "bg-brand text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                {i + 1}
              </span>
              <span
                className={`text-sm ${
                  open ? "font-semibold text-gray-900" : "font-medium text-gray-700"
                }`}
              >
                {item.title}
              </span>
            </button>
            <div className={s.collapse} data-open={open}>
              <div>
                <div className="pb-2 pl-11 pr-2">
                  <p className="text-sm leading-snug text-gray-600">{item.text}</p>
                  {item.target && onRoute && (
                    <button
                      type="button"
                      onClick={() => onShowTarget(item.target!, item.missing)}
                      tabIndex={open ? 0 : -1}
                      className={`${s.press} mt-2 inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-brand/40 px-3 text-sm font-medium text-brand hover:bg-brand-light`}
                    >
                      <Crosshair className="h-3.5 w-3.5" aria-hidden="true" />
                      Mostrarme dónde
                    </button>
                  )}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ───────────── Panel ───────────── */

export function GuidePanel({
  guide,
  onRoute,
  tab,
  onTabChange,
  step,
  onStepChange,
  minimized,
  onRestore,
  onShowTarget,
  onGoToRoute,
  onClose,
  onOpenCenter,
}: {
  guide: Guide | undefined;
  onRoute: boolean;
  tab: GuideTab;
  onTabChange: (tab: GuideTab) => void;
  step: number;
  onStepChange: (i: number) => void;
  minimized: boolean;
  onRestore: () => void;
  onShowTarget: (target: string, missing?: string) => void;
  onGoToRoute: () => void;
  onClose: () => void;
  onOpenCenter: () => void;
}) {
  // Conserva la guía mientras se anima la salida.
  const [shown, setShown] = useState(guide);
  if (guide && guide !== shown) setShown(guide);

  const panel = usePresence(!!guide && !minimized, 180);
  const pill = usePresence(!!guide && minimized, 160);

  // Foco: al abrir va al panel (sin atraparlo); al cerrar vuelve a donde estaba.
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const isOpen = !!guide && !minimized;
  useEffect(() => {
    if (isOpen) {
      if (!returnFocus.current) {
        returnFocus.current = document.activeElement as HTMLElement | null;
      }
      panelRef.current?.focus({ preventScroll: true });
    } else if (!guide && returnFocus.current) {
      returnFocus.current.focus?.({ preventScroll: true });
      returnFocus.current = null;
    }
  }, [isOpen, guide, panel.mounted]);

  if (!shown) return null;
  const scene = shown.sceneId ? SCENES.find((x) => x.id === shown.sceneId) : undefined;
  const effectiveTab: GuideTab = scene ? tab : "steps";
  const Icon = shown.icon;

  return (
    <>
      {panel.mounted && (
        <section
          id="guide-panel"
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="false"
          aria-labelledby="guide-panel-title"
          data-state={panel.state}
          className={`${s.float} fixed inset-x-2 bottom-2 z-[60] flex max-h-[80dvh] flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-gray-900/15 outline-none md:inset-x-auto md:bottom-4 md:right-4 md:max-h-[min(680px,calc(100dvh-6rem))] md:w-[420px]`}
        >
          {/* Encabezado */}
          <div className="flex items-start gap-3 border-b border-gray-100 p-4 pb-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 id="guide-panel-title" className="text-base font-semibold text-gray-900">
                {shown.title}
              </h2>
              <p className="text-sm leading-snug text-gray-600">{shown.summary}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar guía"
              className={`${s.press} -mr-1 -mt-1 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100`}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Selector Mira cómo / Hazlo tú */}
          {scene && (
            <div className="px-4 pt-3">
              <div
                role="tablist"
                aria-label="Modo de la guía"
                data-value={effectiveTab}
                className={`${s.segment} rounded-xl bg-gray-100 p-[3px]`}
              >
                <span className={`${s.segmentThumb} bg-white shadow-sm`} aria-hidden="true" />
                {(
                  [
                    ["demo", "Mira cómo"],
                    ["steps", "Hazlo tú"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={effectiveTab === value}
                    onClick={() => onTabChange(value)}
                    className={`relative h-8 cursor-pointer rounded-[9px] text-sm font-medium transition-colors duration-150 ${
                      effectiveTab === value ? "text-gray-900" : "text-gray-500"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Contenido */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
            {effectiveTab === "demo" && scene ? (
              <div key="demo" className={s.pane}>
                <DemoPlayer scene={scene} active={panel.state === "open"} />
              </div>
            ) : (
              <div key="steps" className={s.pane}>
                {!onRoute && (
                  <button
                    type="button"
                    onClick={onGoToRoute}
                    className={`${s.press} mb-3 flex w-full cursor-pointer items-center justify-between rounded-xl border border-brand/40 bg-brand-light px-3 py-2.5 text-left text-sm font-medium text-brand`}
                  >
                    Ir a {shown.title} para seguir los pasos
                    <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                  </button>
                )}
                <StepList
                  guide={shown}
                  step={step}
                  onStepChange={onStepChange}
                  onRoute={onRoute}
                  onShowTarget={onShowTarget}
                />
                {shown.tip && (
                  <p className="mt-3 flex gap-2 rounded-xl bg-amber-50 p-3 text-sm leading-snug text-amber-900">
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                    {shown.tip}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Pie */}
          <div className="flex items-center justify-between gap-2 border-t border-gray-100 px-4 py-3">
            <button
              type="button"
              onClick={onOpenCenter}
              className={`${s.press} inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-gray-600 hover:bg-gray-100`}
            >
              <LayoutGrid className="h-4 w-4" aria-hidden="true" />
              Todas las guías
            </button>
            {effectiveTab === "demo" ? (
              <button
                type="button"
                onClick={() => onTabChange("steps")}
                className={`${s.press} inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover`}
              >
                Hazlo tú
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className={`${s.press} h-9 cursor-pointer rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover`}
              >
                Entendido
              </button>
            )}
          </div>
        </section>
      )}

      {/* Panel encogido mientras se señala algo en la pantalla */}
      {pill.mounted && (
        <div
          data-state={pill.state}
          className={`${s.float} fixed bottom-24 right-4 z-[60] md:right-6`}
        >
          <button
            type="button"
            onClick={onRestore}
            className={`${s.press} flex h-11 cursor-pointer items-center gap-2 rounded-full border border-gray-200 bg-white pl-2 pr-4 text-sm font-medium text-gray-800 shadow-lg shadow-gray-900/10`}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-light text-brand">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            Volver a la guía
            <span className="text-gray-500">
              {step + 1}/{shown.steps.length}
            </span>
          </button>
        </div>
      )}
    </>
  );
}
