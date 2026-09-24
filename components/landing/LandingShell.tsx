"use client";

import { useState, useEffect, type ReactNode } from "react";

const THEME_KEY = "posib-landing-theme";

function isDarkHour(): boolean {
  const h = new Date().getHours();
  return h >= 19 || h < 7;
}

function readInitialTheme(): boolean {
  if (typeof window === "undefined") return isDarkHour();
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "dark") return true;
  if (stored === "light") return false;
  return isDarkHour();
}

const LIGHT_CSS = `
  .landing-root .lp-text         { color: #0f172a !important; }
  .landing-root .lp-muted        { color: rgba(15,23,42,0.58) !important; }
  .landing-root .lp-subtle       { color: rgba(15,23,42,0.38) !important; }
  .landing-root .lp-card         { background: rgba(15,23,42,0.04) !important; }
  .landing-root .lp-border       { border-color: rgba(15,23,42,0.10) !important; }
  .landing-root .lp-ghost-btn    { color: rgba(15,23,42,0.65) !important; border-color: rgba(15,23,42,0.18) !important; }
  .landing-root .lp-ghost-btn:hover { color: #0f172a !important; background: rgba(15,23,42,0.07) !important; }
  .landing-root .lp-badge        { background: rgba(15,23,42,0.06) !important; border-color: rgba(15,23,42,0.12) !important; color: rgba(15,23,42,0.6) !important; }
  .landing-root .lp-modal-bg     { background: #ffffff !important; color: #0f172a !important; }
  .landing-root .lp-section-sep  { border-color: rgba(15,23,42,0.07) !important; }
  .landing-root .lp-icon-bg      { background: rgba(15,23,42,0.07) !important; }
  .landing-root .lp-check-bg     { background: rgba(0,124,128,0.12) !important; }
`;

const DARK_CSS = `
  .landing-root .lp-text         { color: #ffffff !important; }
  .landing-root .lp-muted        { color: rgba(255,255,255,0.58) !important; }
  .landing-root .lp-subtle       { color: rgba(255,255,255,0.35) !important; }
  .landing-root .lp-card         { background: rgba(255,255,255,0.03) !important; }
  .landing-root .lp-border       { border-color: rgba(255,255,255,0.05) !important; }
  .landing-root .lp-ghost-btn    { color: rgba(255,255,255,0.70) !important; border-color: rgba(255,255,255,0.10) !important; }
  .landing-root .lp-ghost-btn:hover { color: #ffffff !important; background: rgba(255,255,255,0.08) !important; }
  .landing-root .lp-badge        { background: rgba(255,255,255,0.05) !important; border-color: rgba(255,255,255,0.10) !important; color: rgba(255,255,255,0.60) !important; }
  .landing-root .lp-modal-bg     { background: #161b22 !important; color: #ffffff !important; }
  .landing-root .lp-section-sep  { border-color: rgba(255,255,255,0.05) !important; }
  .landing-root .lp-icon-bg      { background: rgba(255,255,255,0.06) !important; }
  .landing-root .lp-check-bg     { background: rgba(0,124,128,0.20) !important; }
`;

export default function LandingShell({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setDark(readInitialTheme());
    setMounted(true);

    // Escuchar cambios manuales desde el navbar
    const onThemeChange = (e: Event) => {
      setDark((e as CustomEvent<boolean>).detail);
    };
    window.addEventListener("posib-theme-change", onThemeChange);

    // Revisar cada minuto por si cambia la hora (solo si no hay preferencia guardada)
    const id = setInterval(() => {
      const stored = localStorage.getItem(THEME_KEY);
      if (!stored) setDark(isDarkHour());
    }, 60_000);

    return () => {
      window.removeEventListener("posib-theme-change", onThemeChange);
      clearInterval(id);
    };
  }, []);

  return (
    <>
      {mounted && <style>{dark ? DARK_CSS : LIGHT_CSS}</style>}
      <div
        data-landing-theme={dark ? "dark" : "light"}
        className="min-h-screen landing-root"
        style={{
          background: mounted ? (dark ? "#0f1117" : "#f8fafb") : "#0f1117",
          transition: mounted ? "background 0.5s ease" : "none",
        }}
      >
        {children}
      </div>
    </>
  );
}
