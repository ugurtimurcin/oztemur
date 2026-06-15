"use client";
import { useCallback, useEffect, useState } from "react";
import { auditApi, type AuditLogDto } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import Icon from "@/components/Icon";

/* ═══════════════════════════════════════════════
   Audit Log Viewer — paginated, filterable.
   Read-only by design: AuditLog rows are immutable
   for compliance / forensic value.
   ═══════════════════════════════════════════════ */

const ACTIONS = ["INSERT", "UPDATE", "DELETE", "SOFT-DELETE"];
const PAGE_SIZE = 50;

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  } catch {
    return iso;
  }
}

function actionStyle(action: string): { bg: string; color: string } {
  switch (action) {
    case "INSERT":      return { bg: "var(--success-container)", color: "var(--success)" };
    case "UPDATE":      return { bg: "var(--primary-fixed)",     color: "var(--primary)" };
    case "DELETE":      return { bg: "var(--error-container)",   color: "var(--error)" };
    case "SOFT-DELETE": return { bg: "var(--error-container)",   color: "var(--error)" };
    default:            return { bg: "var(--surface)",           color: "var(--outline)" };
  }
}

function prettyJson(raw: string | null): string {
  if (!raw) return "—";
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

interface FullscreenPanel {
  title: string;
  body: string;
}

export default function AuditLogPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<AuditLogDto[]>([]);
  const [tables, setTables] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState<FullscreenPanel | null>(null);
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFullscreen(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  const [tableFilter, setTableFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    const r = await auditApi.list(p, PAGE_SIZE, {
      table: tableFilter || undefined,
      action: actionFilter || undefined,
      user: userFilter || undefined,
    });
    if (r.success && r.data) {
      setItems(r.data.items);
      setTotalPages(Math.max(1, Math.ceil(r.data.totalCount / r.data.pageSize)));
    } else {
      setError(r.message || t("Failed to load audit log.", "Denetim kaydı yüklenemedi."));
    }
    setLoading(false);
  }, [tableFilter, actionFilter, userFilter, t]);

  useEffect(() => {
    auditApi.tables().then(r => {
      if (r.success && r.data) setTables(r.data);
    });
  }, []);

  useEffect(() => { load(page); }, [load, page]);

  // Reset to page 1 when filters change.
  useEffect(() => { setPage(1); }, [tableFilter, actionFilter, userFilter]);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Manrope',sans-serif", fontSize: 28, fontWeight: 800, color: "var(--primary)" }}>{t("Audit Log", "Denetim Kaydı")}</h1>
        <p style={{ fontSize: 14, color: "var(--on-surface-variant)", marginTop: 4 }}>
          {t("Immutable record of every create / update / delete across the system.", "Sistemdeki her oluşturma / güncelleme / silme işleminin değiştirilemez kaydı.")} <span style={{ color: "var(--outline)", fontWeight: 500 }}>{t("Read-only.", "Salt okunur.")}</span>
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", minWidth: 200 }}>
          <Icon name="table" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: "var(--outline-variant)", pointerEvents: "none" }} />
          <select
            value={tableFilter}
            onChange={e => setTableFilter(e.target.value)}
            style={{ width: "100%", padding: "9px 12px 9px 38px", borderRadius: 8, fontSize: 13, background: "var(--surface-lowest)", color: "var(--on-surface)", border: "1px solid rgba(198,197,212,0.3)", appearance: "none", outline: "none" }}
          >
            <option value="">{t("All tables", "Tüm tablolar")}</option>
            {tables.map(tbl => <option key={tbl} value={tbl}>{tbl}</option>)}
          </select>
        </div>

        <div style={{ position: "relative", minWidth: 180 }}>
          <Icon name="bolt" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: "var(--outline-variant)", pointerEvents: "none" }} />
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            style={{ width: "100%", padding: "9px 12px 9px 38px", borderRadius: 8, fontSize: 13, background: "var(--surface-lowest)", color: "var(--on-surface)", border: "1px solid rgba(198,197,212,0.3)", appearance: "none", outline: "none" }}
          >
            <option value="">{t("All actions", "Tüm işlemler")}</option>
            {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        <div style={{ position: "relative", flex: 1, minWidth: 220, maxWidth: 320 }}>
          <Icon name="person_search" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: "var(--outline-variant)", pointerEvents: "none" }} />
          <input
            value={userFilter}
            onChange={e => setUserFilter(e.target.value)}
            placeholder={t("Filter by user (email or system)…", "Kullanıcıya göre filtrele (e-posta veya sistem)…")}
            style={{ width: "100%", padding: "9px 12px 9px 38px", borderRadius: 8, fontSize: 13, background: "var(--surface-lowest)", color: "var(--on-surface)", border: "1px solid rgba(198,197,212,0.3)", outline: "none" }}
          />
        </div>

        {(tableFilter || actionFilter || userFilter) && (
          <button
            onClick={() => { setTableFilter(""); setActionFilter(""); setUserFilter(""); }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "var(--outline)", background: "var(--surface)", border: "1px solid rgba(198,197,212,0.3)", cursor: "pointer" }}
          >
            <Icon name="close" style={{ fontSize: 14 }} />
            {t("Clear", "Temizle")}
          </button>
        )}
      </div>

      {loading && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 100, gap: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2.5px solid var(--primary-fixed)", borderTopColor: "var(--primary)", animation: "spin .8s linear infinite" }} />
          <p style={{ fontSize: 13, color: "var(--outline)" }}>{t("Loading audit log…", "Denetim kaydı yükleniyor…")}</p>
        </div>
      )}

      {error && !loading && (
        <div style={{ padding: 40, textAlign: "center" }}>
          <Icon name="error" style={{ fontSize: 36, color: "var(--error)", marginBottom: 8, display: "block", marginInline: "auto" }} />
          <p style={{ fontSize: 13, color: "var(--error)", fontWeight: 600 }}>{error}</p>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 80, background: "var(--surface-lowest)", borderRadius: 16, border: "2px dashed rgba(198,197,212,0.3)" }}>
          <Icon name="inventory_2" style={{ fontSize: 32, color: "var(--outline-variant)", marginBottom: 8 }} />
          <p style={{ fontSize: 14, color: "var(--outline)", fontWeight: 500 }}>{t("No audit entries match the current filters.", "Mevcut filtrelere uyan denetim kaydı yok.")}</p>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div style={{ background: "var(--surface-lowest)", borderRadius: 12, overflow: "hidden", boxShadow: "var(--shadow-ambient)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "180px 130px 160px minmax(0,1fr) 40px", padding: "12px 20px", borderBottom: "1px solid rgba(198,197,212,0.2)", background: "var(--surface)" }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--outline)" }}>{t("Timestamp", "Zaman")}</span>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--outline)" }}>{t("Action", "İşlem")}</span>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--outline)" }}>{t("Table", "Tablo")}</span>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--outline)" }}>{t("User", "Kullanıcı")}</span>
            <span />
          </div>
          {items.map(row => {
            const open = expandedId === row.id;
            const style = actionStyle(row.action);
            return (
              <div key={row.id} style={{ borderBottom: "1px solid rgba(198,197,212,0.1)" }}>
                <div
                  onClick={() => setExpandedId(open ? null : row.id)}
                  style={{ display: "grid", gridTemplateColumns: "180px 130px 160px minmax(0,1fr) 40px", padding: "12px 20px", alignItems: "center", cursor: "pointer", transition: "background .15s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--surface)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 11, color: "var(--on-surface-variant)" }}>
                    {formatDate(row.timestamp)}
                  </span>
                  <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 9999, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", background: style.bg, color: style.color, width: "fit-content" }}>
                    {row.action}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--on-surface)", fontWeight: 600 }}>{row.tableName}</span>
                  <span style={{ fontSize: 12, color: "var(--on-surface-variant)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {row.userDisplay ?? row.userId ?? "—"}
                  </span>
                  <Icon name="expand_more" style={{ fontSize: 18, color: "var(--outline)", justifySelf: "end", transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
                </div>

                {open && (() => {
                  const oldLabel = t("Old values", "Eski değerler");
                  const newLabel = t("New values", "Yeni değerler");
                  const oldBody = prettyJson(row.oldValues);
                  const newBody = prettyJson(row.newValues);
                  return (
                    <div style={{ padding: "0 20px 16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "stretch" }}>
                      <DiffPanel title={oldLabel} body={oldBody} expandLabel={t("Open fullscreen", "Tam ekran aç")} onExpand={() => setFullscreen({ title: oldLabel, body: oldBody })} />
                      <DiffPanel title={newLabel} body={newBody} expandLabel={t("Open fullscreen", "Tam ekran aç")} onExpand={() => setFullscreen({ title: newLabel, body: newBody })} />
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 24 }}>
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            style={{ padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "var(--on-surface-variant)", background: "var(--surface-lowest)", border: "1px solid rgba(198,197,212,0.3)", cursor: page <= 1 ? "not-allowed" : "pointer", opacity: page <= 1 ? 0.5 : 1 }}
          >
            ← {t("Prev", "Önceki")}
          </button>
          <span style={{ fontSize: 12, color: "var(--outline)", padding: "0 10px" }}>
            {t("Page", "Sayfa")} {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            style={{ padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "var(--on-surface-variant)", background: "var(--surface-lowest)", border: "1px solid rgba(198,197,212,0.3)", cursor: page >= totalPages ? "not-allowed" : "pointer", opacity: page >= totalPages ? 0.5 : 1 }}
          >
            {t("Next", "Sonraki")} →
          </button>
        </div>
      )}

      {fullscreen && (
        <FullscreenModal
          title={fullscreen.title}
          body={fullscreen.body}
          closeLabel={t("Close", "Kapat")}
          onClose={() => setFullscreen(null)}
        />
      )}
    </div>
  );
}

interface DiffPanelProps {
  title: string;
  body: string;
  expandLabel: string;
  onExpand: () => void;
}
function DiffPanel({ title, body, expandLabel, onExpand }: DiffPanelProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--outline)" }}>
          {title}
        </span>
        <button
          type="button"
          onClick={onExpand}
          title={expandLabel}
          aria-label={expandLabel}
          style={{ background: "none", border: "none", padding: 4, cursor: "pointer", color: "var(--outline)", display: "flex", alignItems: "center", borderRadius: 4 }}
          onMouseEnter={e => { e.currentTarget.style.color = "var(--primary)"; e.currentTarget.style.background = "var(--surface)"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "var(--outline)"; e.currentTarget.style.background = "none"; }}
        >
          <Icon name="open_in_full" style={{ fontSize: 16 }} />
        </button>
      </div>
      <pre
        style={{
          background: "var(--surface)",
          borderRadius: 6,
          padding: 12,
          fontSize: 11,
          color: "var(--on-surface-variant)",
          height: 360,
          overflow: "auto",
          whiteSpace: "pre",
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          lineHeight: 1.5,
          margin: 0,
        }}
      >
        {body}
      </pre>
    </div>
  );
}

interface FullscreenModalProps {
  title: string;
  body: string;
  closeLabel: string;
  onClose: () => void;
}
function FullscreenModal({ title, body, closeLabel, onClose }: FullscreenModalProps) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0, 0, 0, 0.35)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "stretch", justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--surface-lowest)", borderRadius: 12,
          width: "100%", maxWidth: 1400,
          display: "flex", flexDirection: "column",
          overflow: "hidden", boxShadow: "var(--shadow-elevated)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid rgba(198,197,212,0.25)" }}>
          <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--primary)" }}>
            {title}
          </span>
          <button
            type="button"
            onClick={onClose}
            title={closeLabel}
            aria-label={closeLabel}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 6, color: "var(--outline)", display: "flex", borderRadius: 4 }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--on-surface)"; e.currentTarget.style.background = "var(--surface)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--outline)"; e.currentTarget.style.background = "none"; }}
          >
            <Icon name="close" style={{ fontSize: 20 }} />
          </button>
        </div>
        <pre
          style={{
            margin: 0, padding: "20px 24px",
            background: "var(--surface)",
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: 13, lineHeight: 1.6,
            color: "var(--on-surface)",
            flex: 1, overflow: "auto",
            whiteSpace: "pre",
          }}
        >
          {body}
        </pre>
      </div>
    </div>
  );
}
