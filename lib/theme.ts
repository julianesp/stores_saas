export const THEME_KEY = "posib-theme";
export const THEME_EVENT = "posib-theme-change";

// Oscuro de 18:00 a 06:59, claro de 07:00 a 17:59.
const NIGHT_START = 18;
const NIGHT_END = 7;

// La tienda pública es de cada comerciante y va siempre en claro.
const EXCLUDED_PATHS = /^\/(store|tienda)(\/|$)/;

export function isThemeEnabledForPath(pathname: string | null | undefined): boolean {
  return !EXCLUDED_PATHS.test(pathname ?? "");
}

function isNightHour(hour: number): boolean {
  return hour >= NIGHT_START || hour < NIGHT_END;
}

// Identifica la franja actual (día o noche de una fecha concreta). La noche que
// pasa de la medianoche cuenta como la del día en que empezó.
function periodKey(date: Date): string {
  const hour = date.getHours();
  const ref = new Date(date);
  if (hour < NIGHT_END) ref.setDate(ref.getDate() - 1);
  return `${ref.getFullYear()}-${ref.getMonth() + 1}-${ref.getDate()}${isNightHour(hour) ? "n" : "d"}`;
}

// La elección manual solo vale hasta el siguiente cambio automático (7am/6pm);
// pasado eso vuelve a mandar la hora. Así una elección vieja no deja el POS
// oscuro por la mañana.
export function resolveDark(now: Date = new Date()): boolean {
  let dark = isNightHour(now.getHours());
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (raw) {
      const stored = JSON.parse(raw) as { theme?: string; period?: string };
      if (stored.period === periodKey(now) && (stored.theme === "dark" || stored.theme === "light")) {
        dark = stored.theme === "dark";
      }
    }
  } catch {
    // localStorage no disponible o valor corrupto: manda la hora.
  }
  return dark;
}

export function applyTheme(dark: boolean, pathname?: string | null): void {
  const root = document.documentElement;
  if (isThemeEnabledForPath(pathname ?? window.location.pathname)) {
    root.setAttribute("data-theme", dark ? "dark" : "light");
  } else {
    root.removeAttribute("data-theme");
  }
}

export function setManualTheme(dark: boolean): void {
  try {
    localStorage.setItem(
      THEME_KEY,
      JSON.stringify({ theme: dark ? "dark" : "light", period: periodKey(new Date()) })
    );
  } catch {
    // Sin localStorage el cambio vale solo hasta recargar.
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function subscribeTheme(onChange: () => void): () => void {
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", onChange);
  // Revisar cada minuto por si se cruza 7am/6pm con la página abierta.
  const interval = setInterval(onChange, 60_000);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onChange);
    clearInterval(interval);
  };
}

// Se ejecuta en <head> antes del primer render para no parpadear en claro.
// Debe mantener la misma lógica que resolveDark/periodKey/isThemeEnabledForPath.
export const THEME_INIT_SCRIPT = `(function(){try{
if(/^\\/(store|tienda)(\\/|$)/.test(location.pathname))return;
var d=new Date(),h=d.getHours(),n=h>=${NIGHT_START}||h<${NIGHT_END};
var x=new Date(d);if(h<${NIGHT_END})x.setDate(x.getDate()-1);
var p=x.getFullYear()+"-"+(x.getMonth()+1)+"-"+x.getDate()+(n?"n":"d");
var s=JSON.parse(localStorage.getItem("${THEME_KEY}")||"null");
if(s&&s.period===p&&(s.theme==="dark"||s.theme==="light"))n=s.theme==="dark";
document.documentElement.setAttribute("data-theme",n?"dark":"light");
}catch(e){}})();`;
