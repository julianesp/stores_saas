'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/register-sw';
import OfflineIndicator from './OfflineIndicator';

export default function OfflineProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Registrar Service Worker solo en el cliente
    if (typeof window !== 'undefined') {
      registerServiceWorker().catch((error) => {
        console.error('Error al registrar Service Worker:', error);
      });
    }
  }, []);

  return (
    <>
      {children}
      <OfflineIndicator />
    </>
  );
}
