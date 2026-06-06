import { cookies, headers } from "next/headers";

/**
 * Resolves the locale for a server-rendered request, in priority:
 *   1. The `oz_locale` cookie (set by the client when the user picks a language).
 *   2. The browser's `Accept-Language` header (first supported match).
 *   3. The default locale "tr".
 *
 * The set of "supported" locales is the list of active Language rows the
 * admin has published — fetched dynamically so adding a new language in
 * the admin (e.g. Arabic) is enough to make the public site honour it.
 * The Next.js fetch cache keeps this cheap.
 *
 * Kept on the server because it depends on Next.js request headers/cookies.
 */
export const LOCALE_COOKIE = "oz_locale";
export const DEFAULT_LOCALE = "tr";

/**
 * Used only when the languages API is unreachable on cold start. Listing
 * the two we know we always have prevents a network blip from blanking
 * everyone's chosen locale.
 */
const FALLBACK_LOCALES = ["tr", "en"] as const;

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5137";

export async function getSupportedLocales(): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE}/api/languages`, {
      next: { revalidate: 60, tags: ["site-languages"] },
    });
    if (!res.ok) return [...FALLBACK_LOCALES];
    const json = await res.json();
    if (json?.success && Array.isArray(json.data) && json.data.length > 0) {
      return json.data
        .map((l: { code?: string }) => (l.code ?? "").toLowerCase())
        .filter((c: string) => c.length > 0);
    }
    return [...FALLBACK_LOCALES];
  } catch {
    return [...FALLBACK_LOCALES];
  }
}

export async function resolveLocale(): Promise<string> {
  const supported = await getSupportedLocales();

  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value?.toLowerCase();
  if (fromCookie && supported.includes(fromCookie)) return fromCookie;

  const hdr = await headers();
  const accept = hdr.get("accept-language") ?? "";
  for (const part of accept.split(",")) {
    const code = part.trim().split(";")[0].split("-")[0].toLowerCase();
    if (supported.includes(code)) return code;
  }
  return DEFAULT_LOCALE;
}
