"use client";

import { useEffect, useRef } from "react";
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  LinearScale,
  Tooltip,
} from "chart.js";
import { useIsDark } from "@/lib/use-is-dark";
import { formatCurrency } from "@/lib/utils";

// Solo lo que usan estas barras: Chart.js se queda pequeño en el bundle.
Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

export interface ChartPoint {
  label: string;
  value: number;
}

/** Colores por tema: la barra es la marca; texto y rejilla quedan discretos. */
const THEME = {
  light: { bar: "#007c80", hover: "#006467", text: "#4b5563", grid: "#e5e7eb" },
  dark: { bar: "#2fb3b8", hover: "#5cc8cc", text: "#9ca3af", grid: "rgba(255,255,255,0.08)" },
};

const compact = new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 });

/**
 * Gráfica de barras de una sola serie para previsualizar lo que se va a
 * importar (no necesita leyenda: el título la nombra). Incluye una tabla
 * oculta con los mismos datos para lectores de pantalla.
 */
export function ImportBarChart({
  title,
  description,
  data,
  money = false,
  horizontal = false,
}: {
  title: string;
  description?: string;
  data: ChartPoint[];
  /** true: valores en pesos; false: cantidades. */
  money?: boolean;
  horizontal?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDark = useIsDark();
  const fmt = (v: number) => (money ? formatCurrency(v) : v.toLocaleString("es-CO"));
  const fmtAxis = (v: number) => (money ? `$${compact.format(v)}` : compact.format(v));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;
    const c = isDark ? THEME.dark : THEME.light;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const valueAxis = {
      beginAtZero: true,
      grid: { color: c.grid },
      border: { display: false },
      ticks: { color: c.text, maxTicksLimit: 5, callback: (v: string | number) => fmtAxis(Number(v)) },
    };
    const labelAxis = {
      grid: { display: false },
      border: { color: c.grid },
      ticks: { color: c.text, autoSkip: !horizontal },
    };

    const chart = new Chart(canvas, {
      type: "bar",
      data: {
        labels: data.map((d) => d.label),
        datasets: [
          {
            data: data.map((d) => d.value),
            backgroundColor: c.bar,
            hoverBackgroundColor: c.hover,
            borderRadius: 4,
            borderSkipped: "start",
            maxBarThickness: 36,
          },
        ],
      },
      options: {
        indexAxis: horizontal ? "y" : "x",
        responsive: true,
        maintainAspectRatio: false,
        animation: reduced ? false : { duration: 400 },
        interaction: { mode: "index", intersect: false },
        scales: horizontal ? { x: valueAxis, y: labelAxis } : { x: labelAxis, y: valueAxis },
        plugins: {
          legend: { display: false },
          tooltip: {
            displayColors: false,
            callbacks: { label: (ctx) => fmt(Number(ctx.raw)) },
          },
        },
      },
    });
    return () => chart.destroy();
    // fmt/fmtAxis dependen solo de `money`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, isDark, horizontal, money]);

  if (data.length === 0) return null;
  // Las horizontales crecen con las filas para que cada etiqueta se lea.
  const height = horizontal ? Math.max(160, data.length * 34 + 40) : 220;

  return (
    <figure className="min-w-0">
      <figcaption className="mb-2">
        <span className="block text-sm font-medium">{title}</span>
        {description && (
          <span className="block text-xs text-muted-foreground">{description}</span>
        )}
      </figcaption>
      <div className="relative w-full" style={{ height }}>
        <canvas ref={canvasRef} role="img" aria-label={title} />
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th scope="row">{d.label}</th>
              <td>{fmt(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Junta lo que pasa de `max` filas en "Otras" para no repintar con 40 barras. */
export function topWithOthers(points: ChartPoint[], max: number, othersLabel = "Otras"): ChartPoint[] {
  const sorted = [...points].sort((a, b) => b.value - a.value);
  if (sorted.length <= max) return sorted;
  const rest = sorted.slice(max - 1).reduce((sum, p) => sum + p.value, 0);
  return [...sorted.slice(0, max - 1), { label: othersLabel, value: rest }];
}
