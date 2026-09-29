// Genera app/dark-theme.css: remapea, en modo oscuro, las utilidades de color
// "claras" de Tailwind (bg-white, bg-gray-50, text-gray-600, bg-green-100, ...)
// a equivalentes oscuros. Así el dashboard y las demás páginas se adaptan sin
// añadir `dark:` a cada clase.
//
// Uso: node scripts/gen-dark-theme.mjs
//
// Reglas de diseño:
//  - Solo se voltean fondos claros (50-300), bordes claros y textos oscuros
//    (500-950 / black). Fondos saturados (600+) y text-white no se tocan.
//  - Se excluye lo que esté dentro de .keep-light (documentos tipo papel, p. ej.
//    el recibo) y de .landing-root (la landing tiene su propio sistema de tema).
//  - Todo va en @media screen: la impresión siempre sale en claro.
import { writeFileSync } from "node:fs";

const SURFACE = "#252932";
const NEUTRAL_BG = { 50: "#1c1f26", 100: "#2d323c", 200: "#383e4a", 300: "#454c5a" };
const NEUTRAL_HOVER_BG = { 50: "#2d323c", 100: "#333945", 200: "#3e4553", 300: "#4b5362" };
const NEUTRAL_BORDER = { 100: "#2e333d", 200: "#3b414d", 300: "#4a5261", 400: "#5c6575" };
const NEUTRAL_HOVER_BORDER = { 300: "#5c6575", 400: "#6d7789" };
const NEUTRAL_TEXT = { 500: "#a0abbb", 600: "#bcc5d1", 700: "#d3dae3", 800: "#e6edf3", 900: "#f0f3f7", 950: "#f0f3f7" };
const BRAND_TEXT = "#2fb8bd";

const NEUTRALS = ["gray", "slate"];

// Solo las familias que usa el proyecto (si empiezas a usar otra, agrégala aquí
// y vuelve a correr el script). rgb del tono 500 (tintes) y hex de 200/300/400 (textos).
const COLORS = {
  red: ["239 68 68", "#fecaca", "#fca5a5", "#f87171"],
  orange: ["249 115 22", "#fed7aa", "#fdba74", "#fb923c"],
  amber: ["245 158 11", "#fde68a", "#fcd34d", "#fbbf24"],
  yellow: ["234 179 8", "#fef08a", "#fde047", "#facc15"],
  green: ["34 197 94", "#bbf7d0", "#86efac", "#4ade80"],
  emerald: ["16 185 129", "#a7f3d0", "#6ee7b7", "#34d399"],
  sky: ["14 165 233", "#bae6fd", "#7dd3fc", "#38bdf8"],
  blue: ["59 130 246", "#bfdbfe", "#93c5fd", "#60a5fa"],
  indigo: ["99 102 241", "#c7d2fe", "#a5b4fc", "#818cf8"],
  purple: ["168 85 247", "#e9d5ff", "#d8b4fe", "#c084fc"],
  pink: ["236 72 153", "#fbcfe8", "#f9a8d4", "#f472b6"],
};

const OPACITIES = [30, 40, 50, 60];

const NOT = ":not(.keep-light, .keep-light *, .landing-root *)";
const PREFIX = 'html[data-theme="dark"]';

const esc = (s) => s.replace(/([:/[\]=])/g, "\\$1");

// variante -> [prefijo de clase, sufijo del selector]
const VARIANTS = {
  base: ["", ""],
  hover: ["hover:", ":hover"],
  groupHover: ["group-hover:", ":is(:where(.group):hover *)"],
  disabled: ["disabled:", ":disabled"],
  focus: ["focus:", ":focus"],
  focusVisible: ["focus-visible:", ":focus-visible"],
  placeholder: ["placeholder:", "::placeholder"],
  open: ["data-[state=open]:", '[data-state="open"]'],
};

function sel(variant, utility) {
  const [pre, suf] = VARIANTS[variant];
  return `${PREFIX} .${esc(pre + utility)}${NOT}${suf}`;
}

const rules = [];
function rule(selectors, declarations) {
  if (selectors.length) rules.push(`${selectors.join(",\n")} {\n  ${declarations}\n}`);
}

// ── Neutros ────────────────────────────────────────────────────────────────
rule([sel("base", "bg-white")], `background-color: ${SURFACE};`);
rule([sel("hover", "bg-white")], `background-color: ${NEUTRAL_BG[100]};`);
for (const op of [50, 80, 90, 95]) {
  rule([sel("base", `bg-white/${op}`)], `background-color: rgb(37 41 50 / ${op / 100});`);
}

