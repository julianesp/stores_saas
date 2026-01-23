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
import subscriptionsRoutes from './routes/subscriptions';
import emailRoutes from './routes/email';
import statsRoutes from './routes/stats';

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
  allowHeaders: ['Content-Type', 'Authorization'],
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

// Stats public API (NO auth required - estadísticas públicas)
app.route('/stats', statsRoutes);

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

  console.log('Cron jobs completed');
}

// Export default compatible con ambos fetch y scheduled
export default {
  fetch: app.fetch,
  scheduled,
};
