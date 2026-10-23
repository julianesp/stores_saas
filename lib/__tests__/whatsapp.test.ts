import {
  buildDebtReminderMessage,
  buildWhatsAppLink,
  normalizeColombianPhone,
} from '../whatsapp';

describe('normalizeColombianPhone', () => {
  it.each([
    ['3174503604', '573174503604'],
    ['317 450-3604', '573174503604'],
    ['6015551234', '576015551234'],
    ['+57 317 450 3604', '573174503604'],
    ['573174503604', '573174503604'],
    ['+1 (305) 555-1234', '13055551234'],
  ])('%j → %j', (input, expected) => {
    expect(normalizeColombianPhone(input)).toBe(expected);
  });

  it.each(['', '12345', '4174503604', '1234567890123456'])('rechaza %j', (input) => {
    expect(normalizeColombianPhone(input)).toBeNull();
  });
});

describe('buildWhatsAppLink', () => {
  it('arma el enlace wa.me con el mensaje codificado', () => {
    expect(buildWhatsAppLink('3174503604', 'Hola & gracias')).toBe(
      'https://wa.me/573174503604?text=Hola%20%26%20gracias'
    );
  });

  it('devuelve null si el teléfono no sirve', () => {
    expect(buildWhatsAppLink('123', 'Hola')).toBeNull();
  });
});

describe('buildDebtReminderMessage', () => {
  it('incluye cliente, monto con formato colombiano y nombre de la tienda', () => {
    const msg = buildDebtReminderMessage({
      customerName: 'Doña Rosa',
      amount: 45500,
      storeName: 'Tienda La Esquina',
    });
    expect(msg).toContain('Hola Doña Rosa');
    expect(msg).toContain('*$45.500*');
    expect(msg).toContain('de *Tienda La Esquina*');
  });

  it('omite la tienda si no tiene nombre', () => {
    const msg = buildDebtReminderMessage({ customerName: 'Pedro', amount: 1000, storeName: null });
    expect(msg).toContain('Te escribimos para recordarte');
  });
});
