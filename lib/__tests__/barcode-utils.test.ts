import {
  barcodeEquals,
  formatBarcodeForDisplay,
  isValidBarcode,
  normalizeBarcode,
} from '../barcode-utils';

describe('normalizeBarcode', () => {
  it.each([
    ['  7702004003508 ', '7702004003508'],
    ['abc-123', 'ABC-123'],
    ['77 02 00.4/003', '7702004003'],
  ])('normaliza %j → %j', (input, expected) => {
    expect(normalizeBarcode(input)).toBe(expected);
  });

  it.each([null, undefined, '', '   ', '***'])('devuelve null para %j', (input) => {
    expect(normalizeBarcode(input)).toBeNull();
  });
});

describe('barcodeEquals', () => {
  it('considera iguales códigos que solo difieren en formato (escáner vs. digitado)', () => {
    expect(barcodeEquals('7702004003508\n', ' 7702004003508')).toBe(true);
    expect(barcodeEquals('abc-1', 'ABC-1')).toBe(true);
  });

  it('distingue códigos diferentes y el caso de uno vacío', () => {
    expect(barcodeEquals('123456', '123457')).toBe(false);
    expect(barcodeEquals('123456', null)).toBe(false);
    expect(barcodeEquals('', undefined)).toBe(true);
  });
});

describe('isValidBarcode / formatBarcodeForDisplay', () => {
  it('exige al menos 4 caracteres útiles', () => {
    expect(isValidBarcode('123')).toBe(false);
    expect(isValidBarcode('1234')).toBe(true);
    expect(isValidBarcode(' 12-3 ')).toBe(true);
  });

  it('formatea vacío como string vacío', () => {
    expect(formatBarcodeForDisplay(null)).toBe('');
    expect(formatBarcodeForDisplay(' abc ')).toBe('ABC');
  });
});
