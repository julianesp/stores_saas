/**
 * Credit Helpers - Cloudflare API Version
 * Funciones para manejo de créditos de clientes
 */

import { Sale, Customer, CreditPayment, CreditPaymentWithRelations, SaleWithRelations } from './types';
import {
  getCustomers,
  updateCustomer,
  getSales,
  getCreditPaymentHistory,
  registerCreditPayment as apiRegisterCreditPayment,
  CreditPaymentData,
} from './cloudflare-api';

/**
 * Verifica si un cliente puede recibir más crédito
 */
export async function canCustomerGetCredit(
  customerId: string,
  newAmount: number,
  getToken: () => Promise<string | null>
): Promise<{
  canGetCredit: boolean;
  currentDebt: number;
  creditLimit: number;
  availableCredit: number;
  message?: string;
}> {
  try {
    // Obtener todos los clientes y buscar el específico
    const customers = await getCustomers(getToken);
    const customer = customers.find(c => c.id === customerId);

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

    // Si no tiene límite configurado (0 o null), permitir crédito ilimitado
    if (creditLimit === 0) {
      return {
        canGetCredit: true,
        currentDebt,
        creditLimit: 0,
        availableCredit: Infinity,
        message: 'Crédito sin límite'
      };
    }

    // Si tiene límite configurado, validar que no lo exceda
    const availableCredit = creditLimit - currentDebt;
    const canGetCredit = (currentDebt + newAmount) <= creditLimit;

    return {
      canGetCredit,
      currentDebt,
      creditLimit,
      availableCredit,
      message: canGetCredit
        ? `Crédito disponible: $${availableCredit.toLocaleString()}`
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
export async function updateCustomerDebt(
  customerId: string,
  amount: number,
  getToken: () => Promise<string | null>
): Promise<void> {
  try {
    // Obtener el cliente actual
    const customers = await getCustomers(getToken);
    const customer = customers.find(c => c.id === customerId);

    if (!customer) {
      throw new Error('Cliente no encontrado');
    }

    const currentDebt = customer.current_debt || 0;
    const newDebt = currentDebt + amount;

    // Actualizar el cliente con la nueva deuda
    await updateCustomer(customerId, {
      current_debt: newDebt
    }, getToken);
  } catch (error) {
    console.error('Error al actualizar deuda del cliente:', error);
    throw error;
  }
}

/**
 * Actualiza el límite de crédito de un cliente
 */
export async function updateCustomerCreditLimit(
  customerId: string,
  newLimit: number,
  getToken: () => Promise<string | null>
): Promise<void> {
  try {
    await updateCustomer(customerId, {
      credit_limit: newLimit
    }, getToken);
  } catch (error) {
    console.error('Error al actualizar límite de crédito:', error);
    throw error;
  }
}

/**
 * Obtiene todas las ventas a crédito con saldo pendiente
 */
export async function getCreditSales(getToken: () => Promise<string | null>): Promise<Sale[]> {
  try {
    const sales = await getSales(getToken);

    // Filtrar solo ventas a crédito con saldo pendiente
    return sales.filter(sale =>
      sale.payment_method === 'credito' &&
      (sale.payment_status === 'pendiente' || sale.payment_status === 'parcial')
    );
  } catch (error) {
    console.error('Error al obtener ventas a crédito:', error);
    throw error;
  }
}

/**
 * Obtiene todas las ventas a crédito de un cliente específico
 */
export async function getCustomerCreditSales(
  customerId: string,
  getToken: () => Promise<string | null>
): Promise<Sale[]> {
  try {
    const sales = await getSales(getToken);

    // Filtrar ventas del cliente que estén a crédito con saldo pendiente
    return sales.filter(sale =>
      sale.customer_id === customerId &&
      sale.payment_method === 'credito' &&
      (sale.payment_status === 'pendiente' || sale.payment_status === 'parcial')
    );
  } catch (error) {
    console.error('Error al obtener ventas a crédito del cliente:', error);
    throw error;
  }
}

/**
 * Obtiene todos los clientes con deuda pendiente
 */
export async function getDebtorCustomers(getToken: () => Promise<string | null>): Promise<Customer[]> {
  try {
    const customers = await getCustomers(getToken);

    // Filtrar clientes con deuda > 0 y ordenar por deuda descendente
    return customers
      .filter(customer => (customer.current_debt || 0) > 0)
      .sort((a, b) => (b.current_debt || 0) - (a.current_debt || 0));
  } catch (error) {
    console.error('Error al obtener clientes deudores:', error);
    throw error;
  }
}

/**
 * Registra un pago de crédito
 * Wrapper function que usa la API de Cloudflare
 */
export async function registerCreditPayment(
  saleId: string,
  customerId: string,
  amount: number,
  paymentMethod: 'efectivo' | 'tarjeta' | 'transferencia',
  cashierId: string,
  notes: string | undefined,
  getToken: () => Promise<string | null>
): Promise<void> {
  try {
    const paymentData: CreditPaymentData = {
      sale_id: saleId,
      customer_id: customerId,
      amount,
      payment_method: paymentMethod,
      cashier_id: cashierId,
      notes,
    };

    await apiRegisterCreditPayment(paymentData, getToken);
  } catch (error) {
    console.error('Error al registrar pago de crédito:', error);
    throw error;
  }
}

/**
 * Obtiene el historial de pagos de una venta a crédito
 */
export { getCreditPaymentHistory };
