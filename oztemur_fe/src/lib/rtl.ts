/**
 * Right-to-left locale detection.
 *
 * Set the `<html dir>` attribute from this helper so layout / inline-styles
 * with logical CSS properties flip automatically when an RTL language is
 * active. Adding a new RTL language only requires extending this list.
 */
const RTL_LOCALES = new Set([
  "ar",   // Arabic
  "arc",  // Aramaic
  "dv",   // Divehi
  "fa",   // Persian (Farsi)
  "ha",   // Hausa
  "he",   // Hebrew
  "khw",  // Khowar
  "ks",   // Kashmiri
  "ps",   // Pashto
  "sd",   // Sindhi
  "ur",   // Urdu
  "yi",   // Yiddish
]);

export function isRtlLocale(code: string | null | undefined): boolean {
  if (!code) return false;
  return RTL_LOCALES.has(code.split("-")[0].toLowerCase());
}

export function dirOf(code: string | null | undefined): "rtl" | "ltr" {
  return isRtlLocale(code) ? "rtl" : "ltr";
}
