/**
 * Tiendas clientes que se muestran en la landing de posib.dev.
 *
 * Este archivo es la ÚNICA fuente de datos: para agregar, editar, ocultar o
 * dar de baja una tienda, edita el array `landingStores` de abajo, guarda,
 * haz commit y despliega. No hay base de datos ni panel involucrados.
 *
 * ── Cómo agregar una tienda ────────────────────────────────────────────────
 * 1. Sube la foto de la tienda a donde prefieras (R2, Cloudinary, etc.) y copia
 *    su URL pública. Debe ser https y de un dominio permitido en next.config.ts
 *    (por ahora: *.r2.dev y res.cloudinary.com).
 * 2. Copia uno de los bloques de ejemplo y rellena los campos.
 * 3. El `slug` es la parte final de la URL del perfil: /tienda/<slug>.
 *    Usa solo minúsculas, números y guiones (ej. "supermercado-la-10").
 *
 * ── Interruptores por tienda ───────────────────────────────────────────────
 * - `enabled`:        si es false, la tienda NO aparece en la landing.
 * - `profileEnabled`: si es false, la tarjeta NO enlaza a su perfil público
 *                     (/tienda/[slug]) aunque tenga slug. Útil cuando aún no
 *                     quieres publicar la info extra de esa tienda.
 */

export interface LandingStore {
  /** Identificador de la URL del perfil: /tienda/<slug>. Único. */
  slug: string;
  /** Nombre visible de la tienda. */
  name: string;
  /** Ubicación corta (Pueblo, Departamento). */
  location: string;
  /** URL pública de la foto de la tienda. Vacío muestra un ícono de tienda. */
  image?: string;
  /** Mostrar la tienda como tarjeta en la landing. */
  enabled: boolean;
  /** Habilitar la página de perfil público /tienda/[slug]. */
  profileEnabled: boolean;

  // --- Datos que se muestran solo en el perfil público ---
  /** Descripción breve del negocio (opcional). */
  description?: string;
  /** Dirección exacta en texto (opcional). */
  address?: string;
  /** Enlace de Google Maps para el botón "Cómo llegar" (opcional). */
  mapsUrl?: string;
  /** WhatsApp (solo números; ej. "3001234567"). */
  whatsapp?: string;
  /** Teléfono de contacto. */
  phone?: string;
  /** Correo de contacto. */
  email?: string;
  /** URL del perfil de Facebook. */
  facebook?: string;
  /** URL del perfil de Instagram. */
  instagram?: string;
}

export const landingStores: LandingStore[] = [
  {
    slug: 'supermercado-la-10',
    name: 'Supermercado la 10',
    location: 'Colón, Putumayo',
    image:
      'https://pub-ea40242d92ce470fbb6e43d46f01cefe.r2.dev/images/stores/supermercadoLa10.jpeg',
    enabled: true,
    // Cuando quieras publicar el perfil con contacto y mapa, pon esto en true
    // y rellena los campos de abajo (mapsUrl, whatsapp, etc.).
    profileEnabled: false,
    description: '',
    address: '',
    mapsUrl: '',
    whatsapp: '',
    phone: '',
    email: '',
    facebook: '',
    instagram: '',
  },

  // ── Plantilla para una nueva tienda (descomenta y rellena) ────────────────
  // {
  //   slug: 'mi-nueva-tienda',
  //   name: 'Mi Nueva Tienda',
  //   location: 'Ciudad, Departamento',
  //   image: 'https://.../foto.jpg',
  //   enabled: true,
  //   profileEnabled: true,
  //   description: 'Breve descripción del negocio',
  //   address: 'Calle 10 # 5-20',
  //   mapsUrl: 'https://maps.app.goo.gl/...',
  //   whatsapp: '3001234567',
  //   phone: '3001234567',
  //   email: 'tienda@ejemplo.com',
  //   facebook: 'https://facebook.com/...',
  //   instagram: 'https://instagram.com/...',
  // },
];

/** Tiendas visibles en la landing (respetando el interruptor `enabled`). */
export function getVisibleLandingStores(): LandingStore[] {
  return landingStores.filter((s) => s.enabled);
}

/**
 * Devuelve el perfil público de una tienda por su slug, solo si está visible
 * y su perfil está habilitado. Si no, devuelve null (el perfil da 404).
 */
export function getLandingStoreProfile(slug: string): LandingStore | null {
  const store = landingStores.find((s) => s.slug === slug);
  if (!store || !store.enabled || !store.profileEnabled) return null;
  return store;
}
