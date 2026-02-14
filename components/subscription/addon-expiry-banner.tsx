'use client';

import { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '../ui/button';

interface AddonExpiryInfo {
  name: string;
  daysLeft: number;
  expiresAt: string;
}

interface AddonExpiryBannerProps {
  addons: AddonExpiryInfo[];
}

export function AddonExpiryBanner({ addons }: AddonExpiryBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || addons.length === 0) return null;

  // Encontrar el addon que vence más pronto
  const mostUrgent = addons.reduce((prev, current) =>
    current.daysLeft < prev.daysLeft ? current : prev
  );

  return (
    <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-3 relative">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div className="flex-1">
            {addons.length === 1 ? (
              <p className="text-sm font-medium">
                Tu addon <strong>{mostUrgent.name}</strong> vence en{' '}
                <strong>
                  {mostUrgent.daysLeft === 0
                    ? 'hoy'
                    : mostUrgent.daysLeft === 1
                    ? '1 día'
                    : `${mostUrgent.daysLeft} días`}
                </strong>
              </p>
            ) : (
              <p className="text-sm font-medium">
                Tienes <strong>{addons.length} addons</strong> próximos a vencer. El primero vence en{' '}
                <strong>
                  {mostUrgent.daysLeft === 0
                    ? 'hoy'
                    : mostUrgent.daysLeft === 1
                    ? '1 día'
                    : `${mostUrgent.daysLeft} días`}
                </strong>
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/subscription">
            <Button
              size="sm"
              variant="secondary"
              className="bg-white text-orange-600 hover:bg-gray-100"
            >
              Renovar Ahora
            </Button>
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Cerrar notificación"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
