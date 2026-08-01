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
  // Faster cold starts for marketing pages that don't need Node APIs
  experimental: {
    optimizePackageImports: ["@clerk/nextjs"],
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
}

export default nextConfig
