/**
 * Tienda POS - Cloudflare Workers API
 * Multi-tenant POS system with isolated databases per store
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import { authMiddleware } from './middleware/auth';
import type { ScheduledEvent, ExecutionContext } from '@cloudflare/workers-types';

// Import routes
import productsRoutes from './routes/products';
import customersRoutes from './routes/customers';
import salesRoutes from './routes/sales';
import categoriesRoutes from './routes/categories';
import suppliersRoutes from './routes/suppliers';
import purchaseOrdersRoutes from './routes/purchase-orders';
import debtorsRoutes from './routes/debtors';
import userProfilesRoutes from './routes/user-profiles';
import creditPaymentsRoutes from './routes/credit-payments';
import offersRoutes from './routes/offers';
import paymentTransactionsRoutes from './routes/payment-transactions';
import webhooksRoutes from './routes/webhooks';
import adminStatsRoutes from './routes/admin-stats';
import storefrontRoutes from './routes/storefront';
import shippingZonesRoutes from './routes/shipping-zones';
import wompiRoutes from './routes/wompi';
import epaycoStorefrontRoutes from './routes/epayco-storefront';
import subscriptionsRoutes from './routes/subscriptions';
import emailRoutes from './routes/email';
import statsRoutes from './routes/stats';
import loyaltySettingsRoutes from './routes/loyalty-settings';
import teamInvitationsRoutes from './routes/team-invitations';
import analyticsRoutes from './routes/analytics';
import userStoresRoutes from './routes/user-stores';
import facturasRoutes from './routes/facturas';
import marketTrendsRoutes from './routes/market-trends';
import posReviewsRoutes from './routes/pos-reviews';

const app = new Hono<{ Bindings: Env }>();

// CORS middleware - allow localhost and vercel domains
app.use('/*', cors({
  origin: (origin) => {
    // Allow localhost
    if (origin?.startsWith('http://localhost:')) return origin;
    // Allow Vercel deployments
    if (origin?.endsWith('.vercel.app')) return origin;
    // Allow specific production domain if needed
    if (origin === 'https://posib.dev') return origin;
    return 'http://localhost:3000'; // fallback
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}));

// Health check endpoint (no auth required)
app.get('/health', (c) => {
  return c.json({
    success: true,
    message: 'Tienda POS API is running',
    environment: c.env.ENVIRONMENT || 'unknown',
    timestamp: new Date().toISOString(),
  });
});

// Public endpoints
app.get('/', (c) => {
  return c.json({
    success: true,
    message: 'Tienda POS Multi-Tenant API',
    version: '1.0.0',
    docs: '/docs',
  });
});

// Webhooks (NO auth middleware - verifican su propio secret)
app.route('/api/webhooks', webhooksRoutes);

// Wompi webhook (NO auth - Wompi verifica con signature)
app.post('/api/wompi/webhook', wompiRoutes);

// Subscriptions webhook (NO auth - Wompi verifica con signature)
app.post('/api/subscriptions/webhook', subscriptionsRoutes);

// Storefront public API (NO auth required - endpoints públicos para tiendas online)
app.route('/api/storefront', storefrontRoutes);

// ePayco storefront (NO auth required - pagos públicos para tiendas online)
app.route('/api/storefront/epayco', epaycoStorefrontRoutes);

// Stats public API (NO auth required - estadísticas públicas)
app.route('/stats', statsRoutes);

// Team invitations accept endpoint (NO auth middleware - maneja autenticación internamente)
app.post('/api/team-invitations/accept', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({
        success: false,
        error: 'No autorizado',
      }, 401);
    }

    const token = authHeader.substring(7);

    // Verificar token de Clerk manualmente
    const { decodeClerkToken } = await import('./middleware/auth-helpers');
    let clerkUserId: string;

    try {
      const payload = await decodeClerkToken(token);
      clerkUserId = payload.sub || '';
      if (!clerkUserId) {
        throw new Error('Invalid token');
      }
    } catch (error) {
      return c.json({
        success: false,
        error: 'Token inválido',
      }, 401);
    }

    // Obtener datos del body
    const body = await c.req.json();
    const { token: invitationToken } = body;

    // IMPORTANTE: Usar SOLO el clerk_user_id del token JWT autenticado
    // NO usar el que viene en el body, ya que podría ser diferente
    const userId = clerkUserId;

    if (!invitationToken || !userId) {
      return c.json({
        success: false,
        error: 'Token de invitación requerido',
      }, 400);
    }

    // Buscar la invitación
    const member = await c.env.DB
      .prepare('SELECT * FROM team_members WHERE invitation_token = ?')
      .bind(invitationToken)
      .first<any>();

    if (!member) {
      return c.json({
        success: false,
        error: 'Invitación no encontrada',
      }, 404);
    }

    // Verificar si la invitación ya fue aceptada
    if (member.invitation_status === 'accepted') {
      return c.json({
        success: false,
        error: 'Esta invitación ya fue aceptada',
      }, 400);
    }

    // Verificar si la invitación expiró
    if (member.invitation_expires_at && new Date(member.invitation_expires_at) < new Date()) {
      return c.json({
        success: false,
        error: 'Esta invitación ha expirado',
      }, 400);
    }

    // Verificar si la invitación fue revocada
    if (member.invitation_status === 'revoked') {
      return c.json({
        success: false,
        error: 'Esta invitación ha sido revocada',
      }, 400);
    }

    // Actualizar el miembro con el clerk_user_id y marcar como aceptado
    const now = new Date().toISOString();
    await c.env.DB
      .prepare(`
        UPDATE team_members
        SET clerk_user_id = ?,
            invitation_status = 'accepted',
            invitation_accepted_at = ?,
            status = 'active',
            updated_at = ?
        WHERE id = ?
      `)
      .bind(userId, now, now, member.id)
      .run();

    const updatedMember = await c.env.DB
      .prepare('SELECT * FROM team_members WHERE id = ?')
      .bind(member.id)
      .first<any>();

    return c.json({
      success: true,
      teamMember: updatedMember,
      message: 'Invitación aceptada exitosamente',
    });
  } catch (error: any) {
    console.error('Error aceptando invitación:', error);
    return c.json({
      success: false,
      error: error.message || 'Error al aceptar invitación',
    }, 500);
  }
});

// Email CRON endpoints (NO auth - solo para llamadas internas de CRON)
// IMPORTANTE: Estos endpoints solo deben ser llamados por el CRON scheduler
// Necesitamos crear un handler específico que llame al sub-router sin autenticación
const emailCronHandler = async (c: any) => {
  // Crear una request interna que será procesada por emailRoutes
  const path = c.req.path.replace('/api/email', '');
  const newReq = new Request(c.req.url.replace(c.req.path, path), {
    method: c.req.method,
    headers: c.req.headers,
    body: c.req.body,
  });
  return emailRoutes.fetch(newReq, c.env, c.executionCtx);
};

app.post('/api/email/daily-reports', emailCronHandler);
app.post('/api/email/subscription-reminders', emailCronHandler);
app.post('/api/email/stock-alerts', emailCronHandler);
app.post('/api/email/abandoned-carts', emailCronHandler);

// Team invitations public endpoint (NO auth - para usuarios no autenticados)
app.get('/api/team-invitations/validate', async (c) => {
  const token = c.req.query('token');

  if (!token) {
    return c.json({
      error: 'Token requerido',
    }, 400);
  }

  try {
    // Buscar la invitación por token
    const member = await c.env.DB
      .prepare('SELECT * FROM team_members WHERE invitation_token = ?')
      .bind(token)
      .first<any>();

    if (!member) {
      return c.json({
        error: 'Invitación no encontrada',
      }, 404);
    }

    // Verificar si la invitación ya fue aceptada
    if (member.invitation_status === 'accepted') {
      return c.json({
        error: 'Esta invitación ya fue aceptada',
      }, 400);
    }

    // Verificar si la invitación expiró
    if (member.invitation_expires_at && new Date(member.invitation_expires_at) < new Date()) {
      return c.json({
        error: 'Esta invitación ha expirado',
      }, 400);
    }

    // Verificar si la invitación fue revocada
    if (member.invitation_status === 'revoked') {
      return c.json({
        error: 'Esta invitación ha sido revocada',
      }, 400);
    }

    // Obtener información del owner (dueño de la tienda)
    const owner = await c.env.DB
      .prepare('SELECT * FROM user_profiles WHERE id = ?')
      .bind(member.owner_id)
      .first<any>();

    return c.json({
      email: member.email,
      role: member.role,
      store_name: owner?.store_name || 'Sistema POS',
      inviter_name: owner?.full_name || owner?.email,
      expires_at: member.invitation_expires_at,
    });
  } catch (error: any) {
    console.error('Error validando invitación:', error);
    return c.json({
      error: error.message || 'Error al validar invitación',
    }, 500);
  }
});

// Apply authentication middleware to all API routes
app.use('/api/*', authMiddleware);

// Wompi routes (protected - requieren autenticación del tenant)
app.route('/api/wompi', wompiRoutes);

// Subscriptions routes (protected - requieren autenticación)
app.route('/api/subscriptions', subscriptionsRoutes);

// API Routes (all protected by auth)
app.route('/api/products', productsRoutes);
app.route('/api/customers', customersRoutes);
app.route('/api/sales', salesRoutes);
app.route('/api/categories', categoriesRoutes);
app.route('/api/suppliers', suppliersRoutes);
app.route('/api/purchase-orders', purchaseOrdersRoutes);
app.route('/api/debtors', debtorsRoutes);
app.route('/api/user-profiles', userProfilesRoutes);
app.route('/api/credit-payments', creditPaymentsRoutes);
app.route('/api/offers', offersRoutes);
app.route('/api/payment-transactions', paymentTransactionsRoutes);
app.route('/api/shipping-zones', shippingZonesRoutes);
app.route('/api/admin', adminStatsRoutes);
app.route('/api/email', emailRoutes);
app.route('/loyalty-settings', loyaltySettingsRoutes);
app.route('/api/team-invitations', teamInvitationsRoutes);
// Alias para team-members (mismas rutas que team-invitations)
app.route('/api/team-members', teamInvitationsRoutes);
app.route('/api/analytics', analyticsRoutes);
app.route('/api/user-stores', userStoresRoutes);
app.route('/api/facturas', facturasRoutes);
app.route('/api/market', marketTrendsRoutes);
app.route('/api/pos-reviews', posReviewsRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({
    success: false,
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
  }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Global error handler:', err);

  return c.json({
    success: false,
    error: 'Internal Server Error',
    message: c.env.ENVIRONMENT === 'development' ? err.message : 'An error occurred',
  }, 500);
});

/**
 * Scheduled handler para Cron Triggers
 * Ejecuta los trabajos programados de email marketing
 */
