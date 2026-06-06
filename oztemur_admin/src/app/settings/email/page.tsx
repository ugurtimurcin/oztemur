"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { emailSettingsApi, type EmailProfileDto, type EmailRoutingDto } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { useI18n } from "@/lib/i18n";
import Icon from "@/components/Icon";
import SettingsTabs from "../SettingsTabs";

const cardStyle: React.CSSProperties = { background: "var(--surface-lowest)", borderRadius: 12, padding: "24px 28px", boxShadow: "var(--shadow-ambient)", marginBottom: 20 };
const sectionTitle: React.CSSProperties = { fontFamily: "'Manrope',sans-serif", fontSize: 15, fontWeight: 700, color: "var(--primary)", display: "flex", alignItems: "center", gap: 8, marginBottom: 20 };
const lbl: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--outline)", marginBottom: 6 };
const selectBase: React.CSSProperties = { width: "100%", padding: "12px 16px", borderRadius: 8, fontSize: 14, background: "var(--surface)", color: "var(--on-surface)", border: "1px solid rgba(198,197,212,0.3)", outline: "none", cursor: "pointer" };

const PURPOSES: { key: keyof EmailRoutingDto; label: [string, string]; description: [string, string]; icon: string }[] = [
  {
    key: "passwordResetProfileId",
    icon: "lock",
    label: ["Password reset", "Şifre sıfırlama"],
    description: ["Account recovery emails sent to admin users.", "Hesap kurtarma mailleri admin kullanıcılarına gönderilir."],
  },
  {
    key: "contactReplyProfileId",
    icon: "mail",
    label: ["Contact reply", "İletişim cevabı"],
    description: ["Replies to visitors who used the contact form.", "İletişim formundan gelen ziyaretçilere yanıtlar."],
  },
  {
    key: "applicationReplyProfileId",
    icon: "work",
    label: ["Application reply", "Başvuru cevabı"],
    description: ["Responses to job applicants — invites, rejections.", "İş başvurusu yapanlara cevaplar — davet, ret."],
  },
  {
    key: "adminNotificationProfileId",
    icon: "notifications",
    label: ["Admin notifications", "Admin bildirimleri"],
    description: ["Outbound mirror of in-app alerts — new message, new application, failed login.", "Panel içi bildirimlerin maile mirror'ı — yeni mesaj, yeni başvuru, hatalı giriş."],
  },
];

