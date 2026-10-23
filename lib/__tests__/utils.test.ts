import { cn, formatCurrency, toJsDate } from '../utils';

// Intl separa el símbolo con un espacio duro (U+00A0); lo normalizamos para comparar.
const plain = (s: string) => s.replace(/ /g, ' ');

describe('formatCurrency', () => {
  it('formatea pesos colombianos sin decimales y con punto de miles', () => {
    expect(plain(formatCurrency(24900))).toBe('$ 24.900');
    expect(plain(formatCurrency(1250000))).toBe('$ 1.250.000');
    expect(plain(formatCurrency(0))).toBe('$ 0');
  });
});

describe('toJsDate', () => {
  it('acepta un string ISO', () => {
    expect(toJsDate('2026-10-22T10:00:00.000Z').toISOString()).toBe('2026-10-22T10:00:00.000Z');
  });

  it('acepta un Timestamp legacy de Firestore', () => {
    const date = new Date('2024-01-01T00:00:00.000Z');
    expect(toJsDate({ toDate: () => date })).toBe(date);
  });
});

describe('cn', () => {
  it('combina clases y resuelve conflictos de Tailwind (gana la última)', () => {
    expect(cn('px-2 py-1', false && 'hidden', 'px-4')).toBe('py-1 px-4');
  });
});
