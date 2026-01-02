/**
 * Email utility using Resend API
 * Resend tiene tier gratuito: 100 emails/día, 3,000/mes
 * Documentación: https://resend.com/docs/api-reference/emails/send-email
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
 * Envía un email usando Resend API
 * Requiere la variable de entorno RESEND_API_KEY
 */
export async function sendEmail(
  options: EmailOptions,
  resendApiKey?: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    if (!resendApiKey) {
      return {
        success: false,
        error: 'RESEND_API_KEY not configured',
      };
    }

    const emailPayload = {
      from: `${options.fromName} <${options.from}>`,
      to: options.toName ? [`${options.toName} <${options.to}>`] : [options.to],
      subject: options.subject,
      html: options.html,
      ...(options.text && { text: options.text }),
      ...(options.replyTo && { reply_to: options.replyTo }),
    };

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Resend error:', errorText);
      return {
        success: false,
        error: `Resend API error: ${response.status} - ${errorText}`,
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
