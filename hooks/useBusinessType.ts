"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { getBusinessType, type BusinessType } from "@/lib/business-types";
import { getUserProfile } from "@/lib/cloudflare-api";

const PROFILE_CACHE_KEY = "posib-profile-cache";

/**
 * Devuelve el BusinessType activo del usuario.
 * Lee primero el caché del sidebar (localStorage) para respuesta inmediata;
 * si no hay caché hace un fetch al perfil.
 */
export function useBusinessType(): BusinessType {
  const { getToken } = useAuth();
  const [businessType, setBusinessType] = useState<BusinessType>(() => {
    if (typeof window === "undefined") return getBusinessType(null);
    try {
      const cached = localStorage.getItem(PROFILE_CACHE_KEY);
      if (cached) {
        const profile = JSON.parse(cached);
        return getBusinessType(profile.business_type);
      }
    } catch {
      // caché corrupto: ignorar
    }
    return getBusinessType(null);
  });

  useEffect(() => {
    // Intenta refrescar desde el perfil real por si el caché es viejo
    let cancelled = false;
    (async () => {
      try {
        const profile = await getUserProfile(getToken);
        if (!cancelled) setBusinessType(getBusinessType(profile.business_type));
      } catch {
        // sin conexión: se queda con lo del caché
      }
    })();
    return () => { cancelled = true; };
  }, [getToken]);

  return businessType;
}
