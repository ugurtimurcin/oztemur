"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import { cmsApi, settingsApi, loc, type LocalizedField, type LanguageDto } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import FileUpload from "@/components/FileUpload";
import { useFormValidation, FormField, getValidatedInputStyle, type ValidationSchema } from "@/components/FormValidation";
import { incompleteLocales, localeNames } from "@/lib/localizedValidation";
import LangTabBar from "@/components/LangTabBar";
import { useI18n } from "@/lib/i18n";
import Icon from "@/components/Icon";

interface FormState {
  name: LocalizedField; sector: LocalizedField; description: LocalizedField; detailedDescription: LocalizedField;
  address: LocalizedField;
  logoUrl: string; websiteUrl: string; contactEmail: string; phoneNumber: string; displayOrder: number; isActive: boolean;
}

const empty: FormState = { name: { en: "", tr: "" }, sector: { en: "", tr: "" }, description: { en: "", tr: "" }, detailedDescription: { en: "", tr: "" }, address: { en: "", tr: "" }, logoUrl: "", websiteUrl: "", contactEmail: "", phoneNumber: "", displayOrder: 0, isActive: true };

/* ─── Reusable style tokens ────────────────────── */
const sectionCard: React.CSSProperties = { background: "var(--surface-lowest)", borderRadius: 12, padding: "32px 32px 28px", boxShadow: "var(--shadow-ambient)", marginBottom: 20 };
const sectionTitle: React.CSSProperties = { fontFamily: "'Manrope',sans-serif", fontSize: 15, fontWeight: 700, color: "var(--primary)", display: "flex", alignItems: "center", gap: 8, marginBottom: 24 };
const label: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--outline)", marginBottom: 6 };
const inputBase: React.CSSProperties = { width: "100%", padding: "12px 16px", borderRadius: 8, fontSize: 14, background: "var(--surface)", color: "var(--on-surface)", border: "1px solid rgba(198,197,212,0.3)", outline: "none", transition: "border-color .2s, box-shadow .2s" };
const iconInput: React.CSSProperties = { ...inputBase, paddingLeft: 42 };
const hint: React.CSSProperties = { fontSize: 11, color: "var(--outline-variant)", marginTop: 4 };
const twoCol: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 };

