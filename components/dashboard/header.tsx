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
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-white px-6">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-6 w-6" />
      </Button>

      <div className="flex-1">
        <h2 className="text-lg font-semibold">
          Bienvenido, {user?.firstName || user?.emailAddresses[0]?.emailAddress}
        </h2>
      </div>

      <Button variant="ghost" size="icon" className="relative">
        <Bell className="h-5 w-5" />
        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-600" />
      </Button>

      <RefreshProfileButton />

      <UserButton afterSignOutUrl="/" />
    </header>
  );
}
