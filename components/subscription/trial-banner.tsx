'use client';

import Link from 'next/link';
import { AlertCircle, Clock } from 'lucide-react';

interface TrialBannerProps {
  daysLeft: number;
}

export function TrialBanner({ daysLeft }: TrialBannerProps) {
  const isUrgent = daysLeft <= 7;

  return (
    <div
      className={`${
        isUrgent ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
      } border-b px-4 py-3`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
        {isUrgent ? (
          <AlertCircle className="h-5 w-5 text-red-600" />
        ) : (
          <Clock className="h-5 w-5 text-yellow-600" />
        )}
        <p
          className={`text-center text-sm ${
            isUrgent ? 'text-red-800' : 'text-yellow-800'
          }`}
        >
          {daysLeft === 1 ? (
            <>
              ⚠️ <strong>¡Último día de prueba gratuita!</strong> Tu acceso expirará mañana.{' '}
            </>
          ) : daysLeft === 0 ? (
            <>
              ⚠️ <strong>¡Tu prueba gratuita expira hoy!</strong>{' '}
            </>
          ) : (
            <>
              Te {isUrgent && '¡solo '}quedan <strong>{daysLeft} días</strong> de prueba gratuita
              {isUrgent && '!'}.{' '}
            </>
          )}
          <Link
            href="/dashboard/subscription"
            className={`underline font-medium ${
              isUrgent ? 'text-red-900' : 'text-yellow-900'
            } hover:no-underline`}
          >
            Suscríbete ahora
          </Link>
        </p>
      </div>
    </div>
  );
}
