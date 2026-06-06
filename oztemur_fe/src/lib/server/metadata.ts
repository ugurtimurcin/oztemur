import type { Metadata } from "next";
import { getSupportedLocales, resolveLocale } from "./locale";
import { toBcp47Tag, toOgLocale } from "./languageCodes";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://oztemur.com";
export const SITE_NAME = "Öztemur Group Of Companies";

export interface MetaSpec {
  /** Title without the brand suffix; layout's title.template appends it. */
  title: string;
  description: string;
  /** Path under the site root, e.g. "/about" or "/news/foo-slug". */
  path: string;
  /** Optional image URL for OG / Twitter. */
  image?: string;
  /**
   * Override the og:type. Defaults to "website"; set to "article" for
   * news / blog detail pages so social previews render appropriately.
   */
  type?: "website" | "article";
}

/**
 * Builds a `Metadata` object suitable for returning from a page's
 * `generateMetadata`. Adds canonical URL, hreflang alternates,
 * Open Graph and Twitter card data using the resolved request locale.
 *
 * `hreflang` alternates are generated from the live set of published
 * languages so adding (e.g.) Arabic in the admin starts emitting an
 * `ar-SA` alternate the next time the page is server-rendered — no
 * code change here.
 */
export async function buildMetadata(
  spec: MetaSpec,
  locale?: string,
): Promise<Metadata> {
  const loc = locale ?? (await resolveLocale());
  const url = `${SITE_URL}${spec.path.startsWith("/") ? spec.path : `/${spec.path}`}`;

  // Build hreflang alternates from the currently-published language set.
  // Each one points to the same canonical URL — the site doesn't path-
  // prefix locales, it negotiates via cookie + Accept-Language. Search
  // engines still benefit from seeing the available languages declared.
  const supported = await getSupportedLocales();
  const languages: Record<string, string> = {};
  for (const code of supported) {
    languages[toBcp47Tag(code)] = url;
  }

  return {
    title: spec.title,
    description: spec.description,
    alternates: {
      canonical: url,
      languages,
    },
    openGraph: {
      title: spec.title,
      description: spec.description,
      url,
      siteName: SITE_NAME,
      locale: toOgLocale(loc),
      type: spec.type ?? "website",
      images: spec.image ? [{ url: spec.image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: spec.title,
      description: spec.description,
      images: spec.image ? [spec.image] : undefined,
    },
  };
}

/** Resolve a media path to an absolute URL for use in social cards. */
export function absoluteMediaUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http")) return path;
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5137";
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}
