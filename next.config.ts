import type { NextConfig } from "next";
import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig: NextConfig = {
  turbopack: {},
  serverExternalPackages: [
    'exceljs',
    'jspdf',
    'cloudinary',
    'node-forge',
    'xml-crypto',
    'xmldom',
    '@zxing/library',
    '@ericblade/quagga2',
    'quagga',
  ],
  images: {
    // Las imágenes ya vienen optimizadas desde CDNs (Cloudinary, R2), así que
    // evitamos el optimizador de Next (/_next/image), que devolvía 402 en prod.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.r2.dev',
        pathname: '/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};

export default withPWA(nextConfig);
