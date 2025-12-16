import type { GetTokenFn, Sale, Customer } from './cloudflare-api';
import { getSales, getCustomers, getCustomerById, getSaleById, updateCustomer, registerCreditPayment, getCreditPaymentHistory, getCustomerCreditPayments } from './cloudflare-api';

export interface SaleWithRelations extends Sale {
  customer?: Customer;
}

export interface CreditPaymentWithRelations {
  id: string;
  sale_id: string;
  customer_id: string;
  amount: number;
  payment_method: 'efectivo' | 'tarjeta' | 'transferencia';
  cashier_id: string;
  notes?: string;
  created_at: string;
  sale?: Sale;
}

/**
 * Obtiene todas las ventas a crédito con saldo pendiente
 */
export async function getCreditSales(userProfileId: string, getToken: GetTokenFn): Promise<SaleWithRelations[]> {
  try {
    const allSales = await getSales(getToken);

    // Filtrar ventas a crédito con saldo pendiente
    const creditSales = allSales.filter(sale =>
      sale.payment_method === 'credito' &&
      (sale.payment_status === 'pendiente' || sale.payment_status === 'parcial')
    );

    // Obtener información de clientes
    const sales: SaleWithRelations[] = [];
    for (const sale of creditSales) {
      let customer: Customer | undefined;
      if (sale.customer_id) {
        try {
          customer = await getCustomerById(sale.customer_id, getToken);
        } catch (error) {
          console.error(`Error al obtener cliente ${sale.customer_id}:`, error);
        }
      }

      sales.push({
        ...sale,
        customer,
      });
    }

    // Ordenar por fecha descendente
    sales.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return sales;
  } catch (error) {
    console.error('Error al obtener ventas a crédito:', error);
    throw error;
  }
}

/**
 * Obtiene todas las ventas a crédito de un cliente específico
 */
export async function getCustomerCreditSales(customerId: string, getToken: GetTokenFn): Promise<SaleWithRelations[]> {
  try {
    const allSales = await getSales(getToken);

    // Filtrar ventas del cliente que sean a crédito y tengan saldo pendiente
    const customerCreditSales = allSales.filter(sale =>
      sale.customer_id === customerId &&
      sale.payment_method === 'credito' &&
      (sale.payment_status === 'pendiente' || sale.payment_status === 'parcial')
    );

    // Obtener información del cliente
    let customer: Customer | undefined;
    try {
      customer = await getCustomerById(customerId, getToken);
    } catch (error) {
      console.error(`Error al obtener cliente ${customerId}:`, error);
    }

    const sales: SaleWithRelations[] = customerCreditSales.map(sale => ({
      ...sale,
      customer,
    }));

    // Ordenar por fecha descendente
    sales.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return sales;
  } catch (error) {
    console.error('Error al obtener ventas a crédito del cliente:', error);
    throw error;
  }
}

/**
 * Obtiene todos los clientes con deuda pendiente
 */
export async function getDebtorCustomers(userProfileId: string, getToken: GetTokenFn): Promise<Customer[]> {
  try {
    const allCustomers = await getCustomers(getToken);

    // Filtrar clientes con deuda pendiente
    const debtors = allCustomers.filter(customer =>
      (customer.current_debt || 0) > 0
    );

    // Ordenar por deuda descendente
    debtors.sort((a, b) => (b.current_debt || 0) - (a.current_debt || 0));

    return debtors;
  } catch (error) {
    console.error('Error al obtener clientes deudores:', error);
    throw error;
  }
}

/**
 * Verifica si un cliente puede recibir más crédito
 */
