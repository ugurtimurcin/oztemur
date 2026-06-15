"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DataTable from "@/components/DataTable";
import Pagination from "@/components/Pagination";
import { careersApi, type JobApplicationDto, ApplicationStatus } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { safeExternalUrl } from "@/lib/url";
import Icon from "@/components/Icon";

const PAGE_SIZE = 25;

const statusColor: Record<ApplicationStatus, { color: string; bg: string }> = {
  [ApplicationStatus.Pending]:      { color: "#6b7280", bg: "#f3f4f6" },
  [ApplicationStatus.Reviewed]:     { color: "#1d4ed8", bg: "#dbeafe" },
  [ApplicationStatus.Shortlisted]:  { color: "#6d28d9", bg: "#ede9fe" },
  [ApplicationStatus.Interviewing]: { color: "#1e40af", bg: "#dbeafe" },
  [ApplicationStatus.Offered]:      { color: "#4338ca", bg: "#e0e7ff" },
  [ApplicationStatus.Hired]:        { color: "#15803d", bg: "#dcfce3" },
  [ApplicationStatus.Rejected]:     { color: "#b91c1c", bg: "#fee2e2" },
};

function getInitials(name: string) {
  if (!name) return "??";
  return name.split(" ").filter(n => n.length > 0).map(n => n[0]).join("").substring(0, 3).toUpperCase();
}

export default function ApplicationsPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [data, setData] = useState<JobApplicationDto[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const statusLabel = (s: ApplicationStatus): string => {
    switch (s) {
      case ApplicationStatus.Pending:      return t("Pending", "Beklemede");
      case ApplicationStatus.Reviewed:     return t("Reviewed", "İncelendi");
      case ApplicationStatus.Shortlisted:  return t("Shortlisted", "Ön Elemede");
      case ApplicationStatus.Interviewing: return t("Interviewing", "Görüşmede");
      case ApplicationStatus.Offered:      return t("Offered", "Teklif Verildi");
      case ApplicationStatus.Hired:        return t("Hired", "İşe Alındı");
      case ApplicationStatus.Rejected:     return t("Rejected", "Reddedildi");
      default:                             return String(s);
    }
  };

  const load = useCallback(async (p: number) => {
    setLoading(true);
    const r = await careersApi.getApplications(p, PAGE_SIZE);
    if (r.success && r.data) {
      setData(r.data.items);
      setTotalCount(r.data.totalCount);
      setTotalPages(Math.max(1, Math.ceil(r.data.totalCount / r.data.pageSize)));
    } else setError(r.message || t("Failed to load.", "Yüklenemedi."));
    setLoading(false);
  }, [t]);

  useEffect(() => { load(page); }, [load, page]);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 40 }}>
      {/* Header Area */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'Manrope',sans-serif", fontSize: 32, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>{t("Applications", "Başvurular")}</h1>
          <p style={{ fontSize: 14, color: "#6b7280", marginTop: 4 }}>{t("Manage and review incoming candidate applications across all active positions.", "Tüm açık pozisyonlara gelen aday başvurularını yönetin ve inceleyin.")}</p>
        </div>
      </div>

      {/* Table Area */}
      <div style={{ background: "#ffffff", borderRadius: 12, border: "1px solid #f3f4f6", overflow: "hidden", padding: "16px 24px" }}>
        <DataTable
          columns={[
            {
              key: "candidateName",
              label: t("CANDIDATE", "ADAY"),
              render: a => (
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%", background: "#e0e7ff", color: "#3730a3",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700
                  }}>
                    {getInitials(a.candidateName)}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontWeight: 600, color: "#111827", fontSize: 14 }}>{a.candidateName}</span>
                  </div>
                </div>
              )
            },
            {
              key: "jobTitle",
              label: t("POSITION", "POZİSYON"),
              render: a => (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontWeight: 600, color: "#374151", fontSize: 14 }}>{a.jobTitle || t("Unknown Role", "Bilinmeyen Pozisyon")}</span>
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>{t("Ref", "Ref")} #{a.jobReferenceCode?.split("-")[1] || "0000"}</span>
                </div>
              )
            },
            {
              key: "email",
              label: t("EMAIL / PORTFOLIO", "E-POSTA / PORTFÖY"),
              render: a => (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ color: "#4b5563", fontSize: 13 }}>{a.email}</span>
                  {(() => {
                    const safeUrl = safeExternalUrl(a.linkedInUrl);
                    return safeUrl ? (
                      <a href={safeUrl} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#4338ca", fontSize: 12, textDecoration: "none" }}>
                        <Icon name="link" style={{ fontSize: 14 }} /> {t("LinkedIn profile", "LinkedIn profili")}
                      </a>
                    ) : (
                      <span style={{ fontSize: 12, color: "#9ca3af", fontStyle: "italic" }}>{t("No portfolio provided", "Portföy belirtilmemiş")}</span>
                    );
                  })()}
                </div>
              )
            },
            {
              key: "createdAt",
              label: t("DATE APPLIED", "BAŞVURU TARİHİ"),
              width: "120px",
              render: a => (
                <div style={{ display: "flex", flexDirection: "column", gap: 2, color: "#4b5563", fontSize: 13 }}>
                  <span>{new Date(a.createdAt).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US", { month: "short", day: "numeric" })},</span>
                  <span>{new Date(a.createdAt).getFullYear()}</span>
                </div>
              )
            },
            {
              key: "status",
              label: t("STATUS", "DURUM"),
              width: "140px",
              render: a => {
                const cfg = statusColor[a.status] || statusColor[ApplicationStatus.Pending];
                return (
                  <span style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    padding: "4px 12px", borderRadius: 9999, fontSize: 12, fontWeight: 600,
                    color: cfg.color, backgroundColor: cfg.bg
                  }}>
                    {statusLabel(a.status)}
                  </span>
                );
              }
            },
            {
              key: "actions",
              label: t("ACTIONS", "İŞLEMLER"),
              width: "80px",
              render: a => (
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); router.push(`/applications/${a.id}`); }}
                    style={{
                      background: "transparent", border: "none", cursor: "pointer",
                      color: "#9ca3af", padding: 6, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center"
                    }}
                    title={t("Options", "Seçenekler")}
                  >
                    <Icon name="more_vert" style={{ fontSize: 20 }} />
                  </button>
                </div>
              )
            }
          ]}
          data={data}
          loading={loading}
          error={error}
          getRowId={a => a.id}
          onRowClick={(a) => router.push(`/applications/${a.id}`)}
          emptyIcon="assignment_ind"
          emptyMessage={t("No applications received yet.", "Henüz başvuru alınmadı.")}
        />
      </div>
      <Pagination page={page} totalPages={totalPages} totalCount={totalCount} onPageChange={setPage} />
      <style dangerouslySetInnerHTML={{
        __html: `
        th { font-family: 'Manrope', sans-serif !important; font-size: 13px !important; font-weight: 700 !important; color: var(--outline) !important; letter-spacing: 0.05em; text-transform: uppercase; padding-bottom: 24px !important; border-bottom: none !important; }
        td { border-bottom: none !important; padding: 16px 16px !important; }
        tbody tr { cursor: pointer; transition: background 0.3s ease, transform 0.2s ease; border-radius: 8px; }
        tbody tr:hover { background: var(--surface-low) !important; transform: scale(0.995); }
        .table-container table { border-collapse: separate; border-spacing: 0 8px; }
      `}} />
    </div>
  );
}
