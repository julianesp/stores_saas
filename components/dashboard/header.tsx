'use client';

import { useUser } from '@clerk/nextjs';
import dynamic from 'next/dynamic';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RefreshProfileButton } from './refresh-profile-button';
import { NotificationPanel } from './notification-panel';
import StoreSwitcher from '@/components/layout/StoreSwitcher';

const UserButtonClient = dynamic(
  () => import('@clerk/nextjs').then((mod) => ({ default: mod.UserButton })),
  { ssr: false }
);

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user } = useUser();

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-2 md:gap-4 border-b bg-gray-800 px-4 md:px-6 text-white">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden shrink-0"
        onClick={onMenuClick}
      >
        <Menu className="h-6 w-6" />
      </Button>

      <div className="flex-1 min-w-0">
        <h2 className="text-sm md:text-lg font-semibold truncate">
          Bienvenido, {user?.firstName || user?.emailAddresses[0]?.emailAddress?.split('@')[0]}
        </h2>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="hidden md:block">
          <StoreSwitcher />
        </div>

        <div className="hidden sm:block">
          <NotificationPanel />
        </div>

        <div className="hidden sm:block">
          <RefreshProfileButton />
        </div>

        <UserButtonClient afterSignOutUrl="/" />
      </div>
    </header>
  );
}
