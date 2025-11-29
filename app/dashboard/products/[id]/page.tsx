'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ProductForm } from '@/components/products/product-form';
import { getDocumentById } from '@/lib/firestore-helpers';
import { Product } from '@/lib/types';

export default function EditProductPage() {
  const params = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProduct();
  }, [params.id]);

  const fetchProduct = async () => {
    try {
      const data = await getDocumentById('products', params.id as string) as Product | null;
      setProduct(data);
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="py-8 text-center">Cargando producto...</div>;
  }

  if (!product) {
    return <div className="py-8 text-center">Producto no encontrado</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Editar Producto</h1>
        <p className="text-gray-500">Actualiza la información del producto</p>
      </div>

      <ProductForm initialData={product} productId={product.id} />
    </div>
  );
}
