/**
 * Color del sistema elegido por cada tendero.
 *
 * Es la única fuente de la paleta. Cada acento define su versión para el tema
 * claro y para el oscuro; se aplican como variables CSS (--accent-*) en <html>
 * y globals.css las convierte en --brand/--primary/--ring según el tema activo.
 * Todo el sistema usa esas variables (bg-brand, text-brand, ring-brand…), así
 * que el color cambia en todas las pantallas y en ambos temas.
 *
 * La tienda pública (/store) no lleva data-theme y conserva siempre el color
 * propio de cada tienda (store_primary_color): el acento no la afecta.
 */

export interface AccentTone {
  brand: string; // fondo de botones, pestañas activas (texto blanco encima)
  hover: string;
  light: string; // tinte suave para fondos de realce
}

export interface Accent {
  id: string;
  name: string;
  light: AccentTone;
  dark: AccentTone & { text: string }; // text: color de marca legible sobre fondo oscuro
}

export const DEFAULT_ACCENT = 'teal';

export const ACCENTS: Accent[] = [
  {
    id: 'teal',
    name: 'Teal posib',
    light: { brand: '#007c80', hover: '#006467', light: '#e6f4f4' },
    dark: { brand: '#007c80', hover: '#00696d', light: 'rgba(0, 124, 128, 0.22)', text: '#3cc4c9' },
  },
  {
    id: 'bosque',
    name: 'Bosque',
    light: { brand: '#2f7d32', hover: '#256428', light: '#e8f3e8' },
    dark: { brand: '#33803a', hover: '#2a6b30', light: 'rgba(51, 128, 58, 0.24)', text: '#7fd283' },
  },
  {
    id: 'mar',
    name: 'Mar',
    light: { brand: '#1f5fbf', hover: '#194c99', light: '#e8effa' },
    dark: { brand: '#2a67c6', hover: '#2357a8', light: 'rgba(42, 103, 198, 0.26)', text: '#8db4f3' },
  },
  {
    id: 'anil',
    name: 'Añil',
    light: { brand: '#4f46c8', hover: '#3f38a3', light: '#eeedfb' },
    dark: { brand: '#5a52cf', hover: '#4b44b3', light: 'rgba(90, 82, 207, 0.28)', text: '#aeaaf6' },
  },
  {
    id: 'ciruela',
    name: 'Ciruela',
    light: { brand: '#8a3b8f', hover: '#6f2f73', light: '#f5eaf5' },
    dark: { brand: '#93429a', hover: '#7c3782', light: 'rgba(147, 66, 154, 0.28)', text: '#dc9fe0' },
  },
  {
    id: 'ladrillo',
    name: 'Ladrillo',
    light: { brand: '#b4472b', hover: '#933a23', light: '#f9ece8' },
    dark: { brand: '#b84d31', hover: '#9c4029', light: 'rgba(184, 77, 49, 0.26)', text: '#f0997f' },
  },
  {
    id: 'ocre',
    name: 'Ocre',
    light: { brand: '#9a5800', hover: '#7d4800', light: '#f8efe2' },
    dark: { brand: '#a35f06', hover: '#8a5005', light: 'rgba(163, 95, 6, 0.28)', text: '#ecb15c' },
  },
  {
    id: 'grafito',
    name: 'Grafito',
    light: { brand: '#3d3a35', hover: '#2a2824', light: '#eeece8' },
    dark: { brand: '#6b665e', hover: '#5b564f', light: 'rgba(214, 209, 199, 0.12)', text: '#d6d1c7' },
  },
];

export const ACCENT_KEY = 'posib-accent';
export const ACCENT_EVENT = 'posib-accent-change';

export function findAccent(id: string | null | undefined): Accent {
  return ACCENTS.find((a) => a.id === id) ?? ACCENTS[0];
}

/** Variables CSS de un acento (las mismas que escribe ACCENT_INIT_SCRIPT). */
export function accentVariables(accent: Accent): Record<string, string> {
  return {
    '--accent-brand': accent.light.brand,
    '--accent-brand-hover': accent.light.hover,
    '--accent-brand-light': accent.light.light,
    '--accent-dark-brand': accent.dark.brand,
    '--accent-dark-brand-hover': accent.dark.hover,
    '--accent-dark-brand-light': accent.dark.light,
    '--accent-dark-text': accent.dark.text,
  };
}

export function applyAccent(id: string | null | undefined): void {
  const accent = findAccent(id);
  const root = document.documentElement;
  for (const [name, value] of Object.entries(accentVariables(accent))) {
    root.style.setProperty(name, value);
  }
  root.setAttribute('data-accent', accent.id);
}

export function readStoredAccent(): string {
  try {
    return localStorage.getItem(ACCENT_KEY) || DEFAULT_ACCENT;
  } catch {
    return DEFAULT_ACCENT;
  }
}

/** Guarda el acento en este navegador, lo aplica y avisa a los componentes abiertos. */
export function setAccent(id: string): void {
  const accent = findAccent(id);
  try {
    localStorage.setItem(ACCENT_KEY, accent.id);
  } catch {
    // Sin localStorage el color vale hasta recargar.
  }
  applyAccent(accent.id);
  window.dispatchEvent(new Event(ACCENT_EVENT));
}

export function subscribeAccent(onChange: () => void): () => void {
  window.addEventListener(ACCENT_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(ACCENT_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

// Se ejecuta en <head> antes del primer render para no parpadear con el teal.
export const ACCENT_INIT_SCRIPT = `(function(){try{
var A=${JSON.stringify(Object.fromEntries(ACCENTS.map((a) => [a.id, accentVariables(a)])))};
var id=localStorage.getItem("${ACCENT_KEY}");var v=A[id];if(!v)return;
var r=document.documentElement;for(var k in v)r.style.setProperty(k,v[k]);
r.setAttribute("data-accent",id);
}catch(e){}})();`;
