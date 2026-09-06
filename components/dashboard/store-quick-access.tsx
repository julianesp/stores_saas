"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Store, ExternalLink } from "lucide-react";
import {
  getUserProfileByClerkId,
  hasStoreAccess,
} from "@/lib/cloudflare-subscription-helpers";
import type { UserProfile } from "@/lib/types";

const PROFILE_CACHE_KEY = "posib-profile-cache";

/**
 * Botón flotante (fixed, esquina inferior derecha) que abre la tienda pública
 * del comerciante en una pestaña nueva. Visible en todas las pantallas del
 * dashboard mientras el dueño tenga la tienda activa (trial o addon 'store'
 * pagado) y la tienda esté publicada con slug.
 */
export function StoreQuickAccess() {
  const { getToken } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Pintado inmediato con el perfil cacheado por el sidebar, si existe,
    // para no esperar a la red en cada navegación.
    try {
      const cached = localStorage.getItem(PROFILE_CACHE_KEY);
      if (cached) setProfile(JSON.parse(cached));
    } catch {
      // Caché ausente o inválido: se resolverá con la llamada de abajo.
    }

    (async () => {
      try {
        const data = await getUserProfileByClerkId(getToken);
        if (!cancelled && data) setProfile(data);
      } catch {
        // Sin conexión: nos quedamos con el perfil cacheado (si lo había).
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [getToken]);

  // No mostrar a superadmins ni si la tienda no está lista/activa
  if (
    !profile ||
    profile.is_superadmin ||
    !hasStoreAccess(profile) ||
    !profile.store_enabled ||
    !profile.store_slug
  ) {
    return null;
  }

  return (
    <a
      href={`/store/${profile.store_slug}`}
      target="_blank"
      rel="noopener noreferrer"
      title="Ver mi tienda online"
      aria-label="Ver mi tienda online"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-brand px-4 py-3 text-sm font-semibold text-white shadow-lg hover:scale-105 hover:shadow-xl transition-transform"
    >
      <Store className="h-5 w-5" />
      <span className="hidden sm:inline">Mi tienda</span>
      <ExternalLink className="h-4 w-4" />
    </a>
  );
}
