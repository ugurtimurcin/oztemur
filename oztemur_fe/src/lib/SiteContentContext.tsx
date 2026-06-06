"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLanguage } from "./LanguageContext";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5137";

/** Map of { sectionKey → { fieldKey → resolvedString } } for one page. */
export type PageData = Record<string, Record<string, string>>;

interface SiteContentValue {
  pages: Record<string, PageData>;
  uiStrings: Record<string, string>;
  ensurePage: (pageKey: string) => void;
}

const SiteContentContext = createContext<SiteContentValue>({
  pages: {},
  uiStrings: {},
  ensurePage: () => {},
});

interface ProviderProps {
  children: ReactNode;
  /**
   * Pre-fetched page content from the server, keyed by pageKey. When
   * supplied, useSection returns API values on the very first render —
   * no flash, no extra client fetch.
   */
  initialPages?: Record<string, PageData>;
  /** Pre-fetched UI string dictionary. */
  initialUiStrings?: Record<string, string>;
}

export function SiteContentProvider({ children, initialPages, initialUiStrings }: ProviderProps) {
  const { locale } = useLanguage();
  const [pages, setPages] = useState<Record<string, PageData>>(initialPages ?? {});
  const [uiStrings, setUiStrings] = useState<Record<string, string>>(initialUiStrings ?? {});
  const inflight = useRef<Set<string>>(new Set());
  // Track which locale the cache is valid for. If the user switches
  // languages we wipe and refetch.
  const cacheLocale = useRef<string>(locale);

  useEffect(() => {
    if (cacheLocale.current === locale) return;
    cacheLocale.current = locale;
    setPages({});
    inflight.current.clear();

    let cancelled = false;
    fetch(`${API_BASE}/api/cms/ui-strings?lang=${encodeURIComponent(locale)}`)
      .then(r => r.json())
      .then(j => {
        if (cancelled) return;
        if (j?.success && j?.data && typeof j.data === "object") {
          setUiStrings(j.data as Record<string, string>);
        }
      })
      .catch(() => { /* keep stale */ });
    return () => { cancelled = true; };
  }, [locale]);

  const ensurePage = useCallback((pageKey: string) => {
    if (!pageKey) return;
    if (pages[pageKey]) return;
    if (inflight.current.has(pageKey)) return;

    inflight.current.add(pageKey);
    fetch(`${API_BASE}/api/cms/page/${encodeURIComponent(pageKey)}?lang=${encodeURIComponent(locale)}`)
      .then(r => r.json())
      .then(j => {
        if (j?.success && j?.data && typeof j.data === "object") {
          setPages(prev => ({ ...prev, [pageKey]: j.data as PageData }));
        }
      })
      .catch(() => { /* keep fallback */ })
      .finally(() => { inflight.current.delete(pageKey); });
  }, [pages, locale]);

  return (
    <SiteContentContext.Provider value={{ pages, uiStrings, ensurePage }}>
      {children}
    </SiteContentContext.Provider>
  );
}

/**
 * Returns the resolved fields of a single section, preferring API values
 * and falling back to the supplied defaults. When the provider was
 * pre-hydrated by the server (the common case), no client fetch fires
 * and the very first render already has API content.
 */
export function useSection<T extends Record<string, string>>(
  pageKey: string,
  sectionKey: string,
  fallback: T,
): T {
  const ctx = useContext(SiteContentContext);

  useEffect(() => {
    ctx.ensurePage(pageKey);
  }, [ctx, pageKey]);

  const apiSection = ctx.pages[pageKey]?.[sectionKey];
  if (!apiSection) return fallback;

  const merged: Record<string, string> = { ...fallback };
  for (const key of Object.keys(fallback)) {
    const v = apiSection[key];
    if (typeof v === "string" && v.length > 0) merged[key] = v;
  }
  return merged as T;
}

export function useUiString(key: string, fallback: string): string {
  const { uiStrings } = useContext(SiteContentContext);
  return uiStrings[key] ?? fallback;
}

/**
 * Escape hatch for callers that need the full UI string dictionary —
 * specifically helpers that resolve a key dynamically (e.g. status enum
 * lookups). Prefer the typed <c>useUiStrings(fallback)</c> when you know
 * the key set up front.
 */
export function useAllUiStrings(): Record<string, string> {
  return useContext(SiteContentContext).uiStrings;
}

export function useUiStrings<T extends Record<string, string>>(fallback: T): T {
  const { uiStrings } = useContext(SiteContentContext);
  const merged: Record<string, string> = { ...fallback };
  for (const key of Object.keys(fallback)) {
    const v = uiStrings[key];
    if (typeof v === "string" && v.length > 0) merged[key] = v;
  }
  return merged as T;
}
