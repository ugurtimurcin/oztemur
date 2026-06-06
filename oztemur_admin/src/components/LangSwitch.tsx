"use client";
import { useI18n, type Locale } from "@/lib/i18n";

/** TR/EN pill toggle for the admin panel's own interface language. */
export default function LangSwitch() {
  const { locale, setLocale } = useI18n();
  const opts: Locale[] = ["tr", "en"];

  return (
    <div style={{ display: "flex", gap: 2, background: "var(--surface-low)", borderRadius: 8, padding: 3 }}>
      {opts.map(l => {
        const active = locale === l;
        return (
          <button
            key={l}
            type="button"
            onClick={() => setLocale(l)}
            aria-pressed={active}
            style={{
              padding: "5px 11px", borderRadius: 6, fontSize: 11, fontWeight: 700,
              letterSpacing: "0.04em", border: "none", cursor: "pointer",
              background: active ? "var(--primary)" : "transparent",
              color: active ? "#fff" : "var(--on-surface-variant)",
              transition: "background .15s, color .15s",
            }}
          >
            {l.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
