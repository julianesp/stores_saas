'use client';

import React, { forwardRef } from 'react';
import { Sale, SaleItemWithProduct, Customer, UserProfile } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface InvoiceReceiptProps {
  sale: Sale;
  saleItems: SaleItemWithProduct[];
  customer?: Customer | null;
  storeInfo: UserProfile;
  cashierName?: string;
}

/**
 * Componente de Factura/Recibo
 * Se puede imprimir y generar como PDF
 */
export const InvoiceReceipt = forwardRef<HTMLDivElement, InvoiceReceiptProps>(
  ({ sale, saleItems, customer, storeInfo, cashierName }, ref) => {
    // Formatear fecha y hora
    const saleDate = new Date(sale.created_at);
    const formattedDate = format(saleDate, "dd 'de' MMMM 'de' yyyy", { locale: es });
    const formattedTime = format(saleDate, 'HH:mm:ss', { locale: es });

    // Calcular totales
    const subtotalAmount = saleItems.reduce((sum, item) => sum + item.subtotal, 0);
    const discountAmount = sale.discount || 0;
    const taxAmount = sale.tax || 0;
    const totalAmount = sale.total;

    // Método de pago en español
    const paymentMethodLabels: Record<string, string> = {
      efectivo: 'Efectivo',
      tarjeta: 'Tarjeta',
      transferencia: 'Transferencia',
      credito: 'Crédito',
    };

    return (
      <div
        ref={ref}
        className="bg-white p-8 max-w-2xl mx-auto text-black"
        style={{
          fontFamily: 'monospace',
          fontSize: '14px',
          lineHeight: '1.5',
          color: '#000000',
        }}
      >
        {/* Encabezado de la tienda */}
        <div className="text-center border-b-2 border-gray-300 pb-4 mb-4" style={{ color: '#000000' }}>
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#000000' }}>
            {storeInfo.full_name || 'TIENDA POS'}
          </h1>
          {storeInfo.phone && (
            <p className="text-sm" style={{ color: '#000000' }}>Tel: {storeInfo.phone}</p>
          )}
          {storeInfo.email && (
            <p className="text-sm" style={{ color: '#000000' }}>Email: {storeInfo.email}</p>
          )}
          {/* Aquí se podría agregar dirección y NIT si se agregan al perfil */}
        </div>

        {/* Información de la factura */}
        <div className="border-b border-gray-300 pb-3 mb-3" style={{ color: '#000000' }}>
          <div className="flex justify-between mb-1">
            <span className="font-bold" style={{ color: '#000000' }}>FACTURA/RECIBO:</span>
            <span style={{ color: '#000000' }}>#{sale.sale_number}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span className="font-bold" style={{ color: '#000000' }}>Fecha:</span>
            <span style={{ color: '#000000' }}>{formattedDate}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span className="font-bold" style={{ color: '#000000' }}>Hora:</span>
            <span style={{ color: '#000000' }}>{formattedTime}</span>
          </div>
          {cashierName && (
            <div className="flex justify-between mb-1">
              <span className="font-bold" style={{ color: '#000000' }}>Atendido por:</span>
              <span style={{ color: '#000000' }}>{cashierName}</span>
            </div>
          )}
        </div>

        {/* Información del cliente */}
        {customer && (
          <div className="border-b border-gray-300 pb-3 mb-3" style={{ color: '#000000' }}>
            <p className="font-bold mb-1" style={{ color: '#000000' }}>CLIENTE:</p>
            <p style={{ color: '#000000' }}>{customer.name}</p>
            {customer.phone && <p style={{ color: '#000000' }}>Tel: {customer.phone}</p>}
            {customer.id_number && <p style={{ color: '#000000' }}>ID: {customer.id_number}</p>}
            {customer.loyalty_points > 0 && (
              <p className="text-sm text-green-600 mt-1" style={{ color: '#16a34a' }}>
                Puntos de lealtad: {customer.loyalty_points}
              </p>
            )}
          </div>
        )}

        {/* Detalles de los productos */}
        <div className="border-b border-gray-300 pb-3 mb-3" style={{ color: '#000000' }}>
          <p className="font-bold mb-2" style={{ color: '#000000' }}>DETALLE DE LA COMPRA:</p>

          {/* Encabezado de la tabla */}
          <div className="flex border-b border-gray-200 pb-1 mb-2 text-xs" style={{ color: '#000000' }}>
            <div className="flex-1" style={{ color: '#000000' }}>PRODUCTO</div>
            <div className="w-16 text-center" style={{ color: '#000000' }}>CANT</div>
            <div className="w-24 text-right" style={{ color: '#000000' }}>P.UNIT</div>
            <div className="w-24 text-right" style={{ color: '#000000' }}>SUBTOTAL</div>
          </div>

          {/* Items */}
          {saleItems.map((item, index) => (
            <div key={index} className="mb-2" style={{ color: '#000000' }}>
              <div className="flex items-start">
                <div className="flex-1 pr-2">
                  <span className="font-medium" style={{ color: '#000000' }}>{item.product?.name || 'Producto'}</span>
                  {item.discount > 0 && (
                    <span className="text-xs ml-2" style={{ color: '#dc2626' }}>
                      (Desc: {formatCurrency(item.discount)})
                    </span>
                  )}
                </div>
                <div className="w-16 text-center" style={{ color: '#000000' }}>{item.quantity}</div>
                <div className="w-24 text-right" style={{ color: '#000000' }}>
                  {formatCurrency(item.unit_price)}
                </div>
                <div className="w-24 text-right font-medium" style={{ color: '#000000' }}>
                  {formatCurrency(item.subtotal)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Totales */}
        <div className="border-b-2 border-gray-300 pb-3 mb-3" style={{ color: '#000000' }}>
          <div className="flex justify-between mb-1">
            <span style={{ color: '#000000' }}>Subtotal:</span>
            <span style={{ color: '#000000' }}>{formatCurrency(subtotalAmount)}</span>
          </div>

          {discountAmount > 0 && (
            <div className="flex justify-between mb-1" style={{ color: '#dc2626' }}>
              <span>Descuento:</span>
              <span>- {formatCurrency(discountAmount)}</span>
            </div>
          )}

          {taxAmount > 0 && (
            <div className="flex justify-between mb-1">
              <span style={{ color: '#000000' }}>Impuesto (IVA):</span>
              <span style={{ color: '#000000' }}>{formatCurrency(taxAmount)}</span>
            </div>
          )}

          <div className="flex justify-between mt-2 pt-2 border-t border-gray-300 text-lg font-bold">
            <span style={{ color: '#000000' }}>TOTAL:</span>
            <span style={{ color: '#000000' }}>{formatCurrency(totalAmount)}</span>
          </div>
        </div>

        {/* Información de pago */}
        <div className="border-b border-gray-300 pb-3 mb-3" style={{ color: '#000000' }}>
          <div className="flex justify-between mb-1">
            <span className="font-bold" style={{ color: '#000000' }}>Método de pago:</span>
            <span style={{ color: '#000000' }}>{paymentMethodLabels[sale.payment_method] || sale.payment_method}</span>
          </div>

          {sale.payment_status && (
            <div className="flex justify-between mb-1">
              <span className="font-bold" style={{ color: '#000000' }}>Estado:</span>
              <span className="capitalize" style={{ color: '#000000' }}>{sale.payment_status}</span>
            </div>
          )}

          {sale.payment_method === 'credito' && sale.amount_pending && sale.amount_pending > 0 && (
            <div className="mt-2 p-2 bg-yellow-50 rounded">
              <div className="flex justify-between text-sm" style={{ color: '#000000' }}>
                <span>Monto pagado:</span>
                <span>{formatCurrency(sale.amount_paid || 0)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold" style={{ color: '#dc2626' }}>
                <span>Saldo pendiente:</span>
                <span>{formatCurrency(sale.amount_pending)}</span>
              </div>
              {sale.due_date && (
                <div className="text-xs mt-1" style={{ color: '#4b5563' }}>
                  Vence: {format(new Date(sale.due_date), 'dd/MM/yyyy')}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Puntos ganados */}
        {sale.points_earned && sale.points_earned > 0 && (
          <div className="bg-green-50 p-3 rounded mb-3 text-center">
            <p className="text-sm font-bold" style={{ color: '#15803d' }}>
              🎉 ¡Ganaste {sale.points_earned} puntos de lealtad!
            </p>
          </div>
        )}

        {/* Notas */}
        {sale.notes && (
          <div className="border-t border-gray-300 pt-3 mb-3" style={{ color: '#000000' }}>
            <p className="font-bold mb-1" style={{ color: '#000000' }}>NOTAS:</p>
            <p className="text-sm" style={{ color: '#000000' }}>{sale.notes}</p>
          </div>
        )}

        {/* Pie de página */}
        <div className="text-center border-t-2 border-gray-300 pt-4 mt-4">
          <p className="text-sm mb-2" style={{ color: '#000000' }}>¡Gracias por su compra!</p>
          <p className="text-xs" style={{ color: '#4b5563' }}>
            Este documento es válido como comprobante de compra
          </p>
          {storeInfo.phone && (
            <p className="text-xs mt-1" style={{ color: '#4b5563' }}>
              Cualquier duda o reclamo, contáctenos al {storeInfo.phone}
            </p>
          )}
          <div className="mt-3 text-xs" style={{ color: '#6b7280' }}>
            <p>Generado por Sistema POS</p>
            <p>{format(new Date(), 'dd/MM/yyyy HH:mm:ss')}</p>
          </div>
        </div>
      </div>
    );
  }
);

InvoiceReceipt.displayName = 'InvoiceReceipt';
