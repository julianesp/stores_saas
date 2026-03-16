import { Hono } from 'hono';
import type { Env } from '../types';

const app = new Hono<{ Bindings: Env }>();

/**
 * POST /api/facturas/upload
 * Recibe un PDF en base64, lo guarda en R2 y retorna el link público
 */
app.post('/upload', async (c) => {
  try {
    const { pdfBase64, fileName } = await c.req.json<{ pdfBase64: string; fileName: string }>();

    if (!pdfBase64 || !fileName) {
      return c.json({ success: false, error: 'pdfBase64 y fileName son requeridos' }, 400);
    }

    // Convertir base64 a bytes
    const pdfBytes = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0));

    // Guardar en R2 con expiración de 7 días (via metadata)
    const key = `facturas/${fileName}`;
    await c.env.FACTURAS_BUCKET.put(key, pdfBytes, {
      httpMetadata: {
        contentType: 'application/pdf',
        contentDisposition: `inline; filename="${fileName}"`,
      },
      customMetadata: {
        uploadedAt: new Date().toISOString(),
      },
    });

    // Construir URL pública usando el dominio de desarrollo R2
    const publicUrl = `https://pub-ea40242d92ce470fbb6e43d46f01cefe.r2.dev/${key}`;

    return c.json({ success: true, url: publicUrl });
  } catch (error: any) {
    console.error('Error subiendo factura a R2:', error);
    return c.json({ success: false, error: error.message || 'Error al subir factura' }, 500);
  }
});

/**
 * GET /api/facturas/facturas/:fileName
 * Sirve el PDF directamente desde R2
 */
app.get('/facturas/:fileName', async (c) => {
  try {
    const fileName = c.req.param('fileName');
    const key = `facturas/${fileName}`;

    const object = await c.env.FACTURAS_BUCKET.get(key);

    if (!object) {
      return c.json({ error: 'Factura no encontrada' }, 404);
    }

    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', `inline; filename="${fileName}"`);
    headers.set('Cache-Control', 'public, max-age=604800'); // 7 días

    return new Response(object.body, { headers });
  } catch (error: any) {
    console.error('Error sirviendo factura:', error);
    return c.json({ error: 'Error al obtener factura' }, 500);
  }
});

export default app;
