/**
 * @jest-environment jsdom
 */
import {
  ACCENTS,
  ACCENT_INIT_SCRIPT,
  ACCENT_KEY,
  DEFAULT_ACCENT,
  findAccent,
  readStoredAccent,
  setAccent,
} from '../accent';

// Luminancia relativa y contraste WCAG para validar la paleta.
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const root = document.documentElement;

beforeEach(() => {
  localStorage.clear();
  root.removeAttribute('style');
  root.removeAttribute('data-accent');
});

describe('paleta de colores del sistema', () => {
  it('el color por defecto es el teal de posib', () => {
    expect(findAccent(DEFAULT_ACCENT).light.brand).toBe('#007c80');
    expect(findAccent('no-existe').id).toBe('teal');
  });

  it('los ids son únicos', () => {
    expect(new Set(ACCENTS.map((a) => a.id)).size).toBe(ACCENTS.length);
  });

  it.each(ACCENTS.map((a) => [a.name, a] as const))(
    '%s: el texto blanco se lee sobre los botones en claro y en oscuro (AA ≥ 4.5)',
    (_name, accent) => {
      expect(contrast('#ffffff', accent.light.brand)).toBeGreaterThanOrEqual(4.5);
      expect(contrast('#ffffff', accent.dark.brand)).toBeGreaterThanOrEqual(4.5);
    }
  );

  it.each(ACCENTS.map((a) => [a.name, a] as const))(
    '%s: el texto de marca se lee sobre las fichas del tema oscuro (AA ≥ 4.5)',
    (_name, accent) => {
      expect(contrast(accent.dark.text, '#221f1a')).toBeGreaterThanOrEqual(4.5);
    }
  );
});

describe('setAccent', () => {
  it('guarda la elección, la aplica en <html> y avisa a los componentes', () => {
    const listener = jest.fn();
    window.addEventListener('posib-accent-change', listener);

    setAccent('ladrillo');

    expect(localStorage.getItem(ACCENT_KEY)).toBe('ladrillo');
    expect(readStoredAccent()).toBe('ladrillo');
    expect(root.getAttribute('data-accent')).toBe('ladrillo');
    expect(root.style.getPropertyValue('--accent-brand')).toBe('#b4472b');
    expect(root.style.getPropertyValue('--accent-dark-text')).toBe('#f0997f');
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener('posib-accent-change', listener);
  });

  it('un id desconocido cae en el color por defecto', () => {
    setAccent('fucsia-neon');
    expect(readStoredAccent()).toBe('teal');
  });
});

describe('ACCENT_INIT_SCRIPT (antes del primer render)', () => {
  it('aplica el color guardado sin esperar a React', () => {
    localStorage.setItem(ACCENT_KEY, 'mar');
    new Function(ACCENT_INIT_SCRIPT)();
    expect(root.getAttribute('data-accent')).toBe('mar');
    expect(root.style.getPropertyValue('--accent-brand')).toBe('#1f5fbf');
  });

  it('sin elección guardada no toca nada (queda el teal del CSS)', () => {
    new Function(ACCENT_INIT_SCRIPT)();
    expect(root.getAttribute('data-accent')).toBeNull();
    expect(root.style.getPropertyValue('--accent-brand')).toBe('');
  });
});
