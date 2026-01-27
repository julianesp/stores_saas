"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Truck,
  BarChart3,
  Tag,
  Settings,
  Scan,
  CreditCard,
  Percent,
  Shield,
  Banknote,
  Brain,
  Receipt,
  Lock,
  Sparkles,
  Store,
  Mail,
  TrendingUp,
  GripVertical,
} from "lucide-react";
import {
  getUserProfileByClerkId,
  hasAIAccess,
  hasEmailMarketingAccess,
  hasStoreAccess,
} from "@/lib/cloudflare-subscription-helpers";
import { UserProfile } from "@/lib/types";

// Menú para Super Administradores (gestión del SaaS)
const superAdminMenuItems = [
  {
    title: "Dashboard General",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Gestión de Tiendas",
    href: "/dashboard/superadmin",
    icon: Shield,
  },
  {
    title: "Usuarios del Sistema",
    href: "/dashboard/admin/users",
    icon: Users,
  },
  {
    title: "Suscripciones",
    href: "/dashboard/admin/subscriptions",
    icon: CreditCard,
  },
  {
    title: "Historial de Cobros",
    href: "/dashboard/admin/billing",
    icon: Banknote,
  },
  {
    title: "Reportes Globales",
    href: "/dashboard/admin/reports",
    icon: BarChart3,
  },
];

// Menú para usuarios normales (gestión de su tienda)
const storeMenuItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "cajero"],
  },
  {
    title: "Punto de Venta",
    href: "/dashboard/pos",
    icon: ShoppingCart,
    roles: ["admin", "cajero"],
  },
  {
    title: "Productos",
    href: "/dashboard/products",
    icon: Package,
    roles: ["admin", "cajero"],
  },
  {
    title: "Clientes",
    href: "/dashboard/customers",
    icon: Users,
    roles: ["admin", "cajero"],
  },
  {
    title: "Deudores",
    href: "/dashboard/debtors",
    icon: Receipt,
    roles: ["admin", "cajero"],
  },
  {
    title: "Proveedores",
    href: "/dashboard/suppliers",
    icon: Truck,
    roles: ["admin"],
  },
  {
    title: "Estadísticas de Compras",
    href: "/dashboard/purchase-stats",
    icon: TrendingUp,
    roles: ["admin"],
  },
  {
    title: "Ventas",
    href: "/dashboard/sales",
    icon: BarChart3,
    roles: ["admin", "cajero"],
  },
  {
    title: "Ofertas",
    href: "/dashboard/offers",
    icon: Percent,
    roles: ["admin"],
  },
  {
    title: "Tienda Online",
    href: "/dashboard/store-config",
    icon: Store,
    roles: ["admin"],
  },
  {
    title: "Pedidos Web",
    href: "/dashboard/web-orders",
    icon: ShoppingCart,
    roles: ["admin"],
  },
  {
    title: "Inventario",
    href: "/dashboard/inventory",
    icon: Scan,
    roles: ["admin"],
  },
  {
    title: "Análisis IA",
    href: "/dashboard/analytics",
    icon: Brain,
    roles: ["admin"],
  },
  {
    title: "Email Marketing",
    href: "/dashboard/email-settings",
    icon: Mail,
    roles: ["admin"],
  },
];

interface SidebarProps {
  isMobile?: boolean;
  onLinkClick?: () => void;
}

const MIN_WIDTH = 200;
const MAX_WIDTH = 400;
const DEFAULT_WIDTH = 256; // 16rem = 256px
const STORAGE_KEY = 'sidebar-width';

