import {
  buildOwnerEmail,
  buildOwnerTelegramMessage,
  colombiaDate,
  daysUntilDue,
  shouldRemindCustomer,
} from '../../cloudflare-migration/src/utils/debt-reminders';

// El cron corre a las 13h UTC = 8 AM en Colombia.
const CRON_NOW = new Date('2026-10-25T13:00:00Z');

describe('colombiaDate', () => {
  it('usa la fecha de Colombia, no la UTC', () => {
    // 1 AM UTC del 26 = 8 PM del 25 en Colombia
    expect(colombiaDate(new Date('2026-10-26T01:00:00Z'))).toBe('2026-10-25');
  });
});

describe('daysUntilDue', () => {
  it('cuenta los días entre fechas de Colombia', () => {
    // Fiado hecho el 21 a las 3 PM con 7 días: vence el 28
    expect(daysUntilDue('2026-10-28T20:00:00.000Z', CRON_NOW)).toBe(3);
  });

  it('un fiado hecho de noche no se corre al día siguiente', () => {
    // Vence el 28 a las 8 PM Colombia = 01:00 UTC del 29
    expect(daysUntilDue('2026-10-29T01:00:00.000Z', CRON_NOW)).toBe(3);
  });

  it('acepta fechas sin hora y vencidos', () => {
    expect(daysUntilDue('2026-10-25', CRON_NOW)).toBe(0);
    expect(daysUntilDue('2026-10-18', CRON_NOW)).toBe(-7);
  });

  it('devuelve null con una fecha inválida', () => {
    expect(daysUntilDue('no es fecha', CRON_NOW)).toBeNull();
  });
});

describe('shouldRemindCustomer', () => {
  it('avisa a los 3 días y el día que vence, no en los días intermedios', () => {
    expect([5, 4, 3, 2, 1, 0].map(shouldRemindCustomer)).toEqual([
      false,
      false,
      true,
      false,
      false,
      true,
    ]);
  });

  it('ya vencido, solo una vez por semana', () => {
    expect(shouldRemindCustomer(-1)).toBe(false);
    expect(shouldRemindCustomer(-6)).toBe(false);
    expect(shouldRemindCustomer(-7)).toBe(true);
    expect(shouldRemindCustomer(-14)).toBe(true);
  });
});

describe('aviso al tendero', () => {
  const debtors = [
    { name: 'Doña Rosa', phone: '3001234567', debt: 45000, days: 3 },
    { name: 'Pedro <El Mono>', phone: null, debt: 12000, days: 0 },
    { name: 'Lucía', phone: null, debt: 8000, days: 10 }, // aún lejos: no sale
    { name: 'Carlos', phone: null, debt: 5000, days: -2 }, // vencido: no sale
  ];

  it('Telegram lista los de 3 días y los de hoy, escapando el HTML', () => {
    const msg = buildOwnerTelegramMessage(debtors)!;
    expect(msg).toContain('Se les vence el fiado en 3 días');
    expect(msg).toContain('Doña Rosa — $45.000 · 3001234567');
    expect(msg).toContain('Se les vence HOY');
    expect(msg).toContain('Pedro &lt;El Mono&gt;');
    expect(msg).not.toContain('Lucía');
    expect(msg).not.toContain('Carlos');
  });

  it('el correo cuenta los clientes en el asunto', () => {
    const email = buildOwnerEmail(debtors, 'Tienda La Esquina')!;
    expect(email.subject).toBe('2 clientes tienen fiado por vencer');
    expect(email.html).toContain('Tienda La Esquina');
    expect(email.html).toContain('Doña Rosa');
  });

  it('no envía nada si nadie tiene vencimiento en 3 días ni hoy', () => {
    const quiet = [{ name: 'Lucía', phone: null, debt: 8000, days: 10 }];
    expect(buildOwnerTelegramMessage(quiet)).toBeNull();
    expect(buildOwnerEmail(quiet, 'Tienda')).toBeNull();
  });
});
