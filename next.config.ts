import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.userv.info',
        pathname: '/api/uploads/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/api/uploads/**',
      }
    ],
    // Optimisation des images
    formats: ['image/webp', 'image/avif'],
    // Types d'images autorisés (incluant ICO)
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    // Formats d'image supportés
  },
};

export default nextConfig;
