"use client";

import { useEffect, useState } from "react";
import { cmsApi, careersApi, commsApi, auditApi, type AuditLogDto } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import Icon from "@/components/Icon";

export default function DashboardPage() {
  const { t, locale } = useI18n();
  const [stats, setStats] = useState({ companies: 0, jobs: 0, messages: 0, applications: 0 });
  const [activity, setActivity] = useState<AuditLogDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Each card / feed is an independent count — fetch in parallel.
      const [c, j, m, a, log] = await Promise.all([
        cmsApi.getCompanies(1, 1),
        careersApi.getJobs(1, 1),
        commsApi.getMessages(1, 1),
        careersApi.getApplications(1, 1),
        auditApi.list(1, 6),
      ]);
      setStats({
        companies: c.data?.totalCount ?? 0,
        jobs: j.data?.totalCount ?? 0,
        messages: m.data?.totalCount ?? 0,
        applications: a.data?.totalCount ?? 0,
      });
      if (log.success && log.data) setActivity(log.data.items);
      setLoading(false);
    })();
  }, []);

  const cards = [
    { label: t("COMPANIES", "ŞİRKETLER"),       value: stats.companies,    icon: "business" },
    { label: t("JOB POSTINGS", "İŞ İLANLARI"),  value: stats.jobs,         icon: "work" },
    { label: t("MESSAGES", "MESAJLAR"),         value: stats.messages,     icon: "mail" },
    { label: t("APPLICATIONS", "BAŞVURULAR"),   value: stats.applications, icon: "assignment_ind" },
  ];

  // ── Audit action → visual + label ──
  const actionMeta = (action: string) => {
    const a = action.toUpperCase();
    if (a === "INSERT")
      return { icon: "add", color: "#1b7d3e", bg: "rgba(27,125,62,.08)", label: t("Created", "Oluşturuldu") };
    if (a === "UPDATE")
      return { icon: "edit", color: "#2563eb", bg: "rgba(37,99,235,.08)", label: t("Updated", "Güncellendi") };
    return { icon: "delete", color: "#b3261e", bg: "rgba(179,38,30,.08)", label: t("Deleted", "Silindi") };
  };

  // ── PascalCase table name → friendly TR/EN label ──
  const tableLabel = (table: string): string => {
    const tr = locale === "tr";
    const map: Record<string, [string, string]> = {
      Companies:         ["Companies",         "Şirketler"],
      NewsArticles:      ["News",              "Haberler"],
      BlogPosts:         ["Blog",              "Blog"],
      LeadershipMembers: ["Leadership",        "Yönetim Kadrosu"],
      Projects:          ["Projects",          "Projeler"],
      JobRequisitions:   ["Jobs",              "İş İlanları"],
      JobApplications:   ["Applications",      "Başvurular"],
      ContactMessages:   ["Messages",          "Mesajlar"],
      Users:             ["Users",             "Kullanıcılar"],
      PageSections:      ["Page Sections",     "Sayfa Bölümleri"],
      UiStrings:         ["UI Strings",        "Arayüz Metinleri"],
      Languages:         ["Languages",         "Diller"],
    };
    const entry = map[table];
    return entry ? (tr ? entry[1] : entry[0]) : table;
  };

  // userDisplay falls back to a raw UUID when the audit row has no resolvable
  // account — hide that case rather than dumping a UUID into the feed.
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const userLabel = (row: AuditLogDto): string => {
    const v = row.userDisplay ?? row.userId ?? "";
    if (!v || UUID_RE.test(v) || v === "System-Anonymous") return t("System", "Sistem");
    return v;
  };

  // ── Relative timestamp ──
  const relTime = (iso: string): string => {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    const tr = locale === "tr";
    if (min < 1) return tr ? "az önce" : "just now";
    if (min < 60) return tr ? `${min} dk önce` : `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return tr ? `${hr} sa önce` : `${hr}h ago`;
    const day = Math.floor(hr / 24);
    if (day < 7) return tr ? `${day} gün önce` : `${day}d ago`;
    return new Date(iso).toLocaleDateString(tr ? "tr-TR" : "en-GB", { day: "2-digit", month: "short" });
  };

  const quickActions = [
    { label: t("Add Company", "Şirket Ekle"),       href: "/companies/new", icon: "add_business" },
    { label: t("New Job Posting", "Yeni İlan"),     href: "/careers/new",   icon: "post_add" },
    { label: t("Create Article", "Haber Oluştur"),  href: "/news/new",      icon: "edit_note" },
    { label: t("Write Blog Post", "Blog Yazısı Yaz"), href: "/blog/new",    icon: "article" },
    { label: t("Add Project", "Proje Ekle"),        href: "/projects/new",  icon: "architecture" },
    { label: t("Add User", "Kullanıcı Ekle"),       href: "/users/new",     icon: "person_add" },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "'Manrope',sans-serif", fontSize: 28, fontWeight: 800, color: "var(--primary)", letterSpacing: "-0.02em" }}>{t("Workspace Overview", "Çalışma Alanı Özeti")}</h1>
        <p style={{ fontSize: 14, color: "var(--on-surface-variant)", marginTop: 6 }}>
          <strong style={{ color: "var(--primary)" }}>öztemur-admin</strong> · {new Date().toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        {cards.map(c => (
          <div key={c.label} style={{ background: "var(--surface-lowest)", borderRadius: 8, padding: "24px 28px", boxShadow: "var(--shadow-soft)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.05em", color: "var(--outline)" }}>{c.label}</p>
              <Icon name={c.icon} style={{ fontSize: 18, color: "var(--outline-variant)" }} />
            </div>
            {loading
              ? <div style={{ width: 48, height: 32, borderRadius: 6, background: "var(--surface-low)", animation: "pulse 1.5s ease-in-out infinite" }} />
              : <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 32, fontWeight: 800, color: "var(--primary)" }}>{c.value}</p>
            }
          </div>
        ))}
      </div>

      {/* Activity + Sidebar */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 20 }}>
        {/* Recent Activity */}
        <div>
          <h2 style={{ fontFamily: "'Manrope',sans-serif", fontSize: 20, fontWeight: 700, color: "var(--primary)", marginBottom: 16 }}>{t("Recent Activity", "Son Aktiviteler")}</h2>
          <div style={{ background: "var(--surface-lowest)", borderRadius: 8, padding: "8px 24px", boxShadow: "var(--shadow-soft)" }}>
            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid var(--primary-fixed)", borderTopColor: "var(--primary)", animation: "spin .8s linear infinite" }} />
              </div>
            ) : activity.length === 0 ? (
              <div style={{ textAlign: "center", padding: "44px 0", color: "var(--outline)" }}>
                <Icon name="history" style={{ fontSize: 32, opacity: 0.35, display: "block", marginInline: "auto", marginBottom: 6 }} />
                <p style={{ fontSize: 13, fontWeight: 500 }}>{t("No recent activity yet.", "Henüz aktivite yok.")}</p>
              </div>
            ) : (
              activity.map((row, i) => {
                const m = actionMeta(row.action);
                return (
                  <div key={row.id} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "18px 0", borderTop: i ? "1px solid rgba(198,197,212,.12)" : "none" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: m.bg, flexShrink: 0 }}>
                      <Icon name={m.icon} style={{ fontSize: 20, color: m.color }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "var(--on-surface)" }}>{m.label} · {tableLabel(row.tableName)}</p>
                      <p style={{ fontSize: 12, color: "var(--on-surface-variant)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {userLabel(row)}
                      </p>
                    </div>
                    <p style={{ fontSize: 12, fontWeight: 500, color: "var(--on-surface-variant)", flexShrink: 0 }}>{relTime(row.timestamp)}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right column */}
        <div>
          <h2 style={{ fontFamily: "'Manrope',sans-serif", fontSize: 20, fontWeight: 700, color: "var(--primary)", marginBottom: 16 }}>{t("Quick Actions", "Hızlı İşlemler")}</h2>
          <div style={{ background: "var(--surface-lowest)", borderRadius: 8, padding: "8px 24px", boxShadow: "var(--shadow-soft)" }}>
            {quickActions.map(a => (
              <a key={a.label} href={a.href} style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0", fontSize: 13, fontWeight: 500, color: "var(--on-surface-variant)" }}>
                <Icon name={a.icon} style={{ fontSize: 18, color: "var(--outline)" }} />{a.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
