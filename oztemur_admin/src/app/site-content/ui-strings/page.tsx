"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  siteContentApi,
  settingsApi,
  loc,
  type UiStringDto,
  type LanguageDto,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import Icon from "@/components/Icon";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 50;

/* ═══════════════════════════════════════════════
   UI Strings — read-only listing of seeded reusable
   labels. Click a row to update its translations.
   No add/delete from this UI.
   ═══════════════════════════════════════════════ */

export default function UiStringsListPage() {
  const router = useRouter();
  const { t } = useI18n();

  const [strings, setStrings] = useState<UiStringDto[]>([]);
  const [langs, setLangs] = useState<LanguageDto[]>([]);
  const [listLang, setListLang] = useState("tr");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("__all__");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await siteContentApi.getUiStrings(1, 1000);
    if (r.success && r.data) setStrings(r.data.items);
    else setError(r.message || t("Failed to load UI strings.", "Arayüz metinleri yüklenemedi."));
    setLoading(false);
  }, [t]);

  useEffect(() => {
    load();
    settingsApi.getLanguages().then(r => {
      if (r.success && r.data) setLangs(r.data);
    });
  }, [load]);

  const groups = useMemo(() => {
    const set = new Set<string>();
    strings.forEach(s => set.add(s.group));
    return Array.from(set).sort();
  }, [strings]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return strings
      .filter(s => groupFilter === "__all__" || s.group === groupFilter)
      .filter(s => {
        if (!q) return true;
        if (s.key.toLowerCase().includes(q)) return true;
        if ((s.description ?? "").toLowerCase().includes(q)) return true;
        return Object.values(s.values ?? {}).some(v => v.toLowerCase().includes(q));
      })
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [strings, query, groupFilter]);

  // Reset to page 1 whenever the filter shrinks the result set.
  useEffect(() => { setPage(1); }, [query, groupFilter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  );

  /* ─── Render ──────────────────────────────────── */

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "100px 0", gap: 16 }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2.5px solid var(--primary-fixed)", borderTopColor: "var(--primary)", animation: "spin .8s linear infinite" }} />
      <p style={{ fontSize: 13, color: "var(--outline)", fontWeight: 500 }}>{t("Loading UI strings…", "Arayüz metinleri yükleniyor…")}</p>
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
        <h1 style={{ fontFamily: "'Manrope',sans-serif", fontSize: 28, fontWeight: 800, color: "var(--primary)" }}>{t("UI Strings", "Arayüz Metinleri")}</h1>
        <p style={{ fontSize: 14, color: "var(--on-surface-variant)", marginTop: 4 }}>
          {t("Reusable labels — nav, buttons, footer.", "Tekrar kullanılan metinler — menü, butonlar, alt bilgi.")} <span style={{ color: "var(--outline)", fontWeight: 500 }}>{strings.length} {t("strings", "metin")} · {groups.length} {t("groups", "grup")}</span>
        </p>
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 280, maxWidth: 480 }}>
          <Icon name="search" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 18, color: "var(--outline-variant)", pointerEvents: "none" }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t("Search by key, description or value…", "Anahtar, açıklama veya değere göre ara…")}
            style={{ width: "100%", padding: "10px 16px 10px 42px", borderRadius: 8, fontSize: 13, background: "var(--surface-lowest)", color: "var(--on-surface)", border: "1px solid rgba(198,197,212,0.3)", outline: "none" }}
          />
        </div>
        {groups.length > 0 && (
          <div style={{ display: "flex", gap: 4, background: "var(--surface)", padding: 4, borderRadius: 8, flexWrap: "wrap" }}>
            <button
              onClick={() => setGroupFilter("__all__")}
              style={{
                padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer",
                background: groupFilter === "__all__" ? "var(--primary)" : "transparent",
                color: groupFilter === "__all__" ? "#fff" : "var(--outline)",
                transition: "all .2s",
              }}
            >
              {t("ALL", "TÜMÜ")}
            </button>
            {groups.map(g => (
              <button
                key={g}
                onClick={() => setGroupFilter(g)}
                style={{
                  padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer",
                  background: groupFilter === g ? "var(--primary)" : "transparent",
                  color: groupFilter === g ? "#fff" : "var(--outline)",
                  transition: "all .2s",
                  textTransform: "uppercase",
                }}
              >
                {g}
              </button>
            ))}
          </div>
        )}
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

      {filtered.length === 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 20px", background: "var(--surface-lowest)", borderRadius: 16, border: "2px dashed rgba(198,197,212,0.3)" }}>
          <div style={{ width: 72, height: 72, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--primary-fixed)", marginBottom: 20 }}>
            <Icon name="translate" style={{ fontSize: 36, color: "var(--primary)" }} />
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, color: "var(--on-surface)" }}>
            {strings.length === 0 ? t("No UI strings", "Arayüz metni yok") : t("No matches", "Eşleşme yok")}
          </p>
        </div>
      )}

      {filtered.length > 0 && (
        <div style={{ background: "var(--surface-lowest)", borderRadius: 12, overflow: "hidden", boxShadow: "var(--shadow-ambient)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 2fr) 100px 1fr 60px", padding: "12px 20px", borderBottom: "1px solid rgba(198,197,212,0.2)", background: "var(--surface)" }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--outline)" }}>{t("Key", "Anahtar")}</span>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--outline)" }}>{t("Group", "Grup")}</span>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--outline)" }}>{t("Value", "Değer")} · {listLang.toUpperCase()}</span>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--outline)", textAlign: "right" }}>{t("Edit", "Düzenle")}</span>
          </div>
          {pageRows.map(s => {
            const value = loc(s.values, listLang);
            return (
              <div
                key={s.id}
                style={{ display: "grid", gridTemplateColumns: "minmax(220px, 2fr) 100px 1fr 60px", padding: "14px 20px", borderBottom: "1px solid rgba(198,197,212,0.1)", alignItems: "center", cursor: "pointer", transition: "background .15s" }}
                onClick={() => router.push(`/site-content/ui-strings/${s.id}`)}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--surface)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                  <span style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 12, fontWeight: 600, color: "var(--on-surface)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.key}
                  </span>
                  {s.description && (
                    <span style={{ fontSize: 11, color: "var(--outline)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.description}
                    </span>
                  )}
                </div>
                <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 9999, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", background: "var(--primary-fixed)", color: "var(--primary)", width: "fit-content" }}>
                  {s.group}
                </span>
                <span style={{ fontSize: 13, color: "var(--on-surface-variant)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {value || <em style={{ color: "var(--outline-variant)" }}>— {t("empty", "boş")} —</em>}
                </span>
                <div style={{ display: "flex", justifyContent: "flex-end", color: "var(--outline)" }}>
                  <Icon name="arrow_forward" style={{ fontSize: 18 }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filtered.length > PAGE_SIZE && (
        <Pagination page={page} totalPages={totalPages} totalCount={filtered.length} onPageChange={setPage} />
      )}
    </div>
  );
}
