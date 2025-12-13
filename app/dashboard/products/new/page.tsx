'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProductForm } from '@/components/products/product-form';

function NewProductContent() {
  const searchParams = useSearchParams();
  const supplierId = searchParams.get('supplier_id');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Nuevo Producto</h1>
        <p className="text-gray-500">Crea un nuevo producto en el inventario</p>
      </div>

      <ProductForm initialData={supplierId ? { supplier_id: supplierId } : undefined} />
    </div>
  );
}

export default function NewProductPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <NewProductContent />
    </Suspense>
  );
}
