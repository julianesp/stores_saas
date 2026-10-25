/**
 * Lógica de los recordatorios de fiado (sin acceso a la base de datos, para
 * poder probarla sola). La usa la ruta POST /api/email/debt-reminders.
 *
 * Todas las fechas se comparan en hora de Colombia (UTC-5): due_date se guarda
 * como ISO en UTC, así que un fiado hecho a las 8pm quedaría con el vencimiento
 * al día siguiente si se comparara la fecha UTC.
 */

const COLOMBIA_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Días antes del vencimiento en que se avisa al cliente y al tendero. */
export const REMIND_DAYS_BEFORE = 3;
/** Ya vencido: se le recuerda al cliente una vez por semana, no a diario. */
export const OVERDUE_REMINDER_EVERY_DAYS = 7;

/** Fecha 'YYYY-MM-DD' en Colombia de un instante dado. */
export function colombiaDate(instant: Date): string {
  return new Date(instant.getTime() - COLOMBIA_OFFSET_MS).toISOString().split('T')[0];
}

/**
 * Días que faltan para el vencimiento (0 = vence hoy, negativo = vencido),
 * ambos extremos tomados como fecha de Colombia. Acepta ISO completo o solo
 * 'YYYY-MM-DD' (este último se toma tal cual, ya es una fecha).
 */
export function daysUntilDue(dueDate: string, now: Date = new Date()): number | null {
  const due = /^\d{4}-\d{2}-\d{2}$/.test(dueDate)
    ? dueDate
    : (() => {
        const d = new Date(dueDate);
        return Number.isNaN(d.getTime()) ? null : colombiaDate(d);
      })();
  if (!due) return null;
  const diff = Date.parse(`${due}T00:00:00Z`) - Date.parse(`${colombiaDate(now)}T00:00:00Z`);
  return Math.round(diff / DAY_MS);
}

/**
 * ¿Hoy toca correo al cliente? Faltando 3 días, el día que vence y, si ya
 * venció, cada 7 días. El cron corre una vez al día, así que cada caso sale
 * una sola vez.
 */
export function shouldRemindCustomer(days: number): boolean {
  if (days === REMIND_DAYS_BEFORE || days === 0) return true;
  return days < 0 && -days % OVERDUE_REMINDER_EVERY_DAYS === 0;
}

export interface DueDebtor {
  name: string;
  phone?: string | null;
  debt: number;
  days: number;
}

function formatCOP(n: number): string {
  return `$${Math.round(n).toLocaleString('es-CO')}`;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Clientes del aviso al tendero: a los que se les vence en 3 días o hoy. */
export function pickOwnerAlertDebtors(debtors: DueDebtor[]): {
  inThreeDays: DueDebtor[];
  today: DueDebtor[];
} {
  return {
    inThreeDays: debtors.filter((d) => d.days === REMIND_DAYS_BEFORE),
    today: debtors.filter((d) => d.days === 0),
  };
}

function debtorLine(d: DueDebtor, html: boolean): string {
  const name = html ? escapeHtml(d.name) : d.name;
  const phone = d.phone ? ` · ${html ? escapeHtml(d.phone) : d.phone}` : '';
  return `${name} — ${formatCOP(d.debt)}${phone}`;
}

/** Mensaje de Telegram para el tendero (parse_mode HTML). null si no hay nada. */
export function buildOwnerTelegramMessage(debtors: DueDebtor[]): string | null {
  const { inThreeDays, today } = pickOwnerAlertDebtors(debtors);
  if (inThreeDays.length === 0 && today.length === 0) return null;

  const sections: string[] = [];
  if (inThreeDays.length > 0) {
    sections.push(
      `⏳ <b>Se les vence el fiado en ${REMIND_DAYS_BEFORE} días</b>\n` +
        inThreeDays.map((d) => `• ${debtorLine(d, true)}`).join('\n')
    );
  }
  if (today.length > 0) {
    sections.push(
      `📅 <b>Se les vence HOY</b>\n` + today.map((d) => `• ${debtorLine(d, true)}`).join('\n')
    );
  }
  return `💰 <b>Cobros de fiado</b>\n\n${sections.join('\n\n')}\n\nVer en posib.dev → Deudores`;
}

/** Correo HTML para el tendero. null si no hay nada que avisar. */
export function buildOwnerEmail(
  debtors: DueDebtor[],
  storeName: string
): { subject: string; html: string } | null {
  const { inThreeDays, today } = pickOwnerAlertDebtors(debtors);
  const total = inThreeDays.length + today.length;
  if (total === 0) return null;

  const table = (title: string, list: DueDebtor[]) =>
    list.length === 0
      ? ''
      : `<h3 style="margin:24px 0 8px;font-size:16px;color:#111827">${title}</h3>
<table style="width:100%;border-collapse:collapse;font-size:14px">
${list
  .map(
    (d) => `<tr>
  <td style="padding:8px;border-bottom:1px solid #e5e7eb">${escapeHtml(d.name)}${
    d.phone ? `<br><span style="color:#6b7280;font-size:12px">${escapeHtml(d.phone)}</span>` : ''
  }</td>
  <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600">${formatCOP(d.debt)}</td>
</tr>`
  )
  .join('\n')}
</table>`;

  const html = `<!doctype html>
<html lang="es"><body style="margin:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:24px">
<div style="background:#ffffff;border-radius:12px;padding:24px">
<h2 style="margin:0 0 8px;font-size:20px;color:#111827">Cobros de fiado — ${escapeHtml(storeName)}</h2>
<p style="margin:0;color:#4b5563;font-size:14px">Estos clientes tienen fiado que se vence pronto. Es buen momento para recordarles.</p>
${table(`Se les vence en ${REMIND_DAYS_BEFORE} días`, inThreeDays)}
${table('Se les vence hoy', today)}
<p style="margin:24px 0 0;font-size:13px;color:#6b7280">Puedes ver el detalle y registrar abonos en posib.dev → Deudores.</p>
</div></div></body></html>`;

  return {
    subject:
      total === 1
        ? '1 cliente tiene fiado por vencer'
        : `${total} clientes tienen fiado por vencer`,
    html,
  };
}
