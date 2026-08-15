/**
 * Telegram routes
 *
 * 1. POST /api/telegram/webhook  — webhook público del bot. Telegram lo llama
 *    con cada mensaje. Procesamos `/start <código>` para vincular el chat del
 *    tendero con su tenant (guarda telegram_chat_id).
 * 2. POST /api/telegram/expiration-alerts — tarea interna disparada por el cron
 *    horario. Revisa productos próximos a vencer (≤30 días) y avisa por Telegram
 *    SOLO la primera vez que un producto entra en el umbral.
 *
 * El webhook debe montarse ANTES del authMiddleware (Telegram no envía JWT de
 * Clerk); se protege verificando el secret token de Telegram.
 */

import { Hono } from 'hono';
import type { Env } from '../types';
import { sendTelegramMessage, escapeTelegramHtml } from '../utils/telegram';

const app = new Hono<{ Bindings: Env }>();

// Umbral de "próximo a vencer": mismo que el front (lib/expiration-helpers.ts)
const EXPIRATION_WARNING_DAYS = 30;

/**
 * Días completos entre hoy y una fecha (negativo si ya pasó).
 * Compara a nivel de fecha para evitar desfases por hora/zona.
 */
function daysUntil(dateStr: string): number {
  const now = new Date();
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const d = new Date(dateStr);
  const end = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.round((end - start) / (24 * 60 * 60 * 1000));
}

/**
 * Webhook del bot de Telegram. Procesa el comando /start <código> para
 * vincular el chat del usuario con el tenant cuyo telegram_link_code coincide.
 */
app.post('/webhook', async (c) => {
  // Verificación del secret token de Telegram (se configura al registrar el
  // webhook con setWebhook?secret_token=...). Evita que terceros llamen aquí.
  const expectedSecret = c.env.TELEGRAM_WEBHOOK_SECRET;
  if (expectedSecret) {
    const got = c.req.header('X-Telegram-Bot-Api-Secret-Token');
    if (got !== expectedSecret) {
      return c.json({ ok: true }); // respondemos 200 pero ignoramos
    }
  }

  try {
    const update = await c.req.json<any>();
    const message = update?.message;
    const text: string | undefined = message?.text;
    const chatId = message?.chat?.id;

    if (!text || !chatId) {
      return c.json({ ok: true });
    }

    const botToken = c.env.TELEGRAM_BOT_TOKEN;

    // Comando /start [código]
    if (text.startsWith('/start')) {
      const parts = text.trim().split(/\s+/);
      const code = parts[1];

      if (!code) {
        await sendTelegramMessage(
          String(chatId),
          '👋 ¡Hola! Para recibir alertas de tu tienda, entra a posib.dev → Configuración → Telegram y toca <b>Conectar</b>. Luego pega aquí el código que te muestra.',
          botToken
        );
        return c.json({ ok: true });
      }

      // Buscar el tenant con ese código de vinculación
      const profile = await c.env.DB
        .prepare('SELECT id, full_name FROM user_profiles WHERE telegram_link_code = ?')
        .bind(code)
        .first<any>();

      if (!profile) {
        await sendTelegramMessage(
          String(chatId),
          '❌ El código no es válido o ya expiró. Genera uno nuevo desde posib.dev → Configuración → Telegram.',
          botToken
        );
        return c.json({ ok: true });
      }

      // Guardar el chat_id y limpiar el código (un solo uso)
      await c.env.DB
        .prepare(
          'UPDATE user_profiles SET telegram_chat_id = ?, telegram_link_code = NULL, telegram_enabled = 1, updated_at = ? WHERE id = ?'
        )
        .bind(String(chatId), new Date().toISOString(), profile.id)
        .run();

      await sendTelegramMessage(
        String(chatId),
        '✅ ¡Listo! Tu tienda quedó conectada. Te avisaré aquí cuando tengas productos próximos a vencer para que los pongas en promoción. 🧀🍞',
        botToken
      );
      return c.json({ ok: true });
    }

    // Cualquier otro mensaje: ayuda breve
    await sendTelegramMessage(
      String(chatId),
      'Soy el bot de alertas de <b>posib.dev</b>. Te aviso de productos próximos a vencer. Si aún no conectaste tu tienda, usa el código de posib.dev → Configuración → Telegram.',
      botToken
    );
    return c.json({ ok: true });
  } catch (error) {
    console.error('Error en webhook de Telegram:', error);
    // Siempre 200 para que Telegram no reintente en bucle
    return c.json({ ok: true });
  }
});

