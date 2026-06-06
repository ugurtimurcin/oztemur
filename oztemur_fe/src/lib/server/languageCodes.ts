/**
 * Region mappings for the languages we expect to see. Adding a new entry
 * here only affects SEO niceties (hreflang region, og:locale region) —
 * the public site itself works for any code the admin publishes, with
 * or without an entry below.
 *
 * If a language is published without a region here, we fall back to the
 * bare ISO 639-1 code, which is still a valid hreflang and a valid
 * og:locale prefix.
 */
const REGION_MAP: Record<string, string> = {
  tr: "TR",
  en: "US",
  ar: "SA",
  de: "DE",
  fr: "FR",
  es: "ES",
  it: "IT",
  ru: "RU",
  zh: "CN",
  ja: "JP",
  ko: "KR",
  pt: "PT",
  nl: "NL",
  pl: "PL",
  el: "GR",
};

/** Lowercased ISO 639-1 code → BCP 47 tag (e.g. "tr" → "tr-TR"). */
export function toBcp47Tag(code: string): string {
  const lc = (code ?? "").toLowerCase();
  const region = REGION_MAP[lc];
  return region ? `${lc}-${region}` : lc;
}

/** Lowercased ISO 639-1 code → Open Graph locale (e.g. "tr" → "tr_TR"). */
export function toOgLocale(code: string): string {
  const lc = (code ?? "").toLowerCase();
  const region = REGION_MAP[lc];
  return region ? `${lc}_${region}` : lc;
}
