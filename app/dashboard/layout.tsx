"use client";

import { useState, useEffect } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { TrialBanner } from "@/components/subscription/trial-banner";
import { SubscriptionExpiredModal } from "@/components/subscription/expired-modal";
import { ExpirationAlert } from "@/components/subscription/expiration-alert";
import { TrialNotificationWrapper } from "@/components/subscription/trial-notification-wrapper";
import { AddonExpiryBanner } from "@/components/subscription/addon-expiry-banner";
import OfflineProvider from "@/components/OfflineProvider";
import {
  checkSubscriptionStatus,
  getUserProfileByClerkId,
} from "@/lib/cloudflare-subscription-helpers";
import { SubscriptionStatus } from "@/lib/types";
import { usePageTracking } from "@/lib/hooks/use-analytics";
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
  const [isTeamMember, setIsTeamMember] = useState(false);
  const [expiringAddons, setExpiringAddons] = useState<Array<{
    name: string;
    daysLeft: number;
    expiresAt: string;
  }>>([]);

  // Rastrear automáticamente todas las visitas a páginas
  usePageTracking();

  useEffect(() => {
    async function checkAccess() {
      if (user) {
        try {
          const token = await getToken();
          const userEmail = user.emailAddresses[0]?.emailAddress || "";
          const superAdminEmail = "admin@neurai.dev";

          // PASO 1: Verificar si el usuario es team member PRIMERO
          let userIsTeamMember = false;
          let teamMemberStores: any[] = [];

          try {
            const storesResponse = await fetch(
              `${process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL}/api/user-stores`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            if (storesResponse.ok) {
              const storesData = await storesResponse.json();
              const stores = storesData.data || [];

              // Verificar si tiene acceso como team member a alguna tienda
              teamMemberStores = stores.filter(
                (store: any) => store.access_type === "team_member"
              );

              if (teamMemberStores.length > 0) {
                userIsTeamMember = true;
                setIsTeamMember(true);

                // IMPORTANTE: Establecer el tenant_id ANTES de hacer otras llamadas
                const selectedTenantId = localStorage.getItem("selected_tenant_id");
                if (!selectedTenantId) {
                  console.log(
                    "🏪 Seleccionando tienda del team member:",
                    teamMemberStores[0].store_name,
                    "ID:",
                    teamMemberStores[0].id
                  );
                  localStorage.setItem(
                    "selected_tenant_id",
                    teamMemberStores[0].id
                  );
                }

                // Team members siempre tienen acceso (usan la suscripción del owner)
                setSubscriptionInfo({
                  canAccess: true,
                  status: "active",
                });

                setLoading(false);
                return; // Terminar aquí para team members
              }
            }
          } catch (error) {
            console.error("Error verificando team membership:", error);
          }

          // PASO 2: Si NO es team member, continuar con el flujo normal de owner

          // Asegurarse de que el perfil de usuario existe
          try {
            await fetch("/api/user/init-profile", {
              method: "POST",
            });
          } catch (err) {
            console.warn("Error initializing profile:", err);
          }

          // Intentar auto-upgrade si es el super admin
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

          // Verificar si es superadmin
          const profile = await getUserProfileByClerkId(getToken);
          const isSuperAdminUser = profile?.is_superadmin || false;
          setIsSuperAdmin(isSuperAdminUser);

          // Verificar addons próximos a vencer (solo para owners, no para team members ni superadmin)
          if (profile && !isSuperAdminUser && !userIsTeamMember && profile.subscription_status === 'active') {
            const today = new Date();
            const expiring: Array<{ name: string; daysLeft: number; expiresAt: string }> = [];

            // Verificar addon de IA
            if (profile.has_ai_addon && profile.ai_addon_expires_at) {
              const expiryDate = new Date(profile.ai_addon_expires_at);
              const diffTime = expiryDate.getTime() - today.getTime();
              const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              if (daysLeft <= 3 && daysLeft >= 0) {
                expiring.push({
                  name: 'Análisis con IA',
                  daysLeft,
                  expiresAt: profile.ai_addon_expires_at
                });
              }
            }

            // Verificar addon de Tienda
            if (profile.has_store_addon && profile.store_addon_expires_at) {
              const expiryDate = new Date(profile.store_addon_expires_at);
              const diffTime = expiryDate.getTime() - today.getTime();
              const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              if (daysLeft <= 3 && daysLeft >= 0) {
                expiring.push({
                  name: 'Tienda Online',
                  daysLeft,
                  expiresAt: profile.store_addon_expires_at
                });
              }
            }

            // Verificar addon de Email
            if (profile.has_email_addon && profile.email_addon_expires_at) {
              const expiryDate = new Date(profile.email_addon_expires_at);
              const diffTime = expiryDate.getTime() - today.getTime();
              const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              if (daysLeft <= 3 && daysLeft >= 0) {
                expiring.push({
                  name: 'Email Marketing',
                  daysLeft,
                  expiresAt: profile.email_addon_expires_at
                });
              }
            }

            setExpiringAddons(expiring);
          }

          if (isSuperAdminUser) {
            console.log("🔐 Usuario verificado como Super Admin");
            setSubscriptionInfo({
              canAccess: true,
              status: "active",
            });
          } else {
            // Verificar el estado de suscripción para owners normales
            const info = await checkSubscriptionStatus(getToken);
            setSubscriptionInfo(info);
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

  // Si no puede acceder y no está en la página de suscripción, mostrar modal (excepto superadmin y team members)
  if (
    !loading &&
    !isSuperAdmin &&
    !isTeamMember &&
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
    <OfflineProvider>
      <NoIndexMeta />
      {/* Modal de notificación de trial - solo se muestra para usuarios en trial (no team members) */}
      {!loading && !isSuperAdmin && !isTeamMember && <TrialNotificationWrapper />}
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
          {/* Mostrar banner para trial o suscripciones activas próximas a vencer */}
          {!loading &&
            !isSuperAdmin &&
            !isTeamMember &&
            subscriptionInfo?.daysLeft !== undefined &&
            (subscriptionInfo.status === "trial" || subscriptionInfo.status === "active") && (
              <TrialBanner
                daysLeft={subscriptionInfo.daysLeft}
                subscriptionType={subscriptionInfo.status}
              />
            )}

          {/* Mostrar banner de addons próximos a vencer */}
          {!loading && !isSuperAdmin && !isTeamMember && expiringAddons.length > 0 && (
            <AddonExpiryBanner addons={expiringAddons} />
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
            {/* Alerta de expiración cuando faltan 3 días o menos (no para team members) */}
            {!loading &&
              !isSuperAdmin &&
              !isTeamMember &&
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
    </OfflineProvider>
  );
}
