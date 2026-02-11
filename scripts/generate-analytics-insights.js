/**
 * Script para generar insights automáticos desde datos de analytics
 * Ejecutar como CRON job diario para actualizar insights
 *
 * Uso: node scripts/generate-analytics-insights.js
 */

const CLOUDFLARE_API_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL;
const CLOUDFLARE_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

if (!CLOUDFLARE_API_URL || !CLOUDFLARE_TOKEN) {
  console.error('❌ Error: CLOUDFLARE_API_URL and CLOUDFLARE_TOKEN are required');
  process.exit(1);
}

async function generateInsights() {
  console.log('🔍 Generando insights de analytics...\n');

  try {
    // 1. Obtener estadísticas de los últimos 30 días
    const statsResponse = await fetch(`${CLOUDFLARE_API_URL}/analytics/stats?days=30`, {
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!statsResponse.ok) {
      throw new Error('Failed to fetch analytics stats');
    }

    const stats = await statsResponse.json();

    const insights = [];

    // 2. Identificar funcionalidades populares (usadas por > 50% de usuarios)
    if (stats.top_features && stats.top_features.length > 0) {
      const totalUsers = new Set(stats.active_users.map(u => u.user_email)).size;

      stats.top_features.forEach(feature => {
        const adoptionRate = (feature.unique_users / totalUsers) * 100;

        if (adoptionRate > 50) {
          insights.push({
            type: 'popular_feature',
            title: `Feature Popular: ${feature.event_name}`,
            description: `${adoptionRate.toFixed(1)}% de usuarios activos usan "${feature.event_name}". Esta es una funcionalidad crítica que nunca debe fallar.`,
            data: JSON.stringify({
              feature: feature.event_name,
              adoption_rate: adoptionRate,
              uses: feature.uses,
              unique_users: feature.unique_users,
            }),
            priority: adoptionRate > 80 ? 'critical' : 'high',
            affected_users: feature.unique_users,
            confidence_score: 0.9,
          });
        }
      });
    }

    // 3. Identificar rutas críticas (páginas con > 100 visitas/día)
    if (stats.top_pages && stats.top_pages.length > 0) {
      const avgDailyViews = (page) => page.views / 30; // Promedio diario en 30 días

      stats.top_pages.forEach(page => {
        const dailyAvg = avgDailyViews(page);

        if (dailyAvg > 100) {
          insights.push({
            type: 'critical_path',
            title: `Ruta Crítica: ${page.page_path}`,
            description: `Esta página recibe ~${Math.round(dailyAvg)} visitas/día. Debe estar siempre disponible y optimizada.`,
            data: JSON.stringify({
              page_path: page.page_path,
              page_title: page.page_title,
              total_views: page.views,
              daily_avg: dailyAvg,
              unique_users: page.unique_users,
            }),
            priority: dailyAvg > 500 ? 'critical' : 'high',
            affected_users: page.unique_users,
            confidence_score: 0.95,
          });
        }
      });
    }

    // 4. Identificar features no usadas (< 5% adopción)
    if (stats.top_features && stats.top_features.length > 0) {
      const totalUsers = new Set(stats.active_users.map(u => u.user_email)).size;

      stats.top_features.forEach(feature => {
        const adoptionRate = (feature.unique_users / totalUsers) * 100;

        if (adoptionRate < 5 && feature.uses < 10) {
          insights.push({
            type: 'unused_feature',
            title: `Feature Poco Usada: ${feature.event_name}`,
            description: `Solo ${adoptionRate.toFixed(1)}% de usuarios usan "${feature.event_name}". Considera mejorar el onboarding o eliminar esta funcionalidad.`,
            data: JSON.stringify({
              feature: feature.event_name,
              adoption_rate: adoptionRate,
              uses: feature.uses,
              unique_users: feature.unique_users,
            }),
            priority: 'low',
            affected_users: feature.unique_users,
            confidence_score: 0.7,
          });
        }
      });
    }

    // 5. Identificar usuarios power users (> 1000 eventos)
    if (stats.active_users && stats.active_users.length > 0) {
      stats.active_users.forEach(user => {
        if (user.events_count > 1000) {
          insights.push({
            type: 'power_user',
            title: `Power User: ${user.store_name || user.user_email}`,
            description: `Este usuario ha generado ${user.events_count} eventos en 30 días. Es un usuario muy activo - excelente candidato para testimonial o caso de éxito.`,
            data: JSON.stringify({
              user_email: user.user_email,
              store_name: user.store_name,
              events_count: user.events_count,
              subscription_status: user.subscription_status,
            }),
            priority: 'medium',
            affected_users: 1,
            confidence_score: 1.0,
          });
        }
      });
    }

    // 6. Identificar usuarios en riesgo de churn (< 10 eventos en 30 días)
    if (stats.active_users && stats.active_users.length > 0) {
      stats.active_users.forEach(user => {
        if (user.events_count < 10 && user.subscription_status !== 'trial') {
          insights.push({
            type: 'churn_risk',
            title: `Riesgo de Churn: ${user.store_name || user.user_email}`,
            description: `Este usuario solo ha generado ${user.events_count} eventos en 30 días. Baja actividad puede indicar riesgo de cancelación.`,
            data: JSON.stringify({
              user_email: user.user_email,
              store_name: user.store_name,
              events_count: user.events_count,
              subscription_status: user.subscription_status,
            }),
            priority: 'high',
            affected_users: 1,
            confidence_score: 0.8,
          });
        }
      });
    }

    // 7. Identificar errores frecuentes
    if (stats.recent_errors && stats.recent_errors.length > 0) {
      stats.recent_errors.forEach(error => {
        if (error.occurrences > 5) {
          insights.push({
            type: 'frequent_error',
            title: `Error Frecuente: ${error.event_name}`,
            description: `Este error ha ocurrido ${error.occurrences} veces en los últimos 30 días. Requiere atención urgente.`,
            data: JSON.stringify({
              error_name: error.event_name,
              page_path: error.page_path,
              occurrences: error.occurrences,
              last_occurrence: error.last_occurrence,
              metadata: error.metadata,
            }),
            priority: error.occurrences > 20 ? 'critical' : 'high',
            affected_users: 0, // No sabemos cuántos usuarios afectó
            confidence_score: 0.95,
          });
        }
      });
    }

    console.log(`✅ Se generaron ${insights.length} insights\n`);

    // 8. Guardar insights en la base de datos
    for (const insight of insights) {
      try {
        const response = await fetch(`${CLOUDFLARE_API_URL}/analytics/insights`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${CLOUDFLARE_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            insight_type: insight.type,
            title: insight.title,
            description: insight.description,
            data: insight.data,
            priority: insight.priority,
            affected_users: insight.affected_users,
            confidence_score: insight.confidence_score,
          }),
        });

        if (response.ok) {
          console.log(`✓ ${insight.title}`);
        } else {
          console.error(`✗ Error guardando insight: ${insight.title}`);
        }
      } catch (error) {
        console.error(`✗ Error: ${error.message}`);
      }
    }

    console.log('\n🎉 Insights generados exitosamente!');

  } catch (error) {
    console.error('❌ Error generando insights:', error);
    process.exit(1);
  }
}

// Ejecutar script
generateInsights();
