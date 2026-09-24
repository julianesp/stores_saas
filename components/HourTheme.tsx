"use client";

import { useEffect } from "react";

function getThemeForHour(hour: number): "dark" | "light" {
  // Oscuro de 19:00 a 06:59, claro de 07:00 a 18:59
  return hour >= 19 || hour < 7 ? "dark" : "light";
}

function applyTheme() {
  const hour = new Date().getHours();
  const theme = getThemeForHour(hour);
  document.documentElement.setAttribute("data-theme", theme);
}

export default function HourTheme() {
  useEffect(() => {
    applyTheme();
    // Revisar cada minuto por si cambia la hora mientras la página está abierta
    const interval = setInterval(applyTheme, 60_000);
    return () => clearInterval(interval);
  }, []);

  return null;
}
