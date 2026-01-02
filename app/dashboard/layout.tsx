"use client";

import { useState, useEffect } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { TrialBanner } from "@/components/subscription/trial-banner";
import { SubscriptionExpiredModal } from "@/components/subscription/expired-modal";
import { ExpirationAlert } from "@/components/subscription/expiration-alert";
import {
  checkSubscriptionStatus,
  getUserProfileByClerkId,
} from "@/lib/cloudflare-subscription-helpers";
import { SubscriptionStatus } from "@/lib/types";
import styles from "./styles/Layout.module.scss";

// Component to add noindex meta tag
function NoIndexMeta() {
  useEffect(() => {
    // Add noindex meta tag to prevent search engine indexing
    const metaRobots = document.createElement("meta");
    metaRobots.name = "robots";
    metaRobots.content = "noindex, nofollow";
    document.head.appendChild(metaRobots);

    return () => {
      // Cleanup on unmount
      document.head.removeChild(metaRobots);
    };
  }, []);

  return null;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Control visual para animaciones (open/closing)
  const [sidebarShown, setSidebarShown] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] =
    useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    async function checkAccess() {
      if (user) {
        try {
          // Primero, asegurarse de que el perfil de usuario existe
          try {
            await fetch("/api/user/init-profile", {
              method: "POST",
            });
          } catch (err) {
            console.warn("Error initializing profile:", err);
          }

          // Intentar auto-upgrade si es el super admin
          const userEmail = user.emailAddresses[0]?.emailAddress || "";
          const superAdminEmail = "admin@neurai.dev"; // Hardcoded para evitar problemas con env

          if (userEmail === superAdminEmail) {
            try {
              const upgradeResponse = await fetch("/api/admin/auto-upgrade", {
                method: "POST",
              });
              const upgradeData = await upgradeResponse.json();

              if (upgradeData.upgraded) {
                console.log(
                  "✅ Perfil actualizado a super admin automáticamente"
                );
              } else if (upgradeData.isSuperAdmin) {
                console.log("✅ Ya eres super admin");
              }
            } catch (err) {
              console.warn("Error en auto-upgrade:", err);
            }
          }

          // Inicializar categorías por defecto si no existen (opcional, no crítico)
          // COMENTADO: No es necesario para el funcionamiento del sistema
          // await fetch('/api/categories/seed', { method: 'POST' }).catch(() => {});

          // Verificar si es superadmin
          const profile = await getUserProfileByClerkId(getToken);
          const isSuperAdminUser = profile?.is_superadmin || false;
          setIsSuperAdmin(isSuperAdminUser);

          if (isSuperAdminUser) {
            console.log("🔐 Usuario verificado como Super Admin");
          }

          // Luego, verificar el estado de suscripción (excepto para superadmin)
          if (!isSuperAdminUser) {
            const info = await checkSubscriptionStatus(getToken);
            setSubscriptionInfo(info);
          } else {
            // Super admin siempre tiene acceso
            setSubscriptionInfo({
              canAccess: true,
              status: "active",
            });
          }
        } catch (error) {
          console.error("Error checking subscription:", error);
        } finally {
          setLoading(false);
        }
      }
    }
    checkAccess();
  }, [user]);

  // Permitir acceso a la página de suscripción incluso si está expirado
  const isSubscriptionPage = pathname?.startsWith("/dashboard/subscription");

  // Si no puede acceder y no está en la página de suscripción, mostrar modal (excepto superadmin)
  if (
    !loading &&
    !isSuperAdmin &&
    subscriptionInfo &&
    !subscriptionInfo.canAccess &&
    !isSubscriptionPage
  ) {
    return <SubscriptionExpiredModal reason={subscriptionInfo.status} />;
  }

  // handlers para animación de apertura/cierre del sidebar móvil
  const openSidebar = () => {
    setSidebarOpen(true);
    // activar clase 'open' en el siguiente tick para que la transición ocurra
    setTimeout(() => setSidebarShown(true), 20);
  };

  const closeSidebar = () => {
    // quitar clase 'open' para iniciar transición de cierre
    setSidebarShown(false);
    // esperar la duración de la transición antes de desmontar
    setTimeout(() => setSidebarOpen(false), 500);
  };

  return (
    <>
      <NoIndexMeta />
      <div className="flex h-screen overflow-hidden">
        <Sidebar />

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-50 md:hidden bg-black/20 backdrop-blur-sm"
            onClick={closeSidebar}
          >
            <div
              className={`w-80 h-full ${styles.sidebar} ${
                sidebarShown ? styles.open : styles.closing
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <Sidebar isMobile onLinkClick={closeSidebar} />
            </div>
          </div>
        )}

        <div className="flex flex-col flex-1 overflow-hidden text-black">
          {/* Mostrar banner de trial si aplica (excepto superadmin) */}
          {!loading &&
            !isSuperAdmin &&
            subscriptionInfo?.status === "trial" &&
            subscriptionInfo.daysLeft !== undefined && (
              <TrialBanner daysLeft={subscriptionInfo.daysLeft} />
            )}

          <Header
            onMenuClick={() => {
              if (sidebarOpen) {
                closeSidebar();
              } else {
                openSidebar();
              }
            }}
          />

          <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-6">
            {/* Alerta de expiración cuando faltan 3 días o menos */}
            {!loading &&
              !isSuperAdmin &&
              subscriptionInfo?.daysLeft !== undefined &&
              subscriptionInfo.daysLeft <= 3 && (
                <div className="mb-4">
                  <ExpirationAlert
                    type={
                      subscriptionInfo.status === "trial"
                        ? "trial"
                        : "subscription"
                    }
                    daysLeft={subscriptionInfo.daysLeft}
                  />
                </div>
              )}

            {children}
          </main>
        </div>
      </div>
    </>
  );
}
