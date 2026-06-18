import type { MetadataRoute } from 'next';

const BASE_URL = 'https://posib.dev';

/**
 * Mapa del sitio para los buscadores. Solo se incluyen las páginas públicas
 * indexables (la landing). Las rutas privadas (/dashboard, /api) y utilidades
 * internas quedan fuera y se bloquean además en robots.ts.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];
}
