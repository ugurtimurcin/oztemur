"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { siteContentApi, type PageSectionDto } from "@/lib/api";
import { getPageMeta, SITE_PAGES } from "@/lib/sitePages";
import { useI18n } from "@/lib/i18n";
import Icon from "@/components/Icon";

/* ═══════════════════════════════════════════════
   Page Content — top-level pages overview.
   Pick a page → see its sections → edit a section.
   ═══════════════════════════════════════════════ */

interface PageRow {
  key: string;
  label: string;
  icon: string;
  description: string;
  sectionCount: number;
  fieldCount: number;
}

export default function PagesOverviewPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [sections, setSections] = useState<PageSectionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const r = await siteContentApi.getSections(1, 500);
    if (r.success && r.data) setSections(r.data.items);
    else setError(r.message || t("Failed to load page content.", "Sayfa içeriği yüklenemedi."));
    setLoading(false);
  }, [t]);

  useEffect(() => { load(); }, [load]);

  // Aggregate by pageKey, then merge with the friendly metadata list so
  // the order is stable and known pages show up even if seed is missing.
  const rows = useMemo<PageRow[]>(() => {
    const counts = new Map<string, { sectionCount: number; fieldCount: number }>();
    for (const s of sections) {
      const c = counts.get(s.pageKey) ?? { sectionCount: 0, fieldCount: 0 };
      c.sectionCount += 1;
      c.fieldCount += Object.keys(s.fields ?? {}).length;
      counts.set(s.pageKey, c);
    }

    // Start from the curated SITE_PAGES order, then append any extra
    // pageKeys that exist in DB but not in the metadata list.
    const knownKeys = new Set(SITE_PAGES.map(p => p.key));
    const extras: string[] = [];
    for (const k of counts.keys()) if (!knownKeys.has(k)) extras.push(k);
    extras.sort();

    const all: PageRow[] = [];
    for (const meta of SITE_PAGES) {
      const c = counts.get(meta.key);
      if (!c) continue; // skip pages that aren't yet seeded
      all.push({ ...meta, sectionCount: c.sectionCount, fieldCount: c.fieldCount });
    }
    for (const k of extras) {
      const meta = getPageMeta(k);
      const c = counts.get(k)!;
      all.push({ ...meta, sectionCount: c.sectionCount, fieldCount: c.fieldCount });
    }

    if (!query.trim()) return all;
    const q = query.trim().toLowerCase();
    return all.filter(
      r =>
        r.key.toLowerCase().includes(q) ||
        r.label.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q),
    );
  }, [sections, query]);

  /* ─── Render ──────────────────────────────────── */

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "100px 0", gap: 16 }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2.5px solid var(--primary-fixed)", borderTopColor: "var(--primary)", animation: "spin .8s linear infinite" }} />
      <p style={{ fontSize: 13, color: "var(--outline)", fontWeight: 500 }}>{t("Loading pages…", "Sayfalar yükleniyor…")}</p>
    </div>
  );

  if (error) return (
    <div style={{ padding: "60px 20px", textAlign: "center" }}>
      <Icon name="error" style={{ fontSize: 48, color: "var(--error)", marginBottom: 12, display: "block", marginInline: "auto" }} />
      <p style={{ fontSize: 14, color: "var(--error)", fontWeight: 600 }}>{error}</p>
      <button onClick={load} style={{ marginTop: 16, padding: "10px 24px", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "var(--primary)", background: "var(--primary-fixed)", border: "none", cursor: "pointer" }}>{t("Retry", "Tekrar Dene")}</button>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Manrope',sans-serif", fontSize: 28, fontWeight: 800, color: "var(--primary)" }}>{t("Page Content", "Sayfa İçeriği")}</h1>
        <p style={{ fontSize: 14, color: "var(--on-surface-variant)", marginTop: 4 }}>
          {t("Pick a page to update its translations.", "Çevirilerini güncellemek için bir sayfa seçin.")}
          <span style={{ color: "var(--outline)", fontWeight: 500 }}>
            {" · "}{rows.length} {t("pages", "sayfa")}
          </span>
        </p>
      </div>

      {/* Search */}
      <div style={{ position: "relative", maxWidth: 480, marginBottom: 24 }}>
        <Icon name="search" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 18, color: "var(--outline-variant)", pointerEvents: "none" }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t("Search pages…", "Sayfa ara…")}
          style={{ width: "100%", padding: "10px 16px 10px 42px", borderRadius: 8, fontSize: 13, background: "var(--surface-lowest)", color: "var(--on-surface)", border: "1px solid rgba(198,197,212,0.3)", outline: "none" }}
        />
      </div>

      {rows.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 20px", background: "var(--surface-lowest)", borderRadius: 16, border: "2px dashed rgba(198,197,212,0.3)" }}>
          <div style={{ width: 72, height: 72, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--primary-fixed)", marginBottom: 20 }}>
            <Icon name="view_quilt" style={{ fontSize: 36, color: "var(--primary)" }} />
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, color: "var(--on-surface)" }}>
            {query ? t("No matches", "Eşleşme yok") : t("No page content", "Sayfa içeriği yok")}
          </p>
          <p style={{ fontSize: 13, color: "var(--outline)", marginTop: 6, maxWidth: 360, textAlign: "center" }}>
            {query
              ? t("Try a different search term.", "Farklı bir arama terimi deneyin.")
              : t("Initial content is seeded automatically when the API starts.", "İlk içerik API başladığında otomatik olarak yüklenir.")}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {rows.map(r => (
            <button
              key={r.key}
              onClick={() => router.push(`/site-content/pages/${encodeURIComponent(r.key)}`)}
              style={{
                background: "var(--surface-lowest)",
                borderRadius: 12,
                boxShadow: "var(--shadow-ambient)",
                padding: "20px 22px",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                transition: "transform .15s, box-shadow .2s",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 12px 28px -8px rgba(0,6,102,0.12)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "var(--shadow-ambient)";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: "var(--primary-fixed)", color: "var(--primary)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <Icon name={r.icon} style={{ fontSize: 22 }} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h3 style={{
                    fontFamily: "'Manrope',sans-serif", fontSize: 16, fontWeight: 700,
                    color: "var(--on-surface)", margin: 0,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {r.label}
                  </h3>
                  <span style={{
                    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                    fontSize: 11, color: "var(--outline)", fontWeight: 500,
                  }}>
                    {r.key}
                  </span>
                </div>
              </div>

              {r.description && (
                <p style={{
                  fontSize: 12, color: "var(--on-surface-variant)", lineHeight: 1.5,
                  margin: "6px 0 14px",
                  overflow: "hidden", textOverflow: "ellipsis",
                  display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                }}>
                  {r.description}
                </p>
              )}

              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                borderTop: "1px solid rgba(198,197,212,0.12)", paddingTop: 10, marginTop: 10,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--outline)", fontWeight: 500 }}>
                    <Icon name="view_agenda" style={{ fontSize: 14, color: "var(--outline-variant)" }} />
                    {r.sectionCount} {t("sections", "bölüm")}
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--outline)", fontWeight: 500 }}>
                    <Icon name="list_alt" style={{ fontSize: 14, color: "var(--outline-variant)" }} />
                    {r.fieldCount} {t("fields", "alan")}
                  </span>
                </div>
                <Icon name="arrow_forward" style={{ fontSize: 18, color: "var(--primary)" }} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
