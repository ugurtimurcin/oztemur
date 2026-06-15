/* ═══════════════════════════════════════════════
   AdminShell — Sidebar + Top Bar wrapper
   "Architectural Light" layout using native CSS
   ═══════════════════════════════════════════════ */
"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/AuthContext";
import { useI18n } from "@/lib/i18n";
import NotificationBell from "@/components/NotificationBell";
import LangSwitch from "@/components/LangSwitch";
import Icon from "@/components/Icon";

interface NavItem {
  label: string;
  labelTr: string;
  href: string;
  icon: string;
  // Extra path prefixes that should also light this entry up.
  // Used when sub-routes live outside the primary href.
  alsoActiveOn?: string[];
  // Permission required to see this entry. Omit for always-visible items.
  perm?: string;
}

interface NavGroup {
  /** Group heading — null for the top group (Dashboard) which has none. */
  headingEn: string | null;
  headingTr: string | null;
  items: NavItem[];
}

// Sidebar is organised into four mental buckets — Content (what visitors
// see), Inbox (what visitors send us), Site Strings (translation surface),
// System (admin-of-the-admin). A group is hidden entirely when the user
// has no permission for any of its items.
const NAV_GROUPS: NavGroup[] = [
  { headingEn: null, headingTr: null, items: [
    { label: "Dashboard",    labelTr: "Panel",            href: "/",                          icon: "dashboard" },
  ]},
  { headingEn: "Content", headingTr: "İçerik", items: [
    { label: "Companies",    labelTr: "Şirketler",        href: "/companies",                 icon: "business",        perm: "companies.view" },
    { label: "Projects",     labelTr: "Projeler",         href: "/projects",                  icon: "foundation",      perm: "projects.view" },
    { label: "Leadership",   labelTr: "Yönetim Kadrosu",  href: "/leadership",                icon: "groups",          perm: "leadership.view" },
    { label: "News",         labelTr: "Haberler",         href: "/news",                      icon: "newspaper",       perm: "news.view" },
    { label: "Blog",         labelTr: "Blog",             href: "/blog",                      icon: "edit_note",       perm: "blog.view" },
  ]},
  { headingEn: "Inbox", headingTr: "Etkileşim", items: [
    { label: "Messages",     labelTr: "Mesajlar",         href: "/messages",                  icon: "mail",            perm: "messages.view" },
    { label: "Careers",      labelTr: "Kariyer İlanları", href: "/careers",                   icon: "work",            perm: "careers.view" },
    { label: "Applications", labelTr: "Başvurular",       href: "/applications",              icon: "assignment_ind",  perm: "applications.view" },
  ]},
  { headingEn: "Site Strings", headingTr: "Site Metinleri", items: [
    { label: "Page Content", labelTr: "Sayfa İçeriği",    href: "/site-content/pages",        icon: "view_quilt",      perm: "sitecontent.view", alsoActiveOn: ["/site-content/sections"] },
    { label: "UI Strings",   labelTr: "Arayüz Metinleri", href: "/site-content/ui-strings",   icon: "translate",       perm: "sitecontent.view" },
    { label: "Translations", labelTr: "Çeviri Aktarımı",  href: "/translations",              icon: "language",        perm: "sitecontent.edit" },
  ]},
  { headingEn: "System", headingTr: "Sistem", items: [
    { label: "Users",        labelTr: "Kullanıcılar",     href: "/users",                     icon: "manage_accounts", perm: "users.view" },
    { label: "Audit Log",    labelTr: "Denetim Kaydı",    href: "/audit-log",                 icon: "history",         perm: "audit.view" },
    { label: "Settings",     labelTr: "Ayarlar",          href: "/settings",                  icon: "settings",        perm: "settings.view" },
  ]},
];

