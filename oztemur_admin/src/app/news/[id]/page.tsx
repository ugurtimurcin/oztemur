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

// Languages are fetched dynamically from the API

interface FormState {
  title: LocalizedField;
  slug: string;
  summary: LocalizedField;
  content: LocalizedField;
  imageUrl: string;
  isPublished: boolean;
}

const empty: FormState = { title: { en: "", tr: "" }, slug: "", summary: { en: "", tr: "" }, content: { en: "", tr: "" }, imageUrl: "", isPublished: false };

const sectionCard: React.CSSProperties = { background: "var(--surface-lowest)", borderRadius: 12, padding: "32px 32px 28px", boxShadow: "var(--shadow-ambient)", marginBottom: 20 };
const sectionTitle: React.CSSProperties = { fontFamily: "'Manrope',sans-serif", fontSize: 15, fontWeight: 700, color: "var(--primary)", display: "flex", alignItems: "center", gap: 8, marginBottom: 24 };
const lbl: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--outline)", marginBottom: 6 };
const inputBase: React.CSSProperties = { width: "100%", padding: "12px 16px", borderRadius: 8, fontSize: 14, background: "var(--surface)", color: "var(--on-surface)", border: "1px solid rgba(198,197,212,0.3)", outline: "none", transition: "border-color .2s, box-shadow .2s" };
const iconInput: React.CSSProperties = { ...inputBase, paddingLeft: 42 };
const hint: React.CSSProperties = { fontSize: 11, color: "var(--outline-variant)", marginTop: 4 };
const twoCol: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 };

