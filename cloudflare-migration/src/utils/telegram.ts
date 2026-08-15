/**
 * Telegram utility using the Bot API.
 * No requiere librerías: solo fetch a api.telegram.org.
 * Documentación: https://core.telegram.org/bots/api
 *
 * El token del bot se obtiene con @BotFather y se guarda como secret del
 * Worker (TELEGRAM_BOT_TOKEN). Ver `wrangler secret put TELEGRAM_BOT_TOKEN`.
 */

const TELEGRAM_API = 'https://api.telegram.org';

export interface TelegramResult {
  success: boolean;
  error?: string;
}

/**
 * Envía un mensaje de texto a un chat de Telegram.
 * `text` admite formato HTML (parse_mode: 'HTML').
 */
export async function sendTelegramMessage(
  chatId: string,
  text: string,
  botToken?: string
): Promise<TelegramResult> {
  try {
    if (!botToken) {
      return { success: false, error: 'TELEGRAM_BOT_TOKEN not configured' };
    }
    if (!chatId) {
      return { success: false, error: 'chatId vacío' };
    }

    const response = await fetch(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Telegram error:', errorText);
      return { success: false, error: `Telegram API error: ${response.status} - ${errorText}` };
    }

    return { success: true };
  } catch (error) {
    console.error('Error enviando mensaje de Telegram:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Escapa texto para insertarlo de forma segura en un mensaje con parse_mode HTML.
 * Telegram solo permite un subconjunto de tags; cualquier <, >, & del contenido
 * dinámico (p. ej. el nombre de un producto) debe escaparse.
 */
export function escapeTelegramHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
