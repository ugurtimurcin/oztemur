"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import { emailSettingsApi, getStoredUser, type EmailProfileDto } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { useI18n } from "@/lib/i18n";
import Icon from "@/components/Icon";
import { FormField, getValidatedInputStyle } from "@/components/FormValidation";
import SettingsTabs from "../../../SettingsTabs";

const PASSWORD_MASK = "__UNCHANGED__";

const cardStyle: React.CSSProperties = { background: "var(--surface-lowest)", borderRadius: 12, padding: "28px 32px", boxShadow: "var(--shadow-ambient)", marginBottom: 20 };
const sectionTitle: React.CSSProperties = { fontFamily: "'Manrope',sans-serif", fontSize: 15, fontWeight: 700, color: "var(--primary)", display: "flex", alignItems: "center", gap: 8, marginBottom: 24 };
const lbl: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--outline)", marginBottom: 6 };
const inputBase: React.CSSProperties = { width: "100%", padding: "12px 16px", borderRadius: 8, fontSize: 14, background: "var(--surface)", color: "var(--on-surface)", border: "1px solid rgba(198,197,212,0.3)", outline: "none", transition: "border-color .2s" };
const iconInput: React.CSSProperties = { ...inputBase, paddingLeft: 42 };
const hint: React.CSSProperties = { fontSize: 11, color: "var(--outline-variant)", marginTop: 4 };

const empty: EmailProfileDto = {
  id: null, name: "",
  smtpHost: "", smtpPort: 587, smtpUsername: "", smtpPassword: "",
  useSsl: true, fromEmail: "", fromName: "", isEnabled: false, hasPassword: false,
};

