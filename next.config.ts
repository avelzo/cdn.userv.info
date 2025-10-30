import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Autoriser les images depuis localhost pour le développement
    domains: ['localhost'],
    // Utiliser remotePatterns pour plus de contrôle (supporte tous les ports)
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        pathname: '/api/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'localhost',
        pathname: '/api/uploads/**',
      }
    ],
    // Optimisation des images
    formats: ['image/webp', 'image/avif'],
  },
};

export default nextConfig;
