"use client";
/* ═══════════════════════════════════════════════
   Admin panel localization — static, frontend-only.
   Strings are translated inline at the call site via
   t("English", "Türkçe") — no key catalog to maintain.
   The choice is admin-specific and persisted locally,
   independent of the public site's language.
   ═══════════════════════════════════════════════ */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Locale = "en" | "tr";

const STORAGE_KEY = "oz_admin_locale";
const DEFAULT_LOCALE: Locale = "tr";

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  /** Returns the Turkish or English variant based on the active locale. */
  t: (en: string, tr: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function readStored(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "en" || v === "tr" ? v : DEFAULT_LOCALE;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  // Start from the default so the server HTML and the client's first render
  // agree — reading localStorage during render would cause a hydration
  // mismatch when the stored choice differs from the default.
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // Apply the persisted choice once, after mount.
  useEffect(() => {
    const stored = readStored();
    if (stored !== DEFAULT_LOCALE) setLocaleState(stored);
  }, []);

  // Reflect the language on <html lang> for accessibility / spellcheck.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try { window.localStorage.setItem(STORAGE_KEY, l); } catch { /* ignore */ }
  }, []);

  const t = useCallback((en: string, tr: string) => (locale === "tr" ? tr : en), [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within <I18nProvider>");
  return ctx;
}
