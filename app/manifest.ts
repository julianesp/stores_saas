import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'posib.dev - Sistema POS para tiendas en Colombia',
    short_name: 'posib.dev',
    description: 'Sistema POS de punto de venta, inventario y facturación para tiendas y negocios en Colombia',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#007C80',
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
