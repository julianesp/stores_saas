/**
 * Email routes - Send automated marketing emails
 */

import { Hono } from 'hono';
import type { Env } from '../types';
import { sendEmail, logEmail } from '../utils/email';
import {
  subscriptionReminderTemplate,
  dailyReportTemplate,
  stockAlertTemplate,
  abandonedCartTemplate,
} from '../utils/email-templates';

const app = new Hono<{ Bindings: Env }>();

/**
 * CRON: Send subscription reminder emails
 * Trigger: Diariamente a las 9 AM
 */
app.post('/subscription-reminders', async (c) => {
  const db = c.env.DB;

  try {
    // Obtener usuarios con suscripción activa o en trial que vence pronto
    const users = await db
      .prepare(
        `SELECT id, clerk_user_id, email, full_name, subscription_status,
                trial_end_date, next_billing_date
         FROM user_profiles
         WHERE subscription_status IN ('trial', 'active')
           AND (
             (subscription_status = 'trial' AND julianday(trial_end_date) - julianday('now') <= 7)
             OR (subscription_status = 'active' AND julianday(next_billing_date) - julianday('now') <= 7)
           )`
      )
      .all();

    let emailsSent = 0;
    let emailsFailed = 0;

    for (const user of users.results as any[]) {
      // Verificar preferencias de email
      const prefs = await db
        .prepare('SELECT * FROM email_preferences WHERE user_profile_id = ?')
        .bind(user.id)
        .first();

      if (prefs && !(prefs as any).subscription_reminders_enabled) {
        continue; // Usuario desactivó recordatorios
      }

      const expirationDate =
        user.subscription_status === 'trial'
          ? user.trial_end_date
          : user.next_billing_date;

      const daysLeft = Math.ceil(
        (new Date(expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      const emailData = {
        user_name: user.full_name || user.email.split('@')[0],
        days_left: daysLeft,
        next_billing_date: expirationDate,
        plan_price: 29900,
        payment_link: `https://tienda-pos.vercel.app/dashboard/subscription`,
      };

      const html = subscriptionReminderTemplate(emailData);

      const result = await sendEmail({
        to: user.email,
        toName: user.full_name,
        from: 'noreply@tienda-pos.com',
        fromName: 'Tienda POS',
        subject: `⏰ Tu suscripción vence en ${daysLeft} ${daysLeft === 1 ? 'día' : 'días'}`,
        html,
      });

      if (result.success) {
        emailsSent++;
        await logEmail(
          db,
          user.id,
          'subscription_reminder',
          user.email,
          `Recordatorio de suscripción - ${daysLeft} días`,
          'sent',
          undefined,
          { days_left: daysLeft }
        );
      } else {
        emailsFailed++;
        await logEmail(
          db,
          user.id,
          'subscription_reminder',
          user.email,
          `Recordatorio de suscripción - ${daysLeft} días`,
          'failed',
          result.error
        );
      }
    }

    return c.json({
      success: true,
      emails_sent: emailsSent,
      emails_failed: emailsFailed,
      total_users: users.results.length,
    });
  } catch (error) {
    console.error('Error sending subscription reminders:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * CRON: Send daily report emails
 * Trigger: Según preferencias del usuario (configurado en email_preferences)
 */
app.post('/daily-reports', async (c) => {
  const db = c.env.DB;

  try {
    const currentHour = new Date().getHours();
    const currentMinute = new Date().getMinutes();
    const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute
      .toString()
      .padStart(2, '0')}`;

    // Obtener usuarios con reportes diarios activados para esta hora
    const prefs = await db
      .prepare(
        `SELECT ep.*, up.email, up.full_name, up.store_name
         FROM email_preferences ep
         JOIN user_profiles up ON ep.user_profile_id = up.id
         WHERE ep.daily_reports_enabled = 1
           AND ep.daily_reports_time = ?`
      )
      .bind(currentTime)
      .all();

    let emailsSent = 0;
    let emailsFailed = 0;

    for (const pref of prefs.results as any[]) {
      // Obtener datos del reporte del día anterior
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // Total de ventas
      const salesData = await db
        .prepare(
          `SELECT COUNT(*) as total_sales, SUM(total) as total_revenue
           FROM sales
           WHERE user_profile_id = ?
             AND DATE(created_at) = ?
             AND status = 'completada'`
        )
        .bind(pref.user_profile_id, yesterdayStr)
        .first();

      // Top productos
      const topProducts = await db
        .prepare(
          `SELECT p.name, SUM(si.quantity) as quantity, SUM(si.subtotal) as revenue
           FROM sale_items si
           JOIN sales s ON si.sale_id = s.id
           JOIN products p ON si.product_id = p.id
           WHERE s.user_profile_id = ?
             AND DATE(s.created_at) = ?
             AND s.status = 'completada'
           GROUP BY p.id, p.name
           ORDER BY revenue DESC
           LIMIT 5`
        )
        .bind(pref.user_profile_id, yesterdayStr)
        .all();

      // Productos con bajo stock
      const lowStock = await db
        .prepare(
          `SELECT name, stock as current_stock, min_stock
           FROM products
           WHERE user_profile_id = ?
             AND stock <= min_stock
           ORDER BY (stock - min_stock) ASC
           LIMIT 5`
        )
        .bind(pref.user_profile_id)
        .all();

      const emailData = {
        store_name: pref.store_name || 'Tu Tienda',
        date: yesterdayStr,
        total_sales: (salesData as any)?.total_sales || 0,
        total_revenue: (salesData as any)?.total_revenue || 0,
        top_products: (topProducts.results as any[]) || [],
        low_stock_products: (lowStock.results as any[]) || [],
      };

      const html = dailyReportTemplate(emailData);

      const result = await sendEmail({
        to: pref.email,
        toName: pref.full_name,
        from: pref.from_email || 'noreply@tienda-pos.com',
        fromName: pref.from_name || 'Tienda POS',
        subject: `📊 Reporte Diario - ${emailData.store_name} - ${new Date(
          yesterdayStr
        ).toLocaleDateString('es-CO')}`,
        html,
      });

      if (result.success) {
        emailsSent++;
        await logEmail(
          db,
          pref.user_profile_id,
          'daily_report',
          pref.email,
          'Reporte diario',
          'sent',
          undefined,
          { date: yesterdayStr, total_sales: emailData.total_sales }
        );
      } else {
        emailsFailed++;
        await logEmail(
          db,
          pref.user_profile_id,
          'daily_report',
          pref.email,
          'Reporte diario',
          'failed',
          result.error
        );
      }
    }

    return c.json({
      success: true,
      emails_sent: emailsSent,
      emails_failed: emailsFailed,
      total_prefs: prefs.results.length,
    });
  } catch (error) {
    console.error('Error sending daily reports:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * CRON: Send stock alert emails
 * Trigger: Cuando un producto vuelve a tener stock
 */
app.post('/stock-alerts', async (c) => {
  const db = c.env.DB;

  try {
    // Obtener suscripciones pendientes donde el producto ahora tiene stock
    const subscriptions = await db
      .prepare(
        `SELECT sa.*, p.name as product_name, p.stock, p.image_url, up.store_slug, up.store_name
         FROM stock_alert_subscriptions sa
         JOIN products p ON sa.product_id = p.id
         JOIN user_profiles up ON sa.user_profile_id = up.id
         WHERE sa.notified = 0
           AND p.stock > 0`
      )
      .all();

    let emailsSent = 0;
    let emailsFailed = 0;

    for (const sub of subscriptions.results as any[]) {
      // Verificar preferencias
      const prefs = await db
        .prepare('SELECT * FROM email_preferences WHERE user_profile_id = ?')
        .bind(sub.user_profile_id)
        .first();

      if (prefs && !(prefs as any).stock_alerts_enabled) {
        continue;
      }

      const productUrl = `https://tienda-pos.vercel.app/store/${sub.store_slug}/product/${sub.product_id}`;

      const emailData = {
        product_name: sub.product_name,
        product_image: sub.image_url,
        product_url: productUrl,
        store_name: sub.store_name || 'Nuestra tienda',
      };

      const html = stockAlertTemplate(emailData);

      const result = await sendEmail({
        to: sub.customer_email,
        toName: sub.customer_name,
        from: (prefs as any)?.from_email || 'noreply@tienda-pos.com',
        fromName: (prefs as any)?.from_name || sub.store_name || 'Tienda POS',
        subject: `✨ ${sub.product_name} está disponible!`,
        html,
      });

      if (result.success) {
        emailsSent++;

        // Marcar como notificado
        await db
          .prepare(
            'UPDATE stock_alert_subscriptions SET notified = 1, notified_at = ? WHERE id = ?'
          )
          .bind(new Date().toISOString(), sub.id)
          .run();

        await logEmail(
          db,
          sub.user_profile_id,
          'stock_alert',
          sub.customer_email,
          `Producto disponible: ${sub.product_name}`,
          'sent',
          undefined,
          { product_id: sub.product_id, product_name: sub.product_name }
        );
      } else {
        emailsFailed++;
        await logEmail(
          db,
          sub.user_profile_id,
          'stock_alert',
          sub.customer_email,
          `Producto disponible: ${sub.product_name}`,
          'failed',
          result.error
        );
      }
    }

    return c.json({
      success: true,
      emails_sent: emailsSent,
      emails_failed: emailsFailed,
      total_subscriptions: subscriptions.results.length,
    });
  } catch (error) {
    console.error('Error sending stock alerts:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * CRON: Send abandoned cart emails
 * Trigger: 1 hora, 24 horas, y 72 horas después del abandono
 */
app.post('/abandoned-carts', async (c) => {
  const db = c.env.DB;

  try {
    const now = new Date();
    let emailsSent = 0;
    let emailsFailed = 0;

    // Obtener carritos abandonados no recuperados
    const carts = await db
      .prepare(
        `SELECT ac.*, up.store_slug, up.store_name
         FROM abandoned_carts ac
         JOIN user_profiles up ON ac.user_profile_id = up.id
         WHERE ac.recovered = 0`
      )
      .all();

    for (const cart of carts.results as any[]) {
      // Verificar preferencias
      const prefs = await db
        .prepare('SELECT * FROM email_preferences WHERE user_profile_id = ?')
        .bind(cart.user_profile_id)
        .first();

      if (prefs && !(prefs as any).abandoned_cart_emails_enabled) {
        continue;
      }

      const abandonedAt = new Date(cart.abandoned_at);
      const hoursSinceAbandoned = (now.getTime() - abandonedAt.getTime()) / (1000 * 60 * 60);

      let emailNumber: 1 | 2 | 3 | null = null;

      // Primer email: 1 hora después
      if (hoursSinceAbandoned >= 1 && hoursSinceAbandoned < 2 && !cart.first_email_sent) {
        emailNumber = 1;
      }
      // Segundo email: 24 horas después
      else if (hoursSinceAbandoned >= 24 && hoursSinceAbandoned < 25 && !cart.second_email_sent) {
        emailNumber = 2;
      }
      // Tercer email: 72 horas después
      else if (hoursSinceAbandoned >= 72 && hoursSinceAbandoned < 73 && !cart.third_email_sent) {
        emailNumber = 3;
      }

      if (!emailNumber) continue;

      // Obtener items del carrito
      const items = await db
        .prepare(
          `SELECT p.name as product_name, ci.quantity, p.sale_price as price, p.image_url as image
           FROM cart_items ci
           JOIN products p ON ci.product_id = p.id
           WHERE ci.cart_id = ?`
        )
        .bind(cart.cart_id)
        .all();

      const cartUrl = `https://tienda-pos.vercel.app/store/${cart.store_slug}/cart`;

      const emailData = {
        customer_name: cart.customer_name || 'Cliente',
        cart_items: items.results as any[],
        cart_total: cart.total_amount,
        discount_code: emailNumber === 2 ? 'CART10' : emailNumber === 3 ? 'CART15' : undefined,
        discount_percentage: emailNumber === 2 ? 10 : emailNumber === 3 ? 15 : undefined,
        cart_url: cartUrl,
        store_name: cart.store_name || 'Nuestra tienda',
      };

      const html = abandonedCartTemplate(emailData, emailNumber);

      const result = await sendEmail({
        to: cart.customer_email,
        toName: cart.customer_name,
        from: (prefs as any)?.from_email || 'noreply@tienda-pos.com',
        fromName: (prefs as any)?.from_name || cart.store_name || 'Tienda POS',
        subject:
          emailNumber === 1
            ? '🛒 ¡Olvidaste algo en tu carrito!'
            : emailNumber === 2
            ? '⏰ Tu carrito te está esperando + 10% descuento'
            : '🎁 Última oportunidad - 15% descuento en tu carrito',
        html,
      });

      if (result.success) {
        emailsSent++;

        // Actualizar flag de email enviado
        const field =
          emailNumber === 1
            ? 'first_email_sent'
            : emailNumber === 2
            ? 'second_email_sent'
            : 'third_email_sent';

        await db
          .prepare(`UPDATE abandoned_carts SET ${field} = 1 WHERE id = ?`)
          .bind(cart.id)
          .run();

        await logEmail(
          db,
          cart.user_profile_id,
          'cart_abandoned',
          cart.customer_email,
          `Carrito abandonado - Email ${emailNumber}`,
          'sent',
          undefined,
          {
            cart_id: cart.cart_id,
            email_number: emailNumber,
            total: cart.total_amount,
          }
        );
      } else {
        emailsFailed++;
        await logEmail(
          db,
          cart.user_profile_id,
          'cart_abandoned',
          cart.customer_email,
          `Carrito abandonado - Email ${emailNumber}`,
          'failed',
          result.error
        );
      }
    }

    return c.json({
      success: true,
      emails_sent: emailsSent,
      emails_failed: emailsFailed,
      total_carts: carts.results.length,
    });
  } catch (error) {
    console.error('Error sending abandoned cart emails:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * Get email preferences for a user
 */
app.get('/preferences', async (c) => {
  const db = c.env.DB;
  const userProfileId = c.get('userProfileId');

  try {
    let prefs = await db
      .prepare('SELECT * FROM email_preferences WHERE user_profile_id = ?')
      .bind(userProfileId)
      .first();

    // Si no existen preferencias, crear por defecto
    if (!prefs) {
      const id = crypto.randomUUID();
      await db
        .prepare(
          `INSERT INTO email_preferences (
            id, user_profile_id, daily_reports_enabled, daily_reports_time,
            subscription_reminders_enabled, stock_alerts_enabled, abandoned_cart_emails_enabled
          ) VALUES (?, ?, 1, '20:00', 1, 1, 1)`
        )
        .bind(id, userProfileId)
        .run();

      prefs = await db
        .prepare('SELECT * FROM email_preferences WHERE id = ?')
        .bind(id)
        .first();
    }

    return c.json({ success: true, data: prefs });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * Update email preferences
 */
app.put('/preferences', async (c) => {
  const db = c.env.DB;
  const userProfileId = c.get('userProfileId');
  const body = await c.req.json();

  try {
    await db
      .prepare(
        `UPDATE email_preferences SET
          daily_reports_enabled = ?,
          daily_reports_time = ?,
          subscription_reminders_enabled = ?,
          stock_alerts_enabled = ?,
          abandoned_cart_emails_enabled = ?,
          from_name = ?,
          from_email = ?
        WHERE user_profile_id = ?`
      )
      .bind(
        body.daily_reports_enabled ? 1 : 0,
        body.daily_reports_time || '20:00',
        body.subscription_reminders_enabled ? 1 : 0,
        body.stock_alerts_enabled ? 1 : 0,
        body.abandoned_cart_emails_enabled ? 1 : 0,
        body.from_name || null,
        body.from_email || null,
        userProfileId
      )
      .run();

    return c.json({ success: true, message: 'Preferencias actualizadas' });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * Get email logs for a user
 */
app.get('/logs', async (c) => {
  const db = c.env.DB;
  const userProfileId = c.get('userProfileId');
  const limit = c.req.query('limit') || '50';

  try {
    const logs = await db
      .prepare(
        `SELECT * FROM email_logs
         WHERE user_profile_id = ?
         ORDER BY created_at DESC
         LIMIT ?`
      )
      .bind(userProfileId, parseInt(limit))
      .all();

    return c.json({ success: true, data: logs.results });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

export default app;
