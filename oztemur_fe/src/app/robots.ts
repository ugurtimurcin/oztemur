import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/server/metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Internal admin / API endpoints aren't routed through the
        // public site, but we add explicit disallows so accidental
        // proxy setups don't leak them.
        disallow: ["/admin", "/api"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
