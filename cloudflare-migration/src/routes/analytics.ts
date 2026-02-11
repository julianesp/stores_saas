import { Hono } from 'hono';
import { Env } from '../types/env';

const app = new Hono<{ Bindings: Env }>();

/**
 * POST /analytics/events
 * Guardar evento de analytics en D1
 */
app.post('/events', async (c) => {
  try {
    const body = await c.req.json();

    // Insertar evento en D1
    const result = await c.env.DB.prepare(`
      INSERT INTO user_analytics (
        user_id,
        user_email,
        store_name,
        event_type,
        event_name,
        page_path,
        page_title,
        metadata,
        session_id,
        device_type,
        browser,
        duration_ms,
        subscription_status,
        has_ai_addon,
        has_store_addon,
        has_email_addon
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
      .bind(
        body.user_id,
        body.user_email,
        body.store_name,
        body.event_type,
        body.event_name,
        body.page_path,
        body.page_title,
        body.metadata,
        body.session_id,
        body.device_type,
        body.browser,
        body.duration_ms,
        body.subscription_status,
        body.has_ai_addon,
        body.has_store_addon,
        body.has_email_addon
      )
      .run();

    return c.json({ success: true, eventId: result.meta.last_row_id });
  } catch (error: any) {
    console.error('[analytics/events] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /analytics/stats
 * Obtener estadísticas generales de analytics
 */
app.get('/stats', async (c) => {
  try {
    const days = parseInt(c.req.query('days') || '7');

    // Eventos por tipo
    const eventsByType = await c.env.DB.prepare(`
      SELECT
        event_type,
        COUNT(*) as count
      FROM user_analytics
      WHERE timestamp >= datetime('now', '-${days} days')
      GROUP BY event_type
      ORDER BY count DESC
    `).all();

    // Páginas más visitadas
    const topPages = await c.env.DB.prepare(`
      SELECT
        page_path,
        page_title,
        COUNT(*) as views,
        COUNT(DISTINCT user_id) as unique_users
      FROM user_analytics
      WHERE event_type = 'page_view'
        AND timestamp >= datetime('now', '-${days} days')
        AND page_path IS NOT NULL
      GROUP BY page_path, page_title
      ORDER BY views DESC
      LIMIT 20
    `).all();

    // Features más usadas
    const topFeatures = await c.env.DB.prepare(`
      SELECT
        event_name,
        COUNT(*) as uses,
        COUNT(DISTINCT user_id) as unique_users
      FROM user_analytics
      WHERE event_type = 'feature_use'
        AND timestamp >= datetime('now', '-${days} days')
      GROUP BY event_name
      ORDER BY uses DESC
      LIMIT 15
    `).all();

    // Usuarios más activos
    const activeUsers = await c.env.DB.prepare(`
      SELECT
        user_email,
        store_name,
        COUNT(*) as events_count,
        subscription_status,
        has_ai_addon,
        has_store_addon,
        has_email_addon
      FROM user_analytics
      WHERE timestamp >= datetime('now', '-${days} days')
      GROUP BY user_id, user_email, store_name, subscription_status, has_ai_addon, has_store_addon, has_email_addon
      ORDER BY events_count DESC
      LIMIT 20
    `).all();

    // Dispositivos y navegadores
    const deviceStats = await c.env.DB.prepare(`
      SELECT
        device_type,
        COUNT(*) as count
      FROM user_analytics
      WHERE timestamp >= datetime('now', '-${days} days')
      GROUP BY device_type
    `).all();

    const browserStats = await c.env.DB.prepare(`
      SELECT
        browser,
        COUNT(*) as count
      FROM user_analytics
      WHERE timestamp >= datetime('now', '-${days} days')
      GROUP BY browser
      ORDER BY count DESC
    `).all();

    // Errores recientes
    const recentErrors = await c.env.DB.prepare(`
      SELECT
        event_name,
        page_path,
        metadata,
        COUNT(*) as occurrences,
        MAX(timestamp) as last_occurrence
      FROM user_analytics
      WHERE event_type = 'error'
        AND timestamp >= datetime('now', '-${days} days')
      GROUP BY event_name, page_path, metadata
      ORDER BY occurrences DESC
      LIMIT 10
    `).all();

    return c.json({
      period_days: days,
      events_by_type: eventsByType.results,
      top_pages: topPages.results,
      top_features: topFeatures.results,
      active_users: activeUsers.results,
      device_stats: deviceStats.results,
      browser_stats: browserStats.results,
      recent_errors: recentErrors.results,
    });
  } catch (error: any) {
    console.error('[analytics/stats] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /analytics/user/:userId
 * Obtener analytics de un usuario específico
 */
app.get('/user/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const days = parseInt(c.req.query('days') || '30');

    // Actividad del usuario
    const userActivity = await c.env.DB.prepare(`
      SELECT
        DATE(timestamp) as date,
        COUNT(*) as events
      FROM user_analytics
      WHERE user_id = ?
        AND timestamp >= datetime('now', '-${days} days')
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
    `)
      .bind(userId)
      .all();

    // Páginas visitadas por el usuario
    const userPages = await c.env.DB.prepare(`
      SELECT
        page_path,
        page_title,
        COUNT(*) as visits
      FROM user_analytics
      WHERE user_id = ?
        AND event_type = 'page_view'
        AND timestamp >= datetime('now', '-${days} days')
      GROUP BY page_path, page_title
      ORDER BY visits DESC
    `)
      .bind(userId)
      .all();

    // Features usadas por el usuario
    const userFeatures = await c.env.DB.prepare(`
      SELECT
        event_name,
        COUNT(*) as uses
      FROM user_analytics
      WHERE user_id = ?
        AND event_type = 'feature_use'
        AND timestamp >= datetime('now', '-${days} days')
      GROUP BY event_name
      ORDER BY uses DESC
    `)
      .bind(userId)
      .all();

    return c.json({
      user_id: userId,
      period_days: days,
      activity: userActivity.results,
      pages: userPages.results,
      features: userFeatures.results,
    });
  } catch (error: any) {
    console.error('[analytics/user] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /analytics/insights
 * Obtener insights automáticos
 */
app.get('/insights', async (c) => {
  try {
    const insights = await c.env.DB.prepare(`
      SELECT *
      FROM analytics_insights
      WHERE status = 'active'
      ORDER BY priority DESC, created_at DESC
      LIMIT 50
    `).all();

    return c.json({ insights: insights.results });
  } catch (error: any) {
    console.error('[analytics/insights] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /analytics/insights
 * Crear un nuevo insight
 */
app.post('/insights', async (c) => {
  try {
    const body = await c.req.json();

    // Verificar si ya existe un insight similar (mismo tipo y título)
    const existing = await c.env.DB.prepare(`
      SELECT id
      FROM analytics_insights
      WHERE insight_type = ?
        AND title = ?
        AND status = 'active'
    `)
      .bind(body.insight_type, body.title)
      .first();

    if (existing) {
      // Actualizar insight existente
      await c.env.DB.prepare(`
        UPDATE analytics_insights
        SET
          description = ?,
          data = ?,
          priority = ?,
          affected_users = ?,
          confidence_score = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
        .bind(
          body.description,
          body.data,
          body.priority,
          body.affected_users,
          body.confidence_score,
          existing.id
        )
        .run();

      return c.json({ success: true, message: 'Insight updated', id: existing.id });
    } else {
      // Crear nuevo insight
      const result = await c.env.DB.prepare(`
        INSERT INTO analytics_insights (
          insight_type,
          title,
          description,
          data,
          priority,
          affected_users,
          confidence_score
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
        .bind(
          body.insight_type,
          body.title,
          body.description,
          body.data,
          body.priority,
          body.affected_users,
          body.confidence_score
        )
        .run();

      return c.json({ success: true, message: 'Insight created', id: result.meta.last_row_id });
    }
  } catch (error: any) {
    console.error('[analytics/insights/create] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
