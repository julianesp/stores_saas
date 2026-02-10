'use client';

import { useEffect, useState } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { TrialUsageModal } from './trial-usage-modal';
import { getUserProfile } from '@/lib/cloudflare-api';
import { UserProfile } from '@/lib/types';

/**
 * Componente wrapper que muestra el modal de notificación de prueba
 * Solo se muestra para usuarios en estado "trial"
 */
export function TrialNotificationWrapper() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    async function checkTrialStatus() {
      if (!user || !getToken) {
        console.log('[TrialNotification] No user or getToken');
        return;
      }

      try {
        const userProfile = await getUserProfile(getToken);

        console.log('[TrialNotification] User profile loaded:', {
          email: userProfile?.email,
          subscription_status: userProfile?.subscription_status,
          trial_start_date: userProfile?.trial_start_date,
          trial_end_date: userProfile?.trial_end_date,
        });

        if (!userProfile) {
          console.log('[TrialNotification] No user profile found');
          return;
        }

        // Solo mostrar para usuarios en trial
        if (userProfile.subscription_status === 'trial') {
          console.log('[TrialNotification] User is in trial, showing modal');
          setProfile(userProfile);
          setShowModal(true);
        } else {
          console.log('[TrialNotification] User is NOT in trial, status:', userProfile.subscription_status);
        }
      } catch (error) {
        console.error('[TrialNotification] Error checking trial status:', error);
      }
    }

    checkTrialStatus();
  }, [user, getToken]);

  if (!showModal || !profile || profile.subscription_status !== 'trial') {
    return null;
  }

  // Calcular días transcurridos y restantes
  const calculateDays = () => {
    const now = new Date();
    const trialStart = profile.trial_start_date ? new Date(profile.trial_start_date) : new Date(profile.created_at);
    const trialEnd = profile.trial_end_date ? new Date(profile.trial_end_date) : new Date();

    // Normalizar a medianoche para cálculos precisos
    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startMidnight = new Date(trialStart.getFullYear(), trialStart.getMonth(), trialStart.getDate());
    const endMidnight = new Date(trialEnd.getFullYear(), trialEnd.getMonth(), trialEnd.getDate());

    // Días totales del trial (normalmente 15)
    const totalDays = Math.ceil((endMidnight.getTime() - startMidnight.getTime()) / (1000 * 60 * 60 * 24));

    // Días usados (desde el inicio hasta hoy)
    const daysUsed = Math.floor((nowMidnight.getTime() - startMidnight.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Días restantes (desde hoy hasta el final)
    const daysRemaining = Math.max(0, Math.ceil((endMidnight.getTime() - nowMidnight.getTime()) / (1000 * 60 * 60 * 24)));

    return {
      daysUsed: Math.max(1, Math.min(daysUsed, totalDays)),
      daysRemaining,
      totalDays: Math.max(totalDays, 1),
    };
  };

  const { daysUsed, daysRemaining, totalDays } = calculateDays();

  return (
    <TrialUsageModal
      daysUsed={daysUsed}
      daysRemaining={daysRemaining}
      totalDays={totalDays}
      userEmail={profile.email}
    />
  );
}
