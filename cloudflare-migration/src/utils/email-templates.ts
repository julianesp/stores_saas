/**
 * Email templates for automated marketing emails
 * Plantillas HTML responsive para emails
 */

import {
  SubscriptionReminderData,
  DailyReportData,
  StockAlertData,
  AbandonedCartData,
} from '../types';

// Base template wrapper
function baseTemplate(content: string, primaryColor = '#2563eb'): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tienda POS</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f3f4f6;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background-color: ${primaryColor};
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 24px;
    }
    .content {
      padding: 40px 30px;
    }
    .button {
      display: inline-block;
      padding: 14px 28px;
      background-color: ${primaryColor};
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .footer {
      background-color: #f9fafb;
      padding: 30px;
      text-align: center;
      color: #6b7280;
      font-size: 14px;
    }
    .product-item {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 15px;
      margin: 10px 0;
      display: flex;
      align-items: center;
    }
    .product-image {
      width: 80px;
      height: 80px;
      object-fit: cover;
      border-radius: 6px;
      margin-right: 15px;
    }
    .stats-box {
      background-color: #f9fafb;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .stat-item {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .stat-item:last-child {
      border-bottom: none;
    }
    @media only screen and (max-width: 600px) {
      .content {
        padding: 30px 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    ${content}
    <div class="footer">
      <p>Este es un email automatizado de <strong>Tienda POS</strong></p>
      <p>Si no deseas recibir estos emails, puedes desactivarlos en la configuración de tu cuenta.</p>
      <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
        Powered by <a href="https://posib.dev" style="color: ${primaryColor};">Tienda POS</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Template: Recordatorio de suscripción próxima a vencer
 */
export function subscriptionReminderTemplate(data: SubscriptionReminderData): string {
  const content = `
    <div class="header">
      <h1>⏰ Tu suscripción está por vencer</h1>
    </div>
    <div class="content">
      <p style="font-size: 16px; color: #374151;">Hola <strong>${data.user_name}</strong>,</p>

      <p style="font-size: 16px; color: #374151; line-height: 1.6;">
        Queremos recordarte que tu suscripción a <strong>Tienda POS</strong> vence en
        <strong style="color: #dc2626;">${data.days_left} ${data.days_left === 1 ? 'día' : 'días'}</strong>.
      </p>

      <div class="stats-box">
        <div class="stat-item">
          <span>Plan</span>
          <strong>Plan Básico</strong>
        </div>
        <div class="stat-item">
          <span>Próximo cargo</span>
          <strong>$${data.plan_price.toLocaleString('es-CO')} COP</strong>
        </div>
        <div class="stat-item">
          <span>Fecha de renovación</span>
          <strong>${new Date(data.next_billing_date).toLocaleDateString('es-CO')}</strong>
        </div>
      </div>

      <p style="font-size: 16px; color: #374151;">
        Para continuar disfrutando de todas las funciones de tu sistema POS,
        asegúrate de renovar tu suscripción antes de la fecha de vencimiento.
      </p>

      <div style="text-align: center;">
        <a href="${data.payment_link}" class="button">Renovar Suscripción</a>
      </div>

      <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
        ¿Tienes alguna pregunta? Contáctanos respondiendo a este email.
      </p>
    </div>
  `;

  return baseTemplate(content);
}

/**
 * Template: Reporte diario de ventas
 */
export function dailyReportTemplate(data: DailyReportData): string {
  const topProductsHtml = data.top_products.map(p => `
    <div class="stat-item">
      <span>${p.name}</span>
      <strong>${p.quantity} unid. - $${p.revenue.toLocaleString('es-CO')}</strong>
    </div>
  `).join('');

  const lowStockHtml = data.low_stock_products.length > 0 ? `
    <h3 style="color: #dc2626; margin-top: 30px;">⚠️ Productos con bajo stock</h3>
    <div class="stats-box">
      ${data.low_stock_products.map(p => `
        <div class="stat-item">
          <span>${p.name}</span>
          <strong style="color: #dc2626;">${p.current_stock} / ${p.min_stock}</strong>
        </div>
      `).join('')}
    </div>
  ` : '';

  const content = `
    <div class="header">
      <h1>📊 Reporte Diario - ${data.store_name}</h1>
    </div>
    <div class="content">
      <p style="font-size: 16px; color: #374151;">
        Resumen de ventas del <strong>${new Date(data.date).toLocaleDateString('es-CO', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}</strong>
      </p>

      <div class="stats-box">
        <div class="stat-item">
          <span>Total de ventas</span>
          <strong style="font-size: 20px; color: #2563eb;">${data.total_sales}</strong>
        </div>
        <div class="stat-item">
          <span>Ingresos totales</span>
          <strong style="font-size: 20px; color: #059669;">$${data.total_revenue.toLocaleString('es-CO')} COP</strong>
        </div>
      </div>

      ${data.top_products.length > 0 ? `
        <h3 style="color: #374151; margin-top: 30px;">🏆 Productos más vendidos</h3>
        <div class="stats-box">
          ${topProductsHtml}
        </div>
      ` : ''}

      ${lowStockHtml}

      <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
        Inicia sesión en tu panel de control para ver el análisis completo.
      </p>

      <div style="text-align: center;">
        <a href="https://posib.dev/dashboard/analytics" class="button">Ver Dashboard</a>
      </div>
    </div>
  `;

  return baseTemplate(content);
}

/**
 * Template: Alerta de producto disponible
 */
export function stockAlertTemplate(data: StockAlertData): string {
  const content = `
    <div class="header">
      <h1>✨ ${data.product_name} está disponible!</h1>
    </div>
    <div class="content">
      <p style="font-size: 16px; color: #374151;">
        Buenas noticias! El producto que esperabas ya está disponible en <strong>${data.store_name}</strong>.
      </p>

      ${data.product_image ? `
        <div style="text-align: center; margin: 30px 0;">
          <img src="${data.product_image}" alt="${data.product_name}" style="max-width: 300px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        </div>
      ` : ''}

      <p style="font-size: 18px; font-weight: 600; color: #374151; text-align: center;">
        ${data.product_name}
      </p>

      <p style="font-size: 16px; color: #6b7280; text-align: center;">
        ¡Aprovecha ahora antes de que se agote nuevamente!
      </p>

      <div style="text-align: center;">
        <a href="${data.product_url}" class="button">Ver Producto</a>
      </div>
    </div>
  `;

  return baseTemplate(content, '#059669');
}

/**
 * Template: Carrito abandonado (primera vez - 1 hora)
 */
export function abandonedCartTemplate(data: AbandonedCartData, emailNumber: 1 | 2 | 3): string {
  const messages = {
    1: {
      title: '🛒 ¡Olvidaste algo en tu carrito!',
      message: 'Parece que dejaste algunos productos en tu carrito. ¿Necesitas ayuda para completar tu compra?',
      discount: 0,
    },
    2: {
      title: '⏰ Tu carrito te está esperando',
      message: 'Tus productos favoritos siguen esperándote. ¡Completa tu compra ahora y obtén un descuento especial!',
      discount: data.discount_percentage || 10,
    },
    3: {
      title: '🎁 Última oportunidad - Descuento especial',
      message: 'Esta es tu última oportunidad para aprovechar estos productos. ¡Te ofrecemos un descuento exclusivo!',
      discount: data.discount_percentage || 15,
    },
  };

  const msg = messages[emailNumber];

  const itemsHtml = data.cart_items.map(item => `
    <div class="product-item">
      ${item.image ? `<img src="${item.image}" alt="${item.product_name}" class="product-image">` : ''}
      <div style="flex: 1;">
        <p style="margin: 0; font-weight: 600; color: #374151;">${item.product_name}</p>
        <p style="margin: 5px 0 0 0; color: #6b7280;">
          Cantidad: ${item.quantity} × $${item.price.toLocaleString('es-CO')}
        </p>
      </div>
      <div style="font-weight: 600; color: #2563eb;">
        $${(item.quantity * item.price).toLocaleString('es-CO')}
      </div>
    </div>
  `).join('');

  const discountHtml = msg.discount > 0 ? `
    <div style="background-color: #fef3c7; border: 2px dashed #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
      <p style="margin: 0; font-size: 14px; color: #92400e;">CÓDIGO DE DESCUENTO</p>
      <p style="margin: 10px 0 0 0; font-size: 24px; font-weight: bold; color: #92400e; letter-spacing: 2px;">
        ${data.discount_code || `CART${msg.discount}`}
      </p>
      <p style="margin: 10px 0 0 0; font-size: 14px; color: #92400e;">
        ${msg.discount}% de descuento en tu compra
      </p>
    </div>
  ` : '';

  const content = `
    <div class="header">
      <h1>${msg.title}</h1>
    </div>
    <div class="content">
      <p style="font-size: 16px; color: #374151;">
        Hola <strong>${data.customer_name || 'Cliente'}</strong>,
      </p>

      <p style="font-size: 16px; color: #374151; line-height: 1.6;">
        ${msg.message}
      </p>

      <h3 style="color: #374151; margin-top: 30px;">Productos en tu carrito:</h3>
      ${itemsHtml}

      <div class="stats-box" style="margin-top: 20px;">
        <div class="stat-item">
          <span style="font-size: 18px;">Total del carrito</span>
          <strong style="font-size: 22px; color: #2563eb;">
            $${data.cart_total.toLocaleString('es-CO')} COP
          </strong>
        </div>
      </div>

      ${discountHtml}

      <div style="text-align: center; margin-top: 30px;">
        <a href="${data.cart_url}" class="button">Completar mi compra</a>
      </div>

      <p style="font-size: 14px; color: #6b7280; margin-top: 30px; text-align: center;">
        ¿Tienes alguna pregunta? Estamos aquí para ayudarte.
      </p>
    </div>
  `;

  return baseTemplate(content, '#8b5cf6');
}
