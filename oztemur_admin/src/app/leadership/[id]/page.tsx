"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import { cmsApi, settingsApi, loc, type LocalizedField, type LanguageDto } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import FileUpload from "@/components/FileUpload";
import { FormField, getValidatedInputStyle } from "@/components/FormValidation";
import { incompleteLocales, localeNames } from "@/lib/localizedValidation";
import LangTabBar from "@/components/LangTabBar";
import { useI18n } from "@/lib/i18n";
import Icon from "@/components/Icon";

interface FormState {
  name: LocalizedField;
  role: LocalizedField;
  bio: LocalizedField;
  photoUrl: string;
  displayOrder: number;
  isActive: boolean;
  slug: string;
  email: string;
  phone: string;
  linkedInUrl: string;
}

const empty: FormState = { name: { en: "", tr: "" }, role: { en: "", tr: "" }, bio: { en: "", tr: "" }, photoUrl: "", displayOrder: 0, isActive: true, slug: "", email: "", phone: "", linkedInUrl: "" };

const sectionCard: React.CSSProperties = { background: "var(--surface-lowest)", borderRadius: 12, padding: "32px 32px 28px", boxShadow: "var(--shadow-ambient)", marginBottom: 20 };
const sectionTitle: React.CSSProperties = { fontFamily: "'Manrope',sans-serif", fontSize: 15, fontWeight: 700, color: "var(--primary)", display: "flex", alignItems: "center", gap: 8, marginBottom: 24 };
const label: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--outline)", marginBottom: 6 };
const inputBase: React.CSSProperties = { width: "100%", padding: "12px 16px", borderRadius: 8, fontSize: 14, background: "var(--surface)", color: "var(--on-surface)", border: "1px solid rgba(198,197,212,0.3)", outline: "none", transition: "border-color .2s, box-shadow .2s" };
const iconInput: React.CSSProperties = { ...inputBase, paddingLeft: 42 };
const hint: React.CSSProperties = { fontSize: 11, color: "var(--outline-variant)", marginTop: 4 };
const twoCol: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 };

