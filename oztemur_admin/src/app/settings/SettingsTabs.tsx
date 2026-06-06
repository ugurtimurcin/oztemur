"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import Icon from "@/components/Icon";

/**
 * Tab row shared by every /settings/* page. Add a new entry here whenever a
 * new settings subpage lands — that keeps the tabs in lock-step everywhere.
 */
export default function SettingsTabs() {
  const { t } = useI18n();
  const pathname = usePathname();

  const tabs = [
    { href: "/settings",       icon: "language", label: t("Languages", "Diller") },
    { href: "/settings/email", icon: "mail",     label: t("Email", "E-posta") },
  ];

  return (
    <div style={{ display: "flex", gap: 4, borderBottom: "1px solid rgba(198,197,212,0.2)", marginBottom: 32 }}>
      {tabs.map(tab => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "12px 20px",
              fontSize: 13, fontWeight: 600,
              color: isActive ? "var(--primary)" : "var(--on-surface-variant)",
              borderBottom: isActive ? "2px solid var(--primary)" : "2px solid transparent",
              marginBottom: -1,
              textDecoration: "none",
              transition: "color .2s, border-color .2s",
            }}
          >
            <Icon name={tab.icon} style={{ fontSize: 18 }} />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
