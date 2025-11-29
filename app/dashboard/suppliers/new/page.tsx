import { SupplierForm } from '@/components/suppliers/supplier-form';

export default function NewSupplierPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Nuevo Proveedor</h1>
        <p className="text-gray-500">Registra un nuevo proveedor</p>
      </div>
      <SupplierForm />
    </div>
  );
}