for (const n of NEUTRALS) {
  for (const step of [50, 100, 200, 300]) {
    rule(
      [sel("base", `bg-${n}-${step}`), sel("disabled", `bg-${n}-${step}`), sel("open", `bg-${n}-${step}`)],
      `background-color: ${NEUTRAL_BG[step]};`
    );
    rule([sel("hover", `bg-${n}-${step}`)], `background-color: ${NEUTRAL_HOVER_BG[step]};`);
  }
  for (const step of [100, 200, 300, 400]) {
    rule([sel("base", `border-${n}-${step}`)], `border-color: ${NEUTRAL_BORDER[step]};`);
  }
  for (const step of [300, 400]) {
    rule([sel("hover", `border-${n}-${step}`)], `border-color: ${NEUTRAL_HOVER_BORDER[step]};`);
  }
  for (const step of [500, 600, 700, 800, 900, 950]) {
    rule(
      [
        sel("base", `text-${n}-${step}`),
        sel("disabled", `text-${n}-${step}`),
        sel("placeholder", `text-${n}-${step}`),
        sel("open", `text-${n}-${step}`),
      ],
      `color: ${NEUTRAL_TEXT[step]};`
    );
    rule(
      [sel("hover", `text-${n}-${step}`), sel("groupHover", `text-${n}-${step}`)],
      `color: ${NEUTRAL_TEXT[step]};`
    );
  }
  // Degradados claros (from-gray-50, to-gray-200, ...)
  for (const step of [50, 100, 200]) {
    for (const stop of ["from", "via", "to"]) {
      rule([sel("base", `${stop}-${n}-${step}`)], `--tw-gradient-${stop}: ${NEUTRAL_BG[step]};`);
    }
  }
}
for (const stop of ["from", "via", "to"]) {
  rule([sel("base", `${stop}-white`)], `--tw-gradient-${stop}: ${SURFACE};`);
}

rule(
  [sel("base", "text-black"), sel("hover", "text-black"), sel("groupHover", "text-black")],
  `color: ${NEUTRAL_TEXT[800]};`
);
rule(
  [sel("focus", "ring-gray-950"), sel("focusVisible", "ring-gray-950")],
  `--tw-ring-color: ${NEUTRAL_TEXT[500]};`
);

// ── Marca ──────────────────────────────────────────────────────────────────
rule(
  [sel("base", "text-brand"), sel("hover", "text-brand"), sel("groupHover", "text-brand"), sel("hover", "text-brand-hover")],
  `color: ${BRAND_TEXT};`
);

// ── Colores con matiz ──────────────────────────────────────────────────────
const BG_ALPHA = { 50: 0.1, 100: 0.16, 200: 0.24 };
const HOVER_BG_ALPHA = { 50: 0.14, 100: 0.2, 200: 0.28 };
const BORDER_ALPHA = { 100: 0.25, 200: 0.35, 300: 0.45, 400: 0.55 };

for (const [name, [rgb, c200, c300, c400]] of Object.entries(COLORS)) {
  for (const step of [50, 100, 200]) {
    rule([sel("base", `bg-${name}-${step}`)], `background-color: rgb(${rgb} / ${BG_ALPHA[step]});`);
    rule([sel("hover", `bg-${name}-${step}`)], `background-color: rgb(${rgb} / ${HOVER_BG_ALPHA[step]});`);
    if (step === 200) continue;
    for (const stop of ["from", "via", "to"]) {
      rule([sel("base", `${stop}-${name}-${step}`)], `--tw-gradient-${stop}: rgb(${rgb} / ${BG_ALPHA[step]});`);
    }
  }
  for (const op of OPACITIES) {
    rule(
      [sel("base", `bg-${name}-50/${op}`)],
      `background-color: rgb(${rgb} / ${(BG_ALPHA[50] * 0.6).toFixed(3)});`
    );
  }
  rule(
    [sel("base", `border-${name}-300/60`)],
    `border-color: rgb(${rgb} / ${(BORDER_ALPHA[300] * 0.8).toFixed(3)});`
  );
  for (const step of [100, 200, 300, 400]) {
    rule([sel("base", `border-${name}-${step}`)], `border-color: rgb(${rgb} / ${BORDER_ALPHA[step]});`);
  }
  for (const step of [300, 400]) {
    rule([sel("hover", `border-${name}-${step}`)], `border-color: rgb(${rgb} / ${BORDER_ALPHA[step] + 0.15});`);
  }
  const textMap = { 600: c400, 700: c300, 800: c200, 900: c200 };
  for (const [step, value] of Object.entries(textMap)) {
    rule(
      [sel("base", `text-${name}-${step}`), sel("hover", `text-${name}-${step}`), sel("groupHover", `text-${name}-${step}`)],
      `color: ${value};`
    );
  }
}

const css = `/* GENERADO por scripts/gen-dark-theme.mjs — no editar a mano.
   Modo oscuro (html[data-theme="dark"]): remapea las utilidades claras de
   Tailwind a tonos oscuros. Ver el script para los criterios. */
@media screen {
${rules.join("\n\n").replace(/^/gm, "  ")}
}
`;

writeFileSync(new URL("../app/dark-theme.css", import.meta.url), css);
console.log(`app/dark-theme.css: ${rules.length} reglas, ${(css.length / 1024).toFixed(1)} KB`);
