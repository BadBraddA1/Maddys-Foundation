import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1600, 1920],
    imageSizes: [48, 64, 96, 128, 256],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-6261cb51fc8e4996907690f225f2e296.r2.dev",
        pathname: "/**",
      },
    ],
  },
  // Faster cold starts for marketing pages that don't need Node APIs.
  // Gallery/sponsor uploads allow up to 8 MB (see MAX_MEDIA_BYTES in lib/r2.ts).
  experimental: {
    optimizePackageImports: ["@clerk/nextjs"],
    proxyClientMaxBodySize: "8mb",
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
  async headers() {
    return [
      {
        source: "/brand/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ]
  },
  async redirects() {
    return [
      {
        source: "/sponsor",
        destination: "/",
        permanent: true,
      },
    ]
  },
}

export default nextConfig
