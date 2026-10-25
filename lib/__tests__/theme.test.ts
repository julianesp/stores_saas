/**
 * @jest-environment jsdom
 */
import { getThemeMode, resolveDark, setManualTheme, setThemeMode, THEME_INIT_SCRIPT } from '../theme';

const at = (hour: number, minute = 0) => new Date(2026, 9, 25, hour, minute);

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('modo según la hora', () => {
  it('es claro de 7am hasta antes de las 7pm', () => {
    expect(resolveDark(at(6, 59))).toBe(true);
    expect(resolveDark(at(7, 0))).toBe(false);
    expect(resolveDark(at(18, 59))).toBe(false);
    expect(resolveDark(at(19, 0))).toBe(true);
  });

  it('el modo por defecto es automático', () => {
    expect(getThemeMode()).toBe('auto');
  });
});

describe('modo fijo', () => {
  it('siempre oscuro manda aunque sea de día', () => {
    setThemeMode('dark');
    expect(resolveDark(at(10))).toBe(true);
  });

  it('siempre claro manda aunque sea de noche', () => {
    setThemeMode('light');
    expect(resolveDark(at(22))).toBe(false);
  });

  it('volver a "según la hora" borra el modo fijo', () => {
    setThemeMode('dark');
    setThemeMode('auto');
    expect(getThemeMode()).toBe('auto');
    expect(resolveDark(at(10))).toBe(false);
  });

  it('con modo fijo, el cambio rápido cambia el modo fijo', () => {
    setThemeMode('light');
    setManualTheme(true);
    expect(getThemeMode()).toBe('dark');
  });

  it('el script inicial respeta el modo fijo antes del primer render', () => {
    setThemeMode('dark');
    new Function(THEME_INIT_SCRIPT)();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
