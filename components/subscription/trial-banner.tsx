'use client';

import Link from 'next/link';
import { AlertCircle, Clock } from 'lucide-react';

interface TrialBannerProps {
  daysLeft: number;
  subscriptionType?: 'trial' | 'active';
}

export function TrialBanner({ daysLeft, subscriptionType = 'trial' }: TrialBannerProps) {
  const isUrgent = daysLeft <= 7;
  const isTrial = subscriptionType === 'trial';

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
              ⚠️ <strong>¡Último día!</strong>{' '}
              {isTrial ? 'Tu prueba gratuita expirará mañana' : 'Tu suscripción vence mañana'}.{' '}
            </>
          ) : daysLeft === 0 ? (
            <>
              ⚠️ <strong>¡{isTrial ? 'Tu prueba gratuita' : 'Tu suscripción'} expira hoy!</strong>{' '}
            </>
          ) : (
            <>
              Te {isUrgent && '¡solo '}quedan <strong>{daysLeft} días</strong>{' '}
              {isTrial ? 'de prueba gratuita' : 'en tu suscripción'}
              {isUrgent && '!'}.{' '}
            </>
          )}
          <Link
            href="/dashboard/subscription"
            className={`underline font-medium ${
              isUrgent ? 'text-red-900' : 'text-yellow-900'
            } hover:no-underline`}
          >
            {isTrial ? 'Suscríbete ahora' : 'Renovar ahora'}
          </Link>
        </p>
      </div>
    </div>
  );
}
