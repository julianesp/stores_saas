'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { cn } from '@/lib/utils';
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
} from 'lucide-react';
import { getUserProfileByClerkId } from '@/lib/subscription-helpers';

// Menú para Super Administradores (gestión del SaaS)
const superAdminMenuItems = [
  {
    title: 'Dashboard General',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Gestión de Tiendas',
    href: '/dashboard/superadmin',
    icon: Shield,
  },
  {
    title: 'Usuarios del Sistema',
    href: '/dashboard/admin/users',
    icon: Users,
  },
  {
    title: 'Suscripciones',
    href: '/dashboard/admin/subscriptions',
    icon: CreditCard,
  },
  {
    title: 'Historial de Cobros',
    href: '/dashboard/admin/billing',
    icon: Banknote,
  },
  {
    title: 'Reportes Globales',
    href: '/dashboard/admin/reports',
    icon: BarChart3,
  },
];

// Menú para usuarios normales (gestión de su tienda)
const storeMenuItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'cajero'],
  },
  {
    title: 'Punto de Venta',
    href: '/dashboard/pos',
    icon: ShoppingCart,
    roles: ['admin', 'cajero'],
  },
  {
    title: 'Productos',
    href: '/dashboard/products',
    icon: Package,
    roles: ['admin', 'cajero'],
  },
  {
    title: 'Clientes',
    href: '/dashboard/customers',
    icon: Users,
    roles: ['admin', 'cajero'],
  },
  {
    title: 'Proveedores',
    href: '/dashboard/suppliers',
    icon: Truck,
    roles: ['admin'],
  },
  {
    title: 'Ventas',
    href: '/dashboard/sales',
    icon: BarChart3,
    roles: ['admin', 'cajero'],
  },
  {
    title: 'Ofertas',
    href: '/dashboard/offers',
    icon: Percent,
    roles: ['admin'],
  },
  {
    title: 'Inventario',
    href: '/dashboard/inventory',
    icon: Scan,
    roles: ['admin'],
  },
  {
    title: 'Análisis IA',
    href: '/dashboard/analytics',
    icon: Brain,
    roles: ['admin'],
  },
];

interface SidebarProps {
  isMobile?: boolean;
  onLinkClick?: () => void;
}

export function Sidebar({ isMobile = false, onLinkClick }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useUser();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    async function checkSuperAdmin() {
      if (user) {
        const profile = await getUserProfileByClerkId(user.id);
        setIsSuperAdmin(profile?.is_superadmin || false);
      }
    }
    checkSuperAdmin();
  }, [user]);

  // Seleccionar el menú correcto según el tipo de usuario
  const menuItems = isSuperAdmin ? superAdminMenuItems : storeMenuItems;

  const sidebarClasses = isMobile
    ? "flex w-full md:w-64 flex-col bg-gray-900 text-white h-full"
    : "hidden md:flex md:w-64 md:flex-col bg-gray-900 text-white";

  return (
    <aside className={sidebarClasses}>
      <div className="flex h-16 items-center px-6 border-b border-gray-800">
        <h1 className="text-xl font-bold">
          {isSuperAdmin ? 'Admin Panel' : 'Sistema POS'}
        </h1>
      </div>
      
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onLinkClick}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.title}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-800 space-y-1">
        {!isSuperAdmin && (
          <Link
            href="/dashboard/subscription"
            onClick={onLinkClick}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              pathname === '/dashboard/subscription' || pathname?.startsWith('/dashboard/subscription/')
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
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
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            pathname === '/dashboard/config' || pathname?.startsWith('/dashboard/config/')
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 hover:bg-gray-800 hover:text-white'
          )}
        >
          <Settings className="h-5 w-5" />
          Configuración
        </Link>
      </div>
    </aside>
  );
}
