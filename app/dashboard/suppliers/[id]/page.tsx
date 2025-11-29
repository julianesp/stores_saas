'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { SupplierForm } from '@/components/suppliers/supplier-form';
import { getDocumentById } from '@/lib/firestore-helpers';

export default function EditSupplierPage() {
  const params = useParams();
  const [supplier, setSupplier] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSupplier = async () => {
      try {
        const data = await getDocumentById('suppliers', params.id as string);
        setSupplier(data);
      } catch (error) {
        console.error('Error fetching supplier:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSupplier();
  }, [params.id]);

  if (loading) return <div className="py-8 text-center">Cargando...</div>;
  if (!supplier) return <div className="py-8 text-center">Proveedor no encontrado</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Editar Proveedor</h1>
        <p className="text-gray-500">Actualiza la información del proveedor</p>
      </div>
      <SupplierForm initialData={supplier} supplierId={params.id as string} />
    </div>
  );
}
