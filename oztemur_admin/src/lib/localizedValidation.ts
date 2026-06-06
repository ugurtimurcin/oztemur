import type { LanguageDto } from "@/lib/api";

/**
 * Cross-language completeness check for localized fields.
 *
 * Rule: when content is created/edited, every *published* (active) language
 * must carry a value for each required localized field. Draft languages are
 * exempt — they aren't live on the site yet.
 */

export type LocalizedMap = Record<string, string> | undefined;

/** Codes of the published (active) languages — content is mandatory for these. */
export function publishedLocales(langs: LanguageDto[]): string[] {
  return langs.filter(l => l.isActive).map(l => l.code);
}

/**
 * Returns the codes of every published language missing a value in at least
 * one of the supplied required fields. An empty array means all are complete.
 */
export function incompleteLocales(langs: LanguageDto[], fields: LocalizedMap[]): string[] {
  return publishedLocales(langs).filter(code =>
    fields.some(f => !((f?.[code]) ?? "").trim()),
  );
}

/** Comma-separated human-readable language names for the given codes. */
export function localeNames(langs: LanguageDto[], codes: string[]): string {
  return codes
    .map(c => langs.find(l => l.code === c))
    .map(l => l?.nativeName || l?.name || l?.code || "")
    .filter(Boolean)
    .join(", ");
}
