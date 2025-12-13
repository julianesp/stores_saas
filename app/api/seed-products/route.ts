import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createDocument, queryDocuments } from '@/lib/firestore-helpers';
import { getUserProfileByClerkId } from '@/lib/subscription-helpers';

/**
 * API endpoint para crear productos de muestra
 */
export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Obtener el perfil de usuario para conseguir el user_profile_id
    const userProfile = await getUserProfileByClerkId(userId);
    if (!userProfile) {
      return NextResponse.json(
        { error: 'Perfil de usuario no encontrado' },
        { status: 404 }
      );
    }

    // Obtener categorías existentes del usuario
    const categories = await queryDocuments('categories', [
      { field: 'user_profile_id', operator: '==', value: userProfile.id }
    ]) as any[];

    if (categories.length === 0) {
      return NextResponse.json(
        { error: 'No hay categorías. Por favor crea categorías primero.' },
        { status: 400 }
      );
    }

    // Productos de muestra variados
    const sampleProducts = [
      // Bebidas
      {
        name: 'Coca Cola 2L',
        description: 'Gaseosa Coca Cola 2 litros',
        barcode: '7702010000015',
        cost_price: 4500,
        sale_price: 6500,
        stock: 45,
        min_stock: 10,
        category_name: 'Bebidas'
      },
      {
        name: 'Agua Manantial 600ml',
        description: 'Agua purificada sin gas',
        barcode: '7702010000022',
        cost_price: 800,
        sale_price: 1500,
        stock: 120,
        min_stock: 30,
        category_name: 'Bebidas'
      },
      {
        name: 'Jugo Hit Mora 1L',
        description: 'Jugo de mora tetrapack',
        barcode: '7702010000039',
        cost_price: 2800,
        sale_price: 4200,
        stock: 25,
        min_stock: 8,
        category_name: 'Bebidas'
      },
      {
        name: 'Cerveza Águila 330ml',
        description: 'Cerveza nacional lata',
        barcode: '7702010000046',
        cost_price: 1800,
        sale_price: 3000,
        stock: 80,
        min_stock: 20,
        category_name: 'Bebidas'
      },
      // Snacks
      {
        name: 'Papas Margarita 150g',
        description: 'Papas fritas sabor natural',
        barcode: '7702010000053',
        cost_price: 3200,
        sale_price: 5000,
        stock: 35,
        min_stock: 12,
        category_name: 'Snacks'
      },
      {
        name: 'Doritos Nachos 100g',
        description: 'Tortillas de maíz sabor queso',
        barcode: '7702010000060',
        cost_price: 2500,
        sale_price: 4000,
        stock: 50,
        min_stock: 15,
        category_name: 'Snacks'
      },
      {
        name: 'Chocolatina Jet',
        description: 'Chocolate con leche',
        barcode: '7702010000077',
        cost_price: 800,
        sale_price: 1500,
        stock: 100,
        min_stock: 25,
        category_name: 'Snacks'
      },
      {
        name: 'Chocoramo',
        description: 'Ponqué con cobertura de chocolate',
        barcode: '7702010000084',
        cost_price: 1200,
        sale_price: 2000,
        stock: 60,
        min_stock: 20,
        category_name: 'Snacks'
      },
      // Aseo
      {
        name: 'Jabón Protex 120g',
        description: 'Jabón antibacterial',
        barcode: '7702010000091',
        cost_price: 2800,
        sale_price: 4500,
        stock: 30,
        min_stock: 10,
        category_name: 'Aseo Personal'
      },
      {
        name: 'Shampoo Sedal 350ml',
        description: 'Shampoo para cabello normal',
        barcode: '7702010000107',
        cost_price: 8500,
        sale_price: 12000,
        stock: 20,
        min_stock: 5,
        category_name: 'Aseo Personal'
      },
      {
        name: 'Crema Dental Colgate 100ml',
        description: 'Pasta dental triple acción',
        barcode: '7702010000114',
        cost_price: 4200,
        sale_price: 6500,
        stock: 25,
        min_stock: 8,
        category_name: 'Aseo Personal'
      },
      {
        name: 'Papel Higiénico Familia x4',
        description: 'Papel higiénico doble hoja',
        barcode: '7702010000121',
        cost_price: 6500,
        sale_price: 9500,
        stock: 40,
        min_stock: 12,
        category_name: 'Aseo Hogar'
      },
      // Lácteos
      {
        name: 'Leche Alpina Entera 1L',
        description: 'Leche entera ultra pasteurizada',
        barcode: '7702010000138',
        cost_price: 3200,
        sale_price: 4800,
        stock: 30,
        min_stock: 10,
        category_name: 'Lácteos',
        expiration_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString() // 15 días
      },
      {
        name: 'Yogurt Alpina Fresa 200g',
        description: 'Yogurt con fruta sabor fresa',
        barcode: '7702010000145',
        cost_price: 1800,
        sale_price: 3000,
        stock: 45,
        min_stock: 15,
        category_name: 'Lácteos',
        expiration_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString() // 20 días
      },
      {
        name: 'Queso Campesino 500g',
        description: 'Queso blanco campesino',
        barcode: '7702010000152',
        cost_price: 8500,
        sale_price: 12500,
        stock: 15,
        min_stock: 5,
        category_name: 'Lácteos',
        expiration_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString() // 10 días
      },
      // Abarrotes
      {
        name: 'Arroz Diana 500g',
        description: 'Arroz blanco de primera',
        barcode: '7702010000169',
        cost_price: 1800,
        sale_price: 2800,
        stock: 60,
        min_stock: 20,
        category_name: 'Abarrotes'
      },
      {
        name: 'Aceite Girasol 900ml',
        description: 'Aceite vegetal de girasol',
        barcode: '7702010000176',
        cost_price: 8500,
        sale_price: 12000,
        stock: 25,
        min_stock: 8,
        category_name: 'Abarrotes'
      },
      {
        name: 'Azúcar 500g',
        description: 'Azúcar refinada blanca',
        barcode: '7702010000183',
        cost_price: 1500,
        sale_price: 2500,
        stock: 50,
        min_stock: 15,
        category_name: 'Abarrotes'
      },
      {
        name: 'Sal 500g',
        description: 'Sal de cocina yodada',
        barcode: '7702010000190',
        cost_price: 800,
        sale_price: 1500,
        stock: 40,
        min_stock: 10,
        category_name: 'Abarrotes'
      },
      {
        name: 'Frijol Rojo 500g',
        description: 'Frijol rojo de cocina',
        barcode: '7702010000206',
        cost_price: 3200,
        sale_price: 5000,
        stock: 35,
        min_stock: 10,
        category_name: 'Abarrotes'
      },
      // Panadería
      {
        name: 'Pan Tajado Bimbo',
        description: 'Pan de molde tajado',
        barcode: '7702010000213',
        cost_price: 3500,
        sale_price: 5500,
        stock: 20,
        min_stock: 5,
        category_name: 'Panadería',
        expiration_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 días
      },
      {
        name: 'Galletas Ducales 294g',
        description: 'Galletas de soda',
        barcode: '7702010000220',
        cost_price: 2800,
        sale_price: 4500,
        stock: 40,
        min_stock: 12,
        category_name: 'Panadería'
      },
      // Carnes (stock bajo para probar alertas)
      {
        name: 'Salchicha Zenú 500g',
        description: 'Salchicha tipo suiza',
        barcode: '7702010000237',
        cost_price: 7500,
        sale_price: 11000,
        stock: 3,
        min_stock: 8,
        category_name: 'Carnes',
        expiration_date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        name: 'Jamón de Pierna 250g',
        description: 'Jamón de cerdo',
        barcode: '7702010000244',
        cost_price: 6500,
        sale_price: 9500,
        stock: 2,
        min_stock: 6,
        category_name: 'Carnes',
        expiration_date: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString()
      },
      // Artículos de limpieza
      {
        name: 'Detergente Ariel 500g',
        description: 'Detergente en polvo',
        barcode: '7702010000251',
        cost_price: 8500,
        sale_price: 12500,
        stock: 25,
        min_stock: 8,
        category_name: 'Aseo Hogar'
      },
      {
        name: 'Suavizante Suavitel 900ml',
        description: 'Suavizante de ropa',
        barcode: '7702010000268',
        cost_price: 7200,
        sale_price: 10500,
        stock: 18,
        min_stock: 6,
        category_name: 'Aseo Hogar'
      },
      {
        name: 'Cloro Blanqueador 1L',
        description: 'Blanqueador líquido',
        barcode: '7702010000275',
        cost_price: 3500,
        sale_price: 5500,
        stock: 30,
        min_stock: 10,
        category_name: 'Aseo Hogar'
      },
    ];

    const createdProducts = [];
    const errors = [];

    for (const product of sampleProducts) {
      try {
        // Buscar la categoría por nombre
        const category = categories.find(c =>
          c.name.toLowerCase() === product.category_name.toLowerCase()
        );

        const productData: any = {
          name: product.name,
          description: product.description,
          barcode: product.barcode,
          cost_price: product.cost_price,
          sale_price: product.sale_price,
          stock: product.stock,
          min_stock: product.min_stock,
          category_id: category?.id || null,
        };

        if (product.expiration_date) {
          productData.expiration_date = product.expiration_date;
        }

        const created = await createDocument('products', productData, userProfile.id);
        createdProducts.push(created);
      } catch (error) {
        errors.push({
          product: product.name,
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Se crearon ${createdProducts.length} productos de muestra`,
      created: createdProducts.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error creating sample products:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
