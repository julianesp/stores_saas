import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'posib.dev - Sistema POS',
    short_name: 'posib.dev',
    description: 'Sistema completo de punto de venta y gestión de inventario',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#2563eb',
    orientation: 'portrait',
    icons: [
      {
        src: 'https://pub-ea40242d92ce470fbb6e43d46f01cefe.r2.dev/images/logo.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: 'https://pub-ea40242d92ce470fbb6e43d46f01cefe.r2.dev/images/logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
