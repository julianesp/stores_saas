import { collection, query, where, getDocs, doc, getDoc, updateDoc, addDoc, Timestamp, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';
import { Sale, Customer, CreditPayment, CreditPaymentWithRelations, SaleWithRelations } from './types';

/**
 * Obtiene todas las ventas a crédito con saldo pendiente
 */
export async function getCreditSales(userProfileId: string): Promise<SaleWithRelations[]> {
  try {
    const salesRef = collection(db, 'sales');
    const q = query(
      salesRef,
      where('cashier_id', '==', userProfileId),
      where('payment_method', '==', 'credito'),
      where('payment_status', 'in', ['pendiente', 'parcial']),
      orderBy('created_at', 'desc')
    );

    const snapshot = await getDocs(q);
    const sales: SaleWithRelations[] = [];

    for (const docSnap of snapshot.docs) {
      const saleData = { id: docSnap.id, ...docSnap.data() } as Sale;

      // Obtener información del cliente si existe
      let customer: Customer | undefined;
      if (saleData.customer_id) {
        const customerDoc = await getDoc(doc(db, 'customers', saleData.customer_id));
        if (customerDoc.exists()) {
          customer = { id: customerDoc.id, ...customerDoc.data() } as Customer;
        }
      }

      sales.push({
        ...saleData,
        customer,
      });
    }

    return sales;
  } catch (error) {
    console.error('Error al obtener ventas a crédito:', error);
    throw error;
  }
}

/**
 * Obtiene todas las ventas a crédito de un cliente específico
 */
export async function getCustomerCreditSales(customerId: string): Promise<SaleWithRelations[]> {
  try {
    const salesRef = collection(db, 'sales');
    const q = query(
      salesRef,
      where('customer_id', '==', customerId),
      where('payment_method', '==', 'credito'),
      where('payment_status', 'in', ['pendiente', 'parcial']),
      orderBy('created_at', 'desc')
    );

    const snapshot = await getDocs(q);
    const sales: SaleWithRelations[] = [];

    for (const docSnap of snapshot.docs) {
      const saleData = { id: docSnap.id, ...docSnap.data() } as Sale;

      // Obtener información del cliente
      const customerDoc = await getDoc(doc(db, 'customers', customerId));
      let customer: Customer | undefined;
      if (customerDoc.exists()) {
        customer = { id: customerDoc.id, ...customerDoc.data() } as Customer;
      }

      sales.push({
        ...saleData,
        customer,
      });
    }

    return sales;
  } catch (error) {
    console.error('Error al obtener ventas a crédito del cliente:', error);
    throw error;
  }
}

/**
 * Obtiene todos los clientes con deuda pendiente
 */
export async function getDebtorCustomers(userProfileId: string): Promise<Customer[]> {
  try {
    const customersRef = collection(db, 'customers');
    const q = query(
      customersRef,
      where('user_profile_id', '==', userProfileId),
      where('current_debt', '>', 0),
      orderBy('current_debt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Customer[];
  } catch (error) {
    console.error('Error al obtener clientes deudores:', error);
    throw error;
  }
}

/**
 * Verifica si un cliente puede recibir más crédito
 */
export async function canCustomerGetCredit(customerId: string, newAmount: number): Promise<{
  canGetCredit: boolean;
  currentDebt: number;
  creditLimit: number;
  availableCredit: number;
  message?: string;
}> {
  try {
    const customerDoc = await getDoc(doc(db, 'customers', customerId));

    if (!customerDoc.exists()) {
      return {
        canGetCredit: false,
        currentDebt: 0,
        creditLimit: 0,
        availableCredit: 0,
        message: 'Cliente no encontrado'
      };
    }

    const customer = customerDoc.data() as Customer;
    const currentDebt = customer.current_debt || 0;
    const creditLimit = customer.credit_limit || 0;

    if (creditLimit === 0) {
      return {
        canGetCredit: false,
        currentDebt,
        creditLimit,
        availableCredit: 0,
        message: 'Cliente sin límite de crédito autorizado'
      };
    }

    const availableCredit = creditLimit - currentDebt;
    const canGetCredit = (currentDebt + newAmount) <= creditLimit;

    return {
      canGetCredit,
      currentDebt,
      creditLimit,
      availableCredit,
      message: canGetCredit
        ? 'Crédito disponible'
        : `Excede el límite de crédito. Disponible: $${availableCredit.toLocaleString()}`
    };
  } catch (error) {
    console.error('Error al verificar crédito del cliente:', error);
    throw error;
  }
}

/**
 * Actualiza la deuda del cliente después de una venta a crédito
 */
export async function updateCustomerDebt(customerId: string, amount: number): Promise<void> {
  try {
    const customerRef = doc(db, 'customers', customerId);
    const customerDoc = await getDoc(customerRef);

    if (!customerDoc.exists()) {
      throw new Error('Cliente no encontrado');
    }

    const customer = customerDoc.data() as Customer;
    const currentDebt = customer.current_debt || 0;
    const newDebt = currentDebt + amount;

    await updateDoc(customerRef, {
      current_debt: newDebt,
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error al actualizar deuda del cliente:', error);
    throw error;
  }
}

/**
 * Registra un pago de crédito (parcial o total)
 */
export async function registerCreditPayment(
  saleId: string,
  customerId: string,
  amount: number,
  paymentMethod: 'efectivo' | 'tarjeta' | 'transferencia',
  cashierId: string,
  notes?: string
): Promise<void> {
  try {
    // Obtener la venta
    const saleRef = doc(db, 'sales', saleId);
    const saleDoc = await getDoc(saleRef);

    if (!saleDoc.exists()) {
      throw new Error('Venta no encontrada');
    }

    const sale = saleDoc.data() as Sale;
    const amountPaid = (sale.amount_paid || 0) + amount;
    const amountPending = sale.total - amountPaid;
    const paymentStatus = amountPending <= 0 ? 'pagado' : amountPending < sale.total ? 'parcial' : 'pendiente';

    // Registrar el pago en la colección credit_payments
    const creditPaymentData: Omit<CreditPayment, 'id'> = {
      sale_id: saleId,
      customer_id: customerId,
      amount,
      payment_method: paymentMethod,
      notes,
      cashier_id: cashierId,
      created_at: new Date().toISOString()
    };

    await addDoc(collection(db, 'credit_payments'), creditPaymentData);

    // Actualizar la venta
    await updateDoc(saleRef, {
      amount_paid: amountPaid,
      amount_pending: amountPending,
      payment_status: paymentStatus,
      updated_at: new Date().toISOString()
    });

    // Actualizar la deuda del cliente (reducir)
    const customerRef = doc(db, 'customers', customerId);
    const customerDoc = await getDoc(customerRef);

    if (customerDoc.exists()) {
      const customer = customerDoc.data() as Customer;
      const currentDebt = customer.current_debt || 0;
      const newDebt = Math.max(0, currentDebt - amount); // No puede ser negativo

      await updateDoc(customerRef, {
        current_debt: newDebt,
        updated_at: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error al registrar pago de crédito:', error);
    throw error;
  }
}

/**
 * Obtiene el historial de pagos de una venta a crédito
 */
export async function getCreditPaymentHistory(saleId: string): Promise<CreditPaymentWithRelations[]> {
  try {
    const paymentsRef = collection(db, 'credit_payments');
    const q = query(
      paymentsRef,
      where('sale_id', '==', saleId),
      orderBy('created_at', 'asc')
    );

    const snapshot = await getDocs(q);
    const payments: CreditPaymentWithRelations[] = [];

    for (const docSnap of snapshot.docs) {
      const paymentData = { id: docSnap.id, ...docSnap.data() } as CreditPayment;
      payments.push(paymentData);
    }

    return payments;
  } catch (error) {
    console.error('Error al obtener historial de pagos:', error);
    throw error;
  }
}

/**
 * Obtiene todos los pagos de crédito de un cliente
 */
export async function getCustomerCreditPayments(customerId: string): Promise<CreditPaymentWithRelations[]> {
  try {
    const paymentsRef = collection(db, 'credit_payments');
    const q = query(
      paymentsRef,
      where('customer_id', '==', customerId),
      orderBy('created_at', 'desc')
    );

    const snapshot = await getDocs(q);
    const payments: CreditPaymentWithRelations[] = [];

    for (const docSnap of snapshot.docs) {
      const paymentData = { id: docSnap.id, ...docSnap.data() } as CreditPayment;

      // Obtener información de la venta
      let sale: Sale | undefined;
      if (paymentData.sale_id) {
        const saleDoc = await getDoc(doc(db, 'sales', paymentData.sale_id));
        if (saleDoc.exists()) {
          sale = { id: saleDoc.id, ...saleDoc.data() } as Sale;
        }
      }

      payments.push({
        ...paymentData,
        sale
      });
    }

    return payments;
  } catch (error) {
    console.error('Error al obtener pagos del cliente:', error);
    throw error;
  }
}

/**
 * Actualiza el límite de crédito de un cliente
 */
export async function updateCustomerCreditLimit(customerId: string, newLimit: number): Promise<void> {
  try {
    const customerRef = doc(db, 'customers', customerId);
    await updateDoc(customerRef, {
      credit_limit: newLimit,
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error al actualizar límite de crédito:', error);
    throw error;
  }
}
