import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        {
          key: "X-Content-Type-Options",
          value: "nosniff"
        },
        {
          key: "X-Frame-Options",
          value: "DENY"
        },
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin"
        }
      ]
    },
    {
      source: "/sw.js",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=0, must-revalidate"
        },
        {
          key: "Service-Worker-Allowed",
          value: "/"
        }
      ]
    },
    {
      source: "/manifest.webmanifest",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=3600"
        },
        {
          key: "Content-Type",
          value: "application/manifest+json"
        }
      ]
    },
    {
      source: "/icon.svg",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      source: "/icon-192.png",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      source: "/icon-512.png",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
};

export default nextConfig;
