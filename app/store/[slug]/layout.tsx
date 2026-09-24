import { Metadata } from 'next';
import Link from 'next/link';
import { getStoreConfig } from '@/lib/storefront-api';
import { isStorefrontDisabled } from '@/lib/storefront-access';
import { StoreLayoutWrapper } from '@/components/store';

interface StoreLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: StoreLayoutProps): Promise<Metadata> {
  try {
    const { slug } = await params;

    // Tiendas propias / demo: no exponer nombre real en el título.
    if (isStorefrontDisabled(slug)) {
      return {
        title: 'Tienda no disponible',
        description: 'Esta tienda no está disponible en este momento.',
      };
    }

    const config = await getStoreConfig(slug);

    return {
      title: config.store_name || 'Tienda Online',
      description: config.store_description || 'Bienvenido a nuestra tienda online',
    };
  } catch {
    return {
      title: 'Tienda no encontrada',
      description: 'La tienda que buscas no existe o está inactiva',
    };
  }
}

export default async function StoreLayout({ children, params }: StoreLayoutProps) {
  const { slug } = await params;

  // Bloqueo centralizado de tiendas propias / de demostración (neurai /
  // julii1295@gmail.com) para TODAS las sub-páginas (catálogo, producto,
  // carrito, checkout): si alguien entra por cualquier URL de esta tienda ve el
  // aviso de "no disponible". Se comprueba por slug y, si la config carga, por
  // email del dueño.
  let disabled = isStorefrontDisabled(slug);
  if (!disabled) {
    try {
      const config = await getStoreConfig(slug);
      disabled = isStorefrontDisabled(slug, config.store_email);
    } catch {
      // Si la config no carga, dejamos que la página maneje el error normal.
    }
  }

  if (disabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-8">
          <h1 className="text-2xl font-bold text-black mb-2">
            Esta tienda no está disponible
          </h1>
          <p className="text-black mb-4">
            La tienda que buscas no está disponible en este momento.
          </p>
          <Link
            href="/"
            className="inline-block rounded-md bg-brand px-4 py-2 text-white hover:bg-brand-hover"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return <StoreLayoutWrapper>{children}</StoreLayoutWrapper>;
}
