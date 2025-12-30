'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getStoreConfig, StoreConfig } from '@/lib/storefront-api';
import { StoreNavbar } from './store-navbar';
import { StoreFooter } from './store-footer';

interface StoreLayoutWrapperProps {
  children: React.ReactNode;
}

export function StoreLayoutWrapper({ children }: StoreLayoutWrapperProps) {
  const params = useParams();
  const slug = params.slug as string;
  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, [slug]);

  const loadConfig = async () => {
    try {
      const data = await getStoreConfig(slug);
      setConfig(data);
    } catch (error) {
      console.error('Error loading store config:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando tienda...</p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Tienda no encontrada</h1>
          <p className="text-gray-600">La tienda que buscas no existe o está inactiva</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <StoreNavbar config={config} />
      <main className="flex-1">{children}</main>
      <StoreFooter config={config} />
    </div>
  );
}
