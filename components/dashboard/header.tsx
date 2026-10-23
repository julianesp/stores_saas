'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useUser } from '@clerk/nextjs';
import dynamic from 'next/dynamic';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationPanel } from './notification-panel';
import { OpenWindowButton } from './open-window-button';
import HelpButton from '@/components/help/HelpButton';
import StoreSwitcher from '@/components/layout/StoreSwitcher';
import { ThemeToggle } from '@/components/HourTheme';

const UserButtonClient = dynamic(
  () => import('@clerk/nextjs').then((mod) => ({ default: mod.UserButton })),
  { ssr: false }
);

interface HeaderProps {
  onMenuClick?: () => void;
}

/** "Buenos días" / "Buenas tardes" / "Buenas noches" y la fecha de hoy en español. */
function readGreeting() {
  const now = new Date();
  const hour = now.getHours();
  const saludo = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  const fecha = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(now);
  return `${saludo}|${fecha}`;
}

const noSubscribe = () => () => {};

// Se lee en el navegador (hora local del tendero); en el servidor no hay saludo,
// así se evita un desajuste de hidratación.
function useGreeting() {
  const value = useSyncExternalStore(noSubscribe, readGreeting, () => null);
  if (!value) return null;
  const [saludo, fecha] = value.split('|');
  return { saludo, fecha };
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Escribe la fecha y luego el saludo letra por letra, con un cursor que
 * desaparece al terminar. Solo al montar (una vez por carga del sistema, el
 * header no se desmonta al navegar). Con movimiento reducido se muestra de una.
 */
function TypedGreeting({ fecha, saludo }: { fecha: string; saludo: string }) {
  const total = fecha.length + saludo.length;
  const [count, setCount] = useState(() => (prefersReducedMotion() ? total : 0));

  useEffect(() => {
    if (count >= total) return;
    // La fecha va rápida; pausa breve antes del saludo, que va más pausado.
    const delay = count < fecha.length ? 22 : count === fecha.length ? 260 : 55;
    const timer = setTimeout(() => setCount((c) => c + 1), delay);
    return () => clearTimeout(timer);
  }, [count, total, fecha.length]);

  const typingFecha = count < fecha.length;
  const done = count >= total;

  return (
    <>
      {/* Los lectores de pantalla leen la frase completa (aria-label), no letra por letra. */}
      <p className="h-4 text-xs text-gray-500 first-letter:uppercase" aria-label={fecha}>
        <span aria-hidden="true">{fecha.slice(0, count)}</span>
        {typingFecha && <span className="typing-caret" aria-hidden="true" />}
      </p>
      <h2
        className="truncate text-lg md:text-[1.6rem] font-semibold leading-tight text-gray-900"
        aria-label={saludo}
      >
        <span aria-hidden="true">{saludo.slice(0, Math.max(0, count - fecha.length))}</span>
        {!typingFecha && !done && <span className="typing-caret" aria-hidden="true" />}
        {/* Reserva la altura de la línea mientras aún no hay letras. */}
        {count <= fecha.length && <span aria-hidden="true">&nbsp;</span>}
      </h2>
    </>
  );
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, isLoaded } = useUser();
  const greeting = useGreeting();
  const name = user?.firstName || user?.emailAddresses[0]?.emailAddress?.split('@')[0];

  return (
    <header className="app-titlebar sticky top-0 z-10 flex h-16 md:h-20 items-center gap-3 bg-[color-mix(in_srgb,var(--shell-canvas)_88%,transparent)] px-4 md:px-8 backdrop-blur-md">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden shrink-0"
        onClick={onMenuClick}
        aria-label="Abrir menú"
      >
        <Menu className="h-6 w-6" />
      </Button>

      {/* Saludo con la fecha: oculto en móvil para dar espacio a las acciones. */}
      <div className="hidden sm:block flex-1 min-w-0">
        {greeting && isLoaded ? (
          <TypedGreeting
            key={`${greeting.fecha}|${greeting.saludo}|${name ?? ''}`}
            fecha={greeting.fecha}
            saludo={name ? `${greeting.saludo}, ${name}` : greeting.saludo}
          />
        ) : (
          // Mientras carga el usuario: mismo alto, sin texto (evita un "Hola," que luego cambia).
          <>
            <p className="h-4" />
            <h2 className="text-lg md:text-[1.6rem] font-semibold leading-tight">&nbsp;</h2>
          </>
        )}
      </div>

      {/* En móvil, empujar las acciones a la derecha (el saludo está oculto). */}
      <div className="flex-1 sm:hidden" />

      {/* Bandeja de acciones: una sola pieza en vez de íconos sueltos. */}
      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 rounded-2xl bg-white p-1 ring-1 ring-[var(--shell-line)] shadow-[var(--shell-shadow)] text-gray-700">
        <StoreSwitcher />

        {/* La campana es visible también en móvil: si no, el tendero no puede
            abrir el panel para ver/marcar sus notificaciones (y el aviso seguiría
            activo sin forma de atenderlo). */}
        <NotificationPanel />

        <ThemeToggle className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50" />

        {/* Solo visible cuando corre como PWA instalada (standalone). */}
        <OpenWindowButton />

        <HelpButton />

        <span className="mx-1 h-6 w-px bg-[var(--shell-line)]" aria-hidden="true" />

        <div className="flex h-9 w-9 items-center justify-center">
          <UserButtonClient
            afterSignOutUrl="/"
            appearance={{ elements: { avatarBox: 'rounded-xl' } }}
          />
        </div>
      </div>
    </header>
  );
}
