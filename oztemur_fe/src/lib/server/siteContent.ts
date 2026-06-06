// Server-only module: lives under lib/server/ by convention.
// Imported by Server Components (page.tsx files); never by client components.

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5137";

/** Backend returns: { sectionKey: { fieldKey: resolvedString } } */
export type SectionFields = Record<string, string>;
export type PageContent = Record<string, SectionFields>;
export type UiStrings = Record<string, string>;

const REVALIDATE_SECONDS = 60;

/**
 * Server-side fetch for a page's full content. Cached by Next.js for
 * REVALIDATE_SECONDS so admin edits propagate within a minute, even
 * across CDN caches.
 *
 * Returns an empty object on any error so callers can safely fall back
 * to their hardcoded defaults via {@link mergeWithFallback}.
 */
export async function getPageContent(pageKey: string, locale: string): Promise<PageContent> {
  try {
    const res = await fetch(
      `${API_BASE}/api/cms/page/${encodeURIComponent(pageKey)}?lang=${encodeURIComponent(locale)}`,
      { next: { revalidate: REVALIDATE_SECONDS, tags: [`page:${pageKey}`, "site-content"] } },
    );
    if (!res.ok) return {};
    const json = await res.json();
    if (json?.success && json?.data && typeof json.data === "object") {
      return json.data as PageContent;
    }
    return {};
  } catch {
    return {};
  }
}

/** Same shape as getPageContent but for the global UI string dictionary. */
export async function getUiStrings(locale: string, group?: string): Promise<UiStrings> {
  const groupQs = group ? `&group=${encodeURIComponent(group)}` : "";
  try {
    const res = await fetch(
      `${API_BASE}/api/cms/ui-strings?lang=${encodeURIComponent(locale)}${groupQs}`,
      { next: { revalidate: REVALIDATE_SECONDS, tags: ["ui-strings", "site-content"] } },
    );
    if (!res.ok) return {};
    const json = await res.json();
    if (json?.success && json?.data && typeof json.data === "object") {
      return json.data as UiStrings;
    }
    return {};
  } catch {
    return {};
  }
}

/**
 * Convenience: read a single section out of a page payload, merged with
 * a hardcoded fallback dictionary. The fallback's keys define the shape;
 * API values fill them in where present.
 */
export function pickSection<T extends Record<string, string>>(
  page: PageContent,
  sectionKey: string,
  fallback: T,
): T {
  return mergeWithFallback(page[sectionKey], fallback);
}

export function mergeWithFallback<T extends Record<string, string>>(
  apiSection: SectionFields | undefined,
  fallback: T,
): T {
  if (!apiSection) return fallback;
  const merged: Record<string, string> = { ...fallback };
  for (const key of Object.keys(fallback)) {
    const v = apiSection[key];
    if (typeof v === "string" && v.length > 0) merged[key] = v;
  }
  return merged as T;
}
