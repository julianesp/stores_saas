import type { MetadataRoute } from 'next';

const BASE_URL = 'https://posib.dev';

/**
 * Mapa del sitio para los buscadores. Solo se incluyen las páginas públicas
 * indexables (la landing). Las rutas privadas (/dashboard, /api) y utilidades
 * internas quedan fuera y se bloquean además en robots.ts.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    {
      url: BASE_URL,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
    },
    // Páginas informativas públicas.
    ...[
      { path: '/acerca', priority: 0.7 },
      { path: '/funcionalidades', priority: 0.8 },
      { path: '/como-empezar', priority: 0.8 },
      { path: '/contacto', priority: 0.6 },
      { path: '/terminos', priority: 0.3 },
      { path: '/privacidad', priority: 0.3 },
    ].map(({ path, priority }) => ({
      url: `${BASE_URL}${path}`,
      lastModified,
      changeFrequency: 'monthly' as const,
      priority,
    })),
  ];
}