export default function CompanyForm() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { t } = useI18n();
  const isNew = id === "new";
  const [form, setForm] = useState<FormState>(empty);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [activeLang, setActiveLang] = useState("tr");
  const [langs, setLangs] = useState<LanguageDto[]>([]);
  // Published languages flagged as missing required localized content.
  const [incompleteLangs, setIncompleteLangs] = useState<string[]>([]);

  useEffect(() => {
    settingsApi.getLanguages().then(r => {
      if (r.success && r.data) {
        const all = r.data;
        setLangs(all);
        if (all.some(l => l.code === "tr")) setActiveLang("tr");
        else {
          const def = all.find(l => l.isDefault);
          if (def) setActiveLang(def.code);
        }
      }
    });
  }, []);

  useEffect(() => {
    if (!isNew) cmsApi.getCompany(id).then(r => {
      if (r.success && r.data) {
        const d = r.data;
        const toDict = (v: LocalizedField | string | undefined): LocalizedField => {
          if (!v) return { en: "" };
          if (typeof v === "string") return { en: v };
          return v;
        };
        setForm({
          name: toDict(d.name), sector: toDict(d.sector), description: toDict(d.description),
          detailedDescription: toDict(d.detailedDescription),
          address: toDict(d.address),
          logoUrl: d.logoUrl,
          websiteUrl: d.websiteUrl, contactEmail: d.contactEmail, phoneNumber: d.phoneNumber,
          displayOrder: d.displayOrder, isActive: d.isActive,
        });
      }
      setLoading(false);
    });
  }, [id, isNew]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(f => ({ ...f, [k]: v }));
  const setL = (field: "name" | "sector" | "description" | "detailedDescription" | "address", lang: string, value: string) => {
    setForm(f => ({ ...f, [field]: { ...f[field], [lang]: value } }));
    setIncompleteLangs(prev => (prev.includes(lang) ? prev.filter(c => c !== lang) : prev));
  };

  const schema: ValidationSchema<{ contactEmail: string; websiteUrl: string }> = {
    contactEmail: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, patternMessage: t("Enter a valid email address.", "Geçerli bir e-posta adresi girin.") },
    websiteUrl: { pattern: /^https?:\/\/.+/, patternMessage: t("Must start with http:// or https://", "http:// veya https:// ile başlamalı") },
  };
  const { onBlur, validateAll, getFieldState } = useFormValidation(schema);
  // True when the current tab's value for a required localized field is empty.
  const langErr = (v: LocalizedField) => incompleteLangs.includes(activeLang) && !((v[activeLang]) ?? "").trim();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateAll({ contactEmail: form.contactEmail, websiteUrl: form.websiteUrl })) { toast(t("Please fix the highlighted fields.", "Lütfen işaretli alanları düzeltin."), "warning"); return; }
    const missing = incompleteLocales(langs, [form.name, form.sector]);
    if (missing.length > 0) {
      setIncompleteLangs(missing);
      setActiveLang(missing[0]);
      toast(t(`Content is required for all published languages: ${localeNames(langs, missing)}`, `Tüm yayındaki diller için içerik zorunlu: ${localeNames(langs, missing)}`), "warning");
      return;
    }
    setIncompleteLangs([]);
    setSaving(true);
    const payload = { name: form.name, sector: form.sector, description: form.description, detailedDescription: form.detailedDescription, address: form.address, logoUrl: form.logoUrl, websiteUrl: form.websiteUrl, contactEmail: form.contactEmail, phoneNumber: form.phoneNumber, displayOrder: form.displayOrder, isActive: form.isActive };
    const r = isNew ? await cmsApi.createCompany(payload as never) : await cmsApi.updateCompany(id, payload as never);
    if (r.success) { toast(isNew ? t("Company created successfully!", "Şirket oluşturuldu!") : t("Company updated successfully!", "Şirket güncellendi!"), "success"); setTimeout(() => router.push("/companies"), 800); }
    else toast(r.message || t("Save failed.", "Kaydetme başarısız."), "error");
    setSaving(false);
  };

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "100px 0", gap: 16 }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2.5px solid var(--primary-fixed)", borderTopColor: "var(--primary)", animation: "spin .8s linear infinite" }} />
      <p style={{ fontSize: 13, color: "var(--outline)", fontWeight: 500 }}>{t("Loading company data…", "Şirket verileri yükleniyor…")}</p>
    </div>
  );

  const InputIcon = ({ name, style: s }: { name: string; style?: React.CSSProperties }) => (
    <Icon name={name} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 18, color: "var(--outline-variant)", ...s }} />
  );

  const langLabel = langs.find(l => l.code === activeLang)?.nativeName || activeLang;

  return (
    <div style={{ maxWidth: 720 }}>
      {/* ── Breadcrumb ─────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--outline)", marginBottom: 8 }}>
        <button onClick={() => router.push("/companies")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--outline)", display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 500 }}>
          <Icon name="arrow_back" style={{ fontSize: 16 }} />{t("Companies", "Şirketler")}
        </button>
        <span style={{ color: "var(--outline-variant)" }}>/</span>
        <span style={{ color: "var(--on-surface-variant)", fontWeight: 500 }}>{isNew ? t("New", "Yeni") : t("Edit", "Düzenle")}</span>
      </div>

      {/* ── Page Header ────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "'Manrope',sans-serif", fontSize: 28, fontWeight: 800, color: "var(--primary)", letterSpacing: "-0.02em" }}>
            {isNew ? t("Register Company", "Şirket Kaydet") : t("Edit Company", "Şirketi Düzenle")}
          </h1>
          <p style={{ fontSize: 13, color: "var(--on-surface-variant)", marginTop: 4 }}>
            {isNew
              ? t("Add a new portfolio company to the Öztemur Group roster.", "Öztemur Group portföyüne yeni bir şirket ekleyin.")
              : `${t("Editing company profile:", "Şirket profili düzenleniyor:")} ${loc(form.name) || t("Untitled", "İsimsiz")}`}
          </p>
        </div>
        {!isNew && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 9999, background: form.isActive ? "var(--success-container)" : "var(--error-container)" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: form.isActive ? "var(--success)" : "var(--error)" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: form.isActive ? "var(--success)" : "var(--error)", textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>
              {form.isActive ? t("Active", "Aktif") : t("Inactive", "Pasif")}
            </span>
          </div>
        )}
      </div>

      <form onSubmit={submit}>
        {/* ─── Section 1: Identity ──────────────── */}
        <div style={sectionCard}>
          <div style={sectionTitle}>
            <Icon name="badge" style={{ fontSize: 20, color: "var(--primary)" }} />{t("Company Identity", "Şirket Kimliği")}
          </div>
          <LangTabBar langs={langs} activeLang={activeLang} onSelect={setActiveLang} incomplete={incompleteLangs} />
          <div style={twoCol}>
            <FormField>
              <label style={label}>{t("Company Name", "Şirket Adı")} ({langLabel}) *</label>
              <div style={{ position: "relative" }}>
                <InputIcon name="business" />
                <input value={form.name[activeLang] || ""} onChange={e => setL("name", activeLang, e.target.value)} placeholder="Öztemur Group Of Companies A.Ş." style={getValidatedInputStyle(iconInput, langErr(form.name))} />
              </div>
            </FormField>
            <FormField>
              <label style={label}>{t("Industry Sector", "Sektör")} ({langLabel}) *</label>
              <div style={{ position: "relative" }}>
                <InputIcon name="category" />
                <input value={form.sector[activeLang] || ""} onChange={e => setL("sector", activeLang, e.target.value)} placeholder={t("e.g. Construction, Technology", "ör. İnşaat, Teknoloji")} style={getValidatedInputStyle(iconInput, langErr(form.sector))} />
              </div>
            </FormField>
          </div>
          <div style={{ marginTop: 20 }}>
            <label style={label}>{t("Short Description", "Kısa Açıklama")} ({langLabel})</label>
            <textarea rows={2} value={form.description[activeLang] || ""} onChange={e => setL("description", activeLang, e.target.value)} placeholder={t("A brief one-liner about the company…", "Şirket hakkında kısa bir tanım…")} style={{ ...inputBase, resize: "none" as const }} />
            <p style={hint}>{(form.description[activeLang] || "").length}/300 {t("characters max", "karakter")}</p>
          </div>
          <div style={{ marginTop: 20 }}>
            <label style={label}>{t("Detailed Description", "Detaylı Açıklama")} ({langLabel})</label>
            <textarea rows={6} value={form.detailedDescription[activeLang] || ""} onChange={e => setL("detailedDescription", activeLang, e.target.value)} placeholder={t("Full company profile with capabilities, history, and market position…", "Yetkinlikler, geçmiş ve pazar konumuyla tam şirket profili…")} style={{ ...inputBase, resize: "vertical" as const, minHeight: 120 }} />
            <p style={hint}>{t("This appears on the company detail page. Markdown is not supported.", "Şirket detay sayfasında görünür. Markdown desteklenmez.")}</p>
          </div>
        </div>

        {/* ─── Section 2: Media ─────────────────── */}
        <div style={sectionCard}>
          <div style={sectionTitle}>
            <Icon name="image" style={{ fontSize: 20, color: "var(--primary)" }} />{t("Media & Branding", "Görsel & Marka")}
          </div>
          <FileUpload value={form.logoUrl} onChange={url => set("logoUrl", url)} label={t("Company Logo", "Şirket Logosu")} accept="image/*" hint={t("Upload company logo — PNG, SVG, or WebP recommended", "Şirket logosu yükleyin — PNG, SVG veya WebP önerilir")} variant="logo" />
        </div>

        {/* ─── Section 3: Contact ───────────────── */}
        <div style={sectionCard}>
          <div style={sectionTitle}>
            <Icon name="contact_phone" style={{ fontSize: 20, color: "var(--primary)" }} />{t("Contact & Web", "İletişim & Web")}
          </div>
          <div style={twoCol}>
            <FormField error={getFieldState("websiteUrl").error}>
              <label style={label}>{t("Website URL", "Web Sitesi")}</label>
              <div style={{ position: "relative" }}><InputIcon name="language" /><input value={form.websiteUrl} onChange={e => set("websiteUrl", e.target.value)} onBlur={() => onBlur("websiteUrl", form.websiteUrl)} placeholder="https://www.oztemur.com" style={getValidatedInputStyle(iconInput, getFieldState("websiteUrl").hasError)} /></div>
            </FormField>
            <FormField error={getFieldState("contactEmail").error}>
              <label style={label}>{t("Contact Email", "İletişim E-postası")}</label>
              <div style={{ position: "relative" }}><InputIcon name="mail" /><input value={form.contactEmail} onChange={e => set("contactEmail", e.target.value)} onBlur={() => onBlur("contactEmail", form.contactEmail)} placeholder="info@company.com" style={getValidatedInputStyle(iconInput, getFieldState("contactEmail").hasError)} /></div>
            </FormField>
          </div>
          <div style={{ ...twoCol, marginTop: 20 }}>
            <div>
              <label style={label}>{t("Phone Number", "Telefon")}</label>
              <div style={{ position: "relative" }}><InputIcon name="phone" /><input value={form.phoneNumber} onChange={e => set("phoneNumber", e.target.value)} placeholder="+90 392 XXX XX XX" style={iconInput} /></div>
            </div>
            <div>
              <label style={label}>{t("Display Order", "Sıralama")}</label>
              <div style={{ position: "relative" }}><InputIcon name="sort" /><input type="number" value={form.displayOrder} onChange={e => set("displayOrder", Number(e.target.value) || 0)} style={iconInput} /></div>
              <p style={hint}>{t("Lower values appear first in the portfolio grid.", "Düşük değerler portföy ızgarasında önce gösterilir.")}</p>
            </div>
          </div>
          <div style={{ marginTop: 20 }}>
            <label style={label}>{t("Address", "Adres")} ({langLabel})</label>
            <textarea
              rows={3}
              value={form.address[activeLang] || ""}
              onChange={e => setL("address", activeLang, e.target.value)}
              placeholder={t("Street, district, city, country…", "Cadde, mahalle, şehir, ülke…")}
              style={{ ...inputBase, resize: "vertical" as const, minHeight: 80 }}
            />
            <p style={hint}>{t("Optional. Shown in the company detail modal under Contact info.", "İsteğe bağlı. Şirket detay penceresinde İletişim bilgileri altında gösterilir.")}</p>
          </div>
        </div>

        {/* ─── Section 4: Status (edit only) ────── */}
        {!isNew && (
          <div style={sectionCard}>
            <div style={sectionTitle}><Icon name="toggle_on" style={{ fontSize: 20, color: "var(--primary)" }} />{t("Visibility", "Görünürlük")}</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "var(--surface)", borderRadius: 8 }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--on-surface)" }}>{t("Company Active", "Şirket Aktif")}</p>
                <p style={{ fontSize: 12, color: "var(--outline)", marginTop: 2 }}>{t("When disabled, this company will be hidden from the public website.", "Devre dışı bırakıldığında şirket herkese açık siteden gizlenir.")}</p>
              </div>
              <button type="button" onClick={() => set("isActive", !form.isActive)} style={{ position: "relative", width: 48, height: 26, borderRadius: 9999, background: form.isActive ? "var(--primary)" : "var(--outline-variant)", border: "none", cursor: "pointer", transition: "background .2s", flexShrink: 0 }}>
                <span style={{ position: "absolute", top: 3, left: form.isActive ? 24 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.15)", transition: "left .2s" }} />
              </button>
            </div>
          </div>
        )}

        {/* ─── Action Bar ──────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 0", borderTop: "1px solid rgba(198,197,212,0.15)", marginTop: 4 }}>
          <button type="button" onClick={() => router.push("/companies")} style={{ padding: "12px 28px", borderRadius: 8, fontSize: 13, fontWeight: 500, color: "var(--on-surface-variant)", background: "var(--surface-lowest)", border: "1px solid rgba(198,197,212,0.3)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "background .15s" }}><Icon name="close" style={{ fontSize: 16 }} />{t("Cancel", "Vazgeç")}</button>
          <div style={{ display: "flex", gap: 12 }}>
            {!isNew && (
              <button type="button" onClick={async () => {
                const ok = await confirm({ title: t("Delete Company", "Şirketi Sil"), description: t(`Permanently remove "${loc(form.name)}"? This action is irreversible.`, `"${loc(form.name)}" kalıcı olarak silinsin mi? Bu işlem geri alınamaz.`), confirmLabel: t("Delete Forever", "Kalıcı Olarak Sil"), variant: "danger" });
                if (!ok) return;
                const r = await cmsApi.deleteCompany(id);
                if (r.success) { toast(t("Company deleted.", "Şirket silindi."), "success"); setTimeout(() => router.push("/companies"), 600); }
                else toast(r.message || t("Delete failed.", "Silme başarısız."), "error");
              }} style={{ padding: "12px 24px", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "var(--error)", background: "var(--error-container)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "opacity .15s" }}>
                <Icon name="delete" style={{ fontSize: 16 }} />{t("Delete", "Sil")}
              </button>
            )}
            <button type="submit" disabled={saving} style={{ padding: "12px 32px", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg, var(--primary), var(--primary-container))", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, opacity: saving ? 0.6 : 1, boxShadow: "0 4px 14px rgba(0,6,102,0.25)", transition: "opacity .15s, box-shadow .15s" }}>
              {saving ? (<><span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .8s linear infinite", display: "inline-block" }} />{t("Saving…", "Kaydediliyor…")}</>) : (<><Icon name={isNew ? "add" : "check"} style={{ fontSize: 16 }} />{isNew ? t("Create Company", "Şirket Oluştur") : t("Save Changes", "Değişiklikleri Kaydet")}</>)}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
