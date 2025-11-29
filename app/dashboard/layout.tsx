'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { TrialBanner } from '@/components/subscription/trial-banner';
import { SubscriptionExpiredModal } from '@/components/subscription/expired-modal';
import { checkSubscriptionStatus, getUserProfileByClerkId } from '@/lib/subscription-helpers';
import { SubscriptionStatus } from '@/lib/types';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useUser();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    async function checkAccess() {
      if (user) {
        try {
          // Primero, asegurarse de que el perfil de usuario existe
          await fetch('/api/user/init-profile', {
            method: 'POST',
          });

          // Inicializar categorías por defecto si no existen
          await fetch('/api/categories/seed', {
            method: 'POST',
          });

          // Verificar si es superadmin
          const profile = await getUserProfileByClerkId(user.id);
          const isSuperAdminUser = profile?.is_superadmin || false;
          setIsSuperAdmin(isSuperAdminUser);

          // Luego, verificar el estado de suscripción
          const info = await checkSubscriptionStatus(user.id);
          setSubscriptionInfo(info);
        } catch (error) {
          console.error('Error checking subscription:', error);
        } finally {
          setLoading(false);
        }
      }
    }
    checkAccess();
  }, [user]);

  // Permitir acceso a la página de suscripción incluso si está expirado
  const isSubscriptionPage = pathname?.startsWith('/dashboard/subscription');

  // Si no puede acceder y no está en la página de suscripción, mostrar modal (excepto superadmin)
  if (!loading && !isSuperAdmin && subscriptionInfo && !subscriptionInfo.canAccess && !isSubscriptionPage) {
    return <SubscriptionExpiredModal reason={subscriptionInfo.status} />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div
            className="w-64 h-full bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar />
          </div>
        </div>
      )}

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Mostrar banner de trial si aplica (excepto superadmin) */}
        {!loading &&
          !isSuperAdmin &&
          subscriptionInfo?.status === 'trial' &&
          subscriptionInfo.daysLeft !== undefined && (
            <TrialBanner daysLeft={subscriptionInfo.daysLeft} />
          )}

        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
