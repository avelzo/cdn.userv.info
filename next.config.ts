import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.userv.info',
        pathname: '/uploads/users/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3010',
        pathname: '/uploads/users/**',
      }
    ],
    // Optimisation des images
    formats: ['image/webp', 'image/avif'],
    // Types d'images autorisés (incluant ICO)
    dangerouslyAllowSVG: false,
    contentDispositionType: 'attachment',
    // Formats d'image supportés
  },
};

export default nextConfig;
