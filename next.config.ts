import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    root: import.meta.dirname,
  },
  // Enable gzip/brotli compression for smaller bundles
  compress: true,
  // Optimize images served through next/image
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000, // 1 year cache
  },
  // Reduce unused polyfills in modern browsers
  experimental: {
    optimizePackageImports: [
      '@supabase/supabase-js',
      '@stripe/stripe-js',
      'zod',
    ],
  },
};

export default nextConfig;
