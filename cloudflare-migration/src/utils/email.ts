/**
 * Email utility using MailChannels API
 * MailChannels es gratuito para Cloudflare Workers
 * Documentación: https://support.mailchannels.com/hc/en-us/articles/4565898358413
 */

export interface EmailOptions {
  to: string;
  toName?: string;
  from: string;
  fromName: string;
  subject: string;
  html: string;
  text?: string; // Fallback texto plano
  replyTo?: string;
}

/**
 * Envía un email usando MailChannels API
 */
export async function sendEmail(options: EmailOptions): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const emailPayload = {
      personalizations: [
        {
          to: [
            {
              email: options.to,
              name: options.toName || options.to,
            },
          ],
        },
      ],
      from: {
        email: options.from,
        name: options.fromName,
      },
      subject: options.subject,
      content: [
        {
          type: 'text/html',
          value: options.html,
        },
      ],
    };

    // Agregar reply-to si está presente
    if (options.replyTo) {
      (emailPayload as any).reply_to = {
        email: options.replyTo,
      };
    }

    // Agregar texto plano si está presente
    if (options.text) {
      (emailPayload as any).content.unshift({
        type: 'text/plain',
        value: options.text,
      });
    }

    const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('MailChannels error:', errorText);
      return {
        success: false,
        error: `MailChannels API error: ${response.status} - ${errorText}`,
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Log de email en la base de datos
 */
export async function logEmail(
  db: D1Database,
  userProfileId: string,
  emailType: string,
  recipientEmail: string,
  subject: string,
  status: 'sent' | 'failed',
  errorMessage?: string,
  metadata?: Record<string, any>
) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO email_logs (
        id, user_profile_id, email_type, recipient_email, subject,
        status, error_message, sent_at, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      userProfileId,
      emailType,
      recipientEmail,
      subject,
      status,
      errorMessage || null,
      status === 'sent' ? now : null,
      metadata ? JSON.stringify(metadata) : null,
      now
    )
    .run();
}
