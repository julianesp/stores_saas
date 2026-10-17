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
  /** Ancho en mm de la tira térmica (58 u 80). Sin valor: factura tamaño carta */
  ticketWidthMm?: number | null;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  nequi: 'Nequi',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  credito: 'Crédito',
};

/** Cantidad legible de un ítem para la tira (paquetes o unidades sueltas) */
function ticketQuantity(item: SaleItemWithProduct): string {
  if (item.product?.sell_by_unit && item.product?.units_per_package) {
    const unitsPerPackage = item.product.units_per_package;
    if (item.quantity < 1) {
      return `${+(item.quantity * unitsPerPackage).toFixed(2)} ${item.product.unit_name || 'und'}`;
    }
    if (item.quantity >= unitsPerPackage && item.quantity % unitsPerPackage === 0) {
      const packages = item.quantity / unitsPerPackage;
      return `${packages} ${item.product.package_name || 'paquete'}${packages > 1 ? 's' : ''}`;
    }
    return `${item.quantity} ${item.product.unit_name || 'unidad'}${item.quantity > 1 ? 'es' : ''}`;
  }
  return Number.isInteger(item.quantity) ? `${item.quantity}` : item.quantity.toFixed(2);
}

/**
 * Factura en formato tira para impresora térmica (58 u 80 mm): una sola columna,
 * letra pequeña, sin colores de fondo y con líneas punteadas como separador.
 */
const TicketReceipt = forwardRef<
  HTMLDivElement,
  Omit<InvoiceReceiptProps, 'ticketWidthMm'> & { widthMm: number }
>(({ sale, saleItems, customer, storeInfo, cashierName, widthMm }, ref) => {
  const subtotalAmount = saleItems.reduce((sum, item) => sum + item.subtotal, 0);
  const fontSize = widthMm <= 58 ? 11 : 12;
  const separator = <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />;
  // La etiqueta nunca se aplasta; si el valor es largo (p. ej. un nombre), baja de línea
  const Row = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, fontWeight: bold ? 700 : 400 }}>
      <span style={{ flexShrink: label.length <= 16 ? 0 : 1 }}>{label}</span>
      <span style={{ textAlign: 'right', whiteSpace: value.length <= 14 ? 'nowrap' : 'normal', minWidth: 0 }}>
        {value}
      </span>
    </div>
  );

  return (
    <div
      ref={ref}
      className="keep-light mx-auto"
      style={{
        width: `${widthMm}mm`,
        padding: '3mm',
        boxSizing: 'border-box',
        background: '#ffffff',
        color: '#000000',
        fontFamily: 'monospace',
        fontSize,
        lineHeight: 1.35,
        wordBreak: 'break-word',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: fontSize + 4, fontWeight: 700 }}>
          {storeInfo.full_name || 'TIENDA POS'}
        </div>
        {storeInfo.phone && <div>Tel: {storeInfo.phone}</div>}
      </div>
      {separator}

      <Row label="Factura" value={`#${sale.sale_number}`} bold />
      <Row label="Fecha" value={format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm')} />
      {cashierName && <Row label="Atendió" value={cashierName} />}
      {customer && (
        <>
          <Row label="Cliente" value={customer.name} />
          {customer.phone && <Row label="Tel" value={customer.phone} />}
          {customer.id_number && <Row label="ID" value={customer.id_number} />}
        </>
      )}
      {separator}

      {saleItems.map((item, index) => (
        <div key={index} style={{ marginBottom: 4 }}>
          <div style={{ fontWeight: 700 }}>{item.product?.name || 'Producto'}</div>
          <Row
            label={`${ticketQuantity(item)} x ${formatCurrency(item.unit_price)}`}
            value={formatCurrency(item.subtotal)}
          />
          {item.discount > 0 && <Row label="  Descuento" value={`- ${formatCurrency(item.discount)}`} />}
        </div>
      ))}
      {separator}

      <Row label="Subtotal" value={formatCurrency(subtotalAmount)} />
      {(sale.discount || 0) > 0 && <Row label="Descuento" value={`- ${formatCurrency(sale.discount)}`} />}
      {(sale.tax || 0) > 0 && <Row label="IVA" value={formatCurrency(sale.tax)} />}
      {(sale.shipping_cost || 0) > 0 && <Row label="Envío" value={formatCurrency(sale.shipping_cost || 0)} />}
      <div style={{ fontSize: fontSize + 3, marginTop: 4 }}>
        <Row label="TOTAL" value={formatCurrency(sale.total)} bold />
      </div>
      {separator}

      <Row label="Pago" value={PAYMENT_METHOD_LABELS[sale.payment_method] || sale.payment_method} />
      {sale.payment_reference && <Row label="Ref." value={sale.payment_reference} />}
      {sale.payment_method === 'credito' && !!sale.amount_pending && sale.amount_pending > 0 && (
        <>
          <Row label="Abonado" value={formatCurrency(sale.amount_paid || 0)} />
          <Row label="Saldo pendiente" value={formatCurrency(sale.amount_pending)} bold />
          {sale.due_date && <Row label="Vence" value={format(new Date(sale.due_date), 'dd/MM/yyyy')} />}
        </>
      )}
      {!!sale.points_earned && sale.points_earned > 0 && (
        <div style={{ textAlign: 'center', fontWeight: 700, marginTop: 4 }}>
          ¡Ganaste {sale.points_earned} puntos!
        </div>
      )}

      {sale.notes && (
        <>
          {separator}
          <div>{sale.notes}</div>
        </>
      )}

      {separator}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 700 }}>¡Gracias por su compra!</div>
        <div style={{ fontSize: fontSize - 1 }}>Comprobante de compra</div>
      </div>
    </div>
  );
});
TicketReceipt.displayName = 'TicketReceipt';

