import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  WhereFilterOp,
  DocumentData,
  QueryConstraint
} from 'firebase/firestore';
import { db } from './firebase';

// Tipos para las colecciones
export type CollectionName =
  | 'user_profiles'
  | 'categories'
  | 'suppliers'
  | 'products'
  | 'customers'
  | 'sales'
  | 'sale_items'
  | 'inventory_movements'
  | 'offers'
  | 'shopping_carts'
  | 'cart_items'
  | 'payment_transactions'
  | 'loyalty_settings';

// Helper para obtener todos los documentos de una colección
export async function getAllDocuments(collectionName: CollectionName) {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error(`Error getting documents from ${collectionName}:`, error);
    throw error;
  }
}

// Helper para obtener un documento por ID
export async function getDocumentById(collectionName: CollectionName, id: string) {
  try {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error(`Error getting document ${id} from ${collectionName}:`, error);
    throw error;
  }
}

// Helper para crear un documento
export async function createDocument(collectionName: CollectionName, data: DocumentData) {
  try {
    const now = Timestamp.now();
    const docData = {
      ...data,
      created_at: now,
      updated_at: now,
    };

    const docRef = await addDoc(collection(db, collectionName), docData);
    return { id: docRef.id, ...docData };
  } catch (error) {
    console.error(`Error creating document in ${collectionName}:`, error);
    throw error;
  }
}

// Helper para actualizar un documento
export async function updateDocument(
  collectionName: CollectionName,
  id: string,
  data: DocumentData
) {
  try {
    const docRef = doc(db, collectionName, id);
    const updateData = {
      ...data,
      updated_at: Timestamp.now(),
    };

    await updateDoc(docRef, updateData);
    return { id, ...updateData };
  } catch (error) {
    console.error(`Error updating document ${id} in ${collectionName}:`, error);
    throw error;
  }
}

// Helper para eliminar un documento
export async function deleteDocument(collectionName: CollectionName, id: string) {
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error) {
    console.error(`Error deleting document ${id} from ${collectionName}:`, error);
    throw error;
  }
}

// Helper para hacer consultas con filtros
export async function queryDocuments(
  collectionName: CollectionName,
  filters: { field: string; operator: WhereFilterOp; value: any }[] = [],
  orderByField?: string,
  limitCount?: number
) {
  try {
    const constraints: QueryConstraint[] = [];

    // Agregar filtros where
    filters.forEach(filter => {
      constraints.push(where(filter.field, filter.operator, filter.value));
    });

    // Agregar ordenamiento
    if (orderByField) {
      constraints.push(orderBy(orderByField));
    }

    // Agregar límite
    if (limitCount) {
      constraints.push(limit(limitCount));
    }

    const q = query(collection(db, collectionName), ...constraints);
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error(`Error querying documents from ${collectionName}:`, error);
    throw error;
  }
}

// Helper específico para buscar productos por código de barras
export async function getProductByBarcode(barcode: string) {
  try {
    const products = await queryDocuments('products', [
      { field: 'barcode', operator: '==', value: barcode }
    ]);

    return products.length > 0 ? products[0] : null;
  } catch (error) {
    console.error('Error getting product by barcode:', error);
    throw error;
  }
}

// Helper para generar número de venta único
export async function generateSaleNumber(): Promise<string> {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');

  // Obtener todas las ventas del día
  const todaySales = await queryDocuments('sales', [
    { field: 'sale_number', operator: '>=', value: `VTA-${dateStr}-000000` },
    { field: 'sale_number', operator: '<=', value: `VTA-${dateStr}-999999` }
  ]);

  const nextNumber = String(todaySales.length + 1).padStart(6, '0');
  return `VTA-${dateStr}-${nextNumber}`;
}
