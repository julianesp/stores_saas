'use client';

import { useSyncExternalStore } from 'react';
import { useUser } from '@clerk/nextjs';
import dynamic from 'next/dynamic';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RefreshProfileButton } from './refresh-profile-button';
import { NotificationPanel } from './notification-panel';
import { OpenWindowButton } from './open-window-button';
import HelpButton from '@/components/help/HelpButton';
import StoreSwitcher from '@/components/layout/StoreSwitcher';
import { ThemeToggle } from '@/components/HourTheme';

const UserButtonClient = dynamic(
  () => import('@clerk/nextjs').then((mod) => ({ default: mod.UserButton })),
  { ssr: false }
);

interface HeaderProps {
  onMenuClick?: () => void;
}

/** "Buenos días" / "Buenas tardes" / "Buenas noches" y la fecha de hoy en español. */
function readGreeting() {
  const now = new Date();
  const hour = now.getHours();
  const saludo = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  const fecha = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(now);
  return `${saludo}|${fecha}`;
}

const noSubscribe = () => () => {};

// Se lee en el navegador (hora local del tendero); en el servidor no hay saludo,
// así se evita un desajuste de hidratación.
function useGreeting() {
  const value = useSyncExternalStore(noSubscribe, readGreeting, () => null);
  if (!value) return null;
  const [saludo, fecha] = value.split('|');
  return { saludo, fecha };
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user } = useUser();
  const greeting = useGreeting();
  const name = user?.firstName || user?.emailAddresses[0]?.emailAddress?.split('@')[0];

  return (
    <header className="app-titlebar sticky top-0 z-10 flex h-16 md:h-20 items-center gap-3 bg-[color-mix(in_srgb,var(--shell-canvas)_88%,transparent)] px-4 md:px-8 backdrop-blur-md">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden shrink-0"
        onClick={onMenuClick}
        aria-label="Abrir menú"
      >
        <Menu className="h-6 w-6" />
      </Button>

      {/* Saludo con la fecha: oculto en móvil para dar espacio a las acciones. */}
      <div className="hidden sm:block flex-1 min-w-0">
        <p className="text-xs text-gray-500 first-letter:uppercase h-4">{greeting?.fecha}</p>
        <h2 className="truncate text-lg md:text-[1.6rem] font-semibold leading-tight text-gray-900">
          {greeting ? `${greeting.saludo}, ${name ?? ''}` : `Hola, ${name ?? ''}`}
        </h2>
      </div>

      {/* En móvil, empujar las acciones a la derecha (el saludo está oculto). */}
      <div className="flex-1 sm:hidden" />

      {/* Bandeja de acciones: una sola pieza en vez de íconos sueltos. */}
      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 rounded-2xl bg-white p-1 ring-1 ring-[var(--shell-line)] shadow-[var(--shell-shadow)] text-gray-700">
        <StoreSwitcher />

        {/* La campana es visible también en móvil: si no, el tendero no puede
            abrir el panel para ver/marcar sus notificaciones (y el aviso seguiría
            activo sin forma de atenderlo). */}
        <NotificationPanel />

        <ThemeToggle className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50" />

        {/* Solo visible cuando corre como PWA instalada (standalone). */}
        <OpenWindowButton />

        <HelpButton />

        <RefreshProfileButton />

        <span className="mx-1 h-6 w-px bg-[var(--shell-line)]" aria-hidden="true" />

        <div className="flex h-9 w-9 items-center justify-center">
          <UserButtonClient
            afterSignOutUrl="/"
            appearance={{ elements: { avatarBox: 'rounded-xl' } }}
          />
        </div>
      </div>
    </header>
  );
}
