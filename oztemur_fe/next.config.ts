import type { NextConfig } from "next";

// API base URL the FE proxies /uploads/* to. With the rewrite below, images
// are served from the FE's own origin (no external host), which means
// Next/Image doesn't need any remotePattern entries and its loopback-IP
// SSRF guard never trips on local dev (localhost → ::1).
const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5137";

const nextConfig: NextConfig = {
  // Emit a minimal self-contained server (.next/standalone) for Docker.
  output: "standalone",
  // /uploads/* requests on the FE forward to the API. Browser sees them as
  // same-origin so Next/Image is happy; the FE acts as a thin proxy.
  async rewrites() {
    return [
      { source: "/uploads/:path*", destination: `${apiBase}/uploads/:path*` },
    ];
  },
  // Default browser security headers. Applied to every response by Next's
  // edge layer. HSTS only kicks in once the site is served over HTTPS — on
  // plain HTTP the header is ignored by browsers, which is fine.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
