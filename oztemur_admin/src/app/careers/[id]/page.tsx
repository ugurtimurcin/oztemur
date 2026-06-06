"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import { careersApi, settingsApi, loc, type LocalizedField, type LanguageDto } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { useFormValidation, FormField, getValidatedInputStyle, type ValidationSchema } from "@/components/FormValidation";
import { incompleteLocales, localeNames } from "@/lib/localizedValidation";
import LangTabBar from "@/components/LangTabBar";
import { useI18n } from "@/lib/i18n";
import Icon from "@/components/Icon";

interface LocalizedList { [lang: string]: string[] | undefined }

interface FormState {
  title: LocalizedField; referenceCode: string; department: LocalizedField; location: string;
  type: string; description: LocalizedField; requirements: LocalizedList; coreObjectives: LocalizedList; isActive: boolean;
}

const empty: FormState = { 
  title: { en: "", tr: "" }, 
  referenceCode: "", 
  department: { en: "", tr: "" }, 
  location: "", 
  type: "Full-Time", 
  description: { en: "", tr: "" }, 
  requirements: { en: [], tr: [] }, 
  coreObjectives: { en: [], tr: [] }, 
  isActive: true 
};

// ─── ListEditor Component ──────────────────────
function ListEditor({ label, items, onChange, placeholder }: { label: string, items: string[], onChange: (v: string[]) => void, placeholder: string }) {
  const { t } = useI18n();
  const [val, setVal] = useState("");
  const add = () => { if (val.trim()) { onChange([...items, val.trim()]); setVal(""); } };
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  return (
    <div style={{ flex: 1 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--outline)", marginBottom: 8 }}>{label}</label>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input 
          value={val} 
          onChange={e => setVal(e.target.value)} 
          onKeyDown={e => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder={placeholder} 
          style={{ width: "100%", padding: "10px 14px", borderRadius: 8, fontSize: 13, background: "var(--surface)", color: "var(--on-surface)", border: "1px solid rgba(198,197,212,0.3)", outline: "none" }} 
        />
        <button type="button" onClick={add} style={{ width: 40, height: 40, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--primary-fixed)", color: "var(--primary)", border: "none", cursor: "pointer" }}>
          <Icon name="add" />
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.length === 0 && <p style={{ fontSize: 12, color: "var(--outline-variant)", fontStyle: "italic", margin: "4px 0" }}>{t("No items added yet.", "Henüz öğe eklenmedi.")}</p>}
        {items.map((it, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "var(--surface)", borderRadius: 8, border: "1px solid rgba(198,197,212,0.1)" }}>
            <span style={{ fontSize: 13, color: "var(--on-surface-variant)" }}>{it}</span>
            <button type="button" onClick={() => remove(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--outline-variant)", padding: 4, display: "flex" }} onMouseEnter={e => e.currentTarget.style.color = "var(--error)"} onMouseLeave={e => e.currentTarget.style.color = "var(--outline-variant)"}>
              <Icon name="close" style={{ fontSize: 18 }} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const sectionCard: React.CSSProperties = { background: "var(--surface-lowest)", borderRadius: 12, padding: "32px 32px 28px", boxShadow: "var(--shadow-ambient)", marginBottom: 20 };
const sectionTitle: React.CSSProperties = { fontFamily: "'Manrope',sans-serif", fontSize: 15, fontWeight: 700, color: "var(--primary)", display: "flex", alignItems: "center", gap: 8, marginBottom: 24 };
const lbl: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--outline)", marginBottom: 6 };
const inputBase: React.CSSProperties = { width: "100%", padding: "12px 16px", borderRadius: 8, fontSize: 14, background: "var(--surface)", color: "var(--on-surface)", border: "1px solid rgba(198,197,212,0.3)", outline: "none", transition: "border-color .2s, box-shadow .2s" };
const iconInput: React.CSSProperties = { ...inputBase, paddingLeft: 42 };
const hint: React.CSSProperties = { fontSize: 11, color: "var(--outline-variant)", marginTop: 4 };
const twoCol: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 };

const TYPES = ["Full-Time", "Part-Time", "Contract", "Internship", "Remote"];

export default function JobForm() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { t } = useI18n();
  const [form, setForm] = useState<FormState>(empty);

  const typeLabel = (ty: string): string => {
    switch (ty) {
      case "Full-Time":  return t("Full-Time", "Tam Zamanlı");
      case "Part-Time":  return t("Part-Time", "Yarı Zamanlı");
      case "Contract":   return t("Contract", "Sözleşmeli");
      case "Internship": return t("Internship", "Staj");
      case "Remote":     return t("Remote", "Uzaktan");
      default:           return ty;
    }
  };
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
    if (!isNew) careersApi.getJob(id).then(r => {
      if (r.success && r.data) {
        const d = r.data;
        const toDict = (v: LocalizedField | string | undefined): LocalizedField => {
          if (!v) return { en: "" };
          if (typeof v === "string") return { en: v };
          return v;
        };
        const toList = (v: any): LocalizedList => {
          if (!v) return { en: [] };
          if (typeof v === "string") {
             try { return { en: JSON.parse(v) }; } catch { return { en: [] }; }
          }
          return v;
        };
        setForm({
          title: toDict(d.title), referenceCode: d.referenceCode || "",
          department: toDict(d.department), location: d.location,
          type: d.type, description: toDict(d.description),
          requirements: toList(d.requirements), 
          coreObjectives: toList(d.coreObjectives),
          isActive: d.isActive,
        });
      }
      setLoading(false);
    });
  }, [id, isNew]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(f => ({ ...f, [k]: v }));
  const setL = (field: "title" | "department" | "description", lang: string, value: string) => {
    setForm(f => ({ ...f, [field]: { ...f[field], [lang]: value } }));
    setIncompleteLangs(prev => (prev.includes(lang) ? prev.filter(c => c !== lang) : prev));
  };
  const setListL = (field: "requirements" | "coreObjectives", lang: string, value: string[]) => {
    setForm(f => ({ ...f, [field]: { ...f[field], [lang]: value } }));
  };

  const schema: ValidationSchema<{ location: string }> = {
    location: { required: true, minLength: 2 },
  };
  const { onBlur, validateAll, getFieldState } = useFormValidation(schema);
  // True when the current tab's value for a required localized field is empty.
  const langErr = (v: LocalizedField) => incompleteLangs.includes(activeLang) && !((v[activeLang]) ?? "").trim();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateAll({ location: form.location })) { toast(t("Please fix the highlighted fields.", "Lütfen işaretli alanları düzeltin."), "warning"); return; }
    const missing = incompleteLocales(langs, [form.title, form.department, form.description]);
    if (missing.length > 0) {
      setIncompleteLangs(missing);
      setActiveLang(missing[0]);
      toast(t(`Content is required for all published languages: ${localeNames(langs, missing)}`, `Tüm yayındaki diller için içerik zorunlu: ${localeNames(langs, missing)}`), "warning");
      return;
    }
    setIncompleteLangs([]);
    setSaving(true);
    const payload = { title: form.title, department: form.department, location: form.location, type: form.type, description: form.description, requirements: form.requirements, coreObjectives: form.coreObjectives, isActive: form.isActive };
    const r = isNew ? await careersApi.createJob(payload as never) : await careersApi.updateJob(id, payload as never);
    if (r.success) { toast(isNew ? t("Job posting published!", "İlan yayınlandı!") : t("Job posting updated!", "İlan güncellendi!"), "success"); setTimeout(() => router.push("/careers"), 800); }
    else toast(r.message || t("Failed.", "Başarısız."), "error"); setSaving(false);
  };

  if (loading) return <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "100px 0", gap: 16 }}><div style={{ width: 32, height: 32, borderRadius: "50%", border: "2.5px solid var(--primary-fixed)", borderTopColor: "var(--primary)", animation: "spin .8s linear infinite" }} /><p style={{ fontSize: 13, color: "var(--outline)" }}>{t("Loading job posting…", "İlan yükleniyor…")}</p></div>;
  const InputIcon = ({ name }: { name: string }) => <Icon name={name} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 18, color: "var(--outline-variant)" }} />;
  const langLabel = langs.find(l => l.code === activeLang)?.nativeName || activeLang;

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--outline)", marginBottom: 8 }}>
        <button onClick={() => router.push("/careers")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--outline)", display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 500 }}><Icon name="arrow_back" style={{ fontSize: 16 }} />{t("Careers", "Kariyer")}</button>
        <span style={{ color: "var(--outline-variant)" }}>/</span>
        <span style={{ color: "var(--on-surface-variant)", fontWeight: 500 }}>{isNew ? t("New", "Yeni") : t("Edit", "Düzenle")}</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "'Manrope',sans-serif", fontSize: 28, fontWeight: 800, color: "var(--primary)", letterSpacing: "-0.02em" }}>{isNew ? t("New Job Posting", "Yeni İlan") : t("Edit Job Posting", "İlanı Düzenle")}</h1>
          <p style={{ fontSize: 13, color: "var(--on-surface-variant)", marginTop: 4 }}>{isNew ? t("Create a new job listing for the careers portal.", "Kariyer portalı için yeni bir iş ilanı oluşturun.") : `${t("Editing:", "Düzenleniyor:")} ${loc(form.title) || t("Untitled", "İsimsiz")}`}</p>
        </div>
        {!isNew && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 9999, background: form.isActive ? "var(--success-container)" : "var(--error-container)" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: form.isActive ? "var(--success)" : "var(--error)" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: form.isActive ? "var(--success)" : "var(--error)", textTransform: "uppercase" as const }}>{form.isActive ? t("Active", "Aktif") : t("Closed", "Kapalı")}</span>
          </div>
        )}
      </div>

      <form onSubmit={submit}>
        {/* Position Info */}
        <div style={sectionCard}>
          <div style={sectionTitle}><Icon name="work" style={{ fontSize: 20, color: "var(--primary)" }} />{t("Position Details", "Pozisyon Detayları")}</div>
          <LangTabBar langs={langs} activeLang={activeLang} onSelect={setActiveLang} incomplete={incompleteLangs} />
          <div style={twoCol}>
            <FormField>
              <label style={lbl}>{t("Job Title", "Pozisyon Adı")} ({langLabel}) *</label><div style={{ position: "relative" }}><InputIcon name="badge" /><input value={form.title[activeLang] || ""} onChange={e => setL("title", activeLang, e.target.value)} placeholder={t("e.g. Senior UX Architect", "ör. Kıdemli UX Mimarı")} style={getValidatedInputStyle(iconInput, langErr(form.title))} /></div>
            </FormField>
            {!isNew && (
              <FormField>
                <label style={lbl}>{t("Reference Code", "Referans Kodu")}</label>
                <div style={{ position: "relative" }}><InputIcon name="terminal" /><input value={form.referenceCode} readOnly style={{ ...iconInput, background: "var(--surface-lowest)", cursor: "not-allowed", opacity: 0.8 }} /></div>
              </FormField>
            )}
          </div>
          <div style={{ ...twoCol, marginTop: 20 }}>
            <FormField>
              <label style={lbl}>{t("Department", "Departman")} ({langLabel}) *</label><div style={{ position: "relative" }}><InputIcon name="corporate_fare" /><input value={form.department[activeLang] || ""} onChange={e => setL("department", activeLang, e.target.value)} placeholder={t("e.g. Engineering", "ör. Mühendislik")} style={getValidatedInputStyle(iconInput, langErr(form.department))} /></div>
            </FormField>
            <FormField error={getFieldState("location").error}>
              <label style={lbl}>{t("Location", "Konum")} *</label><div style={{ position: "relative" }}><InputIcon name="location_on" /><input value={form.location} onChange={e => set("location", e.target.value)} onBlur={() => onBlur("location", form.location)} placeholder={t("e.g. Lefkoşa, KKTC", "ör. Lefkoşa, KKTC")} style={getValidatedInputStyle(iconInput, getFieldState("location").hasError)} /></div>
            </FormField>
          </div>
          <div style={{ marginTop: 20 }}>
            <label style={lbl}>{t("Employment Type", "Çalışma Şekli")}</label>
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8, marginTop: 4 }}>
              {TYPES.map(ty => (
                <button key={ty} type="button" onClick={() => set("type", ty)} style={{
                  padding: "8px 16px", borderRadius: 9999, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  background: form.type === ty ? "var(--primary-fixed)" : "var(--surface)",
                  color: form.type === ty ? "var(--on-primary-fixed)" : "var(--on-surface-variant)",
                  border: form.type === ty ? "1px solid var(--primary)" : "1px solid rgba(198,197,212,0.3)",
                  transition: "all .15s",
                }}>{typeLabel(ty)}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Description & Requirements */}
        <div style={sectionCard}>
          <div style={sectionTitle}><Icon name="description" style={{ fontSize: 20, color: "var(--primary)" }} />{t("Description & Qualifications", "Açıklama & Aranılan Nitelikler")}</div>
          <LangTabBar langs={langs} activeLang={activeLang} onSelect={setActiveLang} incomplete={incompleteLangs} />
          <FormField>
            <label style={lbl}>{t("Job Description", "İş Tanımı")} ({langLabel}) *</label>
            <textarea rows={8} value={form.description[activeLang] || ""} onChange={e => setL("description", activeLang, e.target.value)} placeholder={t("Describe the role, responsibilities, and what a typical day looks like…", "Rolü, sorumlulukları ve tipik bir günü anlatın…")} style={{ ...getValidatedInputStyle(inputBase, langErr(form.description)), resize: "vertical" as const, minHeight: 140, lineHeight: 1.7 }} />
            <p style={hint}>{(form.description[activeLang] || "").length.toLocaleString()} {t("characters", "karakter")}</p>
          </FormField>
          <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
            <ListEditor label={`${t("Core Responsibilities", "Temel Sorumluluklar")} (${langLabel})`} items={form.coreObjectives[activeLang] || []} onChange={items => setListL("coreObjectives", activeLang, items)} placeholder={t("Add a core responsibility…", "Bir temel sorumluluk ekleyin…")} />
            <ListEditor label={`${t("Qualifications", "Aranılan Nitelikler")} (${langLabel})`} items={form.requirements[activeLang] || []} onChange={items => setListL("requirements", activeLang, items)} placeholder={t("Add a qualification…", "Bir nitelik ekleyin…")} />
          </div>
        </div>

        {/* Status (edit only) */}
        {!isNew && (
          <div style={sectionCard}>
            <div style={sectionTitle}><Icon name="toggle_on" style={{ fontSize: 20, color: "var(--primary)" }} />{t("Posting Status", "İlan Durumu")}</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "var(--surface)", borderRadius: 8 }}>
              <div><p style={{ fontSize: 14, fontWeight: 600, color: "var(--on-surface)" }}>{t("Accept Applications", "Başvuru Kabul Et")}</p><p style={{ fontSize: 12, color: "var(--outline)", marginTop: 2 }}>{t("When disabled, this position will be removed from the careers portal.", "Devre dışı bırakıldığında pozisyon kariyer portalından kaldırılır.")}</p></div>
              <button type="button" onClick={() => set("isActive", !form.isActive)} style={{ position: "relative", width: 48, height: 26, borderRadius: 9999, background: form.isActive ? "var(--primary)" : "var(--outline-variant)", border: "none", cursor: "pointer", transition: "background .2s", flexShrink: 0 }}><span style={{ position: "absolute", top: 3, left: form.isActive ? 24 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.15)", transition: "left .2s" }} /></button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 0", borderTop: "1px solid rgba(198,197,212,0.15)" }}>
          <button type="button" onClick={() => router.push("/careers")} style={{ padding: "12px 28px", borderRadius: 8, fontSize: 13, fontWeight: 500, color: "var(--on-surface-variant)", background: "var(--surface-lowest)", border: "1px solid rgba(198,197,212,0.3)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><Icon name="close" style={{ fontSize: 16 }} />{t("Cancel", "Vazgeç")}</button>
          <div style={{ display: "flex", gap: 12 }}>
            {!isNew && (
              <button type="button" onClick={async () => {
                const ok = await confirm({ title: t("Delete Job Posting", "İlanı Sil"), description: t(`Permanently delete the listing for "${loc(form.title)}"?`, `"${loc(form.title)}" ilanı kalıcı olarak silinsin mi?`), confirmLabel: t("Delete Job Posting", "İlanı Sil"), variant: "danger" });
                if (!ok) return;
                const r = await careersApi.deleteJob(id);
                if (r.success) { toast(t("Job posting deleted.", "İlan silindi."), "success"); setTimeout(() => router.push("/careers"), 600); }
                else toast(r.message || t("Delete failed.", "Silme başarısız."), "error");
              }} style={{ padding: "12px 24px", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "var(--error)", background: "var(--error-container)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="delete" style={{ fontSize: 16 }} />{t("Delete", "Sil")}
              </button>
            )}
            <button type="submit" disabled={saving} style={{ padding: "12px 32px", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg, var(--primary), var(--primary-container))", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, opacity: saving ? 0.6 : 1, boxShadow: "0 4px 14px rgba(0,6,102,0.25)" }}>
              {saving ? <><span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .8s linear infinite", display: "inline-block" }} />{t("Saving…", "Kaydediliyor…")}</> : <><Icon name={isNew ? "post_add" : "check"} style={{ fontSize: 16 }} />{isNew ? t("Post Job", "İlanı Yayınla") : t("Save Changes", "Değişiklikleri Kaydet")}</>}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
