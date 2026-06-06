"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  siteContentApi,
  settingsApi,
  loc,
  type PageSectionDto,
  type LanguageDto,
} from "@/lib/api";
import { getPageMeta } from "@/lib/sitePages";
import { useI18n } from "@/lib/i18n";
import Icon from "@/components/Icon";

/* ═══════════════════════════════════════════════
   Per-page section list. Tap a section to edit.
   ═══════════════════════════════════════════════ */

export default function PageSectionsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { pageKey } = useParams<{ pageKey: string }>();
  const meta = useMemo(() => getPageMeta(pageKey), [pageKey]);

  const [sections, setSections] = useState<PageSectionDto[]>([]);
  const [langs, setLangs] = useState<LanguageDto[]>([]);
  const [listLang, setListLang] = useState("tr");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    // Load all and filter client-side. Section count per page is small.
    const r = await siteContentApi.getSections(1, 500);
    if (r.success && r.data) {
      setSections(
        r.data.items
          .filter(s => s.pageKey === pageKey)
          .sort((a, b) => a.sectionKey.localeCompare(b.sectionKey)),
      );
    } else {
      setError(r.message || t("Failed to load sections.", "Bölümler yüklenemedi."));
    }
    setLoading(false);
  }, [pageKey, t]);

  useEffect(() => {
    load();
    settingsApi.getLanguages().then(r => {
      if (r.success && r.data) setLangs(r.data);
    });
  }, [load]);

  /* ─── Render ──────────────────────────────────── */

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "100px 0", gap: 16 }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2.5px solid var(--primary-fixed)", borderTopColor: "var(--primary)", animation: "spin .8s linear infinite" }} />
      <p style={{ fontSize: 13, color: "var(--outline)", fontWeight: 500 }}>{t("Loading sections…", "Bölümler yükleniyor…")}</p>
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
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--outline)", marginBottom: 8 }}>
        <button onClick={() => router.push("/site-content/pages")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--outline)", display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 500 }}>
          <Icon name="arrow_back" style={{ fontSize: 16 }} />{t("Page Content", "Sayfa İçeriği")}
        </button>
        <span style={{ color: "var(--outline-variant)" }}>/</span>
        <span style={{ color: "var(--on-surface-variant)", fontWeight: 500 }}>{meta.label}</span>
      </div>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 12,
          background: "var(--primary-fixed)", color: "var(--primary)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Icon name={meta.icon} style={{ fontSize: 28 }} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 style={{ fontFamily: "'Manrope',sans-serif", fontSize: 28, fontWeight: 800, color: "var(--primary)", margin: 0 }}>
            {meta.label}
          </h1>
          <p style={{ fontSize: 13, color: "var(--on-surface-variant)", marginTop: 2 }}>
            {meta.description || t("Page content.", "Sayfa içeriği.")}{" "}
            <span style={{ color: "var(--outline)", fontWeight: 500 }}>
              · {sections.length} {t("sections", "bölüm")}
            </span>
          </p>
        </div>
        {langs.length > 1 && (
          <div style={{ display: "flex", gap: 4, background: "var(--surface)", padding: 4, borderRadius: 8 }}>
            {langs.map(l => (
              <button
                key={l.code}
                onClick={() => setListLang(l.code)}
                style={{
                  padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer",
                  background: listLang === l.code ? "var(--primary)" : "transparent",
                  color: listLang === l.code ? "#fff" : "var(--outline)",
                  transition: "all .2s",
                }}
              >
                {l.code.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </div>

      {sections.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 20px", background: "var(--surface-lowest)", borderRadius: 16, border: "2px dashed rgba(198,197,212,0.3)" }}>
          <div style={{ width: 72, height: 72, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--primary-fixed)", marginBottom: 20 }}>
            <Icon name="view_agenda" style={{ fontSize: 36, color: "var(--primary)" }} />
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, color: "var(--on-surface)" }}>{t("No sections on this page", "Bu sayfada bölüm yok")}</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 12 }}>
          {sections.map(s => {
            const fieldCount = Object.keys(s.fields ?? {}).length;
            const firstFieldKey = Object.keys(s.fields ?? {})[0];
            const previewValue = firstFieldKey ? loc(s.fields[firstFieldKey], listLang) : "";

            return (
              <button
                key={s.id}
                onClick={() => router.push(`/site-content/sections/${s.id}`)}
                style={{
                  background: "var(--surface-lowest)",
                  borderRadius: 12,
                  boxShadow: "var(--shadow-ambient)",
                  border: "none",
                  padding: 0,
                  textAlign: "left",
                  cursor: "pointer",
                  width: "100%",
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
                <div style={{ padding: "18px 20px" }}>
                  <h3 style={{
                    fontSize: 15, fontWeight: 700, color: "var(--on-surface)",
                    fontFamily: "'Manrope',sans-serif", letterSpacing: "0.01em",
                    margin: 0, marginBottom: 6,
                  }}>
                    {s.sectionKey}
                  </h3>
                  {s.description && (
                    <p style={{
                      fontSize: 12, color: "var(--outline)", margin: 0, marginBottom: 8,
                      overflow: "hidden", textOverflow: "ellipsis",
                      display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical",
                    }}>
                      {s.description}
                    </p>
                  )}
                  {previewValue && (
                    <p style={{
                      fontSize: 13, color: "var(--on-surface-variant)", lineHeight: 1.5,
                      margin: "8px 0 0", overflow: "hidden", textOverflow: "ellipsis",
                      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                    }}>
                      {previewValue}
                    </p>
                  )}
                </div>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 20px",
                  borderTop: "1px solid rgba(198,197,212,0.12)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Icon name="list_alt" style={{ fontSize: 14, color: "var(--outline-variant)" }} />
                    <span style={{ fontSize: 11, color: "var(--outline)", fontWeight: 500 }}>
                      {fieldCount} {t("fields", "alan")}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--primary)" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>{t("Edit", "Düzenle")}</span>
                    <Icon name="arrow_forward" style={{ fontSize: 16 }} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