/**
 * Componente de Factura/Recibo
 * Se puede imprimir y generar como PDF
 */
export const InvoiceReceipt = forwardRef<HTMLDivElement, InvoiceReceiptProps>(
  ({ sale, saleItems, customer, storeInfo, cashierName, ticketWidthMm }, ref) => {
    if (ticketWidthMm) {
      return (
        <TicketReceipt
          ref={ref}
          sale={sale}
          saleItems={saleItems}
          customer={customer}
          storeInfo={storeInfo}
          cashierName={cashierName}
          widthMm={ticketWidthMm}
        />
      );
    }

    // Formatear fecha y hora
    const saleDate = new Date(sale.created_at);
    const formattedDate = format(saleDate, "dd 'de' MMMM 'de' yyyy", { locale: es });
    const formattedTime = format(saleDate, 'HH:mm:ss', { locale: es });

    // Calcular totales
    const subtotalAmount = saleItems.reduce((sum, item) => sum + item.subtotal, 0);
    const discountAmount = sale.discount || 0;
    const taxAmount = sale.tax || 0;
    const shippingAmount = sale.shipping_cost || 0;
    const totalAmount = sale.total;

    // Método de pago en español
    const paymentMethodLabels: Record<string, string> = {
      efectivo: 'Efectivo',
      nequi: 'Nequi',
      tarjeta: 'Tarjeta',
      transferencia: 'Transferencia',
      credito: 'Crédito',
    };

    return (
      <div
        ref={ref}
        className="keep-light bg-white p-8 max-w-2xl mx-auto text-black"
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
          {saleItems.map((item, index) => {
            // Determinar cómo mostrar la cantidad según el contexto
            let displayQuantity = item.quantity;
            let unitLabel = '';

            if (item.product?.sell_by_unit && item.product?.units_per_package) {
              // Si quantity < 1, probablemente es una venta vieja que guardó en paquetes
              // Convertir a unidades para mostrar correctamente
              if (item.quantity < 1) {
                displayQuantity = item.quantity * item.product.units_per_package;
                unitLabel = ` ${item.product.unit_name || 'unidad'}${displayQuantity > 1 ? 'es' : ''}`;
              } else {
                // Para ventas nuevas, la cantidad ya está en la unidad correcta
                // Determinar si es paquetes o unidades según el valor
                const unitsPerPackage = item.product.units_per_package;

                // Si la cantidad es un múltiplo exacto de unitsPerPackage y > unitsPerPackage,
                // probablemente es venta por paquetes
                if (item.quantity >= unitsPerPackage && item.quantity % unitsPerPackage === 0) {
                  const packages = item.quantity / unitsPerPackage;
                  if (packages >= 1) {
                    displayQuantity = packages;
                    unitLabel = ` ${item.product.package_name || 'paquete'}${packages > 1 ? 's' : ''}`;
                  } else {
                    displayQuantity = item.quantity;
                    unitLabel = ` ${item.product.unit_name || 'unidad'}${item.quantity > 1 ? 'es' : ''}`;
                  }
                } else {
                  // Es venta por unidades
                  displayQuantity = item.quantity;
                  unitLabel = ` ${item.product.unit_name || 'unidad'}${item.quantity > 1 ? 'es' : ''}`;
                }
              }
            }

            // Formatear cantidad: mostrar como entero si es entero, o con máximo 2 decimales
            const formattedQuantity = Number.isInteger(displayQuantity)
              ? displayQuantity.toString()
              : displayQuantity.toFixed(2).replace(/\.?0+$/, '');

            return (
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
                  <div className="w-16 text-center" style={{ color: '#000000' }}>
                    {formattedQuantity}
                    {unitLabel && <span className="text-xs block">{unitLabel}</span>}
                  </div>
                  <div className="w-24 text-right" style={{ color: '#000000' }}>
                    {formatCurrency(item.unit_price)}
                  </div>
                  <div className="w-24 text-right font-medium" style={{ color: '#000000' }}>
                    {formatCurrency(item.subtotal)}
                  </div>
                </div>
              </div>
            );
          })}
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

          {shippingAmount > 0 && (
            <div className="flex justify-between mb-1">
              <span style={{ color: '#000000' }}>Envío a domicilio:</span>
              <span style={{ color: '#000000' }}>{formatCurrency(shippingAmount)}</span>
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

          {sale.payment_reference && (
            <div className="flex justify-between mb-1">
              <span className="font-bold" style={{ color: '#000000' }}>Referencia de pago:</span>
              <span style={{ color: '#000000' }}>{sale.payment_reference}</span>
            </div>
          )}

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