/**
 * CRON: avisa por Telegram de productos próximos a vencer.
 * Recorre los tenants con Telegram conectado y activo, busca sus productos
 * que vencen dentro del umbral (con stock y sin haber sido notificados aún),
 * y envía UN mensaje resumido por tenant. Registra lo notificado para no repetir.
 */
app.post('/expiration-alerts', async (c) => {
  const db = c.env.DB;
  const botToken = c.env.TELEGRAM_BOT_TOKEN;

  // Esta ruta es pública (montada antes del authMiddleware) porque la dispara el
  // cron sin JWT de Clerk. Si CRON_SECRET está configurado, exigirlo para evitar
  // que terceros la invoquen. El cron interno pasa la cabecera X-Cron-Secret.
  if (c.env.CRON_SECRET) {
    const provided = c.req.header('X-Cron-Secret');
    if (provided !== c.env.CRON_SECRET) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }
  }

  if (!botToken) {
    return c.json({ success: false, error: 'TELEGRAM_BOT_TOKEN not configured' }, 200);
  }

  try {
    // Tenants con Telegram conectado y activo
    const tenants = await db
      .prepare(
        `SELECT id, telegram_chat_id
         FROM user_profiles
         WHERE telegram_chat_id IS NOT NULL AND telegram_enabled = 1`
      )
      .all();

    let messagesSent = 0;
    let productsNotified = 0;

    for (const tenant of (tenants.results as any[]) || []) {
      // Productos por vencer del tenant (con stock, aún no vencidos), que NO
      // tengan ya un registro de notificación para su fecha actual.
      const products = await db
        .prepare(
          `SELECT p.id, p.name, p.stock, p.sale_price, p.expiration_date
           FROM products p
           LEFT JOIN expiration_notifications en
             ON en.product_id = p.id AND en.expiration_date = p.expiration_date
           WHERE p.tenant_id = ?
             AND p.expiration_date IS NOT NULL
             AND p.stock > 0
             AND date(p.expiration_date) >= date('now')
             AND date(p.expiration_date) <= date('now', '+${EXPIRATION_WARNING_DAYS} days')
             AND en.id IS NULL`
        )
        .bind(tenant.id)
        .all();

      const list = (products.results as any[]) || [];
      if (list.length === 0) continue;

      // Ordenar por urgencia (más próximos primero)
      list.sort((a, b) => daysUntil(a.expiration_date) - daysUntil(b.expiration_date));

      // Construir el mensaje
      const lines = list.map((p) => {
        const days = daysUntil(p.expiration_date);
        const when = days === 0 ? 'vence hoy' : days === 1 ? 'vence mañana' : `vence en ${days} días`;
        return `• <b>${escapeTelegramHtml(p.name)}</b> — ${when} (stock ${p.stock})`;
      });

      const header =
        list.length === 1
          ? '⚠️ Tienes <b>1 producto</b> próximo a vencer:'
          : `⚠️ Tienes <b>${list.length} productos</b> próximos a vencer:`;

      const message =
        `${header}\n\n${lines.join('\n')}\n\n` +
        '💡 Ponlos en promoción desde posib.dev → Ofertas para venderlos antes de que se venzan.';

      const result = await sendTelegramMessage(String(tenant.telegram_chat_id), message, botToken);

      if (result.success) {
        messagesSent++;

        // Registrar cada producto como notificado (idempotente por índice único)
        const now = new Date().toISOString();
        for (const p of list) {
          const id = crypto.randomUUID();
          await db
            .prepare(
              `INSERT OR IGNORE INTO expiration_notifications
                 (id, tenant_id, product_id, expiration_date, notified_at)
               VALUES (?, ?, ?, ?, ?)`
            )
            .bind(id, tenant.id, p.id, p.expiration_date, now)
            .run();
          productsNotified++;
        }
      }
    }

    return c.json({ success: true, messagesSent, productsNotified });
  } catch (error) {
    console.error('Error en expiration-alerts de Telegram:', error);
    return c.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      200
    );
  }
});

export default app;
