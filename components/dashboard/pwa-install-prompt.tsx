'use client';

import { useEffect, useState } from 'react';
import { Download, X, SquarePlus, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

/**
 * Invitación a instalar posib como PWA + bienvenida tras instalar.
 *
 * Dos partes:
 *  1. Si el tendero AÚN NO ha instalado la app (y el navegador lo permite),
 *     muestra un aviso flotante "Instala posib" que dispara el prompt nativo de
 *     instalación. Así aprovecha funciones como abrir varias ventanas.
 *  2. Cuando instala la app, muestra un modal explicando que ahora puede abrir
 *     posib en varias ventanas con el botón del header.
 *
 * Notas de plataforma:
 *  - `beforeinstallprompt` solo lo emiten navegadores basados en Chromium
 *    (Chrome/Edge/Android). En iOS Safari no existe: allí la instalación es
 *    manual ("Añadir a pantalla de inicio"), así que el aviso no aparece.
 *  - No se muestra nada si la app ya corre en modo standalone (ya instalada).
 */

// Tipo del evento beforeinstallprompt (no está en las libs estándar de TS).
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'pwa_install_dismissed';
const WELCOME_SHOWN_KEY = 'pwa_welcome_shown';

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    // Si ya está instalada (standalone), no invitamos a instalar. Pero puede que
    // acabe de instalar y aún no haya visto la bienvenida.
    if (isStandalone()) {
      if (localStorage.getItem(WELCOME_SHOWN_KEY) !== 'true') {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShowWelcome(true);
      }
      return;
    }

    // Capturar el prompt de instalación (Chromium). Guardarlo para dispararlo
    // cuando el tendero toque nuestro botón.
    const onBeforeInstall = (e: Event) => {
      e.preventDefault(); // evita el mini-infobar automático del navegador
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (localStorage.getItem(DISMISSED_KEY) !== 'true') {
        setShowInstall(true);
      }
    };

    // Cuando termina la instalación: ocultar el aviso y preparar la bienvenida.
    const onInstalled = () => {
      setShowInstall(false);
      setDeferredPrompt(null);
      localStorage.removeItem(WELCOME_SHOWN_KEY); // que se muestre al reabrir en standalone
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstall(false);
    }
    // Un prompt solo se puede usar una vez.
    setDeferredPrompt(null);
  };

  const dismissInstall = () => {
    setShowInstall(false);
    localStorage.setItem(DISMISSED_KEY, 'true');
  };

  const closeWelcome = () => {
    setShowWelcome(false);
    localStorage.setItem(WELCOME_SHOWN_KEY, 'true');
  };

  return (
    <>
      {/* Aviso flotante para instalar (solo si el navegador ofreció el prompt) */}
      {showInstall && deferredPrompt && (
        <div className="fixed bottom-4 left-4 z-40 max-w-sm rounded-2xl border-t-4 border-brand bg-white p-4 shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-brand-light p-2.5">
              <Download className="h-6 w-6 text-brand" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-gray-900">Instala posib en tu dispositivo</h4>
              <p className="mt-1 text-sm text-gray-600">
                Úsalo como una app: más rápido, en pantalla completa y con la
                opción de abrir varias ventanas a la vez.
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  onClick={handleInstall}
                  className="bg-brand hover:bg-brand-hover text-white"
                >
                  Instalar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={dismissInstall}
                  className="border-brand/40 text-brand hover:bg-brand-light hover:text-brand-hover"
                >
                  Ahora no
                </Button>
              </div>
            </div>
            <button
              onClick={dismissInstall}
              aria-label="Cerrar"
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal de bienvenida tras instalar: explica la función de varias ventanas */}
      <Dialog open={showWelcome} onOpenChange={(o) => !o && closeWelcome()}>
        <DialogContent className="sm:max-w-md border-t-4 border-brand">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl text-brand">
              <SquarePlus className="h-5 w-5" />
              ¡Ya tienes posib instalado!
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Ahora posib funciona como una app. Como no hay pestañas del
              navegador, agregamos una forma de abrir varias ventanas.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl bg-brand-light p-4">
            <p className="flex items-center gap-2 font-semibold text-gray-900">
              <SquarePlus className="h-5 w-5 text-brand" />
              Abrir en otra ventana
            </p>
            <p className="mt-1 text-sm text-gray-600">
              Toca el ícono <span className="font-semibold">de la ventana</span>{' '}
              en la barra superior para abrir otra vista de posib. Así puedes
              tener, por ejemplo, el punto de venta en una y tus productos en
              otra.
            </p>
          </div>
          <div className="mt-2 flex justify-end">
            <Button onClick={closeWelcome} className="bg-brand hover:bg-brand-hover text-white">
              Entendido
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
