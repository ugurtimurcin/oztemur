import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a minimal self-contained server (.next/standalone) for Docker.
  output: "standalone",
  // Same hardening headers as the public site, with one addition:
  // X-Robots-Tag at the HTTP level mirrors the noindex meta tag in
  // layout.tsx — search engines that ignore meta still see the header.
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
          { key: "X-Robots-Tag", value: "noindex, nofollow, nocache" },
        ],
      },
    ];
  },
};

export default nextConfig;