export default function EmailLandingPage() {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const tr = locale === "tr";

  const [profiles, setProfiles] = useState<EmailProfileDto[]>([]);
  const [routing, setRouting] = useState<EmailRoutingDto>({ passwordResetProfileId: null, contactReplyProfileId: null, applicationReplyProfileId: null, adminNotificationProfileId: null });
  const [loading, setLoading] = useState(true);
  const [savingRouting, setSavingRouting] = useState(false);

  const load = async () => {
    const [p, r] = await Promise.all([emailSettingsApi.listProfiles(), emailSettingsApi.getRouting()]);
    if (p.success && p.data) setProfiles(p.data);
    if (r.success && r.data) setRouting(r.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const deleteProfile = async (p: EmailProfileDto) => {
    const ok = await confirm({
      title: t("Delete profile", "Profili sil"),
      description: t(
        `"${p.name}" profilini silmek istediğinize emin misiniz? Bu profile bağlı yönlendirmeler boşa düşer.`,
        `"${p.name}" profilini silmek istediğinize emin misiniz? Bu profile bağlı yönlendirmeler boşa düşer.`
      ),
      confirmLabel: t("Delete", "Sil"),
      variant: "danger",
    });
    if (!ok || !p.id) return;
    const r = await emailSettingsApi.deleteProfile(p.id);
    if (r.success) { toast(t("Profile deleted.", "Profil silindi."), "success"); load(); }
    else toast(r.message || t("Delete failed.", "Silme başarısız."), "error");
  };

  const updateRouting = async (key: keyof EmailRoutingDto, profileId: string | null) => {
    const next = { ...routing, [key]: profileId };
    setRouting(next);
    setSavingRouting(true);
    const r = await emailSettingsApi.saveRouting(next);
    if (r.success) toast(t("Routing updated.", "Yönlendirme güncellendi."), "success");
    else toast(r.message || t("Save failed.", "Kaydetme başarısız."), "error");
    setSavingRouting(false);
  };

  if (loading) return (
    <div style={{ maxWidth: 760 }}>
      <SettingsTabs />
      <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2.5px solid var(--primary-fixed)", borderTopColor: "var(--primary)", animation: "spin .8s linear infinite" }} />
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 760 }}>
      <SettingsTabs />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, marginBottom: 28 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontFamily: "'Manrope',sans-serif", fontSize: 28, fontWeight: 800, color: "var(--primary)" }}>{t("Email Settings", "E-posta Ayarları")}</h1>
          <p style={{ fontSize: 14, color: "var(--on-surface-variant)", marginTop: 4 }}>
            {t(
              "Define one or more SMTP profiles, then route each email purpose to a profile. The same profile can handle every purpose, or each can use its own.",
              "Bir veya daha fazla SMTP profili tanımlayın, ardından her e-posta amacını bir profile yönlendirin. Tek profil tüm amaçlara hizmet edebilir veya her amaç kendi profiliyle çalışabilir."
            )}
          </p>
        </div>
        <Link href="/settings/email/profiles/new"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg, var(--primary), var(--primary-container))", textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0, boxShadow: "0 4px 14px rgba(0,6,102,0.18)" }}>
          <Icon name="add" style={{ fontSize: 18 }} />
          {t("Add Profile", "Profil Ekle")}
        </Link>
      </div>

      {/* Profiles */}
      <div style={cardStyle}>
        <div style={sectionTitle}>
          <Icon name="dns" style={{ fontSize: 20, color: "var(--primary)" }} />
          {t("SMTP Profiles", "SMTP Profilleri")}
        </div>

        {profiles.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--outline)" }}>
            <Icon name="mail" style={{ fontSize: 48, opacity: 0.3, display: "block", marginInline: "auto", marginBottom: 12 }} />
            <p style={{ fontWeight: 600, marginBottom: 4 }}>{t("No profiles yet.", "Henüz profil yok.")}</p>
            <p style={{ fontSize: 13 }}>{t("Add a profile to start sending email.", "Mail göndermek için profil ekleyin.")}</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "rgba(198,197,212,0.18)" }}>
            {profiles.map(p => (
              <div key={p.id!} style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", background: "var(--surface-lowest)" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.isEnabled ? "var(--success, #2e7d32)" : "var(--outline-variant)", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--on-surface)" }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: "var(--on-surface-variant)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {p.fromEmail || "—"} · {p.smtpHost || "—"}:{p.smtpPort}
                  </div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", padding: "4px 10px", borderRadius: 9999, background: p.isEnabled ? "rgba(46,125,50,0.1)" : "rgba(198,197,212,0.2)", color: p.isEnabled ? "var(--success, #2e7d32)" : "var(--outline)" }}>
                  {p.isEnabled ? t("Active", "Aktif") : t("Draft", "Taslak")}
                </span>
                <Link href={`/settings/email/profiles/${p.id}`} style={{ display: "inline-flex", alignItems: "center", padding: 8, color: "var(--on-surface-variant)", textDecoration: "none" }}>
                  <Icon name="edit" style={{ fontSize: 18 }} />
                </Link>
                <button onClick={() => deleteProfile(p)} style={{ display: "inline-flex", alignItems: "center", padding: 8, color: "var(--error)", background: "none", border: "none", cursor: "pointer" }}>
                  <Icon name="delete" style={{ fontSize: 18 }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Routing */}
      <div style={cardStyle}>
        <div style={sectionTitle}>
          <Icon name="category" style={{ fontSize: 20, color: "var(--primary)" }} />
          {t("Routing", "Yönlendirme")}
        </div>
        <p style={{ fontSize: 13, color: "var(--on-surface-variant)", marginBottom: 20 }}>
          {t(
            "Pick which profile handles each kind of email. Leave a row blank to disable that type of email entirely.",
            "Her e-posta türünü hangi profilin işleyeceğini seçin. Bir satırı boş bırakırsanız o tür e-posta hiç gönderilmez."
          )}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {PURPOSES.map(p => (
            <div key={p.key} style={{ display: "grid", gridTemplateColumns: "auto 1fr 280px", gap: 16, alignItems: "center" }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(0,6,102,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name={p.icon} style={{ fontSize: 18, color: "var(--primary)" }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--on-surface)" }}>{tr ? p.label[1] : p.label[0]}</div>
                <div style={{ fontSize: 12, color: "var(--on-surface-variant)", marginTop: 2 }}>{tr ? p.description[1] : p.description[0]}</div>
              </div>
              <select
                value={routing[p.key] ?? ""}
                onChange={e => updateRouting(p.key, e.target.value || null)}
                disabled={savingRouting || profiles.length === 0}
                style={selectBase}
              >
                <option value="">{t("— Not sent —", "— Gönderilmiyor —")}</option>
                {profiles.map(prof => (
                  <option key={prof.id!} value={prof.id!} disabled={!prof.isEnabled}>
                    {prof.name}{!prof.isEnabled ? ` · ${t("draft", "taslak")}` : ""}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
