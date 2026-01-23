'use client';

import { useEffect } from 'react';

interface TawkToChatProps {
  propertyId: string;
  widgetId: string;
}

/**
 * Componente de Chat en Vivo con Tawk.to
 *
 * Para configurar:
 * 1. Crea una cuenta en https://www.tawk.to/
 * 2. Crea un sitio web en tu panel de Tawk.to
 * 3. Obtén tu Property ID y Widget ID del código de instalación
 * 4. Actualiza los valores en lib/landing-config.ts
 *
 * El widget se mostrará en la esquina inferior derecha de la página
 */
export default function TawkToChat({ propertyId, widgetId }: TawkToChatProps) {
  useEffect(() => {
    // Solo cargar si tenemos IDs válidos (no los valores por defecto)
    if (
      !propertyId ||
      !widgetId ||
      propertyId.startsWith('TU_') ||
      widgetId.startsWith('TU_')
    ) {
      console.info(
        'Tawk.to no configurado. Actualiza los IDs en lib/landing-config.ts'
      );
      return;
    }

    // Crear el script de Tawk.to
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://embed.tawk.to/${propertyId}/${widgetId}`;
    script.charset = 'UTF-8';
    script.setAttribute('crossorigin', '*');

    // Agregar el script al documento
    document.body.appendChild(script);

    // Limpiar al desmontar
    return () => {
      // Remover el script
      document.body.removeChild(script);

      // Remover el iframe de Tawk.to si existe
      const tawkIframe = document.getElementById('tawkchat-container');
      if (tawkIframe) {
        tawkIframe.remove();
      }

      // Limpiar variable global
      if (window.Tawk_API) {
        delete window.Tawk_API;
      }
    };
  }, [propertyId, widgetId]);

  return null; // Este componente no renderiza nada visible
}

// Tipos para TypeScript
declare global {
  interface Window {
    Tawk_API?: {
      hideWidget?: () => void;
      showWidget?: () => void;
      maximize?: () => void;
      minimize?: () => void;
      toggle?: () => void;
      [key: string]: unknown;
    };
    Tawk_LoadStart?: Date;
  }
}
