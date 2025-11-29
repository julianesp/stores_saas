import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createDocument, getAllDocuments } from '@/lib/firestore-helpers';

const DEFAULT_CATEGORIES = [
  { name: 'Frutas y Verduras', description: 'Productos frescos' },
  { name: 'Carnes y Pescados', description: 'Productos cárnicos y mariscos' },
  { name: 'Lácteos y Huevos', description: 'Leche, quesos, yogurt y huevos' },
  { name: 'Panadería', description: 'Pan y productos de panadería' },
  { name: 'Bebidas', description: 'Bebidas frías, calientes y alcohólicas' },
  { name: 'Despensa', description: 'Granos, pastas, enlatados' },
  { name: 'Aseo y Limpieza', description: 'Productos de limpieza del hogar' },
  { name: 'Cuidado Personal', description: 'Productos de higiene personal' },
  { name: 'Snacks y Dulces', description: 'Golosinas y aperitivos' },
  { name: 'Congelados', description: 'Productos congelados' },
  { name: 'Licores', description: 'Bebidas alcohólicas' },
  { name: 'Otros', description: 'Productos varios' },
];

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

    // Verificar si ya existen categorías
    const existingCategories = await getAllDocuments('categories');

    if (existingCategories.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Las categorías ya existen',
        count: existingCategories.length,
      });
    }

    // Crear categorías por defecto
    const createdCategories = [];
    for (const category of DEFAULT_CATEGORIES) {
      const newCategory = await createDocument('categories', category);
      createdCategories.push(newCategory);
    }

    return NextResponse.json({
      success: true,
      message: 'Categorías creadas exitosamente',
      count: createdCategories.length,
      categories: createdCategories,
    });
  } catch (error) {
    console.error('Error seeding categories:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error al crear categorías';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
