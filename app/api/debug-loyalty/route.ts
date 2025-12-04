import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAllDocuments, queryDocuments } from '@/lib/firestore-helpers';
import { getUserProfileByClerkId } from '@/lib/subscription-helpers';
import { getLoyaltySettings } from '@/lib/loyalty-helpers';

/**
 * API de diagnóstico para el sistema de puntos
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener perfil del usuario
    const profile = await getUserProfileByClerkId(userId);
    if (!profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    // Obtener configuración de lealtad
    const loyaltySettings = await getLoyaltySettings(profile.id);

    // Obtener todas las ventas con customer_id
    const sales = await getAllDocuments('sales') as any[];
    const salesWithCustomer = sales.filter(s => s.customer_id);

    // Obtener todos los clientes
    const customers = await getAllDocuments('customers') as any[];

    return NextResponse.json({
      loyalty_config: {
        exists: !!loyaltySettings,
        enabled: loyaltySettings?.enabled,
        tiers_count: loyaltySettings?.tiers?.length || 0,
        tiers: loyaltySettings?.tiers || [],
      },
      sales_summary: {
        total_sales: sales.length,
        sales_with_customer: salesWithCustomer.length,
        sales_with_points: salesWithCustomer.filter(s => s.points_earned && s.points_earned > 0).length,
        sales_without_points: salesWithCustomer.filter(s => !s.points_earned || s.points_earned === 0).length,
      },
      recent_sales_with_customer: salesWithCustomer.slice(0, 5).map(s => ({
        sale_number: s.sale_number,
        customer_id: s.customer_id,
        total: s.total,
        points_earned: s.points_earned || 0,
        date: s.created_at,
      })),
      customers_summary: customers.map(c => ({
        name: c.name,
        id: c.id,
        loyalty_points: c.loyalty_points || 0,
        sales_count: salesWithCustomer.filter(s => s.customer_id === c.id).length,
      }))
    });
  } catch (error) {
    console.error('Error in loyalty debug:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error' },
      { status: 500 }
    );
  }
}
