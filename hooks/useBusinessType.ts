"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { getBusinessType, type BusinessType } from "@/lib/business-types";
import { getUserProfile } from "@/lib/cloudflare-api";

const PROFILE_CACHE_KEY = "posib-profile-cache";

function readFromCache(): BusinessType {
  if (typeof window === "undefined") return getBusinessType(null);
  try {
    const cached = localStorage.getItem(PROFILE_CACHE_KEY);
    if (cached) return getBusinessType(JSON.parse(cached).business_type);
  } catch { /* caché corrupto */ }
  return getBusinessType(null);
}

/**
 * Devuelve el BusinessType activo del usuario.
 * - Respuesta inmediata desde el caché del sidebar (localStorage).
 * - Se refresca desde la API al montar.
 * - Reacciona al evento storage cuando otra parte de la app actualiza el caché
 *   (ej: la página de suscripción al cambiar el tipo de negocio).
 */
export function useBusinessType(): BusinessType {
  const { getToken } = useAuth();
  const [businessType, setBusinessType] = useState<BusinessType>(readFromCache);

  // Escuchar cambios en el caché (misma pestaña vía dispatchEvent + entre pestañas)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== PROFILE_CACHE_KEY || !e.newValue) return;
      try {
        setBusinessType(getBusinessType(JSON.parse(e.newValue).business_type));
      } catch { /* valor corrupto */ }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Refrescar desde el servidor al montar
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await getUserProfile(getToken);
        if (!cancelled) setBusinessType(getBusinessType(profile.business_type));
      } catch { /* sin conexión: se queda con el caché */ }
    })();
    return () => { cancelled = true; };
  }, [getToken]);

  return businessType;
}
