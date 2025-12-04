import React, { forwardRef } from 'react';
import { formatCurrency } from '@/lib/utils';

interface TicketItem {
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface TicketReceiptProps {
  saleNumber: string;
  date: Date;
  items: TicketItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  customerName?: string;
  customerPoints?: number;
  pointsEarned?: number;
  pointsRedeemed?: number;
  storeName?: string;
}

export const TicketReceipt = forwardRef<HTMLDivElement, TicketReceiptProps>((props, ref) => {
  const {
    saleNumber,
    date,
    items,
    subtotal,
    discount,
    total,
    paymentMethod,
    customerName,
    customerPoints,
    pointsEarned,
    pointsRedeemed,
    storeName = 'Mi Tienda',
  } = props;

  const paymentMethodNames: Record<string, string> = {
    efectivo: 'Efectivo',
    tarjeta: 'Tarjeta',
    transferencia: 'Transferencia',
  };

  return (
    <div
      ref={ref}
      className="bg-white p-6"
      style={{
        width: '80mm',
        maxWidth: '80mm',
        fontFamily: 'monospace',
        fontSize: '12px',
        lineHeight: '1.4',
      }}
    >
      {/* Header */}
      <div className="text-center mb-4 border-b-2 border-dashed border-gray-400 pb-3">
        <h1 className="text-xl font-bold uppercase mb-1">{storeName}</h1>
        <p className="text-xs">Sistema POS</p>
        <p className="text-xs mt-1">NIT: 123456789-0</p>
        <p className="text-xs">Tel: (601) 234-5678</p>
      </div>

      {/* Sale Info */}
      <div className="mb-3 text-xs">
        <div className="flex justify-between">
          <span>Ticket:</span>
          <span className="font-bold">{saleNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>Fecha:</span>
          <span>{date.toLocaleDateString('es-CO')}</span>
        </div>
        <div className="flex justify-between">
          <span>Hora:</span>
          <span>{date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="flex justify-between">
          <span>Cajero:</span>
          <span>Sistema</span>
        </div>
      </div>

      {/* Customer Info */}
      {customerName && (
        <div className="mb-3 pb-2 border-b border-dashed border-gray-300">
          <p className="text-xs">
            <span className="font-bold">Cliente:</span> {customerName}
          </p>
          {customerPoints !== undefined && (
            <p className="text-xs">
              <span className="font-bold">Puntos disponibles:</span> {customerPoints}
            </p>
          )}
        </div>
      )}

      {/* Items */}
      <div className="border-b-2 border-dashed border-gray-400 pb-2 mb-2">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-300">
              <th className="text-left py-1">Producto</th>
              <th className="text-center py-1">Cant</th>
              <th className="text-right py-1">Precio</th>
              <th className="text-right py-1">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <React.Fragment key={index}>
                <tr>
                  <td className="py-1" colSpan={4}>
                    {item.name}
                  </td>
                </tr>
                <tr>
                  <td></td>
                  <td className="text-center">{item.quantity}</td>
                  <td className="text-right">{formatCurrency(item.unit_price)}</td>
                  <td className="text-right font-bold">{formatCurrency(item.subtotal)}</td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="mb-3 text-xs">
        {discount > 0 && (
          <>
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-green-700 font-semibold">
              <span>Descuento (10%):</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
          </>
        )}
        <div className="flex justify-between text-lg font-bold border-t-2 border-double border-gray-800 mt-2 pt-2">
          <span>TOTAL:</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>

      {/* Payment Method */}
      <div className="mb-3 pb-2 border-b border-dashed border-gray-300 text-xs">
        <div className="flex justify-between">
          <span>Forma de pago:</span>
          <span className="font-bold">{paymentMethodNames[paymentMethod] || paymentMethod}</span>
        </div>
      </div>

      {/* Loyalty Points */}
      {(pointsEarned || pointsRedeemed) && (
        <div className="mb-3 pb-2 border-b border-dashed border-gray-300">
          {pointsRedeemed && pointsRedeemed > 0 && (
            <p className="text-xs text-green-700 font-semibold">
              ✓ Puntos canjeados: {pointsRedeemed}
            </p>
          )}
          {pointsEarned && pointsEarned > 0 && (
            <p className="text-xs text-yellow-700 font-semibold">
              ★ Puntos ganados: +{pointsEarned}
            </p>
          )}
          {customerPoints !== undefined && pointsEarned && (
            <p className="text-xs mt-1">
              Puntos acumulados: {customerPoints + pointsEarned}
            </p>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="text-center mt-4 text-xs">
        <p className="font-bold mb-2">¡Gracias por su compra!</p>
        <p>Vuelva pronto</p>
        <p className="mt-3 text-[10px]">
          Sistema POS - {new Date().getFullYear()}
        </p>
        <p className="mt-1 text-[10px]">
          Este documento no es factura
        </p>
      </div>

      {/* Barcode simulation */}
      <div className="text-center mt-4">
        <div className="inline-block bg-black" style={{ height: '50px', width: '200px' }}>
          <svg viewBox="0 0 200 50" xmlns="http://www.w3.org/2000/svg">
            <rect x="10" y="10" width="3" height="30" fill="white"/>
            <rect x="15" y="10" width="2" height="30" fill="white"/>
            <rect x="20" y="10" width="4" height="30" fill="white"/>
            <rect x="27" y="10" width="2" height="30" fill="white"/>
            <rect x="32" y="10" width="3" height="30" fill="white"/>
            <rect x="38" y="10" width="5" height="30" fill="white"/>
            <rect x="46" y="10" width="2" height="30" fill="white"/>
            <rect x="51" y="10" width="3" height="30" fill="white"/>
            <rect x="57" y="10" width="4" height="30" fill="white"/>
            <rect x="64" y="10" width="2" height="30" fill="white"/>
            <rect x="69" y="10" width="5" height="30" fill="white"/>
            <rect x="77" y="10" width="3" height="30" fill="white"/>
            <rect x="83" y="10" width="2" height="30" fill="white"/>
            <rect x="88" y="10" width="4" height="30" fill="white"/>
            <rect x="95" y="10" width="3" height="30" fill="white"/>
            <rect x="101" y="10" width="5" height="30" fill="white"/>
            <rect x="109" y="10" width="2" height="30" fill="white"/>
            <rect x="114" y="10" width="3" height="30" fill="white"/>
            <rect x="120" y="10" width="4" height="30" fill="white"/>
            <rect x="127" y="10" width="2" height="30" fill="white"/>
            <rect x="132" y="10" width="5" height="30" fill="white"/>
            <rect x="140" y="10" width="3" height="30" fill="white"/>
            <rect x="146" y="10" width="2" height="30" fill="white"/>
            <rect x="151" y="10" width="4" height="30" fill="white"/>
            <rect x="158" y="10" width="3" height="30" fill="white"/>
            <rect x="164" y="10" width="5" height="30" fill="white"/>
            <rect x="172" y="10" width="2" height="30" fill="white"/>
            <rect x="177" y="10" width="3" height="30" fill="white"/>
            <rect x="183" y="10" width="4" height="30" fill="white"/>
          </svg>
        </div>
        <p className="text-[10px] mt-1">{saleNumber}</p>
      </div>
    </div>
  );
});

TicketReceipt.displayName = 'TicketReceipt';
