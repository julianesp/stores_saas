import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAllDocuments } from '@/lib/firestore-helpers';

/**
 * API de diagnóstico para verificar ventas y clientes
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const sales = await getAllDocuments('sales') as any[];
    const customers = await getAllDocuments('customers') as any[];

    const salesWithCustomers = sales.filter(s => s.customer_id);
    const salesWithoutCustomers = sales.filter(s => !s.customer_id);

    const customerIds = customers.map(c => c.id);
    const salesByCustomer = customerIds.map(customerId => {
      const customerSales = sales.filter(s => s.customer_id === customerId);
      const customer = customers.find(c => c.id === customerId);
      return {
        customer_name: customer?.name,
        customer_id: customerId,
        total_sales: customerSales.length,
        sales: customerSales.map(s => ({
          sale_number: s.sale_number,
          total: s.total,
          date: s.created_at,
          points_earned: s.points_earned || 0,
        }))
      };
    });

    return NextResponse.json({
      total_sales: sales.length,
      sales_with_customer: salesWithCustomers.length,
      sales_without_customer: salesWithoutCustomers.length,
      total_customers: customers.length,
      sales_by_customer: salesByCustomer,
      all_sales: sales.map(s => ({
        sale_number: s.sale_number,
        customer_id: s.customer_id || 'SIN CLIENTE',
        total: s.total,
        points_earned: s.points_earned || 0,
        date: s.created_at,
      }))
    });
  } catch (error) {
    console.error('Error in debug:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error' },
      { status: 500 }
    );
  }
}
