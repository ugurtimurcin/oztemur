"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DataTable from "@/components/DataTable";
import Pagination from "@/components/Pagination";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { cmsApi, settingsApi, loc, hasPermission, type NewsArticleDto, type LanguageDto } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import Icon from "@/components/Icon";

const PAGE_SIZE = 25;

export default function NewsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { t, locale } = useI18n();
  const canEdit = hasPermission("news.edit");
  const canDelete = hasPermission("news.delete");
  const [data, setData] = useState<NewsArticleDto[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [langs, setLangs] = useState<LanguageDto[]>([]);
  const [listLang, setListLang] = useState("tr");

  const load = useCallback(async (p: number) => {
    setLoading(true);
    const r = await cmsApi.getNews(p, PAGE_SIZE);
    if (r.success && r.data) {
      setData(r.data.items);
      setTotalCount(r.data.totalCount);
      setTotalPages(Math.max(1, Math.ceil(r.data.totalCount / r.data.pageSize)));
    } else setError(r.message || t("Failed to load.", "Yüklenemedi."));
    setLoading(false);
  }, [t]);

  useEffect(() => { load(page); }, [load, page]);

  useEffect(() => {
    settingsApi.getLanguages().then(r => {
      if (r.success && r.data) setLangs(r.data);
    });
  }, []);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "'Manrope',sans-serif", fontSize: 28, fontWeight: 800, color: "var(--primary)" }}>{t("News", "Haberler")}</h1>
          <p style={{ fontSize: 14, color: "var(--on-surface-variant)", marginTop: 4 }}>{t("Manage news releases and press articles.", "Haber bültenlerini ve basın yazılarını yönetin.")}</p>
        </div>
        {canEdit && (
          <button onClick={() => router.push("/news/new")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 6, fontSize: 13, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg, var(--primary), var(--primary-container))", border: "none", cursor: "pointer" }}>
            <Icon name="add" style={{ fontSize: 18 }} />{t("Create New Article", "Yeni Haber Oluştur")}
          </button>
        )}
      </div>
      {/* Language Toggle for Listing */}
      {langs.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16, background: "var(--surface)", padding: 6, borderRadius: 10, width: "fit-content" }}>
          {langs.map(l => (
            <button
              key={l.code}
              onClick={() => setListLang(l.code)}
              style={{
                padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer",
                background: listLang === l.code ? "var(--primary)" : "transparent",
                color: listLang === l.code ? "#fff" : "var(--outline)",
                transition: "all .2s"
              }}
            >
              {l.code.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      <DataTable columns={[
        { key: "title", label: t("Article Details", "Haber Detayı"), render: n => loc(n.title, listLang) },
        { key: "slug", label: t("Slug", "Kısa Ad") },
        { key: "publishedAt", label: t("Published Date", "Yayın Tarihi"), width: "140px", render: n => n.publishedAt ? new Date(n.publishedAt).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US", { month: "short", day: "numeric", year: "numeric" }) : "—" },
        { key: "isPublished", label: t("Status", "Durum"), width: "130px", render: n => <span style={{ display: "inline-flex", padding: "4px 12px", borderRadius: 9999, fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, background: n.isPublished ? "var(--secondary-container)" : "var(--warning-container)", color: n.isPublished ? "var(--on-secondary)" : "var(--warning)" }}>{n.isPublished ? t("Published", "Yayında") : t("Drafting", "Taslak")}</span> },
      ]} data={data} loading={loading} error={error} getRowId={n => n.id}
        onEdit={canEdit ? (id => router.push(`/news/${id}`)) : undefined}
        onDelete={canDelete ? (async id => {
          const ok = await confirm({
            title: t("Delete Article", "Haberi Sil"),
            description: t("Delete this article? This action cannot be undone.", "Bu haber silinsin mi? Bu işlem geri alınamaz."),
            confirmLabel: t("Delete", "Sil"),
            variant: "danger",
          });
          if (!ok) return;
          const r = await cmsApi.deleteNews(id);
          if (r.success) { toast(t("Article deleted successfully.", "Haber silindi."), "success"); load(page); }
          else toast(r.message || t("Failed to delete article.", "Haber silinemedi."), "error");
        }) : undefined}
        emptyIcon="newspaper" emptyMessage={t("No articles yet.", "Henüz haber yok.")}
      />
      <Pagination page={page} totalPages={totalPages} totalCount={totalCount} onPageChange={setPage} />
    </div>
  );
}