export default function NewsForm() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { t } = useI18n();
  const [form, setForm] = useState<FormState>(empty);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [activeLang, setActiveLang] = useState("tr");
  const [langs, setLangs] = useState<LanguageDto[]>([]);
  // Published languages flagged as missing required localized content.
  const [incompleteLangs, setIncompleteLangs] = useState<string[]>([]);

  // Load available languages
  useEffect(() => {
    settingsApi.getLanguages().then(r => {
      if (r.success && r.data) {
        const all = r.data;
        setLangs(all);
        // Set TR as active if exists, otherwise fallback to system default
        if (all.some(l => l.code === "tr")) setActiveLang("tr");
        else {
          const def = all.find(l => l.isDefault);
          if (def) setActiveLang(def.code);
        }
      }
    });
  }, []);

  useEffect(() => {
    if (!isNew)
      cmsApi.getNewsArticle(id).then(r => {
        if (r.success && r.data) {
          const d = r.data;
          setForm({
            title: typeof d.title === "string" ? { en: d.title } : (d.title || { en: "" }),
            slug: d.slug,
            summary: typeof d.summary === "string" ? { en: d.summary } : (d.summary || { en: "" }),
            content: typeof d.content === "string" ? { en: d.content } : (d.content || { en: "" }),
            imageUrl: d.imageUrl,
            isPublished: d.isPublished,
          });
        }
        setLoading(false);
      });
  }, [id, isNew]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(f => ({ ...f, [k]: v }));
  const setL = (field: "title" | "summary" | "content", lang: string, value: string) => {
    setForm(f => ({ ...f, [field]: { ...f[field], [lang]: value } }));
    setIncompleteLangs(prev => (prev.includes(lang) ? prev.filter(c => c !== lang) : prev));
  };
  const autoSlug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const schema: ValidationSchema<{ slug: string }> = {
    slug: { required: true, minLength: 2, pattern: /^[a-z0-9-]+$/, patternMessage: t("Only lowercase letters, numbers, and hyphens.", "Yalnızca küçük harf, rakam ve tire.") },
  };
  const { onBlur, validateAll, getFieldState } = useFormValidation(schema);
  // True when the current tab's value for a required localized field is empty.
  const langErr = (v: LocalizedField) => incompleteLangs.includes(activeLang) && !((v[activeLang]) ?? "").trim();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateAll({ slug: form.slug })) { toast(t("Please fix the highlighted fields.", "Lütfen işaretli alanları düzeltin."), "warning"); return; }
    const missing = incompleteLocales(langs, [form.title, form.content]);
    if (missing.length > 0) {
      setIncompleteLangs(missing);
      setActiveLang(missing[0]);
      toast(t(`Content is required for all published languages: ${localeNames(langs, missing)}`, `Tüm yayındaki diller için içerik zorunlu: ${localeNames(langs, missing)}`), "warning");
      return;
    }
    setIncompleteLangs([]);
    setSaving(true);
    const payload = { title: form.title, slug: form.slug, summary: form.summary, content: form.content, imageUrl: form.imageUrl, isPublished: form.isPublished };
    const r = isNew ? await cmsApi.createNews(payload as never) : await cmsApi.updateNews(id, payload as never);
    if (r.success) { toast(isNew ? t("Article published!", "Haber yayınlandı!") : t("Article updated!", "Haber güncellendi!"), "success"); setTimeout(() => router.push("/news"), 800); }
    else toast(r.message || t("Failed.", "Başarısız."), "error"); setSaving(false);
  };

  if (loading) return <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "100px 0", gap: 16 }}><div style={{ width: 32, height: 32, borderRadius: "50%", border: "2.5px solid var(--primary-fixed)", borderTopColor: "var(--primary)", animation: "spin .8s linear infinite" }} /><p style={{ fontSize: 13, color: "var(--outline)" }}>{t("Loading article…", "Haber yükleniyor…")}</p></div>;

  const InputIcon = ({ name }: { name: string }) => <Icon name={name} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 18, color: "var(--outline-variant)" }} />;



  return (
    <div style={{ maxWidth: 720 }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--outline)", marginBottom: 8 }}>
        <button onClick={() => router.push("/news")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--outline)", display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 500 }}><Icon name="arrow_back" style={{ fontSize: 16 }} />{t("News", "Haberler")}</button>
        <span style={{ color: "var(--outline-variant)" }}>/</span>
        <span style={{ color: "var(--on-surface-variant)", fontWeight: 500 }}>{isNew ? t("New Article", "Yeni Haber") : t("Edit", "Düzenle")}</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "'Manrope',sans-serif", fontSize: 28, fontWeight: 800, color: "var(--primary)", letterSpacing: "-0.02em" }}>{isNew ? t("Create Article", "Haber Oluştur") : t("Edit Article", "Haberi Düzenle")}</h1>
          <p style={{ fontSize: 13, color: "var(--on-surface-variant)", marginTop: 4 }}>{isNew ? t("Write a new news release for the corporate website.", "Kurumsal site için yeni bir haber yazın.") : `${t("Editing:", "Düzenleniyor:")} ${loc(form.title) || t("Untitled", "İsimsiz")}`}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 9999, background: form.isPublished ? "var(--secondary-container)" : "var(--warning-container)" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: form.isPublished ? "var(--on-secondary)" : "var(--warning)" }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: form.isPublished ? "var(--on-secondary)" : "var(--warning)", textTransform: "uppercase" as const }}>{form.isPublished ? t("Published", "Yayında") : t("Draft", "Taslak")}</span>
        </div>
      </div>

      <form onSubmit={submit}>
        {/* Meta */}
        <div style={sectionCard}>
          <div style={sectionTitle}><Icon name="article" style={{ fontSize: 20, color: "var(--primary)" }} />{t("Article Details", "Haber Detayı")}</div>

          <LangTabBar langs={langs} activeLang={activeLang} onSelect={setActiveLang} incomplete={incompleteLangs} />

          <div style={twoCol}>
            <FormField>
              <label style={lbl}>{t("Title", "Başlık")} ({langs.find(l => l.code === activeLang)?.nativeName || activeLang}) *</label>
              <div style={{ position: "relative" }}>
                <InputIcon name="title" />
                <input value={form.title[activeLang] || ""} onChange={e => { setL("title", activeLang, e.target.value); if (isNew && activeLang === "tr") set("slug", autoSlug(e.target.value)); }} placeholder={t("Article title…", "Haber başlığı…")} style={getValidatedInputStyle(iconInput, langErr(form.title))} />
              </div>
            </FormField>
            <FormField error={getFieldState("slug").error}>
              <label style={lbl}>{t("URL Slug", "URL Kısa Adı")} *</label>
              <div style={{ position: "relative" }}><InputIcon name="link" /><input value={form.slug} onChange={e => set("slug", e.target.value)} onBlur={() => onBlur("slug", form.slug)} placeholder="auto-generated-slug" style={getValidatedInputStyle(iconInput, getFieldState("slug").hasError)} /></div>
              <p style={hint}>{t("Auto-generated from title. Edit for custom URLs.", "Başlıktan otomatik üretilir. Özel URL için düzenleyin.")}</p>
            </FormField>
          </div>
          <div style={{ marginTop: 20 }}>
            <FileUpload
              value={form.imageUrl}
              onChange={url => set("imageUrl", url)}
              label={t("Cover Image", "Kapak Görseli")}
              accept="image/*"
              hint={t("High-res hero image — 1200×630px recommended", "Yüksek çözünürlüklü görsel — 1200×630px önerilir")}
              variant="cover"
            />
          </div>
        </div>

        {/* Content */}
        <div style={sectionCard}>
          <div style={sectionTitle}><Icon name="edit_note" style={{ fontSize: 20, color: "var(--primary)" }} />{t("Content", "İçerik")}</div>

          <LangTabBar langs={langs} activeLang={activeLang} onSelect={setActiveLang} incomplete={incompleteLangs} />

          <div>
            <label style={lbl}>{t("Summary / Excerpt", "Özet")} ({langs.find(l => l.code === activeLang)?.nativeName || activeLang})</label>
            <textarea rows={2} value={form.summary[activeLang] || ""} onChange={e => setL("summary", activeLang, e.target.value)} placeholder={t("A brief summary shown in article listings…", "Haber listelerinde gösterilen kısa özet…")} style={{ ...inputBase, resize: "none" as const }} />
            <p style={hint}>{(form.summary[activeLang] || "").length}/160 {t("characters recommended for SEO", "karakter — SEO için önerilir")}</p>
          </div>
          <FormField style={{ marginTop: 20 }}>
            <label style={lbl}>{t("Article Content", "Haber İçeriği")} ({langs.find(l => l.code === activeLang)?.nativeName || activeLang}) *</label>
            <textarea rows={20} value={form.content[activeLang] || ""} onChange={e => setL("content", activeLang, e.target.value)} placeholder={t("Write the full article content here…", "Haberin tam içeriğini buraya yazın…")} style={{ ...getValidatedInputStyle(inputBase, langErr(form.content)), resize: "vertical" as const, minHeight: 300, lineHeight: 1.7 }} />
            <p style={hint}>{(form.content[activeLang] || "").length.toLocaleString()} {t("characters", "karakter")}</p>
          </FormField>
        </div>

        {/* Publishing */}
        <div style={sectionCard}>
          <div style={sectionTitle}><Icon name="publish" style={{ fontSize: 20, color: "var(--primary)" }} />{t("Publishing", "Yayınlama")}</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "var(--surface)", borderRadius: 8 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--on-surface)" }}>{t("Publish Article", "Haberi Yayınla")}</p>
              <p style={{ fontSize: 12, color: "var(--outline)", marginTop: 2 }}>{t("When enabled, the article will be visible on the public website immediately.", "Etkinleştirildiğinde haber herkese açık sitede hemen görünür.")}</p>
            </div>
            <button type="button" onClick={() => set("isPublished", !form.isPublished)} style={{ position: "relative", width: 48, height: 26, borderRadius: 9999, background: form.isPublished ? "var(--primary)" : "var(--outline-variant)", border: "none", cursor: "pointer", transition: "background .2s", flexShrink: 0 }}>
              <span style={{ position: "absolute", top: 3, left: form.isPublished ? 24 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.15)", transition: "left .2s" }} />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 0", borderTop: "1px solid rgba(198,197,212,0.15)" }}>
          <button type="button" onClick={() => router.push("/news")} style={{ padding: "12px 28px", borderRadius: 8, fontSize: 13, fontWeight: 500, color: "var(--on-surface-variant)", background: "var(--surface-lowest)", border: "1px solid rgba(198,197,212,0.3)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><Icon name="close" style={{ fontSize: 16 }} />{t("Cancel", "Vazgeç")}</button>
          <div style={{ display: "flex", gap: 12 }}>
            {!isNew && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await confirm({
                    title: t("Delete Article", "Haberi Sil"),
                    description: t(`Are you sure you want to delete "${loc(form.title)}"? This cannot be undone.`, `"${loc(form.title)}" haberini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`),
                    confirmLabel: t("Delete Forever", "Kalıcı Olarak Sil"),
                    variant: "danger"
                  });
                  if (!ok) return;

                  const r = await cmsApi.deleteNews(id);
                  if (r.success) {
                    toast(t("Article deleted.", "Haber silindi."), "success");
                    setTimeout(() => router.push("/news"), 600);
                  } else {
                    toast(r.message || t("Delete failed.", "Silme başarısız."), "error");
                  }
                }}
                style={{ padding: "12px 24px", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "var(--error)", background: "var(--error-container)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
              >
                <Icon name="delete" style={{ fontSize: 16 }} />{t("Delete", "Sil")}
              </button>
            )}
            <button type="submit" disabled={saving} style={{ padding: "12px 32px", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg, var(--primary), var(--primary-container))", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, opacity: saving ? 0.6 : 1, boxShadow: "0 4px 14px rgba(0,6,102,0.25)" }}>
              {saving ? <><span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .8s linear infinite", display: "inline-block" }} />{t("Saving…", "Kaydediliyor…")}</> : <><Icon name={isNew ? "publish" : "check"} style={{ fontSize: 16 }} />{isNew ? t("Publish Article", "Haberi Yayınla") : t("Save Changes", "Değişiklikleri Kaydet")}</>}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
