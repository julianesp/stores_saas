import { Metadata } from 'next';
import { getStoreConfig } from '@/lib/storefront-api';
import { notFound } from 'next/navigation';

interface StoreLayoutProps {
  children: React.ReactNode;
  params: { slug: string };
}

export async function generateMetadata({ params }: StoreLayoutProps): Promise<Metadata> {
  try {
    const config = await getStoreConfig(params.slug);

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

export default function StoreLayout({ children }: StoreLayoutProps) {
  return <>{children}</>;
}
