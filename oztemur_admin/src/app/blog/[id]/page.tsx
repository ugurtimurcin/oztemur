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
  title: LocalizedField; slug: string; author: string; summary: LocalizedField;
  content: LocalizedField; imageUrl: string; isPublished: boolean;
}

const empty: FormState = { title: { en: "", tr: "" }, slug: "", author: "", summary: { en: "", tr: "" }, content: { en: "", tr: "" }, imageUrl: "", isPublished: false };

const sectionCard: React.CSSProperties = { background: "var(--surface-lowest)", borderRadius: 12, padding: "32px 32px 28px", boxShadow: "var(--shadow-ambient)", marginBottom: 20 };
const sectionTitle: React.CSSProperties = { fontFamily: "'Manrope',sans-serif", fontSize: 15, fontWeight: 700, color: "var(--primary)", display: "flex", alignItems: "center", gap: 8, marginBottom: 24 };
const lbl: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--outline)", marginBottom: 6 };
const inputBase: React.CSSProperties = { width: "100%", padding: "12px 16px", borderRadius: 8, fontSize: 14, background: "var(--surface)", color: "var(--on-surface)", border: "1px solid rgba(198,197,212,0.3)", outline: "none", transition: "border-color .2s, box-shadow .2s" };
const iconInput: React.CSSProperties = { ...inputBase, paddingLeft: 42 };
const hint: React.CSSProperties = { fontSize: 11, color: "var(--outline-variant)", marginTop: 4 };
const twoCol: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 };

