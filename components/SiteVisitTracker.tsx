'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

const API_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL || 'https://tienda-pos-api.julii1295.workers.dev';
const PRODUCTION_HOSTS = new Set(['posib.dev', 'www.posib.dev']);
const PUBLIC_PATHS = new Set([
  '/', '/acerca', '/como-empezar', '/contacto', '/funcionalidades',
  '/privacidad', '/terminos', '/sign-in', '/sign-up',
]);

export const NO_TRACK_KEY = 'posib_no_track';
const DEVICE_KEY = 'posib_did';
const SESSION_KEY = 'posib_sid';
const SENT_KEY = 'posib_sent';

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

function getOrCreate(storage: Storage, key: string): string {
  let id = storage.getItem(key);
  if (!id) {
    id = newId();
    storage.setItem(key, id);
  }
  return id;
}

// Cuenta una visita por sesión del navegador, solo en las páginas públicas de posib.dev.
export default function SiteVisitTracker() {
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded || !pathname || !PUBLIC_PATHS.has(pathname)) return;
    if (!PRODUCTION_HOSTS.has(window.location.hostname)) return;
    if (navigator.doNotTrack === '1' || navigator.webdriver) return;

    try {
      if (localStorage.getItem(NO_TRACK_KEY) === '1') return;
      if (sessionStorage.getItem(SENT_KEY) === '1') return;

      const params = new URLSearchParams(window.location.search);
      const utm = params.get('utm_source') || (params.get('gclid') ? 'google-ads' : '');

      const body = JSON.stringify({
        device_id: getOrCreate(localStorage, DEVICE_KEY),
        session_id: getOrCreate(sessionStorage, SESSION_KEY),
        path: pathname,
        referrer: document.referrer,
        utm,
        touch: navigator.maxTouchPoints > 1,
        signed_in: !!isSignedIn,
      });

      sessionStorage.setItem(SENT_KEY, '1');
      // text/plain + no-cors evita el preflight; la respuesta no se lee.
      fetch(`${API_URL}/api/visits`, {
        method: 'POST',
        mode: 'no-cors',
        keepalive: true,
        headers: { 'Content-Type': 'text/plain' },
        body,
      }).catch(() => {});
    } catch {
      // storage bloqueado (modo privado estricto): no se cuenta la visita
    }
  }, [pathname, isLoaded, isSignedIn]);

  return null;
}
