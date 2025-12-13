import { Hono } from 'hono';
import type { Env } from '../types';

const app = new Hono<{ Bindings: Env }>();

app.get('/', async (c) => {
  return c.json({ success: true, data: [], message: 'Get all debtors (customers with debt)' });
});

app.get('/:id/credit-sales', async (c) => {
  return c.json({ success: true, data: [], message: `Get credit sales for customer ${c.req.param('id')}` });
});

app.post('/:id/payments', async (c) => {
  return c.json({ success: true, message: 'Register credit payment' }, 201);
});

export default app;
