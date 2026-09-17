/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  compress: true,
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'assets.coingecko.com' },
      { protocol: 'https', hostname: 'coin-images.coingecko.com' },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 604800,
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};
export default nextConfig;