export async function canCustomerGetCredit(customerId: string, newAmount: number, getToken: GetTokenFn): Promise<{
  canGetCredit: boolean;
  currentDebt: number;
  creditLimit: number;
  availableCredit: number;
  message?: string;
}> {
  try {
    const customer = await getCustomerById(customerId, getToken);

    if (!customer) {
      return {
        canGetCredit: false,
        currentDebt: 0,
        creditLimit: 0,
        availableCredit: 0,
        message: 'Cliente no encontrado'
      };
    }

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
export async function updateCustomerDebt(customerId: string, amount: number, getToken: GetTokenFn): Promise<void> {
  try {
    const customer = await getCustomerById(customerId, getToken);

    if (!customer) {
      throw new Error('Cliente no encontrado');
    }

    const currentDebt = customer.current_debt || 0;
    const newDebt = currentDebt + amount;

    await updateCustomer(customerId, {
      current_debt: newDebt,
    }, getToken);
  } catch (error) {
    console.error('Error al actualizar deuda del cliente:', error);
    throw error;
  }
}

/**
 * Registra un pago de crédito (parcial o total)
 * Ahora usa la API de Cloudflare que maneja toda la lógica de actualización
 */
export async function registerCreditPaymentLocal(
  saleId: string,
  customerId: string,
  amount: number,
  paymentMethod: 'efectivo' | 'tarjeta' | 'transferencia',
  cashierId: string,
  getToken: GetTokenFn,
  notes?: string
): Promise<void> {
  try {
    // Usar la función de cloudflare-api que maneja toda la lógica
    await registerCreditPayment({
      sale_id: saleId,
      customer_id: customerId,
      amount,
      payment_method: paymentMethod,
      cashier_id: cashierId,
      notes,
    }, getToken);
  } catch (error) {
    console.error('Error al registrar pago de crédito:', error);
    throw error;
  }
}

/**
 * Obtiene el historial de pagos de una venta a crédito
 */
export async function getCreditPaymentHistoryLocal(saleId: string, getToken: GetTokenFn): Promise<CreditPaymentWithRelations[]> {
  try {
    const payments = await getCreditPaymentHistory(saleId, getToken);

    // Convertir al formato con relaciones
    return payments.map(payment => ({
      id: payment.id || '',
      sale_id: payment.sale_id,
      customer_id: payment.customer_id,
      amount: payment.amount,
      payment_method: payment.payment_method,
      cashier_id: payment.cashier_id,
      notes: payment.notes,
      created_at: payment.created_at || new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Error al obtener historial de pagos:', error);
    throw error;
  }
}

/**
 * Obtiene todos los pagos de crédito de un cliente
 */
export async function getCustomerCreditPaymentsLocal(customerId: string, getToken: GetTokenFn): Promise<CreditPaymentWithRelations[]> {
  try {
    const payments = await getCustomerCreditPayments(customerId, getToken);

    // Convertir al formato con relaciones y obtener información de las ventas
    const paymentsWithRelations: CreditPaymentWithRelations[] = [];

    for (const payment of payments) {
      let sale: Sale | undefined;
      if (payment.sale_id) {
        try {
          sale = await getSaleById(payment.sale_id, getToken);
        } catch (error) {
          console.error(`Error al obtener venta ${payment.sale_id}:`, error);
        }
      }

      paymentsWithRelations.push({
        id: payment.id || '',
        sale_id: payment.sale_id,
        customer_id: payment.customer_id,
        amount: payment.amount,
        payment_method: payment.payment_method,
        cashier_id: payment.cashier_id,
        notes: payment.notes,
        created_at: payment.created_at || new Date().toISOString(),
        sale,
      });
    }

    return paymentsWithRelations;
  } catch (error) {
    console.error('Error al obtener pagos del cliente:', error);
    throw error;
  }
}

/**
 * Actualiza el límite de crédito de un cliente
 */
export async function updateCustomerCreditLimit(customerId: string, newLimit: number, getToken: GetTokenFn): Promise<void> {
  try {
    await updateCustomer(customerId, {
      credit_limit: newLimit,
    }, getToken);
  } catch (error) {
    console.error('Error al actualizar límite de crédito:', error);
    throw error;
  }
}