export default function BlogForm() {
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
    if (!isNew) cmsApi.getBlog(id).then(r => {
      if (r.success && r.data) {
        const d = r.data;
        const toDict = (v: LocalizedField | string | undefined): LocalizedField => {
          if (!v) return { en: "" };
          if (typeof v === "string") return { en: v };
          return v;
        };
        setForm({
          title: toDict(d.title), slug: d.slug, author: d.author,
          summary: toDict(d.summary), content: toDict(d.content),
          imageUrl: d.imageUrl, isPublished: d.isPublished,
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
  const autoSlug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const schema: ValidationSchema<{ slug: string; author: string }> = {
    slug: { required: true, minLength: 2, pattern: /^[a-z0-9-]+$/, patternMessage: t("Only lowercase letters, numbers, and hyphens.", "Yalnızca küçük harf, rakam ve tire.") },
    author: { required: true, minLength: 2 },
  };
  const { onBlur, validateAll, getFieldState } = useFormValidation(schema);
  // True when the current tab's value for a required localized field is empty.
  const langErr = (v: LocalizedField) => incompleteLangs.includes(activeLang) && !((v[activeLang]) ?? "").trim();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateAll({ slug: form.slug, author: form.author })) { toast(t("Please fix the highlighted fields.", "Lütfen işaretli alanları düzeltin."), "warning"); return; }
    const missing = incompleteLocales(langs, [form.title, form.content]);
    if (missing.length > 0) {
      setIncompleteLangs(missing);
      setActiveLang(missing[0]);
      toast(t(`Content is required for all published languages: ${localeNames(langs, missing)}`, `Tüm yayındaki diller için içerik zorunlu: ${localeNames(langs, missing)}`), "warning");
      return;
    }
    setIncompleteLangs([]);
    setSaving(true);
    const payload = { title: form.title, slug: form.slug, author: form.author, summary: form.summary, content: form.content, imageUrl: form.imageUrl, isPublished: form.isPublished };
    const r = isNew ? await cmsApi.createBlog(payload as never) : await cmsApi.updateBlog(id, payload as never);
    if (r.success) { toast(isNew ? t("Blog post published!", "Blog yazısı yayınlandı!") : t("Blog post updated!", "Blog yazısı güncellendi!"), "success"); setTimeout(() => router.push("/blog"), 800); }
    else toast(r.message || t("Failed.", "Başarısız."), "error"); setSaving(false);
  };

  if (loading) return <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "100px 0", gap: 16 }}><div style={{ width: 32, height: 32, borderRadius: "50%", border: "2.5px solid var(--primary-fixed)", borderTopColor: "var(--primary)", animation: "spin .8s linear infinite" }} /><p style={{ fontSize: 13, color: "var(--outline)" }}>{t("Loading post…", "Yazı yükleniyor…")}</p></div>;
  const InputIcon = ({ name }: { name: string }) => <Icon name={name} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 18, color: "var(--outline-variant)" }} />;
  const langLabel = langs.find(l => l.code === activeLang)?.nativeName || activeLang;

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--outline)", marginBottom: 8 }}>
        <button onClick={() => router.push("/blog")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--outline)", display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 500 }}><Icon name="arrow_back" style={{ fontSize: 16 }} />Blog</button>
        <span style={{ color: "var(--outline-variant)" }}>/</span>
        <span style={{ color: "var(--on-surface-variant)", fontWeight: 500 }}>{isNew ? t("New Post", "Yeni Yazı") : t("Edit", "Düzenle")}</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "'Manrope',sans-serif", fontSize: 28, fontWeight: 800, color: "var(--primary)", letterSpacing: "-0.02em" }}>{isNew ? t("Write Post", "Yazı Ekle") : t("Edit Post", "Yazıyı Düzenle")}</h1>
          <p style={{ fontSize: 13, color: "var(--on-surface-variant)", marginTop: 4 }}>{isNew ? t("Craft a new thought-leadership blog post.", "Yeni bir blog yazısı oluşturun.") : `${t("Editing:", "Düzenleniyor:")} ${loc(form.title) || t("Untitled", "İsimsiz")}`}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 9999, background: form.isPublished ? "var(--secondary-container)" : "var(--warning-container)" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: form.isPublished ? "var(--on-secondary)" : "var(--warning)" }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: form.isPublished ? "var(--on-secondary)" : "var(--warning)", textTransform: "uppercase" as const }}>{form.isPublished ? t("Published", "Yayında") : t("Draft", "Taslak")}</span>
        </div>
      </div>

      <form onSubmit={submit}>
        <div style={sectionCard}>
          <div style={sectionTitle}><Icon name="article" style={{ fontSize: 20, color: "var(--primary)" }} />{t("Post Details", "Yazı Detayı")}</div>
          <LangTabBar langs={langs} activeLang={activeLang} onSelect={setActiveLang} incomplete={incompleteLangs} />
          <div style={twoCol}>
            <FormField>
              <label style={lbl}>{t("Title", "Başlık")} ({langLabel}) *</label><div style={{ position: "relative" }}><InputIcon name="title" /><input value={form.title[activeLang] || ""} onChange={e => { setL("title", activeLang, e.target.value); if (isNew && activeLang === "tr") set("slug", autoSlug(e.target.value)); }} placeholder={t("Post headline…", "Yazı başlığı…")} style={getValidatedInputStyle(iconInput, langErr(form.title))} /></div>
            </FormField>
            <FormField error={getFieldState("author").error}>
              <label style={lbl}>{t("Author", "Yazar")} *</label><div style={{ position: "relative" }}><InputIcon name="person" /><input value={form.author} onChange={e => set("author", e.target.value)} onBlur={() => onBlur("author", form.author)} placeholder={t("Author name", "Yazar adı")} style={getValidatedInputStyle(iconInput, getFieldState("author").hasError)} /></div>
            </FormField>
          </div>
          <div style={{ ...twoCol, marginTop: 20 }}>
            <FormField error={getFieldState("slug").error}>
              <label style={lbl}>{t("URL Slug", "URL Kısa Adı")} *</label><div style={{ position: "relative" }}><InputIcon name="link" /><input value={form.slug} onChange={e => set("slug", e.target.value)} onBlur={() => onBlur("slug", form.slug)} placeholder="auto-generated" style={getValidatedInputStyle(iconInput, getFieldState("slug").hasError)} /></div><p style={hint}>{t("Auto-generated from title.", "Başlıktan otomatik üretilir.")}</p>
            </FormField>
            <div />
          </div>
          <div style={{ marginTop: 20 }}>
            <FileUpload value={form.imageUrl} onChange={url => set("imageUrl", url)} label={t("Cover Image", "Kapak Görseli")} accept="image/*" hint={t("High-res hero image — 1200×630px recommended", "Yüksek çözünürlüklü görsel — 1200×630px önerilir")} variant="cover" />
          </div>
        </div>

        <div style={sectionCard}>
          <div style={sectionTitle}><Icon name="edit_note" style={{ fontSize: 20, color: "var(--primary)" }} />{t("Content", "İçerik")}</div>
          <LangTabBar langs={langs} activeLang={activeLang} onSelect={setActiveLang} incomplete={incompleteLangs} />
          <div><label style={lbl}>{t("Summary / Excerpt", "Özet")} ({langLabel})</label><textarea rows={2} value={form.summary[activeLang] || ""} onChange={e => setL("summary", activeLang, e.target.value)} placeholder={t("A brief teaser for listings…", "Listeler için kısa bir tanıtım…")} style={{ ...inputBase, resize: "none" as const }} /><p style={hint}>{(form.summary[activeLang] || "").length}/160 {t("characters", "karakter")}</p></div>
          <FormField style={{ marginTop: 20 }}>
            <label style={lbl}>{t("Post Body", "Yazı Metni")} ({langLabel}) *</label><textarea rows={16} value={form.content[activeLang] || ""} onChange={e => setL("content", activeLang, e.target.value)} placeholder={t("Write your blog post here…", "Blog yazınızı buraya yazın…")} style={{ ...getValidatedInputStyle(inputBase, langErr(form.content)), resize: "vertical" as const, minHeight: 200, lineHeight: 1.7 }} /><p style={hint}>{(form.content[activeLang] || "").length.toLocaleString()} {t("characters", "karakter")}</p>
          </FormField>
        </div>

        <div style={sectionCard}>
          <div style={sectionTitle}><Icon name="publish" style={{ fontSize: 20, color: "var(--primary)" }} />{t("Publishing", "Yayınlama")}</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "var(--surface)", borderRadius: 8 }}>
            <div><p style={{ fontSize: 14, fontWeight: 600, color: "var(--on-surface)" }}>{t("Publish Post", "Yazıyı Yayınla")}</p><p style={{ fontSize: 12, color: "var(--outline)", marginTop: 2 }}>{t("Make this post visible on the public blog.", "Bu yazıyı herkese açık blogda görünür yap.")}</p></div>
            <button type="button" onClick={() => set("isPublished", !form.isPublished)} style={{ position: "relative", width: 48, height: 26, borderRadius: 9999, background: form.isPublished ? "var(--primary)" : "var(--outline-variant)", border: "none", cursor: "pointer", transition: "background .2s", flexShrink: 0 }}><span style={{ position: "absolute", top: 3, left: form.isPublished ? 24 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.15)", transition: "left .2s" }} /></button>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 0", borderTop: "1px solid rgba(198,197,212,0.15)" }}>
          <button type="button" onClick={() => router.push("/blog")} style={{ padding: "12px 28px", borderRadius: 8, fontSize: 13, fontWeight: 500, color: "var(--on-surface-variant)", background: "var(--surface-lowest)", border: "1px solid rgba(198,197,212,0.3)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><Icon name="close" style={{ fontSize: 16 }} />{t("Cancel", "Vazgeç")}</button>
          <div style={{ display: "flex", gap: 12 }}>
            {!isNew && (
              <button type="button" onClick={async () => {
                const ok = await confirm({ title: t("Delete Post", "Yazıyı Sil"), description: t(`Permanently delete "${loc(form.title)}"?`, `"${loc(form.title)}" kalıcı olarak silinsin mi?`), confirmLabel: t("Delete Post", "Yazıyı Sil"), variant: "danger" });
                if (!ok) return;
                const r = await cmsApi.deleteBlog(id);
                if (r.success) { toast(t("Post deleted.", "Yazı silindi."), "success"); setTimeout(() => router.push("/blog"), 600); }
                else toast(r.message || t("Delete failed.", "Silme başarısız."), "error");
              }} style={{ padding: "12px 24px", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "var(--error)", background: "var(--error-container)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="delete" style={{ fontSize: 16 }} />{t("Delete", "Sil")}
              </button>
            )}
            <button type="submit" disabled={saving} style={{ padding: "12px 32px", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg, var(--primary), var(--primary-container))", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, opacity: saving ? 0.6 : 1, boxShadow: "0 4px 14px rgba(0,6,102,0.25)" }}>
              {saving ? <><span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .8s linear infinite", display: "inline-block" }} />{t("Saving…", "Kaydediliyor…")}</> : <><Icon name={isNew ? "publish" : "check"} style={{ fontSize: 16 }} />{isNew ? t("Publish Post", "Yazıyı Yayınla") : t("Save Changes", "Değişiklikleri Kaydet")}</>}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
