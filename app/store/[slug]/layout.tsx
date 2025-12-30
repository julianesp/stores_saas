import { Metadata } from 'next';
import { getStoreConfig } from '@/lib/storefront-api';
import { StoreLayoutWrapper } from '@/components/store';

interface StoreLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: StoreLayoutProps): Promise<Metadata> {
  try {
    const { slug } = await params;
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

export default function StoreLayout({ children }: StoreLayoutProps) {
  return <StoreLayoutWrapper>{children}</StoreLayoutWrapper>;
}
