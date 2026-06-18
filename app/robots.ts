import type { MetadataRoute } from 'next';

const BASE_URL = 'https://posib.dev';

/**
 * Reglas para los rastreadores. Se permite indexar el sitio público y se
 * bloquean las zonas privadas (panel, API y tiendas de cada negocio) para que
 * no aparezcan en los buscadores.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard/',
        '/api/',
        '/store/',
        '/sign-in',
        '/sign-up',
        '/admin-upgrade',
        '/fix-trial',
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