export default function LeadershipMemberForm() {
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
    if (!isNew) cmsApi.getLeadershipMember(id).then(r => {
      if (r.success && r.data) {
        const d = r.data;
        const toDict = (v: LocalizedField | string | undefined): LocalizedField => {
          if (!v) return { en: "" };
          if (typeof v === "string") return { en: v };
          return v;
        };
        setForm({
          name: toDict(d.name),
          role: toDict(d.role),
          bio: toDict(d.bio),
          photoUrl: d.photoUrl,
          displayOrder: d.displayOrder,
          isActive: d.isActive,
          slug: d.slug ?? "",
          email: d.email ?? "",
          phone: d.phone ?? "",
          linkedInUrl: d.linkedInUrl ?? "",
        });
      }
      setLoading(false);
    });
  }, [id, isNew]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(f => ({ ...f, [k]: v }));
  const setL = (field: "name" | "role" | "bio", lang: string, value: string) => {
    setForm(f => ({ ...f, [field]: { ...f[field], [lang]: value } }));
    setIncompleteLangs(prev => (prev.includes(lang) ? prev.filter(c => c !== lang) : prev));
  };

  // True when the current tab's value for a required localized field is empty.
  const langErr = (v: LocalizedField) => incompleteLangs.includes(activeLang) && !((v[activeLang]) ?? "").trim();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const missing = incompleteLocales(langs, [form.name, form.role]);
    if (missing.length > 0) {
      setIncompleteLangs(missing);
      setActiveLang(missing[0]);
      toast(t(`Content is required for all published languages: ${localeNames(langs, missing)}`, `Tüm yayındaki diller için içerik zorunlu: ${localeNames(langs, missing)}`), "warning");
      return;
    }
    setIncompleteLangs([]);
    setSaving(true);
    const payload = {
      name: form.name, role: form.role, bio: form.bio,
      photoUrl: form.photoUrl, displayOrder: form.displayOrder, isActive: form.isActive,
      slug: form.slug.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      linkedInUrl: form.linkedInUrl.trim(),
    };
    const r = isNew ? await cmsApi.createLeadershipMember(payload as never) : await cmsApi.updateLeadershipMember(id, payload as never);
    if (r.success) {
      toast(isNew ? t("Member added!", "Üye eklendi!") : t("Member updated!", "Üye güncellendi!"), "success");
      setTimeout(() => router.push("/leadership"), 700);
    } else toast(r.message || t("Save failed.", "Kaydetme başarısız."), "error");
    setSaving(false);
  };

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "100px 0", gap: 16 }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2.5px solid var(--primary-fixed)", borderTopColor: "var(--primary)", animation: "spin .8s linear infinite" }} />
      <p style={{ fontSize: 13, color: "var(--outline)", fontWeight: 500 }}>{t("Loading member…", "Üye yükleniyor…")}</p>
    </div>
  );

  const InputIcon = ({ name, style: s }: { name: string; style?: React.CSSProperties }) => (
    <Icon name={name} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 18, color: "var(--outline-variant)", ...s }} />
  );

  const langLabel = langs.find(l => l.code === activeLang)?.nativeName || activeLang;

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--outline)", marginBottom: 8 }}>
        <button onClick={() => router.push("/leadership")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--outline)", display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 500 }}>
          <Icon name="arrow_back" style={{ fontSize: 16 }} />{t("Leadership", "Yönetim Kadrosu")}
        </button>
        <span style={{ color: "var(--outline-variant)" }}>/</span>
        <span style={{ color: "var(--on-surface-variant)", fontWeight: 500 }}>{isNew ? t("New", "Yeni") : t("Edit", "Düzenle")}</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "'Manrope',sans-serif", fontSize: 28, fontWeight: 800, color: "var(--primary)", letterSpacing: "-0.02em" }}>
            {isNew ? t("Add Leadership Member", "Yönetim Kadrosu Üyesi Ekle") : t("Edit Leadership Member", "Üyeyi Düzenle")}
          </h1>
          <p style={{ fontSize: 13, color: "var(--on-surface-variant)", marginTop: 4 }}>
            {isNew ? t("Add a new profile to the Leadership page.", "Yönetim Kadrosu sayfasına yeni bir profil ekleyin.") : `${t("Editing:", "Düzenleniyor:")} ${loc(form.name) || t("Untitled", "İsimsiz")}`}
          </p>
        </div>
        {!isNew && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 9999, background: form.isActive ? "var(--success-container)" : "var(--error-container)" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: form.isActive ? "var(--success)" : "var(--error)" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: form.isActive ? "var(--success)" : "var(--error)", textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>
              {form.isActive ? t("Visible", "Görünür") : t("Hidden", "Gizli")}
            </span>
          </div>
        )}
      </div>

      <form onSubmit={submit}>
        <div style={sectionCard}>
          <div style={sectionTitle}>
            <Icon name="person" style={{ fontSize: 20, color: "var(--primary)" }} />{t("Profile", "Profil")}
          </div>
          <LangTabBar langs={langs} activeLang={activeLang} onSelect={setActiveLang} incomplete={incompleteLangs} />
          <div style={twoCol}>
            <FormField>
              <label style={label}>{t("Full Name", "Ad Soyad")} ({langLabel}) *</label>
              <div style={{ position: "relative" }}>
                <InputIcon name="badge" />
                <input value={form.name[activeLang] || ""} onChange={e => setL("name", activeLang, e.target.value)} placeholder="Ad Soyad" style={getValidatedInputStyle(iconInput, langErr(form.name))} />
              </div>
            </FormField>
            <FormField>
              <label style={label}>{t("Role", "Görev")} ({langLabel}) *</label>
              <div style={{ position: "relative" }}>
                <InputIcon name="work" />
                <input value={form.role[activeLang] || ""} onChange={e => setL("role", activeLang, e.target.value)} placeholder="Yönetim Kurulu Başkanı" style={getValidatedInputStyle(iconInput, langErr(form.role))} />
              </div>
            </FormField>
          </div>
          <div style={{ marginTop: 20 }}>
            <label style={label}>{t("Biography", "Biyografi")} ({langLabel})</label>
            <textarea rows={6} value={form.bio[activeLang] || ""} onChange={e => setL("bio", activeLang, e.target.value)} placeholder={t("Short biography…", "Kısa biyografi…")} style={{ ...inputBase, resize: "vertical" as const, minHeight: 140 }} />
            <p style={hint}>{t("Shown beneath the name and role on the public Leadership page.", "Herkese açık Yönetim Kadrosu sayfasında ad ve görev altında gösterilir.")}</p>
          </div>
        </div>

        <div style={sectionCard}>
          <div style={sectionTitle}>
            <Icon name="image" style={{ fontSize: 20, color: "var(--primary)" }} />{t("Photo", "Fotoğraf")}
          </div>
          <FileUpload value={form.photoUrl} onChange={url => set("photoUrl", url)} label={t("Member Photo", "Üye Fotoğrafı")} accept="image/*" hint={t("Portrait photo — 4:5 aspect works best. JPEG or WebP recommended.", "Portre fotoğraf — 4:5 oran en iyisidir. JPEG veya WebP önerilir.")} variant="cover" />
        </div>

        <div style={sectionCard}>
          <div style={sectionTitle}>
            <Icon name="mail" style={{ fontSize: 20, color: "var(--primary)" }} />{t("Contact", "İletişim")}
          </div>
          <div style={twoCol}>
            <div>
              <label style={label}>{t("Email", "E-posta")}</label>
              <div style={{ position: "relative" }}>
                <InputIcon name="mail" />
                <input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="ornek@oztemur.com" style={iconInput} />
              </div>
            </div>
            <div>
              <label style={label}>{t("Phone", "Telefon")}</label>
              <div style={{ position: "relative" }}>
                <InputIcon name="phone" />
                <input type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+90 555 555 55 55" style={iconInput} />
              </div>
            </div>
          </div>
          <div style={{ marginTop: 20 }}>
            <label style={label}>{t("LinkedIn URL", "LinkedIn URL")}</label>
            <div style={{ position: "relative" }}>
              <InputIcon name="link" />
              <input type="url" value={form.linkedInUrl} onChange={e => set("linkedInUrl", e.target.value)} placeholder="https://linkedin.com/in/..." style={iconInput} />
            </div>
            <p style={hint}>{t("Optional — fields left empty are hidden on the public page.", "Opsiyonel — boş bırakılan alanlar herkese açık sayfada gösterilmez.")}</p>
          </div>
        </div>

        <div style={sectionCard}>
          <div style={sectionTitle}>
            <Icon name="tune" style={{ fontSize: 20, color: "var(--primary)" }} />{t("Display", "Görünüm")}
          </div>
          <div style={twoCol}>
            <div>
              <label style={label}>{t("Display Order", "Sıralama")}</label>
              <div style={{ position: "relative" }}>
                <InputIcon name="sort" />
                <input type="number" value={form.displayOrder} onChange={e => set("displayOrder", Number(e.target.value) || 0)} style={iconInput} />
              </div>
              <p style={hint}>{t("Lower values appear first. Drag-to-reorder on the list updates this automatically.", "Düşük değerler önce gelir. Listede sürükle-bırak bunu otomatik günceller.")}</p>
            </div>
            <div>
              <label style={label}>{t("URL Slug", "URL Kısa Adı")}</label>
              <div style={{ position: "relative" }}>
                <InputIcon name="link" />
                <input
                  type="text"
                  value={form.slug}
                  onChange={e => set("slug", e.target.value)}
                  placeholder={t("Auto-generated if empty", "Boşsa otomatik üretilir")}
                  style={iconInput}
                />
              </div>
              <p style={hint}>{t("Used in the public URL (/leadership/{slug}). Must be unique.", "Herkese açık URL'de kullanılır (/leadership/{slug}). Benzersiz olmalı.")}</p>
            </div>
          </div>
        </div>

        {!isNew && (
          <div style={sectionCard}>
            <div style={sectionTitle}><Icon name="toggle_on" style={{ fontSize: 20, color: "var(--primary)" }} />{t("Visibility", "Görünürlük")}</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "var(--surface)", borderRadius: 8 }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--on-surface)" }}>{t("Show on public site", "Herkese açık sitede göster")}</p>
                <p style={{ fontSize: 12, color: "var(--outline)", marginTop: 2 }}>{t("When disabled, this member is hidden from visitors. If no member is visible, the entire Leadership section is hidden.", "Devre dışı bırakıldığında bu üye ziyaretçilerden gizlenir. Hiçbir üye görünmüyorsa Yönetim Kadrosu bölümü tamamen gizlenir.")}</p>
              </div>
              <button type="button" onClick={() => set("isActive", !form.isActive)} style={{ position: "relative", width: 48, height: 26, borderRadius: 9999, background: form.isActive ? "var(--primary)" : "var(--outline-variant)", border: "none", cursor: "pointer", transition: "background .2s", flexShrink: 0 }}>
                <span style={{ position: "absolute", top: 3, left: form.isActive ? 24 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.15)", transition: "left .2s" }} />
              </button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 0", borderTop: "1px solid rgba(198,197,212,0.15)", marginTop: 4 }}>
          <button type="button" onClick={() => router.push("/leadership")} style={{ padding: "12px 28px", borderRadius: 8, fontSize: 13, fontWeight: 500, color: "var(--on-surface-variant)", background: "var(--surface-lowest)", border: "1px solid rgba(198,197,212,0.3)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="close" style={{ fontSize: 16 }} />{t("Cancel", "Vazgeç")}
          </button>
          <div style={{ display: "flex", gap: 12 }}>
            {!isNew && (
              <button type="button" onClick={async () => {
                const ok = await confirm({ title: t("Delete Member", "Üyeyi Sil"), description: t(`Permanently remove "${loc(form.name)}"? This action is irreversible.`, `"${loc(form.name)}" kalıcı olarak silinsin mi? Bu işlem geri alınamaz.`), confirmLabel: t("Delete Forever", "Kalıcı Olarak Sil"), variant: "danger" });
                if (!ok) return;
                const r = await cmsApi.deleteLeadershipMember(id);
                if (r.success) { toast(t("Member deleted.", "Üye silindi."), "success"); setTimeout(() => router.push("/leadership"), 600); }
                else toast(r.message || t("Delete failed.", "Silme başarısız."), "error");
              }} style={{ padding: "12px 24px", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "var(--error)", background: "var(--error-container)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="delete" style={{ fontSize: 16 }} />{t("Delete", "Sil")}
              </button>
            )}
            <button type="submit" disabled={saving} style={{ padding: "12px 32px", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg, var(--primary), var(--primary-container))", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, opacity: saving ? 0.6 : 1, boxShadow: "0 4px 14px rgba(0,6,102,0.25)" }}>
              {saving ? (<><span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .8s linear infinite", display: "inline-block" }} />{t("Saving…", "Kaydediliyor…")}</>) : (<><Icon name={isNew ? "add" : "check"} style={{ fontSize: 16 }} />{isNew ? t("Add Member", "Üye Ekle") : t("Save Changes", "Değişiklikleri Kaydet")}</>)}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
