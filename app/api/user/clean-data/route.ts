import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { queryDocuments, deleteDocument, getAllDocuments, createDocument } from '@/lib/firestore-helpers';

/**
 * API endpoint para limpiar todos los datos de un usuario
 * ADVERTENCIA: Esta operación es irreversible
 *
 * NOTA: Este endpoint limpia los datos de Firestore del usuario autenticado.
 * Los datos se identifican por el clerk_user_id obtenido de la sesión de Clerk.
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

    // Obtener el email del usuario actual de Clerk
    const user = await currentUser();
    const userEmail = user?.emailAddresses[0]?.emailAddress || '';

    if (!userEmail) {
      return NextResponse.json(
        { error: 'No se pudo obtener el email del usuario' },
        { status: 400 }
      );
    }

    // Buscar el perfil por email en Firestore
    const profilesByEmail = await queryDocuments('user_profiles', [
      { field: 'email', operator: '==', value: userEmail }
    ]);

    let userProfileId: string | null = null;
    let cleanAll = false;

    if (profilesByEmail.length === 0) {
      // No hay perfil con este email, buscar por clerk_user_id
      const profilesByClerkId = await queryDocuments('user_profiles', [
        { field: 'clerk_user_id', operator: '==', value: userId }
      ]);

      if (profilesByClerkId.length === 0) {
        // No hay perfil en Firestore, pero podría haber datos huérfanos
        // Vamos a limpiar TODOS los datos de todas las colecciones
        console.log('No se encontró perfil, limpiando TODOS los datos de Firestore...');
        cleanAll = true;
      } else {
        userProfileId = profilesByClerkId[0].id;
      }
    } else {
      userProfileId = profilesByEmail[0].id;
    }

    console.log('Limpiando datos:', cleanAll ? 'TODOS' : `user_profile_id: ${userProfileId}`);

    // Colecciones a limpiar (en orden para evitar referencias huérfanas)
    const collections = [
      'cart_items',
      'shopping_carts',
      'sale_items',
      'sales',
      'inventory_movements',
      'purchase_order_items',
      'purchase_orders',
      'offers',
      'products',
      'customers',
      'suppliers',
      'categories',
      'payment_transactions',
      'loyalty_settings',
    ];

    let totalDeleted = 0;
    const deletionSummary: Record<string, number> = {};

    for (const collectionName of collections) {
      try {
        let documents;

        if (cleanAll) {
          // Limpiar TODOS los documentos de esta colección
          documents = await getAllDocuments(collectionName as any);
        } else {
          // Obtener solo los documentos de este usuario
          documents = await queryDocuments(collectionName as any, [
            { field: 'user_profile_id', operator: '==', value: userProfileId }
          ]);
        }

        deletionSummary[collectionName] = documents.length;

        // Eliminar cada documento
        for (const doc of documents) {
          await deleteDocument(collectionName as any, doc.id);
          totalDeleted++;
        }
      } catch (error) {
        console.error(`Error limpiando ${collectionName}:`, error);
        // Continuar con la siguiente colección aunque haya un error
      }
    }

    return NextResponse.json({
      success: true,
      message: `Se eliminaron ${totalDeleted} documentos`,
      totalDeleted,
      summary: deletionSummary,
    });
  } catch (error) {
    console.error('Error cleaning user data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
