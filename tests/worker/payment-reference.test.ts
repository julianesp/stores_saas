import {
  hashOrderToken,
  isUniqueViolation,
  normalizePaymentReference,
} from '../../cloudflare-migration/src/utils/payment-reference';

describe('normalizePaymentReference (Nequi)', () => {
  it.each([
    ['m 1234 5678', 'M12345678'],
    ['abcd', 'ABCD'],
    ['NQ-2026-001', 'NQ-2026-001'],
  ])('%j → %j', (input, expected) => {
    expect(normalizePaymentReference(input)).toBe(expected);
  });

  it.each(['abc', '-ABCD', 'ABC$123', 'A'.repeat(31), 12345, null, undefined])(
    'rechaza %j',
    (input) => {
      expect(normalizePaymentReference(input)).toBeNull();
    }
  );
});

describe('hashOrderToken', () => {
  it('produce el SHA-256 en hexadecimal (solo el hash se guarda en D1)', async () => {
    expect(await hashOrderToken('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    );
  });
});

describe('isUniqueViolation', () => {
  it('detecta la referencia de pago repetida', () => {
    expect(isUniqueViolation(new Error('D1_ERROR: UNIQUE constraint failed: orders.ref'))).toBe(true);
    expect(isUniqueViolation(new Error('otro error'))).toBe(false);
    expect(isUniqueViolation('UNIQUE constraint failed')).toBe(false);
  });
});
