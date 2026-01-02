"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, usePathname } from "next/navigation";
import {
  ShoppingCart,
  Menu,
  X,
  Store,
  Home,
  Package,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StoreConfig } from "@/lib/storefront-api";

interface StoreNavbarProps {
  config: StoreConfig;
}

export function StoreNavbar({ config }: StoreNavbarProps) {
  const params = useParams();
  const pathname = usePathname();
  const slug = params.slug as string;

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    updateCartCount();

    // Actualizar contador cuando cambia el localStorage
    const handleStorageChange = () => updateCartCount();
    window.addEventListener("storage", handleStorageChange);

    // También actualizar cuando se hace foco en la ventana
    window.addEventListener("focus", updateCartCount);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("focus", updateCartCount);
    };
  }, [slug]);

  const updateCartCount = () => {
    try {
      const cartKey = `cart_${slug}`;
      const savedCart = localStorage.getItem(cartKey);
      const cart = savedCart ? JSON.parse(savedCart) : [];
      const totalItems = cart.reduce(
        (sum: number, item: any) => sum + item.quantity,
        0
      );
      setCartCount(totalItems);
    } catch (error) {
      console.error("Error reading cart:", error);
      setCartCount(0);
    }
  };

  const primaryColor = config.store_primary_color || "#3B82F6";
  const storeName = config.store_name || "Tienda Online";

  const navigation = [
    { name: "Inicio", href: `/store/${slug}`, icon: Home },
    { name: "Productos", href: `/store/${slug}#productos`, icon: Package },
    { name: "Información", href: `/store/${slug}#info`, icon: Info },
  ];

  const isActive = (href: string) => {
    if (href.includes("#")) {
      return pathname === href.split("#")[0];
    }
    return pathname === href;
  };

  return (
    <nav
      className="sticky top-0 z-50 bg-white shadow-md"
      style={{ borderBottom: `4px solid ${primaryColor}` }}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo y nombre */}
          <Link
            href={`/store/${slug}`}
            className="flex items-center gap-3 group"
          >
            {config.store_logo_url ? (
              <div className="relative w-12 h-12 rounded-lg overflow-hidden transition-transform group-hover:scale-105">
                <Image
                  src={config.store_logo_url}
                  alt={storeName}
                  fill
                  className="object-contain"
                />
              </div>
            ) : (
              <div
                className="p-2 rounded-lg transition-transform group-hover:scale-110"
                style={{ backgroundColor: `${primaryColor}20` }}
              >
                <Store className="h-6 w-6" style={{ color: primaryColor }} />
              </div>
            )}
            <span className="text-xl font-bold text-gray-900 hidden sm:block">
              {storeName}
            </span>
          </Link>

          {/* Links de navegación - Desktop */}
          <div className="hidden md:flex items-center space-x-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    active ? "font-semibold" : "text-gray-600 hover:bg-gray-100"
                  }`}
                  style={
                    active
                      ? {
                          color: primaryColor,
                          backgroundColor: `${primaryColor}10`,
                        }
                      : {}
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* Botones de acción */}
          <div className="flex items-center gap-2">
            {/* Carrito */}
            <Link href={`/store/${slug}/cart`}>
              <Button
                variant="outline"
                size="sm"
                className="relative"
                style={{ borderColor: primaryColor, color: primaryColor }}
              >
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full text-white text-xs flex items-center justify-center font-bold"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
                <span className="hidden sm:inline ml-2">Carrito</span>
              </Button>
            </Link>

            {/* Menú hamburguesa - Mobile */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden text-black "
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>

        {/* Menú móvil */}
        {isMenuOpen && (
          <div className="md:hidden border-t py-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    active ? "font-semibold" : "text-gray-600 hover:bg-gray-100"
                  }`}
                  style={
                    active
                      ? {
                          color: primaryColor,
                          backgroundColor: `${primaryColor}10`,
                        }
                      : {}
                  }
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}