export function Sidebar({ isMobile = false, onLinkClick }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useUser();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [hasAI, setHasAI] = useState(false);
  const [hasEmail, setHasEmail] = useState(false);
  const [hasStore, setHasStore] = useState(false);

  // Estado para el ancho del sidebar
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Cargar el ancho guardado del localStorage
  useEffect(() => {
    if (!isMobile) {
      const savedWidth = localStorage.getItem(STORAGE_KEY);
      if (savedWidth) {
        const width = parseInt(savedWidth, 10);
        if (width >= MIN_WIDTH && width <= MAX_WIDTH) {
          setSidebarWidth(width);
        }
      }
    }
  }, [isMobile]);

  // Guardar el ancho en localStorage cuando cambia
  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem(STORAGE_KEY, sidebarWidth.toString());
    }
  }, [sidebarWidth, isMobile]);

  // Manejar el redimensionamiento
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const newWidth = e.clientX;
    if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
      setSidebarWidth(newWidth);
    }
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    async function checkSuperAdmin() {
      if (user) {
        // Usar auth para obtener el token
        const getToken = async () => {
          // En el cliente, no podemos usar auth() de @clerk/nextjs/server
          // Debemos importar desde @clerk/nextjs
          return null; // Temporalmente null, el getToken se manejará en el componente
        };

        try {
          // Hacer una llamada al API para obtener el perfil
          const response = await fetch("/api/user/init-profile", {
            method: "POST",
          });
          const data = await response.json();

          if (data.success && data.profile) {
            setIsSuperAdmin(data.profile.is_superadmin || false);
            setUserProfile(data.profile);
            if (data.profile) {
              setHasAI(hasAIAccess(data.profile));
              setHasEmail(hasEmailMarketingAccess(data.profile));
              setHasStore(hasStoreAccess(data.profile));
            }
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
        }
      }
    }
    checkSuperAdmin();
  }, [user]);

  // Seleccionar el menú correcto según el tipo de usuario
  const menuItems = isSuperAdmin ? superAdminMenuItems : storeMenuItems;

  // Combinar todos los items para móvil
  const allMenuItemsForMobile = [
    ...menuItems,
    ...(!isSuperAdmin
      ? [
          {
            title: "Suscripción",
            href: "/dashboard/subscription",
            icon: CreditCard,
            roles: ["admin"] as string[],
          },
        ]
      : []),
    {
      title: "Configuración",
      href: "/dashboard/config",
      icon: Settings,
      roles: ["admin"] as string[],
    },
  ];

  // Mostrar sidebar en pantallas >= 768px (md breakpoint)
  const sidebarClasses = isMobile
    ? "flex w-full md:w-64 flex-col bg-black/60 backdrop-blur-sm text-white h-full"
    : "hidden md:flex flex-col bg-gray-900 text-white flex-shrink-0 relative";

  return (
    <aside
      ref={sidebarRef}
      className={sidebarClasses}
      style={isMobile ? undefined : { width: `${sidebarWidth}px` }}
    >
      {/* Header - Solo visible en desktop */}
      <div className="hidden md:flex h-16 items-center px-6 border-b border-gray-800">
        <h1 className="text-xl font-bold">
          {isSuperAdmin ? "Admin Panel" : "Sistema POS"}
        </h1>
      </div>

      {/* Header móvil */}
      <div className="flex md:hidden h-16 items-center justify-center border-b border-gray-800 relative">
        <h1 className="text-xl font-bold">
          {isSuperAdmin ? "Admin Panel" : "Sistema POS"}
        </h1>

        {/* Botón de cerrar (solo móvil) */}
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={onLinkClick}
          className="absolute -right-12 top-3 md:hidden w-11 h-11 rounded-full bg-black border-4 border-sky-400 text-white flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-yellow-400"
        >
          <span className="sr-only">Cerrar menú</span>
          {/* X icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Layout Desktop - Lista vertical */}
      <nav className="hidden md:flex flex-1 flex-col space-y-1 px-3 py-4 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          const isAnalytics = item.href === "/dashboard/analytics";
          const isEmailMarketing = item.href === "/dashboard/email-settings";
          const isStoreConfig = item.href === "/dashboard/store-config";
          const isWebOrders = item.href === "/dashboard/web-orders";

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onLinkClick}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="flex-1">{item.title}</span>
              {isAnalytics && userProfile && (
                <>
                  {userProfile.subscription_status === "trial" && (
                    <span className="text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Gratis
                    </span>
                  )}
                  {!hasAI && userProfile.subscription_status !== "trial" && (
                    <Lock className="h-4 w-4 text-gray-400" />
                  )}
                </>
              )}
              {isEmailMarketing && userProfile && (
                <>
                  {userProfile.subscription_status === "trial" && (
                    <span className="text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Gratis
                    </span>
                  )}
                  {!hasEmail && userProfile.subscription_status !== "trial" && (
                    <Lock className="h-4 w-4 text-gray-400" />
                  )}
                </>
              )}
              {(isStoreConfig || isWebOrders) && userProfile && (
                <>
                  {userProfile.subscription_status === "trial" && (
                    <span className="text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Gratis
                    </span>
                  )}
                  {!hasStore && userProfile.subscription_status !== "trial" && (
                    <Lock className="h-4 w-4 text-gray-400" />
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Layout Móvil - Grid de 2 columnas con cuadrados */}
      <nav className="md:hidden flex-1 overflow-y-auto px-2 ">
        <div className="grid grid-cols-2 gap-2 w-full">
          {allMenuItemsForMobile.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname?.startsWith(item.href + "/");
            const isAnalytics = item.href === "/dashboard/analytics";
            const isEmailMarketing = item.href === "/dashboard/email-settings";
            const isStoreConfig = item.href === "/dashboard/store-config";
            const isWebOrders = item.href === "/dashboard/web-orders";

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onLinkClick}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-lg p-4 aspect-square text-sm font-medium transition-colors relative",
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                )}
              >
                <Icon className="h-8 w-8" />
                <span className="text-xs text-center leading-tight">
                  {item.title}
                </span>
                {isAnalytics && userProfile && (
                  <>
                    {userProfile.subscription_status === "trial" && (
                      <span className="absolute top-1 right-1 text-[10px] bg-gradient-to-r from-purple-500 to-pink-500 text-white px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <Sparkles className="h-2 w-2" />
                        Gratis
                      </span>
                    )}
                    {!hasAI && userProfile.subscription_status !== "trial" && (
                      <Lock className="absolute top-1 right-1 h-3 w-3 text-gray-400" />
                    )}
                  </>
                )}
                {isEmailMarketing && userProfile && (
                  <>
                    {userProfile.subscription_status === "trial" && (
                      <span className="absolute top-1 right-1 text-[10px] bg-gradient-to-r from-purple-500 to-pink-500 text-white px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <Sparkles className="h-2 w-2" />
                        Gratis
                      </span>
                    )}
                    {!hasEmail && userProfile.subscription_status !== "trial" && (
                      <Lock className="absolute top-1 right-1 h-3 w-3 text-gray-400" />
                    )}
                  </>
                )}
                {(isStoreConfig || isWebOrders) && userProfile && (
                  <>
                    {userProfile.subscription_status === "trial" && (
                      <span className="absolute top-1 right-1 text-[10px] bg-gradient-to-r from-purple-500 to-pink-500 text-white px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <Sparkles className="h-2 w-2" />
                        Gratis
                      </span>
                    )}
                    {!hasStore && userProfile.subscription_status !== "trial" && (
                      <Lock className="absolute top-1 right-1 h-3 w-3 text-gray-400" />
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer Desktop */}
      <div className="hidden md:block p-4 border-t border-gray-800 space-y-1">
        {!isSuperAdmin && (
          <Link
            href="/dashboard/subscription"
            onClick={onLinkClick}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === "/dashboard/subscription" ||
                pathname?.startsWith("/dashboard/subscription/")
                ? "bg-blue-600 text-white"
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
            )}
          >
            <CreditCard className="h-5 w-5" />
            Suscripción
          </Link>
        )}
        <Link
          href="/dashboard/config"
          onClick={onLinkClick}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            pathname === "/dashboard/config" ||
              pathname?.startsWith("/dashboard/config/")
              ? "bg-blue-600 text-white"
              : "text-gray-300 hover:bg-gray-800 hover:text-white"
          )}
        >
          <Settings className="h-5 w-5" />
          Configuración
        </Link>
      </div>

      {/* Handle de redimensionamiento - Solo visible en desktop */}
      {!isMobile && (
        <div
          onMouseDown={handleMouseDown}
          className={cn(
            "absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors group",
            isResizing && "bg-blue-500"
          )}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <GripVertical className="w-4 h-4 text-blue-500" />
          </div>
        </div>
      )}
    </aside>
  );
}
