"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { projectsApi, ProjectDto, ProjectTimelinePhaseDto, getMediaUrl, settingsApi, LanguageDto, type FeaturedConflictDto } from "@/lib/api";
import LangTabBar from "@/components/LangTabBar";
import { getValidatedInputStyle } from "@/components/FormValidation";
import { incompleteLocales, localeNames } from "@/lib/localizedValidation";
import FileUpload from "@/components/FileUpload";
import { useToast } from "@/components/Toast";
import { useI18n } from "@/lib/i18n";
import Icon from "@/components/Icon";

export default function ProjectEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const isNew = resolvedParams.id === "new";
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [languages, setLanguages] = useState<LanguageDto[]>([]);
  const [activeLang, setActiveLang] = useState<string>("en");
  // Published languages flagged as missing required localized content.
  const [incompleteLangs, setIncompleteLangs] = useState<string[]>([]);

  const [form, setForm] = useState<Partial<ProjectDto>>({
    title: {}, slug: "", category: {}, status: "Planning", year: "",
    description: {}, longDescription: {}, imageUrl: "", location: {}, budget: {}, timeline: [],
    displayOrder: 0, isFeatured: false,
  });

  // Swap modal — opens when backend returns 409 because the four featured
  // slots are full. Holds the four current featured projects so the admin
  // can pick which one to demote.
  const [swapConflict, setSwapConflict] = useState<FeaturedConflictDto | null>(null);
  const [swapChoice, setSwapChoice] = useState<string | null>(null);

  useEffect(() => {
    settingsApi.getLanguages().then(res => {
      if (res.success && res.data) {
        setLanguages(res.data);
        const def = res.data.find(l => l.isDefault)?.code || res.data[0]?.code || "en";
        setActiveLang(def);
      }
    });

    if (!isNew) {
      projectsApi.getProject(resolvedParams.id).then((res) => {
        if (res.success && res.data) setForm(res.data);
        setLoading(false);
      });
    }
  }, [resolvedParams.id, isNew]);

  const setLocal = (field: keyof ProjectDto, value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: { ...(prev[field] as Record<string, string> || {}), [activeLang]: value }
    }));
    setIncompleteLangs(prev => (prev.includes(activeLang) ? prev.filter(c => c !== activeLang) : prev));
  };

  const getLocal = (field: keyof ProjectDto) => {
    const obj = form[field] as Record<string, string>;
    return obj ? obj[activeLang] || "" : "";
  };

  // True when the current tab's value for a required localized field is empty.
  const langErr = (v?: Record<string, string>) =>
    incompleteLangs.includes(activeLang) && !((v?.[activeLang]) ?? "").trim();

  // Core save routine — accepts an optional `replaceFeaturedId` for the
  // retry that comes from the swap modal. Used by both initial submit
  // and the modal's confirm button.
  const submitProject = async (replaceFeaturedId?: string) => {
    setSaving(true);
    if (!form.slug) {
      const titleSource = (form.title as Record<string, string>)?.en || (form.title as Record<string, string>)?.[activeLang] || "";
      form.slug = titleSource.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    }

    try {
      let res;
      if (isNew) {
        const payload = { ...form, replaceFeaturedId } as Omit<ProjectDto, 'id' | 'createdAt' | 'updatedAt'> & { replaceFeaturedId?: string };
        res = await projectsApi.createProject(payload);
      } else {
        const payload = { ...form, id: resolvedParams.id, replaceFeaturedId } as Omit<ProjectDto, 'createdAt' | 'updatedAt'> & { replaceFeaturedId?: string };
        res = await projectsApi.updateProject(resolvedParams.id, payload);
      }

      if (res.success) {
        toast(isNew ? t("Project created.", "Proje oluşturuldu.") : t("Project updated.", "Proje güncellendi."), "success");
        setSwapConflict(null);
        router.push("/projects");
        return;
      }

      // 409 with currentFeatured → backend says swap modal needed.
      const conflict = res.data as FeaturedConflictDto | undefined;
      if (conflict?.currentFeatured?.length) {
        setSwapConflict(conflict);
        setSwapChoice(conflict.currentFeatured[0].id);
        return;
      }

      toast(res.message || t("Save failed.", "Kaydetme başarısız."), "error");
    } catch (err) {
      console.error(err);
      toast(t("An error occurred", "Bir hata oluştu"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    // Every published language must carry the project title.
    const missing = incompleteLocales(languages, [form.title as Record<string, string> | undefined]);
    if (missing.length > 0) {
      setIncompleteLangs(missing);
      setActiveLang(missing[0]);
      toast(t(`Content is required for all published languages: ${localeNames(languages, missing)}`, `Tüm yayındaki diller için içerik zorunlu: ${localeNames(languages, missing)}`), "warning");
      return;
    }
    setIncompleteLangs([]);
    await submitProject();
  };

  const confirmSwap = async () => {
    if (!swapChoice) return;
    await submitProject(swapChoice);
  };

  // Timeline Handlers
  const addTimelinePhase = () => {
    setForm(prev => ({
      ...prev,
      timeline: [...(prev.timeline || []), { date: {}, phase: {}, details: {} }]
    }));
  };

  const updateTimelinePhaseLocal = (index: number, field: keyof ProjectTimelinePhaseDto, value: string) => {
    setForm(prev => {
      const newTimeline = [...(prev.timeline || [])];
      newTimeline[index] = {
        ...newTimeline[index],
        [field]: { ...(newTimeline[index][field] || {}), [activeLang]: value }
      };
      return { ...prev, timeline: newTimeline };
    });
  };

  const getTimelinePhaseLocal = (index: number, field: keyof ProjectTimelinePhaseDto) => {
    const phase = form.timeline?.[index];
    if (!phase) return "";
    return phase[field]?.[activeLang] || "";
  };

  const removeTimelinePhase = (index: number) => {
    setForm(prev => ({
      ...prev,
      timeline: prev.timeline?.filter((_, i) => i !== index)
    }));
  };

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "100px 0", gap: 16 }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2.5px solid var(--primary-fixed)", borderTopColor: "var(--primary)", animation: "spin .8s linear infinite" }} />
      <p style={{ fontSize: 13, color: "var(--outline)", fontWeight: 500 }}>{t("Loading project data…", "Proje verileri yükleniyor…")}</p>
    </div>
  );

  const inputStyle = {
    width: "100%", padding: "10px 14px", borderRadius: 8, fontSize: 13,
    border: "1px solid rgba(198,197,212,0.4)", background: "var(--surface)", color: "var(--on-surface)",
    outline: "none", transition: "border-color .2s", fontFamily: "inherit"
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
        <button onClick={() => router.back()} style={{ width: 40, height: 40, borderRadius: "50%", border: "1px solid rgba(198,197,212,0.3)", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--on-surface-variant)", transition: "background .2s" }}>
          <Icon name="arrow_back" style={{ fontSize: 20 }} />
        </button>
        <div>
          <h1 style={{ fontFamily: "'Manrope',sans-serif", fontSize: 24, fontWeight: 800, color: "var(--primary)", margin: 0 }}>
            {isNew ? t("Create Project", "Proje Oluştur") : t("Edit Project", "Projeyi Düzenle")}
          </h1>
          <p style={{ fontSize: 13, color: "var(--on-surface-variant)", marginTop: 4 }}>
            {t("Configure project details and timeline.", "Proje detaylarını ve zaman çizelgesini yapılandırın.")}
          </p>
        </div>
      </div>

      {languages.length > 1 && (
        <div style={{ position: "sticky", top: 16, zIndex: 10, background: "var(--surface)", padding: "8px 0", borderRadius: 8 }}>
          <LangTabBar langs={languages} activeLang={activeLang} onSelect={setActiveLang} incomplete={incompleteLangs} />
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        
        {/* Core Info */}
        <div style={{ background: "var(--surface-lowest)", borderRadius: 16, padding: "24px 32px", boxShadow: "var(--shadow-ambient)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid rgba(198,197,212,0.15)" }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--on-surface)", margin: 0 }}>{t("Core Information", "Temel Bilgiler")}</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--outline)" }}>{t("Status", "Durum")}</label>
              <select
                value={form.status || "Planning"}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                style={{ ...inputStyle, width: "auto", padding: "8px 12px", background: "var(--surface)" }}
              >
                <option value="Planning">{t("Planning", "Planlama")}</option>
                <option value="InProgress">{t("In Progress", "Devam Ediyor")}</option>
                <option value="Phase2">{t("Phase 2", "2. Aşama")}</option>
                <option value="Operational">{t("Operational", "Faaliyette")}</option>
                <option value="Completed">{t("Completed", "Tamamlandı")}</option>
                <option value="OnHold">{t("On Hold", "Beklemede")}</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--on-surface-variant)", marginBottom: 6 }}>{t("Title", "Başlık")} ({activeLang.toUpperCase()}) *</label>
              <input type="text" value={getLocal("title")} onChange={e => setLocal("title", e.target.value)} style={getValidatedInputStyle(inputStyle, langErr(form.title as Record<string, string> | undefined))} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--on-surface-variant)", marginBottom: 6 }}>{t("Slug", "Kısa Ad")}</label>
              <input type="text" value={form.slug || ""} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder={t("Auto-generated if empty", "Boşsa otomatik üretilir")} style={{ ...inputStyle, background: "rgba(198,197,212,0.05)" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--on-surface-variant)", marginBottom: 6 }}>{t("Category", "Kategori")} ({activeLang.toUpperCase()})</label>
              <input type="text" value={getLocal("category")} onChange={e => setLocal("category", e.target.value)} placeholder={t("e.g. Infrastructure, Real Estate", "ör. Altyapı, Gayrimenkul")} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--on-surface-variant)", marginBottom: 6 }}>{t("Year", "Yıl")}</label>
              <input type="text" value={form.year || ""} onChange={e => setForm({ ...form, year: e.target.value })} placeholder={t("e.g. 2025", "ör. 2025")} style={inputStyle} />
            </div>
          </div>
        </div>

        {/* Specifications */}
        <div style={{ background: "var(--surface-lowest)", borderRadius: 16, padding: "24px 32px", boxShadow: "var(--shadow-ambient)" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--on-surface)", margin: "0 0 20px 0", paddingBottom: 16, borderBottom: "1px solid rgba(198,197,212,0.15)" }}>{t("Specifications", "Özellikler")}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--on-surface-variant)", marginBottom: 6 }}>{t("Location", "Konum")} ({activeLang.toUpperCase()})</label>
              <input type="text" value={getLocal("location")} onChange={e => setLocal("location", e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--on-surface-variant)", marginBottom: 6 }}>{t("Budget", "Bütçe")} ({activeLang.toUpperCase()})</label>
              <input type="text" value={getLocal("budget")} onChange={e => setLocal("budget", e.target.value)} style={inputStyle} />
            </div>
          </div>
        </div>

        {/* Descriptions & Media */}
        <div style={{ background: "var(--surface-lowest)", borderRadius: 16, padding: "24px 32px", boxShadow: "var(--shadow-ambient)" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--on-surface)", margin: "0 0 20px 0", paddingBottom: 16, borderBottom: "1px solid rgba(198,197,212,0.15)" }}>{t("Media & Content", "Görsel & İçerik")}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <FileUpload
              value={form.imageUrl || ""}
              onChange={url => setForm({ ...form, imageUrl: url })}
              label={t("Featured Image", "Öne Çıkan Görsel")}
              accept="image/*"
              hint={t("Upload project banner — high resolution recommended", "Proje görseli yükleyin — yüksek çözünürlük önerilir")}
              variant="cover"
            />

            {/* Gallery Uploads */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--on-surface-variant)" }}>{t("Project Gallery (Max 6)", "Proje Galerisi (En fazla 6)")}</label>
                <button type="button" onClick={() => {
                  const current = form.galleryUrls || [];
                  if (current.length < 6) setForm({ ...form, galleryUrls: [...current, ""] });
                }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 4, fontSize: 11, fontWeight: 700, color: "var(--primary)", background: "var(--primary-fixed)", border: "none", cursor: "pointer" }}>
                  <Icon name="add_photo_alternate" style={{ fontSize: 14 }} />{t("Add Slot", "Alan Ekle")}
                </button>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {(form.galleryUrls || []).map((url: string, idx: number) => (
                  <div key={idx} style={{ position: "relative" }}>
                    <FileUpload 
                      value={url} 
                      onChange={newUrl => {
                        const newGallery = [...(form.galleryUrls || [])];
                        newGallery[idx] = newUrl;
                        setForm({ ...form, galleryUrls: newGallery });
                      }} 
                      label={`${t("Gallery Image", "Galeri Görseli")} ${idx + 1}`}
                      accept="image/*" 
                    />
                    <button type="button" onClick={() => {
                      const newGallery = [...(form.galleryUrls || [])];
                      newGallery.splice(idx, 1);
                      setForm({ ...form, galleryUrls: newGallery });
                    }} style={{ position: "absolute", top: 0, right: 0, background: "rgba(255,0,0,0.1)", color: "red", border: "none", borderRadius: "0 8px 0 8px", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 10 }}>
                      <Icon name="close" style={{ fontSize: 14 }} />
                    </button>
                  </div>
                ))}
                {(!form.galleryUrls || form.galleryUrls.length === 0) && (
                  <div style={{ gridColumn: "1 / -1", padding: 20, textAlign: "center", border: "1px dashed var(--outline-variant)", borderRadius: 8, color: "var(--on-surface-variant)", fontSize: 12 }}>
                    {t("No gallery images added. Click \"Add Slot\" to begin.", "Galeri görseli eklenmedi. Başlamak için \"Alan Ekle\"ye tıklayın.")}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--on-surface-variant)", marginBottom: 6 }}>{t("Short Description", "Kısa Açıklama")} ({activeLang.toUpperCase()})</label>
              <textarea value={getLocal("description")} onChange={e => setLocal("description", e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} placeholder={t("Brief summary for the grid view...", "Izgara görünümü için kısa özet...")}></textarea>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--on-surface-variant)", marginBottom: 6 }}>{t("Detailed Description", "Detaylı Açıklama")} ({activeLang.toUpperCase()})</label>
              <textarea value={getLocal("longDescription")} onChange={e => setLocal("longDescription", e.target.value)} rows={6} style={{ ...inputStyle, resize: "vertical" }} placeholder={t("Detailed project breakdown...", "Detaylı proje açıklaması...")}></textarea>
            </div>
          </div>
        </div>

        {/* Publication & ordering — homepage feature toggle + manual order */}
        <div style={{ background: "var(--surface-lowest)", borderRadius: 16, padding: "24px 32px", boxShadow: "var(--shadow-ambient)" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--on-surface)", margin: "0 0 4px 0" }}>
            {t("Publication & Order", "Yayın & Sıralama")}
          </h2>
          <p style={{ fontSize: 12, color: "var(--on-surface-variant)", margin: "0 0 20px 0" }}>
            {t("Highlight on the homepage and control where the project appears in the listing.", "Anasayfada öne çıkar ve listede nerede görüneceğini belirle.")}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 24, alignItems: "start" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, padding: "16px 18px", background: form.isFeatured ? "var(--primary-fixed)" : "var(--surface)", border: form.isFeatured ? "1px solid var(--primary)" : "1px solid rgba(198,197,212,0.3)", borderRadius: 10, transition: "background .2s, border-color .2s" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <Icon name="home" style={{ fontSize: 16, color: form.isFeatured ? "var(--primary)" : "var(--outline)" }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--on-surface)" }}>
                    {t("Show on homepage", "Anasayfada göster")}
                  </span>
                </div>
                <p style={{ fontSize: 11, color: "var(--on-surface-variant)", margin: 0, lineHeight: 1.5 }}>
                  {t("At most 4 projects can be featured at once. If 4 are already featured, you'll be asked which one to swap out.", "Aynı anda en fazla 4 proje öne çıkarılabilir. Eğer 4'ü doluysa, hangisinin değiştirileceği sorulur.")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setForm({ ...form, isFeatured: !form.isFeatured })}
                aria-pressed={!!form.isFeatured}
                style={{ position: "relative", width: 44, height: 24, borderRadius: 9999, background: form.isFeatured ? "var(--primary)" : "var(--outline-variant)", border: "none", cursor: "pointer", transition: "background .2s", flexShrink: 0 }}
              >
                <span style={{ position: "absolute", top: 3, left: form.isFeatured ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.15)", transition: "left .2s" }} />
              </button>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--on-surface-variant)", marginBottom: 6 }}>
                {t("Display order", "Sıralama")}
              </label>
              <input
                type="number"
                value={form.displayOrder ?? 0}
                onChange={e => setForm({ ...form, displayOrder: Number(e.target.value) || 0 })}
                style={inputStyle}
              />
              <p style={{ fontSize: 11, color: "var(--on-surface-variant)", marginTop: 6, lineHeight: 1.4 }}>
                {t("Lower comes first. Drag-and-drop on the list page updates this automatically.", "Düşük değerler önce gelir. Liste sayfasındaki sürükle-bırak bunu otomatik günceller.")}
              </p>
            </div>
          </div>
        </div>

        {/* Timeline Array Editor */}
        <div style={{ background: "var(--surface-lowest)", borderRadius: 16, padding: "24px 32px", boxShadow: "var(--shadow-ambient)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid rgba(198,197,212,0.15)" }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--on-surface)", margin: 0 }}>{t("Development Timeline", "Gelişim Zaman Çizelgesi")}</h2>
            <button type="button" onClick={addTimelinePhase} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700, color: "var(--primary)", background: "var(--primary-fixed)", border: "none", cursor: "pointer" }}>
              <Icon name="add" style={{ fontSize: 16 }} />{t("Add Phase", "Aşama Ekle")}
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {!form.timeline || form.timeline.length === 0 ? (
              <p style={{ textAlign: "center", color: "var(--outline)", fontSize: 13, fontStyle: "italic", padding: "20px 0" }}>{t("No timeline phases added.", "Zaman çizelgesi aşaması eklenmedi.")}</p>
            ) : (
              form.timeline.map((phase, index) => (
                <div key={index} style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: 16, background: "var(--surface)", border: "1px solid rgba(198,197,212,0.2)", borderRadius: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--outline)", marginBottom: 4 }}>{t("Date", "Tarih")} ({activeLang.toUpperCase()})</label>
                    <input type="text" value={getTimelinePhaseLocal(index, "date")} onChange={e => updateTimelinePhaseLocal(index, "date", e.target.value)} placeholder={t("e.g. Q1 2025", "ör. 2025 Ç1")} style={inputStyle} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--outline)", marginBottom: 4 }}>{t("Phase", "Aşama")} ({activeLang.toUpperCase()})</label>
                    <input type="text" value={getTimelinePhaseLocal(index, "phase")} onChange={e => updateTimelinePhaseLocal(index, "phase", e.target.value)} placeholder={t("e.g. Excavation", "ör. Kazı")} style={inputStyle} />
                  </div>
                  <div style={{ flex: 2 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--outline)", marginBottom: 4 }}>{t("Details", "Detaylar")} ({activeLang.toUpperCase()})</label>
                    <input type="text" value={getTimelinePhaseLocal(index, "details")} onChange={e => updateTimelinePhaseLocal(index, "details", e.target.value)} placeholder={t("Description of phase...", "Aşama açıklaması...")} style={inputStyle} />
                  </div>
                  <button type="button" onClick={() => removeTimelinePhase(index)} style={{ marginTop: 20, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", color: "var(--outline)", cursor: "pointer", borderRadius: 8, transition: "background .2s, color .2s" }} onMouseEnter={e => { e.currentTarget.style.color = "var(--error)"; e.currentTarget.style.background = "var(--error-container)"; }} onMouseLeave={e => { e.currentTarget.style.color = "var(--outline)"; e.currentTarget.style.background = "none"; }}>
                    <Icon name="delete" style={{ fontSize: 18 }} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, padding: "24px 0" }}>
          <button type="button" onClick={() => router.back()} style={{ padding: "12px 24px", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "var(--on-surface-variant)", background: "var(--surface)", border: "1px solid rgba(198,197,212,0.4)", cursor: "pointer" }}>
            {t("Cancel", "Vazgeç")}
          </button>
          <button type="submit" disabled={saving} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 28px", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg, var(--primary), var(--primary-container))", border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, boxShadow: "0 4px 14px rgba(0,6,102,0.2)" }}>
            {saving ? (
               <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin .8s linear infinite" }} />
            ) : (
               <Icon name="save" style={{ fontSize: 18 }} />
            )}
            {saving ? t("Saving…", "Kaydediliyor…") : t("Save Project", "Projeyi Kaydet")}
          </button>
        </div>
      </form>

      {/* Swap modal — opens when the four-featured cap is hit. Asks the
          admin which currently-featured project should step aside. */}
      {swapConflict && (
        <div
          onClick={() => !saving && setSwapConflict(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(10,26,47,0.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: "var(--surface-lowest)", borderRadius: 12, padding: "28px 32px", boxShadow: "0 24px 60px rgba(10,26,47,0.25)", width: "100%", maxWidth: 520 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: "var(--primary-fixed)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="home" style={{ fontSize: 20, color: "var(--primary)" }} />
              </div>
              <div>
                <h3 style={{ fontFamily: "'Manrope',sans-serif", fontSize: 17, fontWeight: 700, color: "var(--primary)" }}>
                  {t("Homepage cap reached", "Anasayfa kapasitesi dolu")}
                </h3>
                <p style={{ fontSize: 12, color: "var(--on-surface-variant)", marginTop: 2 }}>
                  {t("At most 4 projects can be featured at once.", "Aynı anda en fazla 4 proje öne çıkarılabilir.")}
                </p>
              </div>
            </div>

            <p style={{ fontSize: 13, color: "var(--on-surface)", lineHeight: 1.5, marginBottom: 16 }}>
              {t("Pick which currently-featured project should be removed from the homepage so this one can take its place:", "Bu projenin anasayfada görünebilmesi için aşağıdaki projelerden hangisinin yerini bırakacağını seçin:")}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 22, maxHeight: 280, overflowY: "auto" }}>
              {swapConflict.currentFeatured.map((p) => {
                const selected = swapChoice === p.id;
                return (
                  <label
                    key={p.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "12px 14px",
                      background: selected ? "var(--primary-fixed)" : "var(--surface)",
                      border: selected ? "1px solid var(--primary)" : "1px solid rgba(198,197,212,0.3)",
                      borderRadius: 8, cursor: "pointer", transition: "background .2s, border-color .2s",
                    }}
                  >
                    <input
                      type="radio"
                      name="swap"
                      checked={selected}
                      onChange={() => setSwapChoice(p.id)}
                      style={{ width: 16, height: 16, accentColor: "var(--primary)", cursor: "pointer" }}
                    />
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "var(--on-surface)" }}>
                      {p.title || t("Untitled", "İsimsiz")}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--on-surface-variant)", fontVariantNumeric: "tabular-nums" }}>
                      n° {String(p.displayOrder).padStart(2, "0")}
                    </span>
                  </label>
                );
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => setSwapConflict(null)}
                disabled={saving}
                style={{ padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 500, color: "var(--on-surface-variant)", background: "var(--surface)", border: "1px solid rgba(198,197,212,0.3)", cursor: saving ? "not-allowed" : "pointer" }}
              >
                {t("Cancel", "Vazgeç")}
              </button>
              <button
                type="button"
                onClick={confirmSwap}
                disabled={saving || !swapChoice}
                style={{ padding: "10px 24px", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg, var(--primary), var(--primary-container))", border: "none", cursor: saving || !swapChoice ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8, opacity: saving || !swapChoice ? 0.6 : 1 }}
              >
                {saving
                  ? (<><span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .8s linear infinite", display: "inline-block" }} />{t("Swapping…", "Değiştiriliyor…")}</>)
                  : (<>{t("Swap", "Değiştir")}<Icon name="arrow_forward" style={{ fontSize: 16 }} /></>)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