export default function EmailProfileFormPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const isNew = id === "new";

  const [form, setForm] = useState<EmailProfileDto>(empty);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [pwTouched, setPwTouched] = useState(false);
  const [showFieldErrors, setShowFieldErrors] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testTo, setTestTo] = useState("");

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const fieldErrors = {
    name:      !form.name.trim(),
    smtpHost:  !form.smtpHost.trim(),
    smtpPort:  !(form.smtpPort > 0 && form.smtpPort <= 65535),
    fromEmail: !form.fromEmail.trim() || !emailRe.test(form.fromEmail.trim()),
  };
  const allRequiredFilled = !fieldErrors.name && !fieldErrors.smtpHost && !fieldErrors.smtpPort && !fieldErrors.fromEmail;

  useEffect(() => {
    if (isNew) return;
    emailSettingsApi.getProfile(id).then(r => {
      if (r.success && r.data) {
        setForm({ ...r.data, smtpPassword: r.data.hasPassword ? PASSWORD_MASK : "" });
      } else {
        toast(t("Profile not found.", "Profil bulunamadı."), "error");
        router.push("/settings/email");
      }
      setLoading(false);
    });
  }, [id, isNew]);

  const set = <K extends keyof EmailProfileDto>(k: K, v: EmailProfileDto[K]) => {
    setForm(f => ({ ...f, [k]: v }));
    if (showFieldErrors) setShowFieldErrors(false);
  };

  const onPasswordFocus = () => {
    if (form.smtpPassword === PASSWORD_MASK && !pwTouched) {
      setPwTouched(true);
      set("smtpPassword", "");
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!allRequiredFilled) {
      setShowFieldErrors(true);
      toast(t("Please fill the required fields.", "Lütfen zorunlu alanları doldurun."), "warning");
      return;
    }
    setShowFieldErrors(false);
    setSaving(true);
    const payload: EmailProfileDto = {
      ...form,
      smtpPassword: pwTouched ? form.smtpPassword : (form.hasPassword ? PASSWORD_MASK : form.smtpPassword),
    };
    const r = isNew
      ? await emailSettingsApi.createProfile(payload)
      : await emailSettingsApi.updateProfile(id, payload);
    if (r.success) {
      toast(isNew ? t("Profile created.", "Profil oluşturuldu.") : t("Profile updated.", "Profil güncellendi."), "success");
      setTimeout(() => router.push("/settings/email"), 600);
    } else {
      toast(r.message || t("Save failed.", "Kaydetme başarısız."), "error");
    }
    setSaving(false);
  };

  const deleteThis = async () => {
    const ok = await confirm({
      title: t("Delete profile", "Profili sil"),
      description: t(`"${form.name}" profilini silmek istediğinize emin misiniz?`, `"${form.name}" profilini silmek istediğinize emin misiniz?`),
      confirmLabel: t("Delete", "Sil"),
      variant: "danger",
    });
    if (!ok) return;
    const r = await emailSettingsApi.deleteProfile(id);
    if (r.success) { toast(t("Profile deleted.", "Profil silindi."), "success"); router.push("/settings/email"); }
    else toast(r.message || t("Delete failed.", "Silme başarısız."), "error");
  };

  const openTestModal = () => {
    if (!testTo) setTestTo(getStoredUser()?.email ?? "");
    setTestModalOpen(true);
  };

  const sendTest = async () => {
    if (!testTo.trim()) {
      toast(t("Recipient email is required.", "Alıcı e-posta gerekli."), "warning");
      return;
    }
    setTesting(true);
    const r = await emailSettingsApi.testProfile(id, testTo.trim());
    if (r.success) {
      toast(r.message || t("Test email sent.", "Test maili gönderildi."), "success");
      setTestModalOpen(false);
    } else {
      toast(r.message || t("Test failed.", "Test başarısız."), "error");
    }
    setTesting(false);
  };

  if (loading) return (
    <div style={{ maxWidth: 760 }}>
      <SettingsTabs />
      <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2.5px solid var(--primary-fixed)", borderTopColor: "var(--primary)", animation: "spin .8s linear infinite" }} />
      </div>
    </div>
  );

  const InputIcon = ({ name }: { name: string }) => (
    <Icon name={name} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 18, color: "var(--outline-variant)" }} />
  );

  // Test enabled only when toggle is on AND every required SMTP field is
  // filled — same rule as the live send.
  const canTest = !isNew && form.isEnabled && allRequiredFilled;
  const testTooltip = isNew
    ? t("Save the profile first.", "Önce profili kaydedin.")
    : !form.isEnabled
      ? t("Enable the profile first.", "Önce profili etkinleştirin.")
      : !allRequiredFilled
        ? t("Fill the required SMTP fields first.", "Önce zorunlu SMTP alanlarını doldurun.")
        : undefined;

  return (
    <div style={{ maxWidth: 760 }}>
      <SettingsTabs />

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--outline)", marginBottom: 8 }}>
        <button onClick={() => router.push("/settings/email")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--outline)", display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 500 }}>
          <Icon name="arrow_back" style={{ fontSize: 16 }} />{t("Email Settings", "E-posta Ayarları")}
        </button>
        <span style={{ color: "var(--outline-variant)" }}>/</span>
        <span style={{ color: "var(--on-surface-variant)", fontWeight: 500 }}>{isNew ? t("New", "Yeni") : t("Edit", "Düzenle")}</span>
      </div>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Manrope',sans-serif", fontSize: 28, fontWeight: 800, color: "var(--primary)" }}>
          {isNew ? t("New Email Profile", "Yeni E-posta Profili") : form.name || t("Edit Profile", "Profili Düzenle")}
        </h1>
      </div>

      <form onSubmit={submit}>
        {/* ─── Identity + toggle ────────────────────── */}
        <div style={cardStyle}>
          <div style={sectionTitle}>
            <Icon name="badge" style={{ fontSize: 20, color: "var(--primary)" }} />
            {t("Profile", "Profil")}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 20, alignItems: "start" }}>
            <FormField error={showFieldErrors && fieldErrors.name ? t("Required.", "Bu alan zorunlu.") : null}>
              <label style={lbl}>{t("Profile name", "Profil adı")} *</label>
              <div style={{ position: "relative" }}>
                <InputIcon name="title" />
                <input value={form.name} onChange={e => set("name", e.target.value)} placeholder={t("e.g. System, Careers, Contact", "ör. Sistem, Kariyer, İletişim")} style={getValidatedInputStyle(iconInput, showFieldErrors && fieldErrors.name)} />
              </div>
              <p style={hint}>{t("Shown in routing dropdowns.", "Yönlendirme seçimlerinde görünür.")}</p>
            </FormField>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
              <label style={lbl}>{t("Enabled", "Etkin")}</label>
              <button type="button" onClick={() => set("isEnabled", !form.isEnabled)}
                style={{ position: "relative", width: 48, height: 26, borderRadius: 9999, background: form.isEnabled ? "var(--primary)" : "var(--outline-variant)", border: "none", cursor: "pointer", transition: "background .2s" }}>
                <span style={{ position: "absolute", top: 3, left: form.isEnabled ? 24 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.15)", transition: "left .2s" }} />
              </button>
            </div>
          </div>
        </div>

        {/* ─── SMTP server ────────────────────────── */}
        <div style={cardStyle}>
          <div style={sectionTitle}>
            <Icon name="language" style={{ fontSize: 20, color: "var(--primary)" }} />
            {t("SMTP Server", "SMTP Sunucusu")}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
            <FormField error={showFieldErrors && fieldErrors.smtpHost ? t("Required.", "Bu alan zorunlu.") : null}>
              <label style={lbl}>{t("Host", "Sunucu")} *</label>
              <div style={{ position: "relative" }}>
                <InputIcon name="language" />
                <input value={form.smtpHost} onChange={e => set("smtpHost", e.target.value)} placeholder="smtp.gmail.com" style={getValidatedInputStyle(iconInput, showFieldErrors && fieldErrors.smtpHost)} />
              </div>
            </FormField>
            <FormField error={showFieldErrors && fieldErrors.smtpPort ? t("Valid port (1–65535).", "Geçerli port (1–65535).") : null}>
              <label style={lbl}>{t("Port", "Port")} *</label>
              <input type="number" value={form.smtpPort} onChange={e => set("smtpPort", Number(e.target.value) || 0)} style={getValidatedInputStyle(inputBase, showFieldErrors && fieldErrors.smtpPort)} />
              <p style={hint}>{t("587 STARTTLS · 465 SSL · 25 plain", "587 STARTTLS · 465 SSL · 25 düz")}</p>
            </FormField>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 20 }}>
            <div>
              <label style={lbl}>{t("Username", "Kullanıcı Adı")}</label>
              <div style={{ position: "relative" }}>
                <InputIcon name="person" />
                <input value={form.smtpUsername} onChange={e => set("smtpUsername", e.target.value)} placeholder="x@gmail.com" style={iconInput} autoComplete="off" />
              </div>
              <p style={hint}>{t("Leave blank for anonymous SMTP.", "Anonim SMTP için boş bırakın.")}</p>
            </div>
            <div>
              <label style={lbl}>{t("Password", "Şifre")}</label>
              <div style={{ position: "relative" }}>
                <InputIcon name="lock" />
                <input
                  type={showPw ? "text" : "password"}
                  value={form.smtpPassword}
                  onChange={e => { set("smtpPassword", e.target.value); setPwTouched(true); }}
                  onFocus={onPasswordFocus}
                  style={{ ...iconInput, paddingRight: 42 }}
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? "Hide" : "Show"}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--outline)" }}>
                  <Icon name={showPw ? "visibility_off" : "visibility"} style={{ fontSize: 18 }} />
                </button>
              </div>
              <p style={hint}>
                {form.hasPassword && !pwTouched
                  ? t("Saved. Type a new value to replace it.", "Kayıtlı. Değiştirmek için yeni değer girin.")
                  : t("Gmail/Outlook → uygulama şifresi kullanın.", "Gmail/Outlook → uygulama şifresi kullanın.")}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 20, padding: "10px 14px", background: "var(--surface)", borderRadius: 8 }}>
            <input type="checkbox" id="useSsl" checked={form.useSsl} onChange={e => set("useSsl", e.target.checked)} style={{ width: 16, height: 16, cursor: "pointer" }} />
            <label htmlFor="useSsl" style={{ fontSize: 13, color: "var(--on-surface)", cursor: "pointer" }}>
              {t("Use TLS/SSL", "TLS/SSL kullan")}
            </label>
          </div>
        </div>

        {/* ─── Sender identity ────────────────────── */}
        <div style={cardStyle}>
          <div style={sectionTitle}>
            <Icon name="mail" style={{ fontSize: 20, color: "var(--primary)" }} />
            {t("Sender", "Gönderici")}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <FormField error={showFieldErrors && fieldErrors.fromEmail ? t("Valid email required.", "Geçerli e-posta gerekli.") : null}>
              <label style={lbl}>{t("From Email", "Gönderici E-posta")} *</label>
              <div style={{ position: "relative" }}>
                <InputIcon name="mail" />
                <input type="email" value={form.fromEmail} onChange={e => set("fromEmail", e.target.value)} placeholder="info@oztemur.com" style={getValidatedInputStyle(iconInput, showFieldErrors && fieldErrors.fromEmail)} />
              </div>
            </FormField>
            <div>
              <label style={lbl}>{t("From Name", "Gönderici Adı")}</label>
              <div style={{ position: "relative" }}>
                <InputIcon name="badge" />
                <input value={form.fromName} onChange={e => set("fromName", e.target.value)} placeholder="Öztemur Group" style={iconInput} />
              </div>
            </div>
          </div>
        </div>

        {/* ─── Actions ────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 0", borderTop: "1px solid rgba(198,197,212,0.15)", gap: 12, marginTop: 4 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <button type="button" onClick={() => router.push("/settings/email")} disabled={saving}
              style={{ padding: "12px 24px", borderRadius: 8, fontSize: 13, fontWeight: 500, color: "var(--on-surface-variant)", background: "var(--surface-lowest)", border: "1px solid rgba(198,197,212,0.3)", cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="close" style={{ fontSize: 16 }} />{t("Cancel", "Vazgeç")}
            </button>
            {!isNew && (
              <button type="button" onClick={deleteThis}
                style={{ padding: "12px 24px", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "var(--error)", background: "var(--error-container)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="delete" style={{ fontSize: 16 }} />{t("Delete", "Sil")}
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button type="button" onClick={openTestModal} disabled={!canTest}
              title={testTooltip}
              style={{ padding: "12px 24px", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "var(--primary)", background: "var(--surface-lowest)", border: "1px solid var(--primary)", cursor: !canTest ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8, opacity: !canTest ? 0.5 : 1 }}>
              <Icon name="arrow_outward" style={{ fontSize: 16 }} />
              {t("Send test email", "Test maili gönder")}
            </button>
            <button type="submit" disabled={saving}
              style={{ padding: "12px 32px", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg, var(--primary), var(--primary-container))", border: "none", cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8, opacity: saving ? 0.6 : 1, boxShadow: "0 4px 14px rgba(0,6,102,0.18)" }}>
              {saving
                ? (<><span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .8s linear infinite", display: "inline-block" }} />{t("Saving…", "Kaydediliyor…")}</>)
                : (<><Icon name={isNew ? "add" : "check"} style={{ fontSize: 16 }} />{isNew ? t("Create", "Oluştur") : t("Save Changes", "Değişiklikleri Kaydet")}</>)}
            </button>
          </div>
        </div>
      </form>

      {/* ─── Test email modal ─────────────────────── */}
      {testModalOpen && (
        <div
          onClick={() => !testing && setTestModalOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(10,26,47,0.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
        >
          <form
            onClick={e => e.stopPropagation()}
            onSubmit={e => { e.preventDefault(); sendTest(); }}
            style={{ background: "var(--surface-lowest)", borderRadius: 12, padding: "28px 32px", boxShadow: "0 24px 60px rgba(10,26,47,0.25)", width: "100%", maxWidth: 440 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: "rgba(0,6,102,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="arrow_outward" style={{ fontSize: 20, color: "var(--primary)" }} />
              </div>
              <div>
                <h3 style={{ fontFamily: "'Manrope',sans-serif", fontSize: 17, fontWeight: 700, color: "var(--primary)" }}>{t("Send test email", "Test maili gönder")}</h3>
                <p style={{ fontSize: 12, color: "var(--on-surface-variant)", marginTop: 2 }}>{t(`Test with "${form.name}" profile.`, `"${form.name}" profili ile test.`)}</p>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>{t("Recipient email", "Alıcı e-posta")} *</label>
              <div style={{ position: "relative" }}>
                <Icon name="mail" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 18, color: "var(--outline-variant)" }} />
                <input type="email" value={testTo} onChange={e => setTestTo(e.target.value)} placeholder="adres@ornek.com" required autoFocus style={iconInput} />
              </div>
              <p style={hint}>{t("Any inbox you can check — typically your own.", "Eriştiğiniz herhangi bir kutu — genelde kendi adresiniz.")}</p>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" onClick={() => setTestModalOpen(false)} disabled={testing}
                style={{ padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 500, color: "var(--on-surface-variant)", background: "var(--surface)", border: "1px solid rgba(198,197,212,0.3)", cursor: testing ? "not-allowed" : "pointer" }}>
                {t("Cancel", "Vazgeç")}
              </button>
              <button type="submit" disabled={testing}
                style={{ padding: "10px 24px", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg, var(--primary), var(--primary-container))", border: "none", cursor: testing ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8, opacity: testing ? 0.6 : 1 }}>
                {testing
                  ? (<><span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .8s linear infinite", display: "inline-block" }} />{t("Sending…", "Gönderiliyor…")}</>)
                  : (<><Icon name="arrow_outward" style={{ fontSize: 16 }} />{t("Send", "Gönder")}</>)}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
