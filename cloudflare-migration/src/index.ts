/**
 * Tienda POS - Cloudflare Workers API
 * Multi-tenant POS system with isolated databases per store
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import { authMiddleware } from './middleware/auth';

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

const app = new Hono<{ Bindings: Env }>();

// CORS middleware - allow localhost and vercel domains
app.use('/*', cors({
  origin: (origin) => {
    // Allow localhost
    if (origin?.startsWith('http://localhost:')) return origin;
    // Allow Vercel deployments
    if (origin?.endsWith('.vercel.app')) return origin;
    // Allow specific production domain if needed
    if (origin === 'https://tienda-pos.vercel.app') return origin;
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

// Apply authentication middleware to all API routes
app.use('/api/*', authMiddleware);

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

export default app;
