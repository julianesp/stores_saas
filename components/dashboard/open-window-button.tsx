'use client';

import { useEffect, useState } from 'react';
import { SquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Botón para abrir posib en otra ventana/pestaña.
 *
 * Solo aparece cuando la app corre como PWA instalada (display-mode standalone),
 * donde NO hay barra de pestañas del navegador y el tendero no puede abrir otra
 * vista por su cuenta. En el navegador normal no se muestra (ahí ya tiene sus
 * pestañas).
 *
 * Nota de plataforma: en escritorio (Chrome/Edge) window.open abre otra ventana
 * de la PWA; en Android suele abrir el enlace en el navegador del sistema (no es
 * una segunda ventana de la app instalada — es una limitación de Android). En
 * ambos casos el tendero termina con posib abierto en otro lugar, que es el
 * objetivo.
 */
export function OpenWindowButton() {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const check = () => {
      const displayStandalone = window.matchMedia?.('(display-mode: standalone)').matches;
      // iOS Safari expone navigator.standalone en lugar de display-mode.
      const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsStandalone(Boolean(displayStandalone || iosStandalone));
    };
    check();

    // Reaccionar si cambia el modo (p. ej. el usuario instala la app en caliente).
    const mql = window.matchMedia?.('(display-mode: standalone)');
    mql?.addEventListener?.('change', check);
    return () => mql?.removeEventListener?.('change', check);
  }, []);

  if (!isStandalone) return null;

  const openNewWindow = () => {
    // Abrir el inicio del dashboard en una nueva ventana/pestaña. 'noopener'
    // evita que la nueva ventana pueda manipular la actual (buena práctica).
    window.open('/dashboard', '_blank', 'noopener');
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={openNewWindow}
      aria-label="Abrir en otra ventana"
      title="Abrir posib en otra ventana"
      className="relative"
    >
      <SquarePlus className="h-5 w-5" />
    </Button>
  );
}
