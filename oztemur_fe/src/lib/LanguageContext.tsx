"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { dirOf } from "@/lib/rtl";

export interface LangOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

const DEFAULT_LANGS: LangOption[] = [
  { code: "tr", name: "Turkish", nativeName: "Türkçe", flag: "🇹🇷" },
  { code: "en", name: "English", nativeName: "English", flag: "🇬🇧" },
];

interface LanguageContextType {
  locale: string;
  setLocale: (code: string) => void;
  languages: LangOption[];
  currentLang: LangOption;
}

const LanguageContext = createContext<LanguageContextType>({
  locale: "tr",
  setLocale: () => {},
  languages: DEFAULT_LANGS,
  currentLang: DEFAULT_LANGS[0],
});

export function useLanguage() {
  return useContext(LanguageContext);
}

const STORAGE_KEY = "oz_locale";
const COOKIE_KEY = "oz_locale";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5137";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax${secure}`;
}

/**
 * Reads the initial locale from the cookie synchronously so the
 * client matches what the server rendered. Falls back to localStorage
 * (legacy users), then "tr".
 */
function getInitialLocale(initial?: string): string {
  if (initial) return initial;
  if (typeof window === "undefined") return "tr";
  const fromCookie = readCookie(COOKIE_KEY);
  if (fromCookie) return fromCookie;
  const fromStorage = localStorage.getItem(STORAGE_KEY);
  if (fromStorage) return fromStorage;
  return "tr";
}

interface ProviderProps {
  children: ReactNode;
  /**
   * Optional locale resolved on the server (cookie / Accept-Language).
   * Passing it ensures hydration matches the server-rendered HTML.
   */
  initialLocale?: string;
  /**
   * Optional pre-fetched language list. When supplied, the provider
   * skips the runtime fetch — useful for SSR.
   */
  initialLanguages?: LangOption[];
}

export function LanguageProvider({ children, initialLocale, initialLanguages }: ProviderProps) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<string>(() => getInitialLocale(initialLocale));
  const [languages, setLanguages] = useState<LangOption[]>(initialLanguages ?? DEFAULT_LANGS);

  // On mount, refresh the language list from the public endpoint so the
  // dropdown stays accurate when admins add a new locale. We do NOT gate
  // children on this — the SSR-rendered tree must remain visible.
  useEffect(() => {
    if (initialLanguages && initialLanguages.length > 0) return;
    let cancelled = false;
    fetch(`${API_BASE}/api/languages`)
      .then(r => r.json())
      .then(res => {
        if (cancelled) return;
        if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
          const sorted = [...res.data].sort((a: LangOption & { isDefault?: boolean; displayOrder?: number }, b) => {
            if (a.isDefault && !b.isDefault) return -1;
            if (!a.isDefault && b.isDefault) return 1;
            return ((a as { displayOrder?: number }).displayOrder ?? 0) - ((b as { displayOrder?: number }).displayOrder ?? 0);
          });
          setLanguages(sorted.map(l => ({
            code: l.code, name: l.name, nativeName: l.nativeName, flag: l.flag,
          })));
        }
      })
      .catch(() => { /* keep defaults */ });
    return () => { cancelled = true; };
  }, [initialLanguages]);

  // Keep <html dir> in sync immediately — router.refresh() will rebuild the
  // tree with the SSR-resolved dir, but flipping it on the client first
  // avoids a brief LTR/RTL flash while the refresh is in flight.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dir = dirOf(locale);
    document.documentElement.lang = locale;
  }, [locale]);

  // Persist locale to BOTH cookie (for SSR) and localStorage (for legacy),
  // then ask Next.js to re-fetch server components in the new language.
  // router.refresh() preserves client state (scroll position, modal open
  // state) — much smoother than a full reload.
  const setLocale = useCallback((code: string) => {
    setLocaleState(code);
    if (typeof window !== "undefined") {
      try { localStorage.setItem(STORAGE_KEY, code); } catch { /* ignore */ }
      writeCookie(COOKIE_KEY, code);
    }
    router.refresh();
  }, [router]);

  const currentLang = languages.find(l => l.code === locale) ?? languages[0] ?? DEFAULT_LANGS[0];

  return (
    <LanguageContext.Provider value={{ locale, setLocale, languages, currentLang }}>
      {children}
    </LanguageContext.Provider>
  );
}
