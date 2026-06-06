/* ═══════════════════════════════════════════════
   DataTable — "Fluid Table" (No dividers)
   ═══════════════════════════════════════════════ */
"use client";

import { type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import Icon from "@/components/Icon";

export interface Column<T> {
  key: string;
  label: string;
  width?: string;
  render?: (item: T) => ReactNode;
}

interface Props<T> {
  columns: Column<T>[];
  data: T[];
  loading: boolean;
  error?: string | null;
  onEdit?:   (id: string) => void;
  onDelete?: (id: string) => void;
  onRowClick?: (item: T) => void;
  getRowId:  (item: T) => string;
  emptyIcon?:    string;
  emptyMessage?: string;
}

export default function DataTable<T>({ columns, data, loading, error, onEdit, onDelete, onRowClick, getRowId, emptyIcon = "inbox", emptyMessage }: Props<T>) {
  const { t } = useI18n();

  /* loading */
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0", background: "var(--surface-lowest)", borderRadius: 8 }}>
      <div style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid var(--primary-fixed)", borderTopColor: "var(--primary)", animation: "spin .8s linear infinite" }} />
      <span style={{ marginLeft: 12, fontSize: 13, fontWeight: 500, color: "var(--outline)" }}>{t("Loading…", "Yükleniyor…")}</span>
    </div>
  );

  /* error */
  if (error) return (
    <div style={{ textAlign: "center" as const, padding: "64px 0", background: "var(--surface-lowest)", borderRadius: 8 }}>
      <Icon name="cloud_off" style={{ fontSize: 36, color: "var(--error)", display: "block", marginInline: "auto", marginBottom: 8 }} />
      <p style={{ fontSize: 13, fontWeight: 500, color: "var(--error)" }}>{error}</p>
    </div>
  );

  /* empty */
  if (!data.length) return (
    <div style={{ textAlign: "center" as const, padding: "80px 0", background: "var(--surface-lowest)", borderRadius: 8 }}>
      <Icon name={emptyIcon} style={{ fontSize: 40, color: "var(--outline-variant)", display: "block", marginInline: "auto", marginBottom: 12 }} />
      <p style={{ fontSize: 13, fontWeight: 500, color: "var(--outline)" }}>{emptyMessage ?? t("No records found.", "Kayıt bulunamadı.")}</p>
    </div>
  );

  return (
    <div style={{ background: "var(--surface-lowest)", borderRadius: 8, boxShadow: "var(--shadow-soft)", overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {columns.map(c => (
              <th key={c.key} style={{ textAlign: "left" as const, padding: "14px 24px", fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.05em", color: "var(--outline)", width: c.width }}>
                {c.label}
              </th>
            ))}
            {(onEdit || onDelete) && <th style={{ width: 100, padding: "14px 24px" }} />}
          </tr>
        </thead>
        <tbody>
          {data.map(item => (
            <tr key={getRowId(item)} style={{ transition: "background .12s", cursor: onRowClick ? "pointer" : "default" }}
              onClick={() => onRowClick?.(item)}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-low)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              {columns.map(c => (
                <td key={c.key} style={{ padding: "16px 24px", fontSize: 14, color: "var(--on-surface)" }}>
                  {c.render ? c.render(item) : String((item as Record<string, unknown>)[c.key] ?? "—")}
                </td>
              ))}
              {(onEdit || onDelete) && (
                <td style={{ padding: "16px 24px", textAlign: "right" as const }}>
                  <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                    {onEdit && <button onClick={() => onEdit(getRowId(item))} title={t("Edit", "Düzenle")} style={{ padding: 6, cursor: "pointer", background: "none", border: "none", color: "var(--primary)", display: "flex" }}><Icon name="edit" style={{ fontSize: 17 }} /></button>}
                    {onDelete && <button onClick={() => onDelete(getRowId(item))} title={t("Delete", "Sil")} style={{ padding: 6, cursor: "pointer", background: "none", border: "none", color: "var(--error)", display: "flex" }}><Icon name="delete" style={{ fontSize: 17 }} /></button>}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
