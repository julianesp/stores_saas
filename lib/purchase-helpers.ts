import {
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderWithItems,
  Product
} from './types';
import {
  createDocument,
  queryDocuments,
  updateDocument,
  getDocumentById,
  getAllDocuments
} from './firestore-helpers';

/**
 * Genera un número de orden de compra único
 */
export async function generatePurchaseOrderNumber(): Promise<string> {
  const orders = await getAllDocuments('purchase_orders') as any[];
  const count = orders.length + 1;
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2);
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  return `OC-${year}${month}-${count.toString().padStart(4, '0')}`;
}

/**
 * Crea una nueva orden de compra
 */
export async function createPurchaseOrder(
  userProfileId: string,
  supplierId: string,
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit_cost: number;
  }>,
  notes?: string,
  expectedDate?: string
): Promise<PurchaseOrder> {
  try {
    // Generar número de orden
    const orderNumber = await generatePurchaseOrderNumber();

    // Calcular totales
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
    const tax = 0; // Por ahora sin impuestos, se puede agregar después
    const total = subtotal + tax;

    // Crear orden de compra
    const orderData: Omit<PurchaseOrder, 'id' | 'created_at' | 'updated_at'> = {
      user_profile_id: userProfileId,
      supplier_id: supplierId,
      order_number: orderNumber,
      status: 'pendiente',
      order_date: new Date().toISOString(),
      expected_date: expectedDate,
      subtotal,
      tax,
      total,
      notes,
    };

    const order = await createDocument('purchase_orders', orderData) as any;

    // Crear items de la orden
    for (const item of items) {
      await createDocument('purchase_order_items', {
        purchase_order_id: order.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        subtotal: item.quantity * item.unit_cost,
      });
    }

    return order as PurchaseOrder;
  } catch (error) {
    console.error('Error creating purchase order:', error);
    throw error;
  }
}

/**
 * Obtiene una orden de compra con todos sus items
 */
export async function getPurchaseOrderWithItems(orderId: string): Promise<PurchaseOrderWithItems | null> {
  try {
    const order = await getDocumentById('purchase_orders', orderId) as any;
    if (!order) return null;

    const items = await queryDocuments('purchase_order_items', [
      { field: 'purchase_order_id', operator: '==', value: orderId }
    ]) as any[];

    const supplier = order.supplier_id
      ? await getDocumentById('suppliers', order.supplier_id) as any
      : undefined;

    return {
      ...order,
      supplier,
      items,
    } as PurchaseOrderWithItems;
  } catch (error) {
    console.error('Error getting purchase order:', error);
    return null;
  }
}

/**
 * Obtiene todas las órdenes de compra de un proveedor
 */
export async function getSupplierPurchaseOrders(supplierId: string): Promise<PurchaseOrder[]> {
  try {
    const orders = await queryDocuments('purchase_orders', [
      { field: 'supplier_id', operator: '==', value: supplierId }
    ]) as any[];

    // Ordenar por fecha descendente (más reciente primero)
    orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return orders as PurchaseOrder[];
  } catch (error) {
    console.error('Error getting supplier purchase orders:', error);
    return [];
  }
}

/**
 * Recibe una orden de compra y actualiza el inventario
 */
export async function receivePurchaseOrder(
  orderId: string,
  userProfileId: string
): Promise<void> {
  try {
    // Obtener orden con items
    const orderWithItems = await getPurchaseOrderWithItems(orderId);
    if (!orderWithItems) {
      throw new Error('Orden de compra no encontrada');
    }

    if (orderWithItems.status !== 'pendiente') {
      throw new Error('Esta orden ya fue recibida o cancelada');
    }

    // Actualizar inventario para cada producto
    for (const item of orderWithItems.items) {
      const product = await getDocumentById('products', item.product_id) as any;

      if (product) {
        const newStock = product.stock + item.quantity;

        // Actualizar stock del producto
        await updateDocument('products', item.product_id, {
          stock: newStock,
          cost_price: item.unit_cost, // Actualizar precio de costo
        });

        // Crear movimiento de inventario
        await createDocument('inventory_movements', {
          product_id: item.product_id,
          type: 'entrada',
          quantity: item.quantity,
          previous_stock: product.stock,
          new_stock: newStock,
          reference_type: 'compra',
          reference_id: orderId,
          notes: `Orden de compra ${orderWithItems.order_number}`,
          user_id: userProfileId,
        });
      }
    }

    // Actualizar estado de la orden
    await updateDocument('purchase_orders', orderId, {
      status: 'recibida',
      received_date: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error receiving purchase order:', error);
    throw error;
  }
}

/**
 * Cancela una orden de compra
 */
export async function cancelPurchaseOrder(orderId: string): Promise<void> {
  try {
    const order = await getDocumentById('purchase_orders', orderId) as any;

    if (!order) {
      throw new Error('Orden de compra no encontrada');
    }

    if (order.status !== 'pendiente') {
      throw new Error('Solo se pueden cancelar órdenes pendientes');
    }

    await updateDocument('purchase_orders', orderId, {
      status: 'cancelada',
    });
  } catch (error) {
    console.error('Error canceling purchase order:', error);
    throw error;
  }
}

/**
 * Obtiene productos de un proveedor
 */
export async function getSupplierProducts(supplierId: string): Promise<Product[]> {
  try {
    const products = await queryDocuments('products', [
      { field: 'supplier_id', operator: '==', value: supplierId }
    ]) as any[];

    return products as Product[];
  } catch (error) {
    console.error('Error getting supplier products:', error);
    return [];
  }
}

/**
 * Calcula el margen de ganancia de un producto
 */
export function calculateProductMargin(costPrice: number, salePrice: number): {
  marginAmount: number;
  marginPercentage: number;
} {
  const marginAmount = salePrice - costPrice;
  const marginPercentage = costPrice > 0 ? (marginAmount / costPrice) * 100 : 0;

  return {
    marginAmount,
    marginPercentage: Number(marginPercentage.toFixed(2)),
  };
}

/**
 * Sugiere un precio de venta basado en el costo y un margen deseado
 */
export function suggestSalePrice(costPrice: number, desiredMarginPercentage: number): number {
  return Math.round(costPrice * (1 + desiredMarginPercentage / 100));
}
