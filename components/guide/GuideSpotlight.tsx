"use client";

import { useEffect, useRef } from "react";
import { usePresence } from "./use-presence";
import s from "./guide.module.css";

const PAD = 6;
const VISIBLE_MS = 6000;

/** Primer elemento visible con `data-guide="target"` (hay vistas móvil/escritorio duplicadas). */
export function findGuideTarget(target: string): HTMLElement | null {
  const els = document.querySelectorAll<HTMLElement>(
    `[data-guide="${CSS.escape(target)}"]`,
  );
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

/**
 * Señala un elemento real de la pantalla con un anillo de marca. Sin fondo
 * oscuro y sin bloquear clics: el tendero puede tocar el botón señalado de una
 * vez. Se va solo a los pocos segundos, al tocar cualquier parte o con Escape.
 */
export function GuideSpotlight({
  target,
  onDone,
}: {
  target: string | null;
  onDone: () => void;
}) {
  const ringRef = useRef<HTMLDivElement>(null);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  const { mounted, state } = usePresence(!!target, 150);

  useEffect(() => {
    if (!target) return;
    const el = findGuideTarget(target);
    if (!el) {
      onDoneRef.current();
      return;
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });

    // Sigue al elemento mientras la página se desplaza (el scroll vive en
    // <main>, no en window). Escribe directo en el estilo: sin re-render.
    const place = () => {
      const ring = ringRef.current;
      if (!ring) return;
      const r = el.getBoundingClientRect();
      ring.style.transform = `translate(${r.left - PAD}px, ${r.top - PAD}px)`;
      ring.style.width = `${r.width + PAD * 2}px`;
      ring.style.height = `${r.height + PAD * 2}px`;
    };
    let raf = 0;
    const follow = () => {
      place();
      raf = requestAnimationFrame(follow);
    };
    place();
    raf = requestAnimationFrame(follow);

    const done = () => onDoneRef.current();
    const timer = window.setTimeout(done, VISIBLE_MS);
    // Se registra en el siguiente tick para que el clic de "Mostrarme" no lo cierre.
    const arm = window.setTimeout(
      () => window.addEventListener("pointerdown", done, true),
      0,
    );

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      window.clearTimeout(arm);
      window.removeEventListener("pointerdown", done, true);
    };
  }, [target]);

  if (!mounted) return null;

  return (
    <div
      ref={ringRef}
      aria-hidden="true"
      data-state={state}
      className={`${s.spot} z-[55]`}
    />
  );
}
