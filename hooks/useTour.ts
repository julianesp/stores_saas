import { useEffect, useState } from 'react';
import { driver, DriveStep, Config } from 'driver.js';
import 'driver.js/dist/driver.css';
import '@/app/tour-styles.css';

export interface TourConfig {
  tourId: string;
  steps: DriveStep[];
  config?: Partial<Config>;
}

/**
 * Hook personalizado para gestionar tours guiados en la aplicación
 *
 * @param tourConfig - Configuración del tour
 * @param enabled - Si el tour está habilitado (por defecto true)
 * @param userId - ID del usuario (opcional, para vincular tours a usuarios específicos)
 * @returns Funciones para controlar el tour
 */
export function useTour(tourConfig: TourConfig, enabled: boolean = true, userId?: string) {
  const [hasSeenTour, setHasSeenTour] = useState(true);
  const [isReady, setIsReady] = useState(false);

  // Verificar si el usuario ya vio este tour
  useEffect(() => {
    // Incluir userId en la clave si está disponible
    const tourKey = userId
      ? `tour_completed_${tourConfig.tourId}_${userId}`
      : `tour_completed_${tourConfig.tourId}`;

    const completed = localStorage.getItem(tourKey);
    setHasSeenTour(completed === 'true');

    // Pequeño delay para asegurar que el DOM esté listo
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 500);

    return () => clearTimeout(timer);
  }, [tourConfig.tourId, userId]);

  // Iniciar el tour automáticamente si no se ha visto
  useEffect(() => {
    if (!hasSeenTour && enabled && isReady) {
      startTour();
    }
  }, [hasSeenTour, enabled, isReady]);

  const startTour = () => {
    const driverObj = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      nextBtnText: 'Siguiente',
      prevBtnText: 'Anterior',
      doneBtnText: 'Finalizar',
      progressText: '{{current}} de {{total}}',
      ...tourConfig.config,
      onDestroyed: (element, step, options) => {
        markTourAsCompleted();
        tourConfig.config?.onDestroyed?.(element, step, options);
      },
      steps: tourConfig.steps,
    });

    driverObj.drive();
  };

  const markTourAsCompleted = () => {
    const tourKey = userId
      ? `tour_completed_${tourConfig.tourId}_${userId}`
      : `tour_completed_${tourConfig.tourId}`;
    localStorage.setItem(tourKey, 'true');
    setHasSeenTour(true);
  };

  const resetTour = () => {
    const tourKey = userId
      ? `tour_completed_${tourConfig.tourId}_${userId}`
      : `tour_completed_${tourConfig.tourId}`;
    localStorage.removeItem(tourKey);
    setHasSeenTour(false);
  };

  return {
    startTour,
    resetTour,
    hasSeenTour,
  };
}
