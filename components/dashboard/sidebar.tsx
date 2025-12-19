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
  Receipt,
  Lock,
  Sparkles,
} from 'lucide-react';
import { getUserProfileByClerkId, hasAIAccess } from '@/lib/cloudflare-subscription-helpers';
import { UserProfile } from '@/lib/types';

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
    title: 'Deudores',
    href: '/dashboard/debtors',
    icon: Receipt,
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
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [hasAI, setHasAI] = useState(false);

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
          const response = await fetch('/api/user/init-profile', {
            method: 'POST',
          });
          const data = await response.json();

          if (data.success && data.profile) {
            setIsSuperAdmin(data.profile.is_superadmin || false);
            setUserProfile(data.profile);
            if (data.profile) {
              setHasAI(hasAIAccess(data.profile));
            }
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
        }
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
          const isAnalytics = item.href === '/dashboard/analytics';

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
              <span className="flex-1">{item.title}</span>
              {isAnalytics && userProfile && (
                <>
                  {userProfile.subscription_status === 'trial' && (
                    <span className="text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Gratis
                    </span>
                  )}
                  {!hasAI && userProfile.subscription_status !== 'trial' && (
                    <Lock className="h-4 w-4 text-gray-400" />
                  )}
                </>
              )}
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