async function scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
  console.log('Cron trigger fired:', event.cron);

  // Helper para hacer requests internos
  const makeRequest = async (path: string) => {
    try {
      const request = new Request(`https://internal/${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await app.fetch(request, env, ctx);
      return await response.json();
    } catch (error) {
      console.error(`Error in ${path}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  // Ejecutar tareas según el horario
  const hour = new Date().getUTCHours();

  // 9 AM UTC - Recordatorios de suscripción
  if (hour === 9) {
    console.log('Running subscription reminders...');
    const result = await makeRequest('api/email/subscription-reminders');
    console.log('Subscription reminders result:', result);
  }

  // Cada hora - Reportes diarios (verifican preferencias internas)
  console.log('Running daily reports check...');
  const reportsResult = await makeRequest('api/email/daily-reports');
  console.log('Daily reports result:', reportsResult);

  // Cada 2 horas - Alertas de stock (solo en horas pares)
  if (hour % 2 === 0) {
    console.log('Running stock alerts...');
    const stockResult = await makeRequest('api/email/stock-alerts');
    console.log('Stock alerts result:', stockResult);
  }

  // Cada hora - Carritos abandonados
  console.log('Running abandoned carts check...');
  const cartsResult = await makeRequest('api/email/abandoned-carts');
  console.log('Abandoned carts result:', cartsResult);

  // A las 8 AM - Recordatorios de deudas
  if (hour === 8) {
    console.log('Running debt reminders...');
    const debtResult = await makeRequest('api/email/debt-reminders');
    console.log('Debt reminders result:', debtResult);
  }

  console.log('Cron jobs completed');
}

// Export default compatible con ambos fetch y scheduled
export default {
  fetch: app.fetch,
  scheduled,
};
