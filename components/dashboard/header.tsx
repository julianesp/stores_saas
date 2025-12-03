'use client';

import { UserButton, useUser } from '@clerk/nextjs';
import { Menu, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RefreshProfileButton } from './refresh-profile-button';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user } = useUser();

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-2 md:gap-4 border-b bg-gray-800 px-4 md:px-6">
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
        <Button variant="ghost" size="icon" className="relative hidden sm:flex">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-600" />
        </Button>

        <div className="hidden sm:block">
          <RefreshProfileButton />
        </div>

        <UserButton afterSignOutUrl="/" />
      </div>
    </header>
  );
}
