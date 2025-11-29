import { ProductForm } from '@/components/products/product-form';

export default function NewProductPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Nuevo Producto</h1>
        <p className="text-gray-500">Crea un nuevo producto en el inventario</p>
      </div>

      <ProductForm />
    </div>
  );
}