export default function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const { t } = useI18n();
  const { loading, user, logout } = useAuth();

  // Pages that don't need auth — login + the password-reset flow. New
  // public routes must be added here or the guard below will bounce
  // unauthenticated visitors back to /login.
  const isPublicPath = path === "/login" || path === "/forgot-password" || path === "/reset-password";

  useEffect(() => {
    if (!loading && !user && !isPublicPath) router.replace("/login");
  }, [loading, user, isPublicPath, router]);

  if (isPublicPath) return <>{children}</>;
  if (loading || !user) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface)" }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid var(--primary-fixed)", borderTopColor: "var(--primary)", animation: "spin .8s linear infinite" }} />
    </div>
  );

  const initials = `${user.firstName[0]}${user.lastName[0]}`;
  const perms = user.permissions ?? [];
  // Per-group permission filtering. Drop empty groups so a permission set
  // that only sees "Settings" doesn't leave dangling "Content" headings.
  const visibleGroups = NAV_GROUPS
    .map(g => ({ ...g, items: g.items.filter(n => !n.perm || perms.includes(n.perm)) }))
    .filter(g => g.items.length > 0);
  // Heuristic label: anyone who can manage users is, in practice, an admin.
  const roleLabel = perms.includes("users.edit")
    ? t("Administrator", "Yönetici")
    : t("Team member", "Ekip üyesi");

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--surface)" }}>

      {/* ── Sidebar ─────────────────────────── */}
      <aside style={{ width: 250, minWidth: 250, flexShrink: 0, height: "100vh", position: "sticky", top: 0, display: "flex", flexDirection: "column", background: "var(--surface-low)", overflow: "hidden" }}>

        {/* Logo block */}
        <div style={{ padding: "28px 24px 16px" }}>
          <Image src="/logo-seffaf.png" alt="Öztemur Group" width={150} height={42} priority style={{ objectFit: "contain", height: "auto", width: "auto", maxWidth: 150 }} />
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.15em", color: "var(--outline)", marginTop: 8 }}>{t("Management Console", "Yönetim Konsolu")}</p>
        </div>

        {/* Nav links — grouped, with small caps headings between blocks. */}
        <nav style={{ flex: 1, padding: "8px 12px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
          {visibleGroups.map((g, gi) => (
            <div key={gi} style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: gi === 0 ? 0 : 14 }}>
              {g.headingTr && (
                <div style={{
                  padding: "6px 16px 4px",
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--outline)",
                }}>
                  {t(g.headingEn ?? "", g.headingTr)}
                </div>
              )}
              {g.items.map((n) => {
                const matchesPrimary = path === n.href || (n.href !== "/" && path.startsWith(n.href));
                const matchesExtra = n.alsoActiveOn?.some(p => path === p || path.startsWith(p + "/")) ?? false;
                const active = matchesPrimary || matchesExtra;
                return (
                  <Link key={n.href} href={n.href} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 16px", fontSize: 13, fontWeight: active ? 600 : 500,
                    borderRadius: 9999,
                    background: active ? "var(--primary-fixed)" : "transparent",
                    color: active ? "var(--on-primary-fixed)" : "var(--on-surface-variant)",
                    transition: "background .15s, color .15s",
                  }}>
                    <Icon name={n.icon} style={{ fontSize: 20, color: active ? "var(--primary)" : "var(--outline)" }} />
                    {t(n.label, n.labelTr)}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User block */}
        <div style={{ padding: "16px 16px 20px", borderTop: "1px solid rgba(198,197,212,0.15)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, background: "var(--primary)", color: "var(--on-primary)", flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--on-surface)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{user.firstName} {user.lastName}</p>
              <p style={{ fontSize: 11, color: "var(--outline)" }}>{roleLabel}</p>
            </div>
            <button onClick={async () => { await logout(); router.push("/login"); }} title={t("Sign out", "Çıkış yap")} style={{ padding: 6, cursor: "pointer", background: "none", border: "none", color: "var(--outline)", display: "flex" }}>
              <Icon name="logout" style={{ fontSize: 18 }} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>

        {/* Top bar */}
        <header style={{ position: "sticky", top: 0, zIndex: 30, height: 64, padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "flex-end", background: "var(--surface)" }}>
          {/* Right */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <LangSwitch />
            <NotificationBell />
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ textAlign: "right" as const }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--on-surface)" }}>{user.firstName} {user.lastName}</p>
                <p style={{ fontSize: 11, color: "var(--outline)" }}>{roleLabel}</p>
              </div>
              <div style={{ width: 38, height: 38, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, background: "linear-gradient(135deg, var(--primary), var(--primary-container))", color: "var(--on-primary)" }}>
                {initials}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: "8px 32px 48px" }} className="animate-fadeIn">
          {children}
        </main>
      </div>
    </div>
  );
}
