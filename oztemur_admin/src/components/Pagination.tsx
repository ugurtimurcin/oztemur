"use client";
import { useI18n } from "@/lib/i18n";

interface PaginationProps {
  page: number;
  totalPages: number;
  totalCount?: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, totalCount, onPageChange }: PaginationProps) {
  const { t } = useI18n();
  if (totalPages <= 1) return null;

  const btn: React.CSSProperties = {
    padding: "8px 14px",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    color: "var(--on-surface-variant)",
    background: "var(--surface-lowest)",
    border: "1px solid rgba(198,197,212,0.3)",
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 24, flexWrap: "wrap" }}>
      <button
        disabled={page <= 1}
        onClick={() => onPageChange(Math.max(1, page - 1))}
        style={{ ...btn, cursor: page <= 1 ? "not-allowed" : "pointer", opacity: page <= 1 ? 0.5 : 1 }}
      >
        ← {t("Prev", "Önceki")}
      </button>
      <span style={{ fontSize: 12, color: "var(--outline)", padding: "0 10px" }}>
        {t("Page", "Sayfa")} {page} / {totalPages}
        {typeof totalCount === "number" && (
          <span style={{ marginLeft: 8, color: "var(--outline-variant)" }}>· {totalCount} {t("total", "toplam")}</span>
        )}
      </span>
      <button
        disabled={page >= totalPages}
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        style={{ ...btn, cursor: page >= totalPages ? "not-allowed" : "pointer", opacity: page >= totalPages ? 0.5 : 1 }}
      >
        {t("Next", "Sonraki")} →
      </button>
    </div>
  );
}
