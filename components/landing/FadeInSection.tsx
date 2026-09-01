"use client";

import { useEffect, useRef, useState } from "react";

interface FadeInSectionProps {
  children: React.ReactNode;
  /** Retraso opcional (ms) para escalonar secciones consecutivas. */
  delay?: number;
  className?: string;
}

/**
 * Envuelve una sección de la landing para que aparezca con un fade-in (opacidad
 * + leve subida) la primera vez que entra en el viewport al hacer scroll. Una
 * vez visible se queda; no se vuelve a ocultar al subir. Respeta
 * prefers-reduced-motion (solo opacidad) vía CSS en globals.css.
 */
export default function FadeInSection({
  children,
  delay = 0,
  className = "",
}: FadeInSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Navegador sin IntersectionObserver (muy raro): mostrar sin animación,
    // diferido con rAF para no llamar a setState síncronamente en el efecto.
    if (typeof IntersectionObserver === "undefined") {
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(true);
          observer.disconnect(); // una sola vez
        }
      },
      // threshold 0 + margen inferior negativo: se activa apenas la sección
      // asoma ~12% dentro del viewport, sin exigir un % de una sección que
      // puede ser más alta que la pantalla.
      { threshold: 0, rootMargin: "0px 0px -12% 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`fade-in-section ${visible ? "is-visible" : ""} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
